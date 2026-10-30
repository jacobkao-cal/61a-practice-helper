// Phase 6B: verified doctest engine and PrairieLearn-style Test Results behind the single Run Code button.
// The shipped suite registry is empty until Phase 6C, so this test adds FIXTURE suites (test-only, never shipped)
// through a page-load hook. Needs internet access the first time (Pyodide is loaded from the jsDelivr CDN).
const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Fixture suites. fa25-4 exercises the exam's own `exclude` function; fa25-3 is deliberately unverified.
const FIXTURES = [
  {
    id: 'fixture-fa25-4', problem: 'fa25-4', verified: true,
    verification: { method: 'test fixture', reviewedBy: 'e2e test', date: '2026-10-30' },
    provenance: 'test fixture only',
    setup: '',
    cases: [
      { name: 'Case 1', input: '>>> exclude([1, 2, 3, 2], 2)\n[1, 3]' },
      { name: 'Case 2', input: '>>> exclude([], 5)\n[]\n>>> exclude([7, 7], 7)\n[]' },
      { name: 'Case 3', input: '>>> exclude([4, 5, 6], 9)\n[4, 5, 6]' },
    ],
  },
  { id: 'fixture-fa25-3', problem: 'fa25-3', verified: false, verification: null, cases: [{ input: '>>> 1\n1' }] },
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());

  // Shipped registry: verified suites only, none yet (6C adds them). Checked before the fixture hook is installed.
  await page.goto(APP_URL);
  const shipped = await page.evaluate(() => window.CS61A_TEST_SUITES);
  ok(shipped && Array.isArray(shipped.suites) && shipped.suites.length === 0, 'shipped registry has no suites (no fabricated test bank before 6C)');
  const B = await page.evaluate(() => window.CS61A_BANK);
  const key = B.ANSWER_KEY;

  // no suite → Console Output only, no summary
  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const seed = async (obj) => {
    await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
    await page.goto(APP_URL); await wait(150);
  };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(60); };
  const has = async (sel) => !!(await page.$(sel));
  const setCode = (src) => page.evaluate((src) => document.querySelector('.CodeMirror').CodeMirror.setValue(src), src);
  const finished = () => page.waitForFunction(() => {
    const s = document.querySelector('#run-status');
    return s && s.textContent && !/Loading|Running/.test(s.textContent) && !document.querySelector('#run-btn').disabled;
  }, { timeout: 120000 });
  const result = () => page.evaluate(() => ({
    status: document.querySelector('#run-status').textContent,
    out: (document.querySelector('#run-console .run-out') || {}).textContent || null,
    err: (document.querySelector('#run-console > .run-err') || {}).textContent || null,
    summary: (document.querySelector('#tests-summary') || {}).textContent || null,
    why: [...document.querySelectorAll('#run-tests > .run-msg')].map((p) => p.textContent).join(' '),
    cases: [...document.querySelectorAll('#run-tests .case')].map((d) => ({ state: d.querySelector('.case-state').textContent, text: d.querySelector('.case-body').textContent })),
    panel: (document.querySelector('.run-slot') || {}).textContent || '',
  }));
  const run = async (src) => { if (src !== undefined) await setCode(src); await click('#run-btn'); await finished(); return result(); };
  const fill = async (vals) => { for (const b of 'abcdef') await page.$eval(`#ta-fa25-4${b}`, (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, vals[b]); };
  const right = Object.fromEntries([...'abcdef'].map((b) => [b, key[`fa25-4${b}`].accepted[0]]));
  const practice = (pids) => seed({ prefs: { mode: 'practice', timerOn: false }, session: { ids: pids.flatMap((pid) => B.QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id)), index: 0, title: 'Tests', answers: {}, timer: null, startedAt: Date.now(), finished: false } });

  await practice(['fa25-4']);
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  let r = await run("print('plain')");
  ok(r.out === 'plain\n' && r.summary === null && !(await has('#run-suite')) && !/Passed|tests?!|Test Results/.test(r.panel), 'no verified suite: Console Output only, no test summary');

  // install the fixture suites for the rest of the test
  await page.evaluateOnNewDocument((fx) => {
    let v;
    Object.defineProperty(window, 'CS61A_TEST_SUITES', { configurable: true, get: () => v, set: (x) => { v = x; v.suites = v.suites.concat(fx); } });
  }, FIXTURES);
  await practice(['fa25-4', 'fa25-3']);
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  ok(await page.$$eval('[data-action="run-code"]', (b) => b.length) === 1 && !(await page.$$eval('button', (bs) => bs.some((b) => /Run Tests|Save & Grade/.test(b.textContent)))), 'still exactly one Run Code button; no Run Tests / Save & Grade');
  ok(await page.$eval('#run-suite', (s) => s.textContent) === 'Includes 3 verified tests', 'verified question says “Includes 3 verified tests”');

  // all correct
  await setCode(B.PROBLEMS['fa25-4'].code + "\nprint('module ran')");
  await fill(right);
  r = await run();
  ok(r.out === 'module ran\n' && r.summary === 'Passed 3/3 tests!' && r.cases.every((c) => c.state === 'Passed'), `correct answers → console output + “${r.summary}”`);
  await wait(100);
  ok(await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].some((e) => /Run finished: Completed\. Passed 3 of 3 tests\./.test(e.textContent))), 'result (with test counts) is announced to screen readers');
  // Expand a case with the keyboard
  await page.focus('#run-tests .case[data-case="0"] > summary'); await page.keyboard.press('Enter');
  ok(await page.$eval('#run-tests .case[data-case="0"]', (d) => d.open), 'case panels expand from the keyboard');
  const c1 = await page.$eval('#run-tests .case[data-case="0"] .case-body', (b) => b.textContent);
  ok(/Input[\s\S]*>>> exclude\(\[1, 2, 3, 2\], 2\)[\s\S]*Expected[\s\S]*\[1, 3\][\s\S]*Actual[\s\S]*\[1, 3\]/.test(c1), 'case details show Input, Expected and Actual');

  // wrong code → some cases fail, with expected vs actual
  r = await run('def exclude(s, x):\n    return s');
  ok(r.summary === 'Passed 1/3 tests' && r.cases.map((c) => c.state).join() === 'Failed,Failed,Passed', `wrong code → “${r.summary}” (actual counts, no “!”)`);
  ok(/Expected[\s\S]*\[1, 3\][\s\S]*Actual[\s\S]*\[1, 2, 3, 2\]/.test(r.cases[0].text), 'failed case shows expected [1, 3] vs actual [1, 2, 3, 2]');

  // an exception inside a case
  r = await run('def exclude(s, x):\n    print("checking", x)\n    return [y for y in s if y != x] if s else 1 / 0');
  ok(r.cases[1].state === 'Failed' && /ZeroDivisionError/.test(r.cases[1].text) && /<your code>/.test(r.cases[1].text) && !/run_case|harness/.test(r.cases[1].text), 'an error inside a case is shown with a traceback of the student’s code');
  ok(/checking 2/.test(r.cases[0].text), 'per-case stdout is captured in Actual');

  // module-level error → tests not run, never counted as passed
  r = await run('def exclude(s, x):\n    return s\nraise ValueError("boom")');
  ok(r.summary === 'Tests not run' && /raised an error/.test(r.why) && r.cases.every((c) => c.state === 'Not run') && /ValueError/.test(r.err), 'module-level error → “Tests not run”, every case “Not run”');
  r = await run('def exclude(s, x:\n    return s');
  ok(r.summary === 'Tests not run' && /SyntaxError/.test(r.err), 'syntax error → tests not run, Console shows the error');

  // isolation between cases: each case gets a fresh namespace (mutable global state doesn't carry over)
  r = await run('seen = []\ndef exclude(s, x):\n    seen.append(x)\n    assert len(seen) <= 2, "state leaked between cases"\n    return [y for y in s if y != x]');
  ok(r.summary === 'Passed 3/3 tests!', `cases are isolated from each other (${r.summary})`);

  // a case that loops forever: real timeout, later cases "Not run", next run recovers
  const t0 = Date.now();
  r = await run('def exclude(s, x):\n    while not s:\n        pass\n    return [y for y in s if y != x]');
  ok(r.cases.map((c) => c.state).join() === 'Passed,Timed out,Not run' && r.summary === 'Passed 1/3 tests · 1 not run' && /restarted/.test(r.why), `infinite loop in Case 2 → “${r.summary}” (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  await setCode(B.PROBLEMS['fa25-4'].code); await fill(right);
  r = await run();
  ok(r.summary === 'Passed 3/3 tests!', 'after a timeout the next run works in a fresh worker');

  // no points / percentages
  const shown = await page.$eval('.run-slot', (slot) => { const c = slot.cloneNode(true); c.querySelectorAll('.tests-note').forEach((n) => n.remove()); return c.textContent; });
  ok(!/points?|pts|%|score/i.test(shown) && /never changes your answers or scores/.test(r.panel), 'no points, percentages or scores in the runner (only the “never changes your scores” note)');

  // unverified suite (fa25-3) is ignored → console only; and no stale results across questions
  await setCode("import time\nt = time.time()\nwhile time.time() - t < 1.5:\n    pass\ndef exclude(s, x):\n    return [y for y in s if y != x]");
  await click('#run-btn');
  await click('[data-action="next"]');
  await page.waitForFunction(() => !document.querySelector('#run-btn').disabled, { timeout: 60000 });
  ok(!(await has('#run-suite')) && !(await has('#run-tests')) && await page.$eval('#run-console', (c) => c.hidden), 'unverified suite is ignored, and Q1’s test results never show on Q2');
  r = await run('print(2)');
  ok(r.out === '2\n' && r.summary === null, 'unverified question: Console Output only');
  await click('[data-action="prev"]');
  ok((await result()).summary === 'Passed 3/3 tests!', 'back on Q1, its own test results are shown');

  // mobile
  await page.setViewport({ width: 375, height: 740 }); await wait(200);
  await page.$$eval('#run-tests details', (ds) => ds.forEach((d) => { d.open = true; }));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile: expanded test results fit without horizontal scrolling');
  await page.setViewport({ width: 1400, height: 900 });

  // exam: no runner/tests in the live exam; review runs tests and changes nothing
  await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['fa25-4'], timerOn: false, minutes: 120 } });
  await click('[data-action="enter"]'); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await has('#run-btn')) && !(await has('#run-suite')) && !/verified test|exclude\(\[1, 2, 3, 2\]/.test(await page.$eval('#app', (a) => a.textContent).catch(() => '')), 'live exam: no Run Code, and verified tests are not revealed');
  await fill(right);
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  const before = await st();
  const snap = (S) => JSON.stringify({ attempts: S.attempts.map((a) => ({ answers: a.answers, graded: a.graded, score: a.score, notes: a.notes })) });
  await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
  r = await run();
  ok(r.summary === 'Passed 3/3 tests!', 'review: Run Code runs the verified tests on the review workspace');
  r = await run('def exclude(s, x):\n    return s');
  ok(r.summary === 'Passed 1/3 tests', 'review: failing tests reported');
  const after = await st();
  ok(snap(after) === snap(before), 'submitted answers, grades, score and notes unchanged by running tests');
  ok(!/Passed \d|tests!/.test(JSON.stringify(after)), 'test results are not stored');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
