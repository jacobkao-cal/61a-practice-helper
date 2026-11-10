// Browser Gleam runner: the Gleam counterpart of runner.js, with the same API and result shape, so the Run Code
// panel and the Test Results list work unchanged.
//
// How a run works
//   - The compiler is Gleam's own browser build (WebAssembly), vendored with gleam_stdlib and the JavaScript prelude
//     in vendor/gleam/gleam_bundle.js (see tools/vendor_gleam.mjs). The bundle is added as a <script> on the first
//     Gleam run only, so it never slows down Python questions, and it works on file:// pages as well as when served.
//   - Everything runs in a dedicated Web Worker created from a Blob URL, like runner.js. Each run compiles the
//     standard library and the student's code (module `your_code`) to JavaScript, links the modules through Blob URLs
//     and imports them, so nothing from one run is reused by the next.
//   - Gleam doesn't allow statements outside functions, but the course writes `assert ...` and `echo ...` lines at
//     the top level, as in lecture. Each such statement is wrapped, on its own lines, in a generated function, so
//     line numbers in errors still match the editor. Those run in order, then `main()` if the code defines one.
//   - io.println and echo write to the console, which the worker captures as Console Output.
//   - A run (compiling + running) that exceeds RUN_TIMEOUT_MS is stopped by terminating the worker.
//
// Tests: tests.cases[i].input is Gleam code (usually one `assert` line). Each case becomes a generated function
// compiled with the student's code and run on its own; it passes if it finishes without an error.
//
// Security boundary: the same as runner.js. A Web Worker keeps student code off the page and away from saved data,
// but it is not a hardened sandbox.
(function () {
  'use strict';

  const config = {
    bundleURL: 'vendor/gleam/gleam_bundle.js',
    LOAD_TIMEOUT_MS: 60000,
    RUN_TIMEOUT_MS: 5000,
    OUTPUT_LIMIT: 20000,
  };

  // ── Source preparation (pure; also used by the test-bank verifier through module.exports) ──
  // Splits a line into [code, comment] at a `//` that isn't inside a string, and tracks open brackets.
  function scanLine(line, state) {
    let i = 0;
    for (; i < line.length; i++) {
      const c = line[i];
      if (state.str) {
        if (c === '\\') i++;
        else if (c === '"') state.str = false;
      } else if (c === '"') state.str = true;
      else if (c === '/' && line[i + 1] === '/') return i;
      else if ('([{'.includes(c)) state.depth++;
      else if (')]}'.includes(c)) state.depth = Math.max(0, state.depth - 1);
    }
    return -1;
  }
  const TOP_STMT = /^(assert|echo|let)\b/;
  // Wraps each run of top-level statements in `pub fn cs61a_top_N() { ... }` without changing the number of lines.
  // A run is consecutive statements, with blank and comment lines allowed between them, so a `let` is visible to the
  // asserts after it. A statement continues on indented lines and while brackets are open; a line at column 0 that
  // doesn't start a statement (fn, pub, type, import, ...) ends the run. ` Nil` closes the function body, so a run may
  // end with a `let`.
  function wrapTopLevel(code) {
    const lines = code.split('\n');
    const state = { depth: 0, str: false };
    const tops = [];
    let open = null; // { last, commentAt }: the last code line of the run being collected
    const close = () => {
      const { last, commentAt } = open;
      lines[last] = commentAt >= 0
        ? `${lines[last].slice(0, commentAt).replace(/\s+$/, '')} Nil } ${lines[last].slice(commentAt)}`
        : `${lines[last]} Nil }`;
      open = null;
    };
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n];
      const atTop = state.depth === 0 && !state.str;
      const blankOrComment = line.trim() === '' || line.trim().startsWith('//');
      if (open && atTop && !blankOrComment && !/^\s/.test(line) && !TOP_STMT.test(line)) close();
      let prefix = '';
      if (!open && atTop && TOP_STMT.test(line)) {
        const name = `cs61a_top_${tops.length}`;
        tops.push(name);
        prefix = `pub fn ${name}() { `;
        lines[n] = prefix + line;
        open = { last: n, commentAt: -1 };
      }
      const at = scanLine(line, state);
      if (open && !blankOrComment) { open.last = n; open.commentAt = at >= 0 ? at + prefix.length : -1; }
    }
    if (open) close();
    return { source: lines.join('\n'), tops };
  }
  // The student's code (top level wrapped) plus one generated function per test case, placed after it.
  function buildSource(code, cases) {
    const { source, tops } = wrapTopLevel(code);
    const extra = (cases || []).map((input, i) => `\n\npub fn cs61a_case_${i}() {\n${input}\n  Nil\n}`).join('');
    return { source: source + extra, tops };
  }

  // ── Worker (serialized into a Blob; must not reference anything outside itself) ──
  function workerMain() {
    const PID = 1;
    let g = null;          // the compiler (wasm-bindgen module)
    let assets = null;     // stdlib sources and FFI files (for the compiler), the runtime bundle and its exports
    let mod = null;        // the compiled student module of the last run
    let out = null;        // console capture for the current run

    const capture = (...args) => {
      if (!out) return;
      // echo prints "src/your_code.gleam:<line>" first; shown like compile errors name the file.
      const s = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ').replace(/^src\/your_code\.gleam:(\d+)/, 'your_code.gleam:$1') + '\n';
      const room = out.limit - out.size;
      if (s.length > room) out.truncated = true;
      if (room > 0) { out.parts.push(s.slice(0, room)); out.size += Math.min(room, s.length); }
    };
    console.log = console.info = console.warn = console.error = console.debug = capture;

    let inspect = null; // gleam/string.inspect: shows a value the way Gleam prints it
    function formatError(e) {
      if (e && e.gleam_error) {
        const where = typeof e.line === 'number' && !(typeof e.function === 'string' && e.function.startsWith('cs61a_case_'))
          ? ` (line ${e.line}${e.function && !String(e.function).startsWith('cs61a_') ? `, in ${e.function}` : ''})` : '';
        const kind = { assert: 'Assertion failed', panic: 'panic', todo: 'todo', let_assert: 'let assert failed' }[e.gleam_error] || e.gleam_error;
        let msg = String(e.message || '').replace(/\.$/, '');
        if (msg.toLowerCase() === kind.toLowerCase() + '' || msg === 'Assertion failed') msg = '';
        // `assert a == b` reports both sides' values, like doctest's Expected / Got.
        let sides = '';
        if (e.gleam_error === 'assert' && e.kind === 'binary_operator' && e.left && e.right && inspect) {
          try { sides = `\n  left:  ${inspect(e.left.value)}\n  right: ${inspect(e.right.value)}`; } catch (err) { sides = ''; }
        }
        return `${kind}${msg ? `: ${msg}` : ''}${where}${sides}`;
      }
      if (e instanceof RangeError && /call stack/i.test(e.message)) return 'Error: recursion too deep (the call stack ran out). Check that every recursive call gets closer to a base case.';
      return `${(e && e.name) || 'Error'}: ${(e && e.message) || String(e)}`;
    }

    // The prelude and standard library are one prebuilt module (assets.runtime). Each path compiled code imports
    // (./gleam.mjs, ./gleam/list.mjs, ...) gets a small module re-exporting its namespace of that bundle. Both are
    // made once per worker and shared by every run; they hold no state a run could change.
    const blobUrl = (src) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    let runtimeUrl = null;
    const facades = {};
    function facade(path) {
      if (facades[path]) return facades[path];
      const entry = assets.exports[path];
      if (!entry) throw new Error(`The module ${path.replace(/\.mjs$/, '')} isn't available in the browser.`);
      if (!runtimeUrl) runtimeUrl = blobUrl(assets.runtime);
      const [ns, names] = entry;
      facades[path] = blobUrl(`import { ${ns} as m } from ${JSON.stringify(runtimeUrl)};\n${names.length ? `export const { ${names.join(', ')} } = m;\n` : ''}`);
      return facades[path];
    }

    function compile(source, files) {
      g.reset_filesystem(PID);
      Object.keys(assets.modules).forEach((m) => g.write_module(PID, m, assets.modules[m]));
      Object.keys(assets.files).forEach((f) => g.write_file(PID, `/src/${f}`, assets.files[f]));
      Object.keys(files).forEach((f) => g.write_file(PID, `/src/${f}`, files[f]));
      g.write_module(PID, 'your_code', source);
      try {
        g.compile_package(PID, 'javascript');
      } catch (err) {
        return { error: String(err).replace(/\/src\/your_code\.gleam/g, 'your_code.gleam').replace(/\s+$/, '') };
      }
      while (g.pop_warning(PID)) { /* warnings (e.g. unused variables in a template) aren't shown */ }
      return { error: null };
    }

    // files: the problem's own JavaScript (FFI) files, e.g. { 'fib_ffi.mjs': '...' }, imported by @external functions.
    async function load(source, files) {
      const c = compile(source, files);
      if (c.error) return c;
      const js = g.read_compiled_javascript(PID, 'your_code');
      if (js == null) return { error: 'The compiler produced no JavaScript for your code.' };
      // your_code.mjs and the FFI files sit at the package root, so their imports are "./gleam.mjs", "./x_ffi.mjs", ...
      const made = [];
      const own = {};
      const link = (text) => text.replace(/(\bfrom\s*|\bimport\s*)(["'])\.\/([^"']+)\2/g, (m, kw, q, p) => `${kw}${q}${own[p] || facade(p)}${q}`);
      Object.keys(files).forEach((f) => { own[f] = blobUrl(link(files[f])); made.push(own[f]); });
      const url = blobUrl(link(js));
      made.push(url);
      if (!inspect) inspect = (await import(facade('gleam/string.mjs'))).inspect;
      try {
        return { error: null, module: await import(url) };
      } finally {
        made.forEach((u) => URL.revokeObjectURL(u));
      }
    }

    function run(fn) {
      try { fn(); return null; } catch (e) { return formatError(e); }
    }

    self.onmessage = async (e) => {
      const m = e.data;
      if (m.type === 'init') {
        try {
          assets = { modules: m.modules, files: m.files, runtime: m.runtime, exports: m.exports };
          const glueUrl = URL.createObjectURL(new Blob([m.glue], { type: 'text/javascript' }));
          g = await import(glueUrl);
          const bin = atob(m.wasm);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          await g.default({ module_or_path: bytes });
          g.initialise_panic_hook(false);
          self.postMessage({ type: 'ready' });
        } catch (err) {
          self.postMessage({ type: 'init-error', message: String((err && err.message) || err) });
        }
      } else if (m.type === 'run') {
        out = { parts: [], size: 0, limit: m.limit, truncated: false };
        mod = null;
        let error = null;
        let testsError = null; // why the tests can't run, when the code with the tests doesn't compile
        try {
          let r = m.withTests ? await load(m.full, m.files) : await load(m.plain, m.files);
          if (r.error && m.withTests) {
            testsError = r.error;
            r = await load(m.plain, m.files);
          }
          if (r.error) error = r.error;
          else {
            mod = r.module;
            for (const name of m.tops) {
              error = run(() => mod[name]());
              if (error) break;
            }
            if (!error && typeof mod.main === 'function' && mod.main.length === 0) error = run(() => mod.main());
          }
        } catch (err) {
          error = String((err && err.message) || err);
        }
        const stdout = out.parts.join('');
        const truncated = out.truncated;
        out = null;
        self.postMessage({ type: 'result', id: m.id, stdout, error, truncated, compiled: !!mod, testsError, testsLoaded: !!mod && !testsError && m.withTests });
      } else if (m.type === 'test') {
        out = { parts: [], size: 0, limit: m.limit, truncated: false };
        const fn = mod && mod[`cs61a_case_${m.index}`];
        const error = typeof fn === 'function' ? run(() => fn()) : 'This test could not be loaded.';
        out = null;
        self.postMessage({ type: 'case', id: m.id, error });
      }
    };
  }

  // ── Main thread ──
  let assetsPromise = null;
  function loadAssets() {
    if (window.CS61A_GLEAM_ASSETS) return Promise.resolve(window.CS61A_GLEAM_ASSETS);
    if (assetsPromise) return assetsPromise;
    assetsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = config.bundleURL;
      s.onload = () => (window.CS61A_GLEAM_ASSETS ? resolve(window.CS61A_GLEAM_ASSETS) : reject(new Error('The Gleam bundle is empty.')));
      s.onerror = () => reject(new Error('The Gleam compiler could not be loaded.'));
      document.head.appendChild(s);
    }).catch((err) => { assetsPromise = null; throw err; });
    return assetsPromise;
  }

  let worker = null;
  let starting = null;
  let chain = Promise.resolve();
  let seq = 0;

  function discard() {
    if (worker) worker.terminate();
    worker = null;
  }

  function startWorker() {
    if (worker) return Promise.resolve(worker);
    if (starting) return starting;
    starting = loadAssets().then((a) => new Promise((resolve, reject) => {
      const src = `(${workerMain.toString()})();`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      URL.revokeObjectURL(url);
      const fail = (message) => { clearTimeout(timer); w.terminate(); reject(new Error(message)); };
      const timer = setTimeout(() => fail('Loading Gleam took too long.'), config.LOAD_TIMEOUT_MS);
      w.onmessage = (e) => {
        if (e.data.type === 'ready') { clearTimeout(timer); w.onmessage = null; w.onerror = null; worker = w; resolve(w); }
        else if (e.data.type === 'init-error') fail(e.data.message);
      };
      w.onerror = (e) => { e.preventDefault(); fail(e.message || 'The Gleam worker could not start.'); };
      w.postMessage({ type: 'init', glue: a.glue, wasm: a.wasm, modules: a.modules, files: a.files, runtime: a.runtime, exports: a.exports });
    })).finally(() => { starting = null; });
    return starting;
  }

  function request(w, msg, ms) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const finish = (r) => {
        clearTimeout(timer);
        w.onmessage = null; w.onerror = null;
        resolve(Object.assign({}, r, { ms: Math.round(performance.now() - t0) }));
      };
      const timer = setTimeout(() => { discard(); finish({ type: 'timeout' }); }, ms);
      w.onmessage = (e) => { if (e.data.id === msg.id) finish(e.data); };
      w.onerror = (e) => { e.preventDefault(); discard(); finish({ type: 'crash', message: e.message || 'Gleam stopped unexpectedly.' }); };
      w.postMessage(msg);
    });
  }

  function testCases(tests) {
    return tests.cases.map((c, i) => ({ name: c.name || `Case ${i + 1}`, origin: c.origin || null, input: c.input, status: 'not-run', examples: [], error: null, ms: 0 }));
  }
  function skipped(tests, reason) {
    const cases = testCases(tests);
    return { total: cases.length, passed: 0, notRun: cases.length, reason, cases };
  }

  async function execute(code, onPhase, tests, files, runMs) {
    const t0 = performance.now();
    const base = { stdout: '', error: null, truncated: false };
    if (!worker) onPhase('loading');
    let w;
    try {
      w = await startWorker();
    } catch (err) {
      const r = Object.assign(base, { status: 'load-error', message: err.message, ms: Math.round(performance.now() - t0) });
      if (tests) r.tests = skipped(tests, 'load-error');
      return r;
    }
    onPhase('running');
    const plain = buildSource(code, null);
    const full = tests ? buildSource(code, tests.cases.map((c) => c.input)) : plain;
    const m = await request(w, { type: 'run', id: ++seq, plain: plain.source, full: full.source, withTests: !!tests, tops: plain.tops, files, limit: config.OUTPUT_LIMIT }, runMs);
    const r = Object.assign(base,
      m.type === 'timeout' ? { status: 'timeout', ms: m.ms }
        : m.type === 'crash' ? { status: 'crash', message: m.message, ms: m.ms }
          : { status: m.error ? 'error' : 'ok', stdout: m.stdout, error: m.error || null, truncated: !!m.truncated, ms: m.ms });
    if (!tests) return r;
    // Unlike Python, a failing top-level assert doesn't stop the tests: each case is its own function call, and
    // Gleam values can't be changed, so one case can't affect another. Tests need the code to compile, though.
    if (m.type !== 'result' || !m.compiled) { r.tests = skipped(tests, m.type === 'result' ? 'error' : r.status); return r; }
    const summary = skipped(tests, null);
    if (m.testsError) {
      summary.cases.forEach((c) => { c.status = 'error'; c.error = m.testsError; });
      summary.notRun = 0;
      r.tests = summary;
      return r;
    }
    for (let i = 0; i < summary.cases.length; i++) {
      if (!worker) { summary.reason = 'stopped'; break; }
      onPhase('testing', { done: i, total: summary.cases.length });
      const c = summary.cases[i];
      const res = await request(worker, { type: 'test', id: ++seq, index: i, limit: config.OUTPUT_LIMIT }, runMs);
      summary.notRun--;
      c.ms = res.ms;
      if (res.type === 'timeout') { c.status = 'timeout'; continue; }
      if (res.type === 'crash') { c.status = 'error'; c.error = 'Gleam stopped unexpectedly while running this case.'; continue; }
      c.status = res.error ? 'failed' : 'passed';
      c.error = res.error;
      if (!res.error) summary.passed++;
    }
    r.tests = summary;
    return r;
  }

  const api = {
    language: 'Gleam',
    config,
    buildSource,
    get ready() { return !!worker; },
    run(code, opts) {
      const onPhase = (opts && opts.onPhase) || (() => {});
      const tests = opts && opts.tests && Array.isArray(opts.tests.cases) && opts.tests.cases.length ? opts.tests : null;
      const files = opts && opts.files && typeof opts.files === 'object' ? opts.files : {};
      // timeoutMs: a longer limit for one problem whose intended program is slow (data/gleam_questions.js RUN_LIMITS)
      const runMs = opts && Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : config.RUN_TIMEOUT_MS;
      const p = chain.then(() => execute(String(code), onPhase, tests, files, runMs));
      chain = p.catch(() => {});
      return p;
    },
  };
  if (typeof window !== 'undefined') window.CS61A_GLEAM_RUNNER = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildSource, wrapTopLevel };
})();
