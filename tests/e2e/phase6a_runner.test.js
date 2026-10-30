// Phase 6A: in-browser Python runner (Pyodide in a Web Worker), Run Code button and Console Output.
// Needs internet access the first time (Pyodide is loaded from the jsDelivr CDN).
const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/invalid\.example/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  // These checks cover console-only behavior (6A), so the verified suites (6C) are removed for this test.
  await page.evaluateOnNewDocument(() => {
    let v;
    Object.defineProperty(window, 'CS61A_TEST_SUITES', { configurable: true, get: () => v, set: (x) => { v = x; v.suites = []; } });
  });
  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const seed = async (obj) => {
    await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
    await page.goto(APP_URL); await wait(150);
  };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(60); };
  const has = async (sel) => !!(await page.$(sel));
  const setCode = (src) => page.evaluate((src) => document.querySelector('.CodeMirror').CodeMirror.setValue(src), src);
  const appendCode = (src) => page.evaluate((src) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.replaceRange(src, { line: cm.lastLine() + 1, ch: 0 }); }, '\n' + src);
  const finished = () => page.waitForFunction(() => {
    const s = document.querySelector('#run-status');
    return s && s.textContent && !/Loading|Running/.test(s.textContent) && !document.querySelector('#run-btn').disabled;
  }, { timeout: 120000 });
  const run = async (src) => { if (src !== undefined) await setCode(src); await click('#run-btn'); await finished(); return result(); };
  const result = () => page.evaluate(() => ({
    status: document.querySelector('#run-status').textContent,
    out: (document.querySelector('#run-console .run-out') || {}).textContent || null,
    err: (document.querySelector('#run-console .run-err') || {}).textContent || null,
    empty: !!document.querySelector('#run-console .run-empty'),
    msg: (document.querySelector('#run-console .run-msg') || {}).textContent || null,
    console: (document.querySelector('#run-console') || {}).textContent || '',
  }));

  await page.goto(APP_URL);
  const B = await page.evaluate(() => window.CS61A_BANK);
  const practice = (pids) => seed({ prefs: { mode: 'practice', timerOn: false }, session: { ids: pids.flatMap((pid) => B.QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id)), index: 0, title: 'Runner test', answers: {}, timer: null, startedAt: Date.now(), finished: false } });

  // ── 11. load failure is recoverable (before Python has ever loaded in this page) ──
  await practice(['fa25-4', 'fa25-3']);
  await click('[data-action="enter"]'); await click('.resume [data-action="resume"]');
  ok(await page.$$eval('[data-action="run-code"]', (b) => b.length) === 1 && await page.$eval('#run-btn', (b) => b.textContent.trim()) === '▶ Run Code', 'exactly one "Run Code" button, under the scratch editor');
  await page.evaluate(() => { window.__realURL = window.CS61A_RUNNER.config.indexURL; window.CS61A_RUNNER.config.indexURL = 'https://invalid.example/pyodide/'; });
  let r = await run('print("hi")');
  ok(r.status === 'Couldn’t load Python' && /Check your internet connection/.test(r.msg), `11. load failure → "${r.status}": recoverable message`);
  await page.evaluate(() => { window.CS61A_RUNNER.config.indexURL = window.__realURL; });

  // ── 1–5 basic execution ──
  await click('#run-btn');
  ok(/Loading Python/.test(await page.$eval('#run-status', (s) => s.textContent)), 'first run shows "Loading Python…"');
  await finished();
  r = await result();
  ok(r.out === 'hi\n', `11b. after the failure, the next run loads Python and works (${JSON.stringify(r.out)})`);
  r = await run("print('hello')");
  ok(r.out === 'hello\n' && /^Completed/.test(r.status), `1. print('hello') → ${JSON.stringify(r.out)} (${r.status})`);
  r = await run("print(1)\nprint('two')\nfor i in range(3):\n    print(i * 10)");
  ok(r.out === '1\ntwo\n0\n10\n20\n', '2. multiple prints keep their order');
  r = await run('def f(x):\n    return x * 2');
  ok(r.empty && !r.err && /^Completed/.test(r.status), '3. a definition with no output shows "No output" (not an error)');
  r = await run('def f(:\n    pass');
  ok(r.status.startsWith('Error') && /SyntaxError/.test(r.err) && /line 1/.test(r.err), `4. syntax error is reported: ${JSON.stringify((r.err || '').split('\n').slice(-2).join(' '))}`);
  r = await run("print('before')\nx = 1 / 0\nprint('after')");
  ok(r.out === 'before\n' && /ZeroDivisionError/.test(r.err) && /line 2/.test(r.err) && !/run_student|exec\(|harness/.test(r.err), '5. output printed before an exception is kept; traceback shows only the student’s code');
  r = await run('def g(n):\n    yield n\n    yield from g(n - 1) if n else ()\nprint(list(g(3)))\ndef fact(n):\n    return 1 if n == 0 else n * fact(n - 1)\nprint(fact(20))');
  ok(r.out === '[3, 2, 1, 0]\n2432902008176640000\n', 'generators and recursion work');
  r = await run('def r(n):\n    return r(n + 1)\nr(0)');
  ok(/RecursionError/.test(r.err || '') || /restarted/.test(r.msg || ''), `unbounded recursion fails clearly (${r.status})`);
  r = await run("x = input('name? ')");
  ok(/EOFError/.test(r.err || '') && /input\(\) is not available/.test(r.err), 'input() fails clearly instead of hanging');
  r = await run("print('x' * 30000)");
  ok(r.out.length === 20000 && /cut off after 20,000 characters/.test(r.msg), 'output capped at 20,000 characters with a truncation notice');

  // ── 10. runs don't share globals ──
  await run('secret = 42\nimport math\nmath_ok = True');
  r = await run('print(secret)');
  ok(/NameError: name 'secret' is not defined/.test(r.err || ''), '10. a name defined in one run is not visible in the next');

  // ── 6. infinite loop → real timeout, worker restarted, next run works ──
  const t0 = Date.now();
  r = await run('while True:\n    pass');
  const took = Date.now() - t0;
  ok(r.status === 'Timed out' && /Stopped after 5 seconds/.test(r.msg) && took < 9000, `6. infinite loop stopped after ${(took / 1000).toFixed(1)} s`);
  ok(await page.evaluate(() => !window.CS61A_RUNNER.ready), 'the stuck worker was terminated');
  r = await run("print('recovered')");
  ok(r.out === 'recovered\n', '6b. next run works in a fresh worker');

  // ── 7. long-running script doesn't freeze the page ──
  await setCode("import time\nt = time.time()\nwhile time.time() - t < 2.5:\n    pass\nprint('slow done')");
  await click('#run-btn');
  const ticks = await page.evaluate(() => new Promise((res) => { let n = 0; const id = setInterval(() => n++, 50); setTimeout(() => { clearInterval(id); res(n); }, 1500); }));
  await click('#nav-toggle'); const navOpened = await has('#navigator'); await page.keyboard.press('Escape');
  ok(ticks >= 20 && navOpened, `7. page stays responsive while Python runs (${ticks} timer ticks in 1.5 s; navigator opened)`);
  await finished();
  ok((await result()).out === 'slow done\n', 'long run completes');

  // ── uses the student's current answers in the blanks; no guessed Link definitions ──
  await setCode(B.PROBLEMS['fa25-4'].code + "\nprint(exclude([1, 2, 3, 2], 2))");
  r = await run();
  ok(/SyntaxError/.test(r.err || '') && /___\(a\)___|___\(b\)___/.test(r.err), 'unanswered blanks stay ___(x)___ and fail clearly');
  const key = B.ANSWER_KEY;
  for (const b of 'abcdef') await page.$eval(`#ta-fa25-4${b}`, (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, key[`fa25-4${b}`].accepted[0]);
  r = await run();
  ok(r.out === '[1, 3]\n', `answers typed on the right are what runs in the blanks (${JSON.stringify(r.out)})`);
  await appendCode('exclude_link(Link(1), 1)');
  r = await run();
  ok(/NameError: name 'Link' is not defined/.test(r.err || ''), 'Link is not silently injected (clear NameError)');
  const unsaved = "print('unsaved edit')";
  await setCode(unsaved); // edits not yet saved (saveSoon pending) still run
  ok((await run()).out === 'unsaved edit\n', 'runs the live editor contents, including unsaved edits');

  // ── 8. switching questions mid-run never shows stale output ──
  await setCode("import time\nt = time.time()\nwhile time.time() - t < 2:\n    pass\nprint('from Q1')");
  await click('#run-btn');
  await click('[data-action="next"]');
  const q2 = await page.evaluate(() => ({ console: document.querySelector('#run-console').hidden, status: document.querySelector('#run-status').textContent, btn: document.querySelector('#run-btn').disabled }));
  ok(q2.console && q2.status === '' && q2.btn, '8. Q2 shows no Q1 status/output; its Run button waits for the other run');
  await page.waitForFunction(() => !document.querySelector('#run-btn').disabled, { timeout: 20000 });
  ok(await page.$eval('#run-console', (c) => c.hidden) && await page.$eval('#run-status', (s) => s.textContent) === '', 'Q1’s result does not appear on Q2 when it finishes');
  await click('[data-action="prev"]');
  ok((await result()).out === 'from Q1\n', 'returning to Q1 shows Q1’s own result');
  // a new practice set never shows the previous set's output
  await click('[data-action="home"]'); await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  ok(await page.$eval('#run-console', (c) => c.hidden), 'a new practice set starts with an empty console');

  // ── exam mode: no runner during a live exam (no feedback before submission) ──
  await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['fa25-4'], timerOn: false, minutes: 120 } });
  await click('[data-action="enter"]'); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await has('#run-btn')) && await has('.run-slot[hidden]'), 'live exam: no Run Code (matches “no feedback until submit”)');
  for (const b of 'abcdef') await page.$eval(`#ta-fa25-4${b}`, (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, key[`fa25-4${b}`].accepted[0]);
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  const before = await st();
  const snap = (S) => JSON.stringify(S.attempts.map((a) => ({ answers: a.answers, graded: a.graded, score: a.score, notes: a.notes })));
  // ── 9. review mode: runs the review workspace, never changes the attempt ──
  await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
  ok(await has('#run-btn'), 'Run Code available in the editable review');
  await appendCode('print(exclude([5, 6, 5], 5))');
  r = await run();
  ok(r.out === '[6]\n', `9. review run uses the review workspace’s answers (${JSON.stringify(r.out)})`);
  const after = await st();
  ok(snap(after) === snap(before), '9. submitted answers, grades, score and notes unchanged by running');
  ok(!JSON.stringify(after).includes('[6]') && !JSON.stringify(after).includes('run-'), 'run output is not stored anywhere');

  // ── 14. no test counts / scores / doctest UI ──
  const panel = await page.$eval('.run-slot', (s) => s.textContent);
  ok(!/Passed \d|\d+\s*\/\s*\d+ tests|tests?!|points?|pts|%|Run Tests|Save & Grade/i.test(panel), '14. runner shows no test counts, points or scores');
  ok(await page.$$eval('button', (bs) => bs.filter((b) => /run/i.test(b.textContent)).length) === 1, 'still a single run button on the page');

  // ── 12. keyboard + small screens ──
  await page.focus('#run-btn'); await setCode("print('kbd')"); await page.focus('#run-btn'); await page.keyboard.press('Enter'); await finished();
  ok((await result()).out === 'kbd\n', '12. Run Code works from the keyboard (Enter)');
  ok(await page.$eval('#run-status', (s) => s.getAttribute('role') === 'status' && s.getAttribute('aria-live') === 'polite'), 'status is announced to screen readers');
  await page.setViewport({ width: 375, height: 740 }); await wait(200);
  const m = await page.evaluate(() => { const b = document.querySelector('#run-btn').getBoundingClientRect(); return { fits: document.documentElement.scrollWidth <= innerWidth, w: b.width, right: b.right }; });
  ok(m.fits && m.w > 60 && m.right <= 375, '12. mobile: Run Code and console fit without horizontal scrolling');
  await page.setViewport({ width: 1400, height: 900 });

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
