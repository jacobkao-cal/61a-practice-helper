// Node harness for Gleam code, matching the browser runner (app/gleam_runner.js) as closely as possible:
// the same vendored compiler, standard library and runtime (app/vendor/gleam/gleam_bundle.js), the same source
// preparation (buildSource: top-level statements wrapped, test cases appended), and the same run order (top-level
// runs, then main(), then each case on its own). Each program runs in a worker thread that is stopped after 5 s.
//
//   const h = await require('./gleam_harness').create();
//   const r = await h.run(code, { cases: ['assert f(1) == 2'], files: { 'x_ffi.mjs': '...' } });
//   r = { compileError, error, stdout, cases: [{ status: 'passed' | 'failed' | 'timeout', error }] }
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { Worker } = require('worker_threads');

const APP = path.join(__dirname, '..', 'app');
const TIMEOUT_MS = 5000;

function loadAssets() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(APP, 'vendor', 'gleam', 'gleam_bundle.js'), 'utf8'), sandbox);
  return sandbox.window.CS61A_GLEAM_ASSETS;
}
function loadBuildSource() {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(APP, 'gleam_runner.js'), 'utf8'), sandbox);
  return sandbox.module.exports.buildSource;
}

// Runs inside the worker thread: import the module, then run its top-level functions, main, and one case.
const WORKER = `
const { parentPort, workerData } = require('worker_threads');
const out = [];
console.log = console.info = console.warn = console.error = (...a) => out.push(a.join(' ').replace(/^src\\/your_code\\.gleam:(\\d+)/, 'your_code.gleam:$1') + '\\n');
// In Node, io.println and echo write to process.stdout / stderr (echo adds colour codes) instead of console.log.
process.stdout.write = process.stderr.write = (s) => { out.push(String(s).replace(/\\u001b\\[\\d+m/g, '').replace(/^src\\/your_code\\.gleam:(\\d+)/, 'your_code.gleam:$1')); return true; };
const fmt = (e) => (e && e.gleam_error ? e.gleam_error + ': ' + e.message + (e.line ? ' (line ' + e.line + ')' : '') : String(e && e.stack || e));
(async () => {
  const m = await import(workerData.url);
  let error = null;
  if (workerData.which === 'program') {
    for (const t of workerData.tops) { try { m[t](); } catch (e) { error = fmt(e); break; } }
    if (!error && typeof m.main === 'function' && m.main.length === 0) { try { m.main(); } catch (e) { error = fmt(e); } }
  } else {
    try { m['cs61a_case_' + workerData.which](); } catch (e) { error = fmt(e); }
  }
  parentPort.postMessage({ error, stdout: out.join('') });
})().catch((e) => parentPort.postMessage({ error: 'load: ' + fmt(e), stdout: out.join('') }));
`;

async function create() {
  const assets = loadAssets();
  const buildSource = loadBuildSource();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gleam-harness-'));
  fs.writeFileSync(path.join(dir, 'gleam_wasm.mjs'), assets.glue);
  const g = await import(pathToFileURL(path.join(dir, 'gleam_wasm.mjs')).href);
  g.initSync({ module: Buffer.from(assets.wasm, 'base64') });
  g.initialise_panic_hook(false);
  fs.writeFileSync(path.join(dir, 'runtime.mjs'), assets.runtime);
  const facade = {};
  Object.entries(assets.exports).forEach(([p, [ns, names]], i) => {
    const file = path.join(dir, `facade_${i}.mjs`);
    fs.writeFileSync(file, `import { ${ns} as m } from "./runtime.mjs";\n${names.length ? `export const { ${names.join(', ')} } = m;\n` : ''}`);
    facade[p] = pathToFileURL(file).href;
  });
  let seq = 0;

  function compile(source, files) {
    g.reset_filesystem(1);
    Object.keys(assets.modules).forEach((m) => g.write_module(1, m, assets.modules[m]));
    Object.keys(assets.files).forEach((f) => g.write_file(1, `/src/${f}`, assets.files[f]));
    Object.keys(files || {}).forEach((f) => g.write_file(1, `/src/${f}`, files[f]));
    g.write_module(1, 'your_code', source);
    try { g.compile_package(1, 'javascript'); } catch (e) { return { error: String(e).replace(/\/src\/your_code\.gleam/g, 'your_code.gleam').trim() }; }
    while (g.pop_warning(1)) { /* ignored, as in the browser */ }
    const n = ++seq;
    const own = {}; // the problem's own FFI files, linked like the browser runner does
    const link = (js) => js.replace(/(\bfrom\s*|\bimport\s*)(["'])\.\/([^"']+)\2/g, (m, kw, q, p) => {
      const target = own[p] || facade[p];
      if (!target) throw new Error(`No module ${p}`);
      return `${kw}${q}${target}${q}`;
    });
    Object.keys(files || {}).forEach((f) => {
      const file = path.join(dir, `ffi_${n}_${f}`);
      fs.writeFileSync(file, link(files[f]));
      own[f] = pathToFileURL(file).href;
    });
    const file = path.join(dir, `your_code_${n}.mjs`);
    fs.writeFileSync(file, link(g.read_compiled_javascript(1, 'your_code')));
    return { error: null, url: pathToFileURL(file).href };
  }

  function exec(url, tops, which, ms) {
    return new Promise((resolve) => {
      const w = new Worker(WORKER, { eval: true, workerData: { url, tops, which } });
      const timer = setTimeout(() => { w.terminate(); resolve({ timeout: true, error: null, stdout: '' }); }, ms || TIMEOUT_MS);
      w.once('message', (m) => { clearTimeout(timer); w.terminate(); resolve(m); });
      w.once('error', (e) => { clearTimeout(timer); resolve({ error: `worker: ${e.message}`, stdout: '' }); });
    });
  }

  async function run(code, opts = {}) {
    const cases = opts.cases || [];
    const built = buildSource(code, cases);
    const c = compile(built.source, opts.files);
    if (c.error) {
      const alone = compile(buildSource(code, null).source, opts.files);
      return { compileError: alone.error || null, casesCompileError: alone.error ? null : c.error, error: null, stdout: '', cases: [] };
    }
    const prog = await exec(c.url, built.tops, 'program', opts.timeoutMs);
    const res = { compileError: null, error: prog.timeout ? 'timeout' : prog.error, stdout: prog.stdout, cases: [] };
    for (let i = 0; i < cases.length; i++) {
      const r = await exec(c.url, [], i, opts.timeoutMs);
      res.cases.push({ status: r.timeout ? 'timeout' : r.error ? 'failed' : 'passed', error: r.error });
    }
    return res;
  }

  return { run, buildSource, assets, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

module.exports = { create };
