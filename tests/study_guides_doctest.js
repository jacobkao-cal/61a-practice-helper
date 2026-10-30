// Runs every example in app/data/study_guides.js as a Python doctest, with the course's Link and Tree
// classes in scope, so the outputs shown to students are known to be what Python prints.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

global.window = {};
require(path.join(__dirname, '..', 'app', 'data', 'study_guides.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guides-'));
let n = 0;
for (const [topic, concepts] of Object.entries(window.CS61A_GUIDES)) {
  concepts.forEach((c, i) => { if (c.code) { fs.writeFileSync(path.join(dir, `${topic}_${i}.txt`), c.code + '\n'); n++; } });
}
console.log(`${n} examples`);
try {
  process.stdout.write(execFileSync('python3', ['-I', path.join(__dirname, 'study_guides_doctest.py'), dir], { encoding: 'utf8' }));
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.exit(1);
}
