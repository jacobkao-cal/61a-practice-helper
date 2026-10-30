// Browser Python runner (Phase 6A; verified doctests added in 6B).
//
// Runs student code with Pyodide inside a dedicated Web Worker, so the page stays responsive while Python runs.
//   - The worker is created from a Blob URL, which works when the app is served over http(s) *and* when
//     index.html is opened directly from disk (Chrome refuses `new Worker('file.js')` on file:// pages).
//   - The runtime is loaded lazily on the first run, from a pinned Pyodide release on the jsDelivr CDN
//     (needs an internet connection the first time; the browser caches it afterwards).
//   - Every run gets a fresh `__main__` namespace, so names defined in one run never leak into the next.
//   - A run that exceeds RUN_TIMEOUT_MS is stopped by terminating the worker; the next run starts a new one.
//   - Output is capped at OUTPUT_LIMIT characters and reported as truncated.
//
// Security boundary: a Web Worker keeps student code off the page's main thread and away from the DOM and
// localStorage, but it is NOT a hardened sandbox. Code can still use the network from the worker. Nothing
// secret is available to it (the app has no secrets or privileged APIs).
//
// API (window.CS61A_RUNNER):
//   run(code, { onPhase, tests }) -> Promise<result>
//     onPhase('loading' | 'running' | 'testing', progress) is called as the run progresses
//     (progress = { done, total } while testing).
//     result = { status: 'ok' | 'error' | 'timeout' | 'load-error' | 'crash',
//                stdout, error, truncated, ms, message, tests? }
//   tests (optional, Phase 6B) = { setup, cases: [{ name, input }] }, where each case's `input` is doctest text
//     (`>>> expr` lines followed by the expected output). The code runs once for Console Output; if that run
//     completes without error, each case then runs on its own: a fresh namespace, the setup, the student's code,
//     then the case's examples, checked exactly like Python's doctest. A case that runs too long stops Python,
//     so the cases after it are reported as not run (never counted as passed).
//     result.tests = { total, passed, notRun, reason, cases: [{ name, input, status, examples, error, ms }] }
//       status: 'passed' | 'failed' (an example's output differed or it raised) | 'error' (the code itself could
//               not be loaded for this case) | 'timeout' | 'not-run'
//       examples: [{ source, want, got, ok, error, truncated }]
//       reason (why some cases did not run): null | 'error' | 'timeout' | 'load-error' | 'crash' | 'stopped'
(function () {
  'use strict';

  const PYODIDE_VERSION = '0.26.4';
  const config = {
    indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    LOAD_TIMEOUT_MS: 60000, // downloading + starting Python
    RUN_TIMEOUT_MS: 5000,   // one run of student code, and separately each test case
    OUTPUT_LIMIT: 20000,    // characters of console output kept per run
    CASE_OUTPUT_LIMIT: 5000, // characters of output kept per test example
  };

  // Python side: runs `src` in a fresh namespace, capturing stdout/stderr (including anything printed before an
  // exception), and formats errors with only the student's own frames, labelled "<your code>".
  const HARNESS = String.raw`
import sys, traceback, linecache, doctest, json

class _Capture:
    def __init__(self, limit):
        self.parts, self.size, self.limit, self.truncated = [], 0, limit, False
    def write(self, s):
        s = str(s)
        room = self.limit - self.size
        if len(s) > room:
            self.truncated = True
        if room > 0:
            piece = s[:room]
            self.parts.append(piece)
            self.size += len(piece)
        return len(s)
    def flush(self):
        pass

_SHOWN_FILES = ('<your code>', '<test>')

def _no_input(*args):
    raise EOFError('input() is not available in this runner')

def _format_error(e):
    if isinstance(e, SyntaxError):
        return ''.join(traceback.format_exception_only(type(e), e))
    te = traceback.TracebackException(type(e), e, e.__traceback__)
    te.stack = traceback.StackSummary.from_list([f for f in te.stack if f.filename in _SHOWN_FILES])
    return ''.join(te.format())

def run_student(src, limit):
    out = _Capture(limit)
    ns = {'__name__': '__main__', '__builtins__': __builtins__, 'input': _no_input}
    linecache.cache['<your code>'] = (len(src), None, src.splitlines(True), '<your code>')
    saved = sys.stdout, sys.stderr, sys.getrecursionlimit()
    sys.stdout = sys.stderr = out
    error = None
    try:
        exec(compile(src, '<your code>', 'exec'), ns)
    except BaseException as e:
        error = _format_error(e)
    finally:
        sys.stdout, sys.stderr = saved[0], saved[1]
        sys.setrecursionlimit(saved[2])
        ns.clear()
    return ''.join(out.parts), error, out.truncated

def _flags(example):
    flags = 0
    for flag, on in example.options.items():
        flags = flags | flag if on else flags & ~flag
    return flags

def run_case(src, setup, case_src, limit):
    # One test case: fresh namespace, setup, the student's code, then each doctest example in order.
    ns = {'__name__': '__main__', '__builtins__': __builtins__, 'input': _no_input}
    linecache.cache['<your code>'] = (len(src), None, src.splitlines(True), '<your code>')
    saved = sys.stdout, sys.stderr, sys.getrecursionlimit()
    result = {'status': 'passed', 'examples': [], 'error': None}
    try:
        sys.stdout = sys.stderr = _Capture(limit)  # the code's own prints already appear in Console Output
        try:
            if setup:
                exec(compile(setup, '<test setup>', 'exec'), ns)
            exec(compile(src, '<your code>', 'exec'), ns)
        except BaseException as e:
            result['status'] = 'error'
            result['error'] = _format_error(e)
            return json.dumps(result)
        examples = doctest.DocTestParser().get_examples(case_src)
        checker = doctest.OutputChecker()
        if not examples:
            result['status'] = 'error'
            result['error'] = 'This test case has no >>> examples.'
        for ex in examples:
            cap = _Capture(limit)
            sys.stdout = sys.stderr = cap
            linecache.cache['<test>'] = (len(ex.source), None, ex.source.splitlines(True), '<test>')
            exc = None
            try:
                exec(compile(ex.source, '<test>', 'single'), ns)
            except BaseException as e:
                exc = e
            sys.stdout, sys.stderr = saved[0], saved[1]
            got = ''.join(cap.parts)
            item = {'source': ex.source, 'want': ex.want, 'got': got, 'ok': False, 'error': None, 'truncated': cap.truncated}
            if exc is None:
                item['ok'] = checker.check_output(ex.want, got, _flags(ex))
            elif ex.exc_msg is not None:  # the example expects this exception
                item['ok'] = checker.check_output(ex.exc_msg, traceback.format_exception_only(type(exc), exc)[-1], _flags(ex))
                item['error'] = None if item['ok'] else _format_error(exc)
            else:
                item['error'] = _format_error(exc)
            if not item['ok']:
                result['status'] = 'failed'
            result['examples'].append(item)
        return json.dumps(result)
    finally:
        sys.stdout, sys.stderr = saved[0], saved[1]
        sys.setrecursionlimit(saved[2])
        ns.clear()
`;

  // Worker side (serialized into a Blob; must not reference anything outside itself).
  function workerMain() {
    let runStudent = null;
    let runCase = null;
    self.onmessage = async (e) => {
      const m = e.data;
      if (m.type === 'init') {
        try {
          importScripts(m.indexURL + 'pyodide.js');
          const py = await self.loadPyodide({ indexURL: m.indexURL });
          py.setStdin({ error: true });
          py.runPython(m.harness);
          runStudent = py.globals.get('run_student');
          runCase = py.globals.get('run_case');
          self.postMessage({ type: 'ready', version: py.version });
        } catch (err) {
          self.postMessage({ type: 'init-error', message: String((err && err.message) || err) });
        }
      } else if (m.type === 'run') {
        try {
          const r = runStudent(m.code, m.limit);
          const [stdout, error, truncated] = r.toJs();
          r.destroy();
          self.postMessage({ type: 'result', id: m.id, stdout, error: error || null, truncated: !!truncated });
        } catch (err) {
          // The interpreter itself failed (e.g. the WebAssembly stack overflowed); this worker is not reused.
          self.postMessage({ type: 'crash', id: m.id, message: String((err && err.message) || err) });
        }
      } else if (m.type === 'test') {
        try {
          self.postMessage({ type: 'case', id: m.id, json: runCase(m.code, m.setup, m.input, m.limit) });
        } catch (err) {
          self.postMessage({ type: 'crash', id: m.id, message: String((err && err.message) || err) });
        }
      }
    };
  }

  let worker = null;     // the live worker, once Python has loaded in it
  let starting = null;   // Promise<Worker> while a worker is loading Python
  let chain = Promise.resolve(); // runs are strictly one after another
  let seq = 0;

  function discard() {
    if (worker) worker.terminate();
    worker = null;
  }

  function startWorker() {
    if (worker) return Promise.resolve(worker);
    if (starting) return starting;
    starting = new Promise((resolve, reject) => {
      const src = `(${workerMain.toString()})();`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      URL.revokeObjectURL(url);
      const fail = (message) => { clearTimeout(timer); w.terminate(); reject(new Error(message)); };
      const timer = setTimeout(() => fail('Loading Python took too long.'), config.LOAD_TIMEOUT_MS);
      w.onmessage = (e) => {
        if (e.data.type === 'ready') { clearTimeout(timer); w.onmessage = null; w.onerror = null; worker = w; resolve(w); }
        else if (e.data.type === 'init-error') fail(e.data.message);
      };
      w.onerror = (e) => { e.preventDefault(); fail(e.message || 'The Python worker could not start.'); };
      w.postMessage({ type: 'init', indexURL: config.indexURL, harness: HARNESS });
    }).finally(() => { starting = null; });
    return starting;
  }

  // Sends one message to the live worker and waits for the reply to it. Python can't be interrupted from
  // outside, so a real timeout terminates the whole worker; the next run starts a new one.
  function request(w, msg, ms) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const finish = (r) => {
        clearTimeout(timer);
        w.onmessage = null; w.onerror = null;
        resolve(Object.assign({}, r, { ms: Math.round(performance.now() - t0) }));
      };
      const timer = setTimeout(() => { discard(); finish({ type: 'timeout' }); }, ms);
      w.onmessage = (e) => {
        if (e.data.id !== msg.id) return; // never accept a reply meant for an earlier request
        if (e.data.type === 'crash') discard(); // the interpreter failed; this worker is not reused
        finish(e.data);
      };
      w.onerror = (e) => { e.preventDefault(); discard(); finish({ type: 'crash', message: e.message || 'Python stopped unexpectedly.' }); };
      w.postMessage(msg);
    });
  }

  async function execute(code, onPhase, tests) {
    const t0 = performance.now();
    const base = { stdout: '', error: null, truncated: false };
    if (!worker) onPhase('loading');
    let w;
    try {
      w = await startWorker();
    } catch (err) {
      const r = Object.assign(base, { status: 'load-error', message: err.message, ms: Math.round(performance.now() - t0) });
      if (tests) r.tests = runTestsSkipped(tests, 'load-error');
      return r;
    }
    onPhase('running');
    const m = await request(w, { type: 'run', id: ++seq, code, limit: config.OUTPUT_LIMIT }, config.RUN_TIMEOUT_MS);
    const r = Object.assign(base,
      m.type === 'timeout' ? { status: 'timeout', ms: m.ms }
        : m.type === 'crash' ? { status: 'crash', message: m.message, ms: m.ms }
          : { status: m.error ? 'error' : 'ok', stdout: m.stdout, error: m.error || null, truncated: !!m.truncated, ms: m.ms });
    if (tests) r.tests = r.status === 'ok' ? await runTests(code, tests, onPhase) : runTestsSkipped(tests, r.status);
    return r;
  }

  function testCases(tests) {
    return tests.cases.map((c, i) => ({ name: c.name || `Case ${i + 1}`, input: c.input, status: 'not-run', examples: [], error: null, ms: 0 }));
  }
  function runTestsSkipped(tests, reason) {
    const cases = testCases(tests);
    return { total: cases.length, passed: 0, notRun: cases.length, reason, cases };
  }
  async function runTests(code, tests, onPhase) {
    const summary = runTestsSkipped(tests, null);
    const { cases } = summary;
    for (let i = 0; i < cases.length; i++) {
      if (!worker) { summary.reason = 'stopped'; break; } // an earlier case timed out or crashed Python
      onPhase('testing', { done: i, total: cases.length });
      const m = await request(worker, { type: 'test', id: ++seq, code, setup: tests.setup || '', input: cases[i].input, limit: config.CASE_OUTPUT_LIMIT }, config.RUN_TIMEOUT_MS);
      summary.notRun--;
      cases[i].ms = m.ms;
      if (m.type === 'timeout') { cases[i].status = 'timeout'; continue; }
      if (m.type === 'crash') { cases[i].status = 'error'; cases[i].error = 'Python stopped unexpectedly while running this case.'; continue; }
      const c = JSON.parse(m.json);
      Object.assign(cases[i], { status: c.status, examples: c.examples, error: c.error });
      if (c.status === 'passed') summary.passed++;
    }
    return summary;
  }

  window.CS61A_RUNNER = {
    version: PYODIDE_VERSION,
    config,
    get ready() { return !!worker; },
    run(code, opts) {
      const onPhase = (opts && opts.onPhase) || (() => {});
      const tests = opts && opts.tests && Array.isArray(opts.tests.cases) && opts.tests.cases.length ? opts.tests : null;
      const p = chain.then(() => execute(String(code), onPhase, tests));
      chain = p.catch(() => {});
      return p;
    },
  };
})();
