// Phase 6C: the verified test bank, checked in the browser (Pyodide), plus the student flow on real questions.
// tests/verify_test_bank.js validates every suite against many correct and wrong versions in local Python; this
// test confirms the browser runtime agrees: each suite passes with the official solution and catches a wrong one.
// Needs internet access the first time (Pyodide is loaded from the jsDelivr CDN).
const puppeteer = require('puppeteer-core');
const path = require('path');
const { APP_URL, CHROME } = require('./config');
const VARIANTS = require('../test_bank/variants.js');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

global.window = {};
require(path.join(__dirname, '..', '..', 'app', 'data', 'questions.js'));
require(path.join(__dirname, '..', '..', 'app', 'data', 'test_suites.js'));
const B = window.CS61A_BANK;
const SUITES = window.CS61A_TEST_SUITES.suites;
const parts = (pid) => B.QUESTIONS.filter((q) => q.problem === pid && q.blank);
// The stored answer the app keeps for a part when it's answered with the official answer.
const officialStored = (q) => {
  const k = B.ANSWER_KEY[q.id];
  if (q.type === 'single_choice') return typeof k.correct === 'number' ? k.correct : k.correct[0];
  if (q.type === 'multi_select') return [...k.correct];
  return k.accepted[0];
};
const blankText = (q, stored) => (q.type === 'single_choice' ? q.choices[stored] : q.type === 'multi_select' ? stored.map((i) => q.choices[i]).join(' | ') : stored);
function fill(pid, over) {
  const t = Object.fromEntries(parts(pid).map((q) => [q.blank, blankText(q, officialStored(q))]));
  Object.assign(t, over || {});
  return B.PROBLEMS[pid].code.split('\n').map((line) => line.replace(/⟦([^⟧]+)⟧/g, (m, name, col) => t[name].split('\n').map((l, i) => (i ? ' '.repeat(col) + l : l)).join('\n'))).join('\n');
}
const officialAnswers = (pids) => Object.fromEntries(pids.flatMap((pid) => parts(pid).map((q) => [q.id, officialStored(q)])));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const seed = async (obj) => {
    await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
    await page.goto(APP_URL); await wait(150);
  };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(60); };
  const has = async (sel) => !!(await page.$(sel));
  const finished = () => page.waitForFunction(() => {
    const s = document.querySelector('#run-status');
    return s && s.textContent && !/Loading|Running/.test(s.textContent) && !document.querySelector('#run-btn').disabled;
  }, { timeout: 120000 });
  const result = () => page.evaluate(() => ({
    status: document.querySelector('#run-status').textContent,
    summary: (document.querySelector('#tests-summary') || {}).textContent || null,
    suite: (document.querySelector('#run-suite') || {}).textContent || null,
    notes: [...document.querySelectorAll('#run-tests .tests-note')].map((p) => p.textContent),
    origins: [...document.querySelectorAll('#run-tests .case-origin')].map((s) => s.textContent),
    states: [...document.querySelectorAll('#run-tests .case-state')].map((s) => s.textContent),
    panel: (document.querySelector('.run-slot') || {}).textContent || '',
  }));
  const run = async () => { await click('#run-btn'); await finished(); return result(); };

  // ── every shipped suite, in the browser's Python ──
  await page.goto(APP_URL);
  ok(await page.evaluate(() => window.CS61A_TEST_SUITES.suites.length) === 15, 'the app ships 15 verified suites');
  for (const t of SUITES) {
    const tests = { setup: t.setup || '', cases: t.cases.map((c) => ({ input: c.input, origin: c.origin })) };
    const good = await page.evaluate((code, tests) => window.CS61A_RUNNER.run(code, { tests }), fill(t.problem), tests);
    const wrong = await page.evaluate((code, tests) => window.CS61A_RUNNER.run(code, { tests }), fill(t.problem, VARIANTS[t.problem].wrong[0] || { [parts(t.problem)[0].blank]: 'None' }), tests);
    const caught = wrong.status !== 'ok' || wrong.tests.passed < wrong.tests.total;
    ok(good.status === 'ok' && good.tests.passed === good.tests.total && good.tests.total === t.cases.length && caught,
      `${t.id}: official solution passes ${good.tests && good.tests.passed}/${t.cases.length} in Pyodide; a wrong answer is caught`);
  }

  // ── student flow (Practice): official answers → all pass, with setup note and case origins ──
  const pids = ['fa25-4', 'sp25-5b', 'fa25-1'];
  const ids = pids.flatMap((pid) => B.QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id));
  const practice = (answers) => seed({ prefs: { mode: 'practice', timerOn: false }, session: { ids, index: 0, title: 'Test bank', answers, timer: null, startedAt: Date.now(), finished: false } });
  await practice(officialAnswers(['fa25-4', 'sp25-5b']));
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  let r = await result();
  ok(r.suite === 'Includes 5 verified tests', `fa25-4 shows “${r.suite}”`);
  r = await run();
  ok(r.summary === 'Passed 5/5 tests!', `fa25-4 with the official answers → “${r.summary}”`);
  ok(r.notes.some((n) => /course’s Link class/.test(n)), 'the Link setup is disclosed under the results');
  ok(r.origins.filter((o) => o === 'From the exam').length === 2 && r.origins.filter((o) => o === 'Added').length === 3, `cases are labelled by origin (${r.origins.join(', ')})`);
  ok(!/points?|pts|%|score:/i.test(r.panel.replace(/never changes your answers or scores/, '')), 'no points, percentages or scores');

  // multiple-choice blanks are what runs: sp25-5b passes, then fails with a wrong choice
  const q5 = B.QUESTIONS.find((q) => q.id === 'sp25-5d');
  await click('[data-action="next"]');
  await page.waitForFunction(() => /ways/.test((document.querySelector('.CodeMirror') || {}).textContent || ''));
  r = await run();
  ok(r.summary === 'Passed 4/4 tests!', `sp25-5b (blanks filled by multiple choice) → “${r.summary}”`);
  const wrongAnswers = officialAnswers(['fa25-4', 'sp25-5b']);
  wrongAnswers['sp25-5d'] = q5.choices.indexOf('left');
  await practice(wrongAnswers);
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  await click('[data-action="next"]');
  await page.waitForFunction(() => /ways/.test((document.querySelector('.CodeMirror') || {}).textContent || ''));
  r = await run();
  ok(/^Passed [0-3]\/4 tests$/.test(r.summary || '') && r.states.includes('Failed'), `a wrong choice in blank (d) → “${r.summary}”`);
  const before = await st();
  ok(JSON.stringify(before.session.answers) === JSON.stringify(wrongAnswers), 'running tests does not change the saved answers');

  // What Would Python Display: Run Code works, never a test summary
  await click('[data-action="next"]');
  r = await result();
  ok(r.suite === null, 'fa25-1 (What Would Python Display) has no suite');
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.setValue("print('wwpd')"));
  r = await run();
  ok(r.summary === null && /wwpd/.test(r.panel), 'fa25-1: Console Output only');

  // ── Exam: nothing during the live exam; tests run in the review and change nothing ──
  await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['fa25-4'], timerOn: false, minutes: 120 } });
  await click('[data-action="enter"]'); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await has('#run-btn')) && !(await has('#run-suite')), 'live exam: no Run Code and no mention of tests');
  for (const b of 'abcdef') await page.$eval(`#ta-fa25-4${b}`, (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, B.ANSWER_KEY[`fa25-4${b}`].accepted[0]);
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  const snap = (S) => JSON.stringify(S.attempts.map((a) => ({ answers: a.answers, graded: a.graded, score: a.score, notes: a.notes })));
  const pre = await st();
  await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
  r = await run();
  ok(r.summary === 'Passed 5/5 tests!', `review: “${r.summary}”`);
  await page.$eval('#ta-fa25-4a', (t) => { t.value = 's'; t.dispatchEvent(new Event('input', { bubbles: true })); });
  r = await run();
  ok(/^Passed [0-4]\/5 tests$/.test(r.summary || ''), `review edit to a wrong answer → “${r.summary}”`);
  const post = await st();
  ok(snap(post) === snap(pre), 'submitted answers, grades and score unchanged');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
