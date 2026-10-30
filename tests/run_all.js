// Runs every browser suite in e2e/ one after another, then the study-guide doctests and the test-bank validation. Exit code 1 if any fail.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let failed = 0;
const suites = fs.readdirSync(path.join(__dirname, 'e2e')).filter((f) => f.endsWith('.test.js')).sort();
for (const f of [...suites.map((s) => path.join('e2e', s)), 'study_guides_doctest.js', 'verify_test_bank.js']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = (out.match(/^PASS/gm) || []).length;
  const fail = (out.match(/^FAIL/gm) || []).length;
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${f}${pass || fail ? `  (${pass} passed, ${fail} failed)` : ''}`);
  if (!ok) console.log(out.split('\n').filter((l) => !l.startsWith('PASS')).slice(0, 15).map((l) => '      ' + l).join('\n'));
}
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll suites passed');
process.exit(failed ? 1 : 0);
