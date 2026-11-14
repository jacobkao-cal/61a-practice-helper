// Builds app/vendor/gleam/gleam_bundle.js: everything the browser needs to compile and run Gleam, in one plain
// script, so Run Code works both when the site is served and when index.html is opened from disk (a file:// page
// can't fetch() a .wasm file or load ES modules, but it can add a <script> tag).
//
//   node tools/vendor_gleam.mjs
//
// Needs: an internet connection, `tar`, npx, and the Gleam CLI at the same version as COMPILER (it downloads the
// standard library from Hex and compiles it, with the JavaScript prelude, to the code the browser runs).
//
// The bundle holds:
//   glue     the compiler's wasm-bindgen JavaScript (an ES module, imported from a Blob URL inside the worker)
//   wasm     the compiler itself (gleam_wasm_bg.wasm), base64
//   modules  gleam_stdlib's .gleam sources, type-checked together with the student's code on every run
//   files    gleam_stdlib's JavaScript FFI files (.mjs), which the compiler expects next to those sources
//   runtime  the prelude and the compiled standard library as one ES module (see step 3)
//   exports  for each path compiled code imports: [namespace in runtime, export names]
import { execFileSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const COMPILER = '1.19.2';
const STDLIB = '1.0.5';
const ESBUILD = '0.24.2'; // only used here, to combine the compiled standard library into one module

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'app', 'vendor', 'gleam');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-gleam-'));
const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// 1. The browser build of the compiler, checked against the release's published SHA-256.
const base = `https://github.com/gleam-lang/gleam/releases/download/v${COMPILER}/gleam-v${COMPILER}-browser.tar.gz`;
const tarball = await download(base);
const want = (await download(`${base}.sha256`)).toString('utf8').trim().split(/\s+/)[0].toLowerCase();
const got = crypto.createHash('sha256').update(tarball).digest('hex');
if (got !== want) throw new Error(`Checksum mismatch for ${base}: got ${got}, expected ${want}`);
const tarPath = path.join(tmp, 'browser.tar.gz');
const wasmDir = path.join(tmp, 'browser');
fs.writeFileSync(tarPath, tarball);
fs.mkdirSync(wasmDir);
sh('tar', ['-xzf', 'browser.tar.gz', '-C', 'browser'], tmp);
const pkg = JSON.parse(fs.readFileSync(path.join(wasmDir, 'package.json'), 'utf8'));
if (pkg.version !== COMPILER) throw new Error(`Browser build is ${pkg.version}, expected ${COMPILER}`);

// 2. The standard library (exact version) and the prelude, from a throwaway project built with the local CLI.
const cli = sh('gleam', ['--version']).trim();
if (cli !== `gleam ${COMPILER}`) throw new Error(`Local Gleam CLI is "${cli}"; install gleam ${COMPILER} so the prelude matches.`);
const proj = path.join(tmp, 'proj');
fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
fs.writeFileSync(path.join(proj, 'gleam.toml'), `name = "proj"\nversion = "1.0.0"\ntarget = "javascript"\n\n[dependencies]\ngleam_stdlib = ">= ${STDLIB} and <= ${STDLIB}"\n`);
fs.writeFileSync(path.join(proj, 'src', 'proj.gleam'), 'import gleam/io\n\npub fn main() {\n  io.println("ok")\n}\n');
sh('gleam', ['build'], proj);
const manifest = fs.readFileSync(path.join(proj, 'manifest.toml'), 'utf8');
if (!manifest.includes(`name = "gleam_stdlib", version = "${STDLIB}"`)) throw new Error(`gleam_stdlib ${STDLIB} was not resolved`);
const stdSrc = path.join(proj, 'build', 'packages', 'gleam_stdlib', 'src');
const modules = {};
const files = {};
(function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const rel = path.relative(stdSrc, p).split(path.sep).join('/');
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (rel.endsWith('.gleam')) modules[rel.slice(0, -'.gleam'.length)] = fs.readFileSync(p, 'utf8');
    else if (rel.endsWith('.mjs')) files[rel] = fs.readFileSync(p, 'utf8');
  }
})(stdSrc);
// 3. The runtime: the standard library and prelude as compiled by the CLI, combined into ONE ES module. The
// standard library's modules import each other in cycles (gleam_stdlib.mjs <-> gleam/dynamic.mjs, ...), and a
// worker can only link modules through Blob URLs, which can't form a cycle. esbuild resolves the cycles here, and
// the worker gives each path compiled code imports (./gleam.mjs, ./gleam/list.mjs, ...) a small module that
// re-exports one namespace of this bundle (`exports` lists the names for each path).
const jsOut = path.join(proj, 'build', 'dev', 'javascript', 'gleam_stdlib');
const paths = ['gleam.mjs', ...Object.keys(files), ...Object.keys(modules).map((m) => `${m}.mjs`)];
const exportsOf = {};
let entry = '';
for (const [i, p] of paths.entries()) {
  const file = path.join(jsOut, ...p.split('/'));
  if (!fs.existsSync(file)) throw new Error(`Compiled standard library is missing ${p}`);
  const ns = await import(pathToFileURL(file).href);
  exportsOf[p] = [`m${i}`, Object.keys(ns).sort()];
  entry += `export * as m${i} from ${JSON.stringify('./' + p)};\n`;
}
fs.writeFileSync(path.join(jsOut, 'cs61a_entry.mjs'), entry);
execSync(`npx --yes esbuild@${ESBUILD} cs61a_entry.mjs --bundle --format=esm --log-level=warning --outfile=../cs61a_runtime.mjs`,
  { cwd: jsOut, stdio: ['ignore', 'inherit', 'inherit'] });
const runtime = fs.readFileSync(path.join(jsOut, '..', 'cs61a_runtime.mjs'), 'utf8');

// 4. Write the bundle and the licences that cover it.
const assets = {
  compiler: COMPILER,
  stdlib: STDLIB,
  glue: fs.readFileSync(path.join(wasmDir, 'gleam_wasm.js'), 'utf8'),
  wasm: fs.readFileSync(path.join(wasmDir, 'gleam_wasm_bg.wasm')).toString('base64'),
  modules,
  files,
  runtime,
  exports: exportsOf,
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'gleam_bundle.js'),
  `// Generated by tools/vendor_gleam.mjs: the Gleam ${COMPILER} browser compiler, gleam_stdlib ${STDLIB} and the prelude.\n` +
  `// Do not edit by hand. Licences: see LICENSE.md in this folder.\n` +
  `window.CS61A_GLEAM_ASSETS = ${JSON.stringify(assets)};\n`);
const stdLicence = path.join(proj, 'build', 'packages', 'gleam_stdlib', 'LICENCE');
fs.writeFileSync(path.join(outDir, 'LICENSE.md'),
  `# Third-party code in gleam_bundle.js\n\n` +
  `- The Gleam compiler ${COMPILER} (browser build), Copyright 2016 Louis Pilfold and the Gleam contributors, Apache License 2.0: https://github.com/gleam-lang/gleam/blob/v${COMPILER}/LICENCE\n` +
  `- gleam_stdlib ${STDLIB}, Apache License 2.0 (text below)\n` +
  `- The Gleam JavaScript prelude, part of the Gleam compiler, Apache License 2.0\n\n` +
  (fs.existsSync(stdLicence) ? '```\n' + fs.readFileSync(stdLicence, 'utf8').trim() + '\n```\n' : ''));
fs.rmSync(tmp, { recursive: true, force: true });
const size = fs.statSync(path.join(outDir, 'gleam_bundle.js')).size;
console.log(`Wrote app/vendor/gleam/gleam_bundle.js (${(size / 1048576).toFixed(1)} MB): Gleam ${COMPILER}, gleam_stdlib ${STDLIB}, ${Object.keys(modules).length} modules, ${Object.keys(files).length} FFI files.`);
