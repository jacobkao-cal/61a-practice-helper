// Verifies the Gleam bank (app/data/gleam_questions.js) with the same compiler and runtime as the browser
// (tests/gleam_harness.js). For every problem:
//   - with every blank filled with its official answer, the code compiles, its own top-level asserts pass, and every
//     Run Code test case passes;
//   - each other accepted answer, put in its blank alone, passes too;
//   - each wrong multiple-choice option and each listed wrong answer (WRONG below), alone, fails: the code doesn't
//     compile, an assert fails, or a test case fails or times out;
//   - parts without a blank (What Would Gleam Do?) are checked by evaluating the official answer (VALUE_CHECKS).
//
//   node tests/verify_gleam_bank.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const harness = require('./gleam_harness');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'data', 'gleam_questions.js'), 'utf8'), sandbox);
const B = sandbox.window.CS61A_GLEAM_BANK;

// Plausible wrong answers, by part. Each must be caught.
const WRONG = {
  'gl-ep11-2a': ['0, []'],
  'gl-ep11-2b': ['beads'],
  'gl-ep11-2d': ['rest', 'list.append([first], rest)', 'list.append(rest, first)'],
  'gl-ep11-2e': ['length'],
  'gl-ep11-3c': ['s'],
  'gl-ep11-3d': ['[first0, first1]', '#(first1, first0)'],
  'gl-ep11-3e': ['s0'],
  'gl-ep11-4a': ['s, pred', 's, pred, s, []'],
  'gl-ep11-4b': ['#(not_satisfy, satisfy)'],
  'gl-ep11-4c': ['rest, pred, satisfy, [first, ..not_satisfy]', 'rest, pred, [satisfy, ..first], not_satisfy'],
  'gl-ep11-4d': ['rest, pred, [first, ..satisfy], not_satisfy'],
  'gl-ep11-5a': ['[]'],
  'gl-ep11-5c': ['lst'],
  'gl-ep11-5d': ['first'],
  'gl-ep11-5e': ['k'],
  'gl-ep11-6a': ['[m]', '[]'],
  'gl-ep11-6b': ['part(n - m, m + 1)', 'part(n, m + 2)'],
  'gl-ep11-6c': ['m'],
  'gl-ep11-7a': ['find(rest, b, fn(_) { False })', 'True'],
  'gl-ep11-7b': ['True'],
  'gl-ep12-2a': ['contents'],
  'gl-ep12-2b': ['rest'],
  'gl-ep12-2c': ['File(name)'],
  'gl-ep12-2d': ['rest'],
  'gl-ep12-3a': ['dict.insert(s.catalog, content, content.details.title)', 'dict.insert(s.catalog, content.details.author, content)'],
  'gl-ep12-3c': ['LearningSite(..s, watched: [content, ..s.watched])'],
  'gl-ep12-3d': ['LearningSite(..s, missing: list.append(s.missing, [title]))'],
  'gl-ep12-3e': ['list.map(s.watched, fn(c) { c.details.title })'],
  'gl-ep12-3f': ['map'],
  'gl-ep12-3j': ['Video(_, _) -> False'],
  'gl-ep12-4a': ['dict.insert(pen.animals, name, Animal(name, [name]))'],
  'gl-ep12-4d': ['[a, ..x.friends]'],
  'gl-ep12-4e': ['dict.insert(pen.animals, a, new_x)'],
  'gl-lec28-8a': ['[_, _]', '[_]'],
  'gl-lec28-8b': ['[x, _, z]'],
  'gl-lec28-8c': ['x == z'],
  'gl-lec28-8d': ['[_, _, ..rest]'],
  'gl-lec28-10a': ['[first, ..rest] -> first == expected'],
  'gl-lec28-12a': ['[x, ..s_rest], [y, ..t_rest] -> x == y'],
  'gl-lec28-14d': ['s'],
  'gl-lec28-20a': ['0'],
  'gl-lec29-14a': ['[x, ..], _ -> Ok(x)'],
  'gl-lec29-14b': ['[_, ..rest], _ -> nth(rest, n)'],
  'gl-lec29-18b': ['Nil'],
  'gl-lec29-18c': ['1'],
  'gl-lec29-18d': ['fib(n - 2, new_counter()) + fib(n - 1, new_counter())'],
  'gl-lec29-20a': ['[Tree(_, _), ..rest]'],
  'gl-lec29-20b': ['Tree(label, [first, ..rest])'],
};

// Parts without a blank: a test case (Gleam code) that holds exactly when `answer` is right.
const VALUE_CHECKS = {
  'gl-ep12-4f': (answer) => `let my_pen = add_animal(add_animal(Pen("coop", dict.new()), "Alice"), "Clarice")\nlet _ = befriend(my_pen, "Clarice", "Alice")\nassert dict.get(my_pen.animals, "Alice") == ${answer}`,
  'gl-ep12-5a': (answer) => `let run = shrink(3, [])\nassert run([3, 1, 4, 1, 5, 9, 2, 6]) == ${answer}`,
};
const VALUE_WRONG = {
  'gl-ep12-4f': ['Ok(Animal("Alice", ["Clarice"]))', 'Error(Nil)'],
  'gl-ep12-5a': ['[1, 1, 9, 2]', '[6, 2, 9, 5, 1, 4, 1, 3]'],
};

const official = (q) => {
  const k = B.ANSWER_KEY[q.id];
  if (q.type === 'single_choice') return q.choices[k.correct];
  return k.accepted[0];
};
// Put answers into the template like the app does: later lines of a multi-line answer are indented to the blank.
function fill(template, answers) {
  return template.split('\n').map((line) => line.replace(/⟦([^⟧]+)⟧/g, (m, name, col) => {
    const a = answers[name];
    if (a == null) throw new Error(`No answer for blank ${name}`);
    return a.split('\n').map((l, i) => (i ? ' '.repeat(col) + l : l)).join('\n');
  })).join('\n');
}

let pass = 0;
let fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); };
const allPassed = (r) => !r.compileError && !r.casesCompileError && !r.error && r.cases.every((c) => c.status === 'passed');
const why = (r) => r.compileError || r.casesCompileError || r.error || (r.cases.find((c) => c.status !== 'passed') || {}).error || 'a case timed out';

(async () => {
  const h = await harness.create();
  try {
    for (const pid of Object.keys(B.PROBLEMS)) {
      const pr = B.PROBLEMS[pid];
      const parts = B.QUESTIONS.filter((q) => q.problem === pid);
      const withBlank = parts.filter((q) => q.blank);
      const answers = Object.fromEntries(withBlank.map((q) => [q.blank, official(q)]));
      const cases = ((B.TESTS[pid] || {}).cases || []).map((c) => c.input);
      const files = B.FILES[pid];
      const timeoutMs = (B.RUN_LIMITS || {})[pid];
      const blanksInCode = [...pr.code.matchAll(/⟦([^⟧]+)⟧/g)].map((m) => m[1]);
      ok(blanksInCode.every((b) => answers[b] != null) && withBlank.every((q) => blanksInCode.includes(q.blank)), `${pid}: every blank has exactly one part`);
      ok(cases.length > 0 || parts.every((q) => !q.blank), `${pid}: has Run Code tests`);

      const base = await h.run(fill(pr.code, answers), { cases, files, timeoutMs });
      ok(allPassed(base), `${pid}: official answers compile, pass the question's asserts and ${cases.length} test case(s)${allPassed(base) ? '' : ` — ${why(base)}`}`);

      for (const q of withBlank) {
        const key = B.ANSWER_KEY[q.id];
        const alts = q.type === 'single_choice' ? [] : key.accepted.slice(1);
        for (const alt of alts) {
          const r = await h.run(fill(pr.code, Object.assign({}, answers, { [q.blank]: alt })), { cases, files, timeoutMs });
          ok(allPassed(r), `${q.id}: accepted answer ${JSON.stringify(alt)} passes${allPassed(r) ? '' : ` — ${why(r)}`}`);
        }
        const wrongs = q.type === 'single_choice' ? q.choices.filter((c, i) => i !== key.correct) : (WRONG[q.id] || []);
        for (const w of wrongs) {
          const r = await h.run(fill(pr.code, Object.assign({}, answers, { [q.blank]: w })), { cases, files, timeoutMs });
          ok(!allPassed(r), `${q.id}: wrong ${q.type === 'single_choice' ? 'choice' : 'answer'} ${JSON.stringify(w)} is caught`);
        }
      }
      for (const q of parts.filter((x) => !x.blank)) {
        const check = VALUE_CHECKS[q.id];
        ok(!!check, `${q.id}: has a value check`);
        if (!check) continue;
        for (const a of B.ANSWER_KEY[q.id].accepted) {
          const r = await h.run(fill(pr.code, answers), { cases: [check(a)], files, timeoutMs });
          ok(allPassed(r), `${q.id}: answer ${a} evaluates as stated${allPassed(r) ? '' : ` — ${why(r)}`}`);
        }
        for (const w of VALUE_WRONG[q.id] || []) {
          const r = await h.run(fill(pr.code, answers), { cases: [check(w)], files, timeoutMs });
          ok(!allPassed(r), `${q.id}: wrong answer ${w} is caught`);
        }
      }
    }
    // Every part in the bank has an answer, and the data is well formed.
    for (const q of B.QUESTIONS) {
      ok(!!B.PROBLEMS[q.problem] && !!B.ANSWER_KEY[q.id], `${q.id}: problem and answer exist`);
      ok(q.topics.length > 0 && q.topics.every((t) => B.TOPICS.some((x) => x.id === t)), `${q.id}: topics are Gleam topics`);
      ok(['easy', 'medium', 'hard'].includes(q.difficulty), `${q.id}: difficulty is set`);
    }
    for (const id of Object.keys(B.PROBLEMS)) ok(!!B.SOURCES[B.PROBLEMS[id].exam], `${id}: source exists`);
  } finally {
    h.cleanup();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
