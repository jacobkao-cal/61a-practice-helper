// Phase 8: Fall 2024 and Spring 2024 Midterm 2 added to the bank. Checks the data against the PDFs' structure,
// then the new exams through Full Past Exam Mode, grading, review, topic-based practice, the exam figure,
// the saved-filter migration and Run Code with a verified suite. Existing 2025 data and attempts must not change.
// Needs internet access the first time (Pyodide is loaded from the jsDelivr CDN) for the Run Code check.
const puppeteer = require('puppeteer-core');
const path = require('path');
const { APP_URL, CHROME } = require('./config');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

global.window = {};
require(path.join(__dirname, '..', '..', 'app', 'data', 'questions.js'));
require(path.join(__dirname, '..', '..', 'app', 'data', 'test_suites.js'));
const B = window.CS61A_BANK;
const SUITES = window.CS61A_TEST_SUITES.suites;
const partsOf = (pid) => B.QUESTIONS.filter((q) => q.problem === pid);
const examPids = (e) => Object.keys(B.PROBLEMS).filter((pid) => B.PROBLEMS[pid].exam === e);
const examIds = (e) => examPids(e).flatMap((pid) => partsOf(pid).map((q) => q.id));
const official = (q) => {
  const k = B.ANSWER_KEY[q.id];
  if (q.type === 'single_choice') return k.correct;
  if (q.type === 'multi_select') return [...k.correct];
  return k.accepted[0];
};

// ── static: structure taken from the PDFs ──
// [question number, subparts, points] per top-level question, in exam order.
const PDF = {
  fa24: [['1', 5, 5], ['2', 3, 5], ['3', 3, 6], ['4', 12, 18], ['5', 7, 11], ['6', 1, 0]],
  sp24: [['1', 4, 7], ['2', 3, 6], ['3', 4, 8], ['4', 19, 29]],
};
for (const [e, rows] of Object.entries(PDF)) {
  const pids = examPids(e);
  const byQ = (n) => pids.filter((pid) => B.PROBLEMS[pid].number.match(/^\d+/)[0] === n);
  const seen = [...new Set(pids.map((pid) => B.PROBLEMS[pid].number.match(/^\d+/)[0]))];
  ok(JSON.stringify(seen) === JSON.stringify(rows.map((r) => r[0])), `${e}: question groups ${seen.join(', ')} in exam order`);
  for (const [n, subparts, pts] of rows) {
    const qs = byQ(n).flatMap(partsOf);
    const got = qs.reduce((t, q) => t + q.points, 0);
    ok(qs.length === subparts && got === pts && byQ(n).reduce((t, pid) => t + B.PROBLEMS[pid].points, 0) === pts, `${e} Q${n}: ${qs.length} subparts, ${got} points (PDF: ${subparts}, ${pts})`);
  }
}
ok(B.QUESTIONS.length === new Set(B.QUESTIONS.map((q) => q.id)).size, `all ${B.QUESTIONS.length} question ids are unique`);
ok(['fa25', 'sp25'].every((e) => examIds(e).length === { fa25: 33, sp25: 29 }[e]), '2025 exams unchanged in size (33 and 29 subparts)');
ok(B.QUESTIONS.filter((q) => /^(fa24|sp24)/.test(q.id)).every((q) => B.ANSWER_KEY[q.id]), 'every 2024 subpart has an official answer');
ok(['fa24-1', 'fa24-2', 'sp24-1', 'sp24-2'].every((pid) => !SUITES.some((t) => t.problem === pid)), 'no test suites for 2024 What Would Python Display / environment diagram questions');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const st = async () => { await wait(300); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const seed = async (obj) => {
    await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
    await page.goto(APP_URL); await wait(150);
  };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(60); };
  const has = async (sel) => !!(await page.$(sel));
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
  await page.goto(APP_URL);

  // ── saved practice filter: "all of the old exams" picks up the new ones; a narrowed filter is kept ──
  const prefs = { mode: 'practice', topics: [], difficulties: ['easy', 'medium', 'hard'], types: ['single_choice', 'multi_select', 'short_answer', 'code'], size: 'all', timerOn: false, minutes: 25 };
  await seed({ prefs: { ...prefs, exams: ['fa25', 'sp25'] } });
  await page.evaluate(() => { Storage.prototype.setItem = Object.getPrototypeOf(localStorage).setItem; });
  await click('[data-action="enter"]');
  let S = await st();
  ok(JSON.stringify(S.prefs.exams) === JSON.stringify(['fa25', 'sp25', 'fa24', 'sp24']), `saved "both midterms" filter now includes the 2024 exams (${S.prefs.exams})`);
  await seed({ prefs: { ...prefs, exams: ['fa25'] } });
  await click('[data-action="enter"]');
  S = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  await page.goto(APP_URL); await wait(150);
  S = await st();
  ok(JSON.stringify(S.prefs.exams) === JSON.stringify(['fa25']), 'a filter narrowed to one exam is kept');

  // ── topic-based practice shows the new questions ──
  await seed({ prefs: { ...prefs, exams: ['fa24', 'sp24'], topics: ['trees'], examsKnown: Object.keys(B.EXAMS) } });
  await click('[data-action="enter"]'); await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  S = await st();
  const trees24 = B.QUESTIONS.filter((q) => /^(fa24|sp24)/.test(q.id) && q.topics.includes('trees')).map((q) => q.id);
  ok(S.session.ids.length > 0 && S.session.ids.every((id) => /^(fa24|sp24)/.test(id)) && trees24.every((id) => S.session.ids.includes(id)),
    `Trees practice from 2024 exams: ${S.session.ids.length} parts, all 2024, every Trees-tagged part included`);

  // ── Full Past Exam Mode for both semesters: start, answer officially, submit, review ──
  const old = { id: 'old-fa25', mode: 'exam', submitted: true, kind: 'full', examId: 'fa25', title: 'Fall 2025 Midterm 2', ids: ['fa25-1a'], groups: [{ pid: 'fa25-1', ids: ['fa25-1a'] }], index: 0,
    answers: { 'fa25-1a': 3 }, graded: { 'fa25-1a': 'correct' }, score: { v: 2, earned: 1, possible: 1, auto: 1, counts: { correct: 1, incorrect: 0, staff: 0, skipped: 0 }, staff: 0, unknown: 0, partial: false }, notes: {}, annotations: {}, eliminated: {}, startedAt: 1, finishedAt: 2 };
  for (const [e, label, total] of [['fa24', 'Fall 2024 Midterm 2', 45], ['sp24', 'Spring 2024 Midterm 2', 50]]) {
    await seed({ prefs: { mode: 'exam', exams: Object.keys(B.EXAMS), examsKnown: Object.keys(B.EXAMS) }, examPrefs: { kind: 'full', examId: e, topics: [], picked: [], timerOn: false, minutes: 120 }, attempts: [old] });
    await click('[data-action="enter"]');
    const row = await page.$eval(`#exam-id-${e}`, (i) => i.closest('label').textContent.replace(/\s+/g, ' ').trim());
    ok(new RegExp(`${total} points`).test(row) && /Complete/.test(row), `${e}: listed as “${row}”`);
    await click(`#exam-id-${e}`); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
    S = await st();
    ok(JSON.stringify(S.exam.groups.map((g) => g.pid)) === JSON.stringify(examPids(e)) && JSON.stringify(S.exam.ids) === JSON.stringify(examIds(e)), `${e}: full exam has all ${examIds(e).length} subparts in exam order`);
    ok(new RegExp(label).test(await text('.set-name')), `${e}: header shows “${label}”`);
    if (e === 'fa24') {
      await click('#nav-toggle'); await click('#nav-fa24-2');
      await page.waitForFunction(() => { const i = document.querySelector('.exam-figure img'); return i && i.complete && i.naturalWidth > 0; }, { timeout: 8000 });
      ok(/environment diagram/.test(await page.$eval('.exam-figure img', (i) => i.alt)), 'fa24 Q2: the exam’s diagram image loads, with alt text');
    }
    ok(!(await has('#run-btn')), `${e}: no Run Code during the live exam`);
    // answer every part with the official answer, then submit
    const answers = Object.fromEntries(examIds(e).map((id) => [id, official(B.QUESTIONS.find((q) => q.id === id))]));
    await page.evaluate((k, a) => { const s = JSON.parse(localStorage.getItem(k)); s.exam.answers = a; localStorage.setItem(k, JSON.stringify(s)); Storage.prototype.setItem = function () {}; }, KEY, answers);
    await page.goto(APP_URL); // an exam in progress reopens directly on reload
    await page.waitForSelector('#pane-right .part');
    ok(Object.keys((await st()).exam.answers).length === examIds(e).length && new RegExp(label).test(await text('.set-name')), `${e}: exam in progress restored after reload with all answers`);
    await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
    S = await st();
    const A = S.attempts[S.attempts.length - 1];
    const aplus = examIds(e).filter((id) => B.QUESTIONS.find((q) => q.id === id).type === 'code');
    ok(A.score.earned === total && A.score.possible === total && A.score.counts.incorrect === 0 && aplus.every((id) => A.graded[id] === 'staff'),
      `${e}: official answers score ${A.score.earned}/${A.score.possible}; A+ part graded by course staff, not counted as wrong`);
    const snap = (a) => JSON.stringify([a.id, a.ids, a.answers, a.graded, a.score, a.finishedAt]);
    ok(S.attempts.length === 2 && snap(S.attempts[0]) === snap(old), `${e}: earlier Fall 2025 attempt in Exam History unchanged`);
    await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
    const first = examIds(e)[0];
    ok(await has(`#rv-${first}`) && (await text(`#rv-${first}`)).includes(String(B.ANSWER_KEY[first].accepted ? B.ANSWER_KEY[first].accepted[0] : '')), `${e}: review shows the official answer for ${first}`);
  }

  // ── Run Code with a verified 2024 suite (sp24 4(d), where the exam's missing colon was added) ──
  const pids = ['sp24-4d'];
  const ids = partsOf('sp24-4d').map((q) => q.id);
  await seed({ prefs: { mode: 'practice', timerOn: false, exams: Object.keys(B.EXAMS), examsKnown: Object.keys(B.EXAMS) },
    session: { ids, index: 0, title: 'Run', answers: Object.fromEntries(ids.map((id) => [id, official(B.QUESTIONS.find((q) => q.id === id))])), timer: null, startedAt: Date.now(), finished: false } });
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  ok((await text('#run-suite')) === `Includes ${SUITES.find((t) => t.problem === pids[0]).cases.length} verified tests`, `sp24-4d shows “${await text('#run-suite')}”`);
  await click('#run-btn');
  await page.waitForFunction(() => { const s = document.querySelector('#run-status'); return s && s.textContent && !/Loading|Running/.test(s.textContent) && !document.querySelector('#run-btn').disabled; }, { timeout: 120000 });
  const summary = await text('#tests-summary');
  ok(/^Passed (\d+)\/\1 tests!$/.test(summary), `sp24-4d with the official answers → “${summary}”`);

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
