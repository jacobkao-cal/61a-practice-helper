// Gleam in Practice Mode: the Language picker (Python / Gleam / SQL coming soon), Gleam topics and sources, Gleam
// practice sets, the question screen (Gleam editor, no Python Tutor, Run Code with the Gleam compiler and the
// question's tests), the Practice Summary without walkthrough videos, and Exam Mode never showing Gleam questions.
// The Gleam compiler is vendored (app/vendor/gleam), so no internet connection is needed.
const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME, skipTour } = require('./config');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await skipTour(page);
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(60); };
  const has = async (sel) => !!(await page.$(sel));
  const text = (sel) => page.$eval(sel, (e) => e.textContent);
  const fresh = async () => {
    await page.goto(APP_URL);
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await page.goto(APP_URL);
    await click('[data-action="enter"]');
  };
  const openMenu = async (id) => { await click(`[data-action="menu"][data-id="${id}"]`); };
  const menuOptions = (pref) => page.$$eval(`.dd-panel input[data-pref="${pref}"]`, (els) => els.map((e) => ({ v: e.value, on: e.checked, disabled: e.disabled, label: e.closest('label').textContent.replace(/\s+/g, ' ').trim() })));
  const finished = () => page.waitForFunction(() => {
    const s = document.querySelector('#run-status');
    return s && s.textContent && !/Loading|Compiling|Running/.test(s.textContent) && !document.querySelector('#run-btn').disabled;
  }, { timeout: 120000 });
  const result = () => page.evaluate(() => ({
    status: document.querySelector('#run-status').textContent,
    out: (document.querySelector('#run-console .run-out') || {}).textContent || null,
    err: (document.querySelector('#run-console .run-err') || {}).textContent || null,
    msg: [...document.querySelectorAll('#run-console .run-msg')].map((m) => m.textContent).join(' '),
    tests: (document.querySelector('#tests-summary') || {}).textContent || null,
    origins: [...document.querySelectorAll('#run-tests .case-origin')].map((o) => o.textContent),
    failed: [...document.querySelectorAll('#run-tests .st-case-failed .case-body')].map((b) => b.textContent),
  }));
  const run = async () => { await click('#run-btn'); await finished(); return result(); };
  const typeAnswer = async (qid, value) => {
    await page.evaluate((qid, value) => {
      const t = document.querySelector(`textarea[data-qid="${qid}"]`);
      t.value = value;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }, qid, value);
    await wait(80);
  };
  // A practice set of the given problems, saved before the app loads (the app saves its own state on unload).
  const seedPractice = async (B, pids, answers, prefs) => {
    const ids = pids.flatMap((pid) => B.QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id));
    const store = { version: 5, prefs: Object.assign({ mode: 'practice', timerOn: false }, prefs || {}), session: { ids, index: 0, title: 'Gleam test', answers: answers || {}, timer: null, startedAt: Date.now(), finished: false } };
    await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(store));
    await page.goto(APP_URL); // the stub above lived in the old page only; this one saves normally
    await click('[data-action="enter"]');
    await click('.resume [data-action="resume"]');
    await page.waitForSelector('#problem-article');
  };

  await page.goto(APP_URL);
  const G = await page.evaluate(() => window.CS61A_GLEAM_BANK);
  const P = await page.evaluate(() => window.CS61A_BANK);
  ok(G && G.QUESTIONS.length > 0 && Object.keys(G.PROBLEMS).length > 0, `the Gleam bank loads (${Object.keys(G.PROBLEMS).length} problems, ${G.QUESTIONS.length} parts)`);

  // ── Language picker ──
  await fresh();
  const langs = await page.$$eval('.lang-row .lang-opt', (b) => b.map((x) => ({ t: x.textContent.trim(), checked: x.getAttribute('aria-checked'), disabled: x.disabled })));
  ok(langs.length === 3 && langs[0].t === 'Python' && langs[1].t === 'Gleam' && /^SQL\s*Coming soon$/.test(langs[2].t), `Language shows Python, Gleam and "SQL Coming soon" (${langs.map((l) => l.t).join(' | ')})`);
  ok(langs[0].checked === 'true' && langs[1].checked === 'false' && langs[2].disabled, 'Python is chosen by default; SQL is greyed out and can’t be chosen');
  await openMenu('topics');
  let opts = await menuOptions('topics');
  ok(opts.length > 0 && opts.every((o) => P.TOPICS.some((t) => t.id === o.v)) && !opts.some((o) => o.v.startsWith('gl-')), 'with Python, Topics lists only Python topics');
  await openMenu('topics');
  ok((await text('[data-id="exams"] .dd-label')) === 'Exams', 'with Python, the second menu is Exams');

  // a Python topic chosen before switching stays chosen for Python
  await openMenu('topics');
  await click('.dd-panel input[data-pref="topics"][value="recursion"]');
  await openMenu('topics'); // close it (a click outside an open menu only closes the menu)
  await click('#lang-gleam');
  ok((await page.$eval('#lang-gleam', (b) => b.getAttribute('aria-checked'))) === 'true', 'clicking Gleam chooses it');
  ok((await st()).prefs.lang === 'gleam', 'the language choice is saved');
  await openMenu('topics');
  opts = await menuOptions('glTopics');
  ok(opts.map((o) => o.v).join() === G.TOPICS.map((t) => t.id).join(), `with Gleam, Topics lists exactly the Gleam topics (${opts.map((o) => o.label).join(', ')})`);
  ok(!(await has('.dd-panel input[data-pref="topics"]')), 'no Python topic is listed for Gleam');
  ok(!G.TOPICS.some((t) => t.id === 'gl-efficiency') && !opts.some((o) => /Efficiency/.test(o.label)), 'there is no Efficiency topic for Gleam');
  const interp = opts.find((o) => o.v === 'gl-interpreters');
  ok(interp && interp.disabled && /soon/.test(interp.label), 'Interpreters has no questions yet, so it shows "soon" and is disabled');
  const lists = opts.find((o) => o.v === 'gl-lists');
  const listCount = new Set(G.QUESTIONS.filter((q) => q.topics.includes('gl-lists')).map((q) => q.problem)).size;
  ok(lists && lists.label.endsWith(String(listCount)), `topic counts are Gleam question groups (Lists & Pattern Matching: ${listCount})`);
  await click('.dd-panel input[data-pref="glTopics"][value="gl-dicts"]');
  await openMenu('exams');
  ok((await text('[data-id="exams"] .dd-label')) === 'Sources', 'with Gleam, the second menu is Sources');
  opts = await menuOptions('glSources');
  ok(opts.map((o) => o.v).join() === Object.keys(G.SOURCES).join() && opts.every((o) => o.on), `Sources lists the Gleam worksheets and lectures, all chosen (${opts.map((o) => o.label).join('; ')})`);
  await openMenu('exams');
  let s = await st();
  ok(s.prefs.topics.join() === 'recursion' && s.prefs.glTopics.join() === 'gl-dicts', 'each language keeps its own topic selection');
  await click('#lang-python');
  await openMenu('topics');
  opts = await menuOptions('topics');
  ok(opts.find((o) => o.v === 'recursion').on, 'switching back to Python shows its own selection again');
  await openMenu('topics');
  await page.reload(); await click('[data-action="enter"]');
  ok((await page.$eval('#lang-python', (b) => b.getAttribute('aria-checked'))) === 'true', 'the language is kept after a reload');

  // ── Starting a Gleam set ──
  await click('#lang-gleam');
  await openMenu('topics'); await click('[data-action="topics-none"]'); await openMenu('topics');
  const summary = await text('.start-row .summary');
  const gleamGroups = Object.keys(G.PROBLEMS).length;
  ok(summary.includes(`${gleamGroups} matching question`), `all ${gleamGroups} Gleam question groups match with every topic and source (${summary.trim()})`);
  await openMenu('exams');
  await click('.dd-panel input[data-pref="glSources"][value="gl-ep11"]');
  await click('.dd-panel input[data-pref="glSources"][value="gl-ep12"]');
  await openMenu('exams');
  const lectureGroups = Object.keys(G.PROBLEMS).filter((pid) => G.SOURCES[G.PROBLEMS[pid].exam].kind === 'lecture').length;
  ok((await text('.start-row .summary')).includes(`${lectureGroups} matching question`), `with only the lectures chosen, ${lectureGroups} groups match`);
  await openMenu('topics'); await click('[data-action="topics-all"]'); await openMenu('topics');
  s = await st();
  ok(s.prefs.glTopics.length === G.TOPICS.length - 1 && !s.prefs.glTopics.includes('gl-interpreters'), 'Select all chooses every Gleam topic that has questions');
  await page.$eval('#set-size', (i) => { i.value = '50'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await wait(100);
  await click('[data-action="start"]');
  await page.waitForSelector('#problem-article');
  s = await st();
  ok(s.session.ids.length > 0 && s.session.ids.every((id) => id.startsWith('gl-lec')), `the set holds only Gleam lecture questions (${s.session.groups.length} groups)`);
  ok(/^Gleam · /.test(s.session.title), `the set is titled for Gleam ("${s.session.title}")`);

  // ── The question screen ──
  await seedPractice(G, ['gl-lec28-8', 'gl-ep11-5'], {}, { lang: 'gleam' });
  ok(!(await has('#tutor-btn')), 'no Python Tutor button on a Gleam question');
  ok((await text('.editor-file')) === 'alternating.gleam', `the editor file is named for the function (${await text('.editor-file')})`);
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getOption('mode') === 'gleam'), 'the editor uses the Gleam mode');
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getOption('indentUnit') === 2), 'Gleam code indents by 2 spaces');
  ok(await page.evaluate(() => !!document.querySelector('.CodeMirror .cm-keyword')), 'Gleam keywords are highlighted');
  ok((await text('.src')).startsWith('Source: Lecture 28: Algebraic Data Types, Slide 8'), `a lecture problem cites its slide (${(await text('.src')).slice(0, 60)})`);
  const h2 = await text('#problem-article h2');
  ok(h2 === 'Example: Alternating Lists', `a lecture problem has no number or points in its title ("${h2}")`);
  ok(/\/\//.test(await text('.editor-hint')), 'the editor hint mentions // comments');
  ok(!(await has('.diagram-workspace, #dg-canvas')), 'no environment diagram workspace');
  const altTests = G.TESTS['gl-lec28-8'].cases.length;
  ok(new RegExp(`Includes ${altTests} verified tests`).test(await text('.run-bar')), `Run Code says how many tests the question has (${altTests})`);

  let r = await run();
  ok(/^Error/.test(r.status) && /Syntax error/.test(r.err) && /___\(a\)___/.test(r.err), 'with empty blanks, Run Code shows the Gleam compile error at the empty blank');
  ok(r.tests === 'Tests not run' && /doesn’t compile/.test(r.msg), 'tests don’t run when the code doesn’t compile, and the message says why');
  await typeAnswer('gl-lec28-8a', '[] | [_] | [_, _]');
  await typeAnswer('gl-lec28-8b', '[x, _, z, ..]');
  await typeAnswer('gl-lec28-8c', 'x != z');
  await typeAnswer('gl-lec28-8d', '[_, ..rest]');
  r = await run();
  ok(/^Completed/.test(r.status) && r.tests === `Passed ${altTests}/${altTests} tests!`, `with the official answers, the question's asserts pass and so do all its tests (${r.status}; ${r.tests})`);
  ok(r.origins.filter((o) => o === 'From the question').length === 5 && r.origins.filter((o) => o === 'Added').length === altTests - 5, 'tests are labelled "From the question" (the slide\'s asserts) or "Added"');
  await typeAnswer('gl-lec28-8c', 'x == z');
  r = await run();
  ok(/^Error/.test(r.status) && /Assertion failed \(line \d+\)/.test(r.err) && /Passed \d\/9 tests/.test(r.tests), `a wrong answer fails the question's assert and some tests (${r.err.split('\n')[0]}; ${r.tests})`);
  ok(r.failed.length > 0 && r.failed.every((b) => /Input/.test(b) && /assert/.test(b) && /Assertion failed/.test(b)), 'each failed test shows its assert and the error');
  // grading is unchanged by running
  s = await st();
  ok(s.session.answers['gl-lec28-8c'] === 'x == z' && !s.session.checked['gl-lec28-8c'], 'running never grades or changes answers');

  await click('[data-action="next"]');
  await page.waitForSelector('#run-btn');
  ok((await text('.src')).startsWith('Source: Exam Prep Week 11: Gleam and Linked Lists, Q5') && /^5\. \(5\.0 points\)Rotation Situation$/.test(await text('#problem-article h2')), 'a worksheet problem shows its number and points like an exam');
  await typeAnswer('gl-ep11-5a', 'lst');
  await click('input[data-qid="gl-ep11-5b"][value="0"]');
  await typeAnswer('gl-ep11-5c', 'rest');
  await typeAnswer('gl-ep11-5d', '[first, first]');
  await typeAnswer('gl-ep11-5e', 'k - 1');
  r = await run();
  ok(/left:\s+\[2, 3, 4, 5, 1, 1\]/.test(r.err) && /right: \[2, 3, 4, 5, 1\]/.test(r.err), 'a failed `assert a == b` shows both sides\' values');
  await typeAnswer('gl-ep11-5d', '[first]');
  r = await run();
  ok(r.tests === 'Passed 6/6 tests!', `fixing the answer passes all 6 tests (${r.tests})`);
  // Check Answer works like Python's
  await page.$eval('[data-part="gl-ep11-5d"] [data-action="check"]', (b) => b.click());
  await wait(200);
  s = await st();
  ok(s.session.checked['gl-ep11-5d'] === 'correct', 'Check Answer grades a Gleam short answer against the official answer');

  // infinite loop: stopped after 5 seconds, and the next run works
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.setValue('fn spin(n) { spin(n + 1) }\n\npub fn main() {\n  spin(0)\n}'));
  r = await run();
  ok(r.status === 'Timed out' && /Stopped after 5 seconds/.test(r.msg) && /Gleam was restarted/.test(r.msg), `an infinite loop is stopped after 5 seconds (${r.status})`);
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.setValue('import gleam/io\n\npub fn main() {\n  io.println("again")\n  echo [1, 2] |> list_len\n}\n\nfn list_len(s) { case s { [] -> 0 [_, ..r] -> 1 + list_len(r) } }'));
  r = await run();
  ok(/^Completed/.test(r.status) && r.out === 'again\nyour_code.gleam:5\n2\n', `after a timeout, the next run works; io.println and echo print to Console Output (${JSON.stringify(r.out)})`);

  // ── Practice Summary: no walkthrough videos for Gleam ──
  await click('#nav-toggle');
  await click('.navigator [data-action="finish"]');
  await page.waitForSelector('.results');
  ok(!(await has('#walk-sec')), 'the Practice Summary of a Gleam set has no Walkthrough Videos section');
  ok(/Lecture 28: Algebraic Data Types Slide 8/.test(await text('.results')), 'the summary lists each Gleam question with its source');

  // ── Python is unchanged ──
  await seedPractice(P, ['fa25-4'], {}, { lang: 'python' });
  ok(await has('#tutor-btn'), 'Python questions still have Python Tutor');
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getOption('mode') === 'python' && document.querySelector('.CodeMirror').CodeMirror.getOption('indentUnit') === 4), 'Python questions still use the Python editor mode with 4-space indents');
  ok((await text('.editor-file')).endsWith('.py') && /<code>#<\/code>|#/.test(await text('.editor-hint')), 'Python file name and # comment hint are unchanged');

  // ── Exam Mode never shows Gleam ──
  await fresh();
  await click('#mode-exam');
  ok(!(await has('.lang-row')), 'Exam Mode has no Language picker (Exam Mode is unchanged)');
  const examIds = await page.$$eval('input[name="exam-id"]', (els) => els.map((e) => e.value));
  ok(examIds.length === Object.keys(P.EXAMS).length && examIds.every((id) => P.EXAMS[id]), 'the full-exam list holds only the Python midterms');
  await click('#exam-kind-custom');
  await page.waitForSelector('#pick-list');
  const picks = await page.$$eval('#pick-list [data-pick]', (els) => els.map((e) => e.dataset.pick));
  ok(picks.length > 0 && picks.every((pid) => P.PROBLEMS[pid]) && !picks.some((pid) => pid.startsWith('gl-')), `the topic-based exam lists no Gleam question (${picks.length} Python groups)`);
  const examTopics = await page.$$eval('.exam-setup [data-action="xtopic"]', (els) => els.map((e) => e.dataset.id));
  ok(examTopics.length > 0 && examTopics.every((t) => P.TOPICS.some((x) => x.id === t)) && !examTopics.some((t) => t.startsWith('gl-')), `the exam topic filter has only Python topics (${examTopics.length})`);

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
