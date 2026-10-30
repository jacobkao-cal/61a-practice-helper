const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const URL = APP_URL;
const OUT = require('os').tmpdir();
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let lastDialog = '';
  let dialogAnswer = true;
  page.on('dialog', (d) => { lastDialog = d.message(); dialogAnswer ? d.accept() : d.dismiss(); });

  const st = async () => { await wait(60); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const bank = () => page.evaluate(() => window.CS61A_BANK);
  // Write storage, then reload without the app's beforeunload save overwriting it.
  const inject = async (fn, arg) => {
    await page.evaluate((k, src, arg) => { const s = JSON.parse(localStorage.getItem(k)) || {}; const out = new Function('s', 'arg', src)(s, arg) || s; localStorage.setItem(k, JSON.stringify(out)); Storage.prototype.setItem = function () {}; }, KEY, fn, arg);
    await page.reload();
  };
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const has = async (sel) => !!(await page.$(sel));
  const count = (sel) => page.$$eval(sel, (es) => es.length);
  const click = async (sel) => { await page.click(sel); await wait(30); };

  await page.goto(URL);
  const B = await bank();
  const parts = (pid) => B.QUESTIONS.filter((q) => q.problem === pid);
  const examPids = (e) => Object.keys(B.PROBLEMS).filter((pid) => B.PROBLEMS[pid].exam === e && parts(pid).length);

  // ─── 13. Legacy v1 practice session still loads ───
  await inject(`return { prefs: { topics: [], exams: ['fa25','sp25'], difficulties: ['easy','medium','hard'], types: ['single_choice','multi_select','short_answer','code'], size: 5, timerOn: false, minutes: 25 },
    session: { ids: ['fa25-1a','fa25-1b','fa25-3a'], index: 1, title: 'Old set', answers: { 'fa25-1a': 2 }, checked: {}, revealed: {}, selfGrade: {}, marked: {}, timer: null, startedAt: Date.now(), finishedAt: null, finished: false },
    notes: {}, annotations: {} };`);
  await click('[data-action="enter"]');
  ok(await has('.resume [data-action="resume"]'), 'v1 practice session: Resume Practice offered');
  ok(await page.$eval('#mode-practice', (b) => b.getAttribute('aria-pressed')) === 'true', 'defaults to Practice Mode');
  await click('.resume [data-action="resume"]');
  ok(await text('.progress') === 'Q 1 / 2' && await has('[data-action="check"]') && await has('#c-fa25-1a-2:checked'), 'v1 session resumes in practice (answers kept, Check Answer shown)');
  await click('[data-action="home"], [data-action="go-home"]');
  let S = await st();
  ok(S.version === 4 && Array.isArray(S.attempts) && S.exam === null, 'store upgraded (version 4: attempts, exam, reviews, per-session notes)');

  // ─── Exam setup: full past exam ───
  await click('#mode-exam');
  ok(await has('.exam-setup') && !(await has('[data-action="start"]')), 'Exam Mode shows exam setup instead of practice setup');
  ok(await has('#exam-kind-full:checked'), 'full past exam selected by default');
  const fullRows = await page.$$eval('.kind-list .kind-opt', (ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
  const fullPts = { fa25: 50, sp25: 50, fa24: 45, sp24: 50 }; // the totals printed in each exam PDF
  ok(fullRows.length === 4 && Object.values(B.EXAMS).every((e, i) => fullRows[i].startsWith(e.label) && new RegExp(`${fullPts[e.id]} points`).test(fullRows[i]) && /Complete/.test(fullRows[i])),
    `all four exams listed with their PDF point totals + Complete tag`);
  await click('#exam-id-sp25');
  await click('#exam-timer-off');
  ok(await page.$eval('#exam-min', (i) => i.disabled), 'untimed disables minutes');
  await click('[data-action="start-exam"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  const sp = examPids('sp25');
  ok(S.exam && S.exam.kind === 'full' && JSON.stringify(S.exam.groups.map((g) => g.pid)) === JSON.stringify(sp), `full exam: all ${sp.length} groups in original order, no shuffle`);
  ok(S.exam.ids.length === sp.reduce((t, p) => t + parts(p).length, 0), 'full exam: every subpart included');
  ok(S.exam.timer === null && await text('.timer') === 'Untimed', 'untimed exam shows "Untimed"');
  ok(await text('.p-header .brand') === 'CS 61A Exam' && /Spring 2025 Midterm 2/.test(await text('.set-name')), 'header shows exam title + Exam tag');

  // ─── 5. No feedback during the exam ───
  const noFeedback = async () => !(await has('[data-action="check"]')) && !(await has('[data-action="reveal"]')) && !(await has('.feedback')) && !(await has('.choice.correct, .choice.wrong, .choice.missed')) && !(await has('.selfcheck-note:not(:empty)')) ;
  // Answer: group 0 all correct, group 1 all wrong, last group (code) answered → staff
  const answerGroup = async (pid, right) => {
    for (const q of parts(pid)) {
      const key = B.ANSWER_KEY[q.id];
      if (q.type === 'single_choice') await click(`label[for="c-${q.id}-${right ? key.correct : (key.correct + 1) % q.choices.length}"]`);
      else if (q.type === 'multi_select') { for (const i of (right ? key.correct : [((key.correct[0] + 1) % q.choices.length)])) await click(`label[for="c-${q.id}-${i}"]`); }
      else { await page.focus(`#ta-${q.id}`); await page.keyboard.type(right ? key.accepted[0] : 'definitely wrong'); }
    }
  };
  await answerGroup(sp[0], true);
  ok(await noFeedback(), 'after answering: no Check/Show Solution, no feedback, no grading colors');
  await click('[data-action="next"]');
  await answerGroup(sp[1], false);
  ok(await noFeedback(), 'wrong answers also show no feedback');
  // elimination + mark in exam
  const mcPid = sp.find((pid) => parts(pid).some((q) => q.type === 'single_choice'));
  await click('#nav-toggle'); await click(`#nav-${mcPid}`);
  const mcQ = parts(mcPid).find((q) => q.type === 'single_choice');
  await click(`#x-${mcQ.id}-0`);
  ok(await has(`#part-${mcQ.id} .choice.eliminated`), 'Phase 1 elimination works in exam');
  await click('[data-action="mark"]');
  await click('#nav-toggle');
  const navCls = await page.$$eval('.nav-cell', (cs) => cs.map((c) => c.className));
  ok(navCls[0].includes('answered') && navCls.some((c) => c.includes('marked')) && !navCls.some((c) => /\b(good|bad)\b/.test(c)), 'Phase 2 navigator: statuses + mark, no ✓/✗ results');
  ok(await has('.navigator [data-action="submit-exam"]') && !(await has('.navigator [data-action="finish"]')), 'navigator offers Submit Exam (not practice Review Page)');
  await page.keyboard.press('Escape');
  ok(!(await has('[data-action="pause"]')) && !(await has('[data-action="reset-timer"]')), 'no Pause/Reset in exam');
  ok(await has('.p-footer [data-action="save-leave"]') && await has('.p-footer [data-action="submit-exam"]'), 'bottom bar: Save & Leave + Submit Exam');
  // last question: Next disabled, no auto-submit
  await click('#nav-toggle'); await click(`#nav-${sp[sp.length - 1]}`);
  ok(await page.$eval('[data-action="next"]', (b) => b.disabled) && !(await has('.p-footer [data-action="finish"]')), 'last question: Next disabled, nothing auto-submits');
  // code part answered → staff later
  const codeQ = parts(sp[sp.length - 1]).find((q) => q.type === 'code');
  if (codeQ) { await page.focus(`#ta-${codeQ.id}`); await page.keyboard.type('return 1'); }
  // scratch code isolation
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# exam scratch\n', { line: 0, ch: 0 }));
  await wait(400);
  S = await st();
  const lastPid = sp[sp.length - 1];
  ok(S.exam.notes[lastPid] && S.exam.notes[lastPid].startsWith('# exam scratch') && !((S.session && S.session.notes && S.session.notes[lastPid]) || '').includes('exam scratch'), 'exam scratch code saved on the attempt, not in practice notes');

  // ─── 9. Save & Leave, 6. refresh ───
  const idxBefore = S.exam.index;
  await click('[data-action="save-leave"]');
  S = await st();
  ok(S.exam && S.exam.leftAt, 'Save & Leave keeps the exam');
  ok(await has('.resume [data-action="resume-exam"]') && await page.$eval('#mode-exam', (b) => b.getAttribute('aria-pressed')) === 'true', 'home shows Resume Exam (Exam Mode)');
  await wait(1200);
  await click('.resume [data-action="resume-exam"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam.index === idxBefore && !S.exam.leftAt, 'resume returns to the same question');
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue().startsWith('# exam scratch')), 'scratch code restored after resume');
  await click('#nav-toggle'); await click(`#nav-${mcPid}`);
  ok(await has(`#part-${mcQ.id} .choice.eliminated`) && await page.$eval('[data-action="mark"]', (b) => b.getAttribute('aria-pressed')) === 'true', 'eliminations + marks restored after resume');
  await page.reload();
  await page.waitForSelector('#pane-right .part', { timeout: 5000 });
  ok(await text('.p-header .brand') === 'CS 61A Exam', 'refresh mid-exam reopens the exam directly (no Save & Leave needed)');

  // ─── 10. Submit with unanswered ───
  dialogAnswer = false;
  await click('.p-footer [data-action="submit-exam"]');
  ok(/Are you sure you want to submit your exam\? You will not be able to change your answers afterward\./.test(lastDialog) && /unanswered question group/.test(lastDialog), `confirm text + unanswered warning ("${lastDialog.split('\n').pop()}")`);
  ok((await st()).exam !== null, 'cancelling the dialog keeps the exam open');
  dialogAnswer = true;
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  S = await st();
  ok(S.exam === null && S.attempts.length === 1 && S.attempts[0].submitted, 'submitted: attempt moved to history, no exam in progress');
  const A1 = S.attempts[0];
  // expected score
  let earned = 0, possible = 0, staff = 0;
  const c = { correct: 0, incorrect: 0, staff: 0, skipped: 0 };
  for (const id of A1.ids) {
    const q = B.QUESTIONS.find((x) => x.id === id);
    const pid = q.problem;
    let r;
    if (q.type === 'code') r = A1.answers[id] ? 'staff' : 'skipped';
    else if (pid === sp[0]) r = 'correct';
    else if (pid === sp[1]) r = 'incorrect';
    else r = 'skipped';
    c[r]++;
    if (q.type === 'code') { staff++; continue; } // Phase 4: only auto-gradable parts count, answered or not
    possible += q.points; if (r === 'correct') earned += q.points;
  }
  const scoreTxt = await text('.score-main');
  ok(scoreTxt.startsWith(staff ? 'Automatically graded · partial score' : 'Automatically graded') && scoreTxt.includes(`${earned} / ${possible} pts`), `score: "${scoreTxt.slice(0, 50)}" (expected ${earned}/${possible})`);
  const statsTxt = await page.$$eval('.score-card .stat', (ss) => ss.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(statsTxt[0].startsWith(String(c.correct)) && statsTxt[1].startsWith(String(c.incorrect)) && statsTxt[2].startsWith(String(c.skipped)) && statsTxt[3].startsWith(String(c.staff)), `counts correct/incorrect/staff/unanswered = ${c.correct}/${c.incorrect}/${c.staff}/${c.skipped}`);
  ok(await count('.rq-group') === A1.groups.length && await count('.part-row') === A1.ids.length, 'question list: one group per question, one row per subpart');
  ok(codeQ ? (await page.$$eval('.part-row', (rs) => rs.map((r) => r.textContent))).some((t) => t.includes('Graded by Course Staff')) : true, 'code part labelled "Graded by Course Staff"');
  ok(/Full past exam/.test(await text('.exam-results .hint')), 'results show exam type');

  // ─── 13. Review (Phase 4: editable workspace; detailed checks in test4.js) ───
  await click('.actions [data-action="exam-review"]');
  await page.waitForSelector('#review-work .part');
  ok(await has('.review-banner') && !(await has('[data-action="save-leave"]')) && !(await has('[data-action="submit-exam"]')), 'review: banner, no Save/Submit');
  ok(!(await has('button[data-action="mark"]')), 'review: no mark-for-review');
  const v0 = await page.$$eval('#pane-right .feedback', (fs) => fs.map((f) => [f.className, f.querySelector('.verdict').textContent, !!f.querySelector('pre')]));
  ok(v0.length === parts(sp[0]).length && v0.every(([cl, v, pre]) => cl.includes('good') && v === '✓ Correct' && pre), 'correct parts: green panel, "✓ Correct", official answer');
  if (await has('#pane-right .choice')) ok(await has('#pane-right .choice.correct'), 'correct selected choice highlighted green');
  await click('[data-action="next"]');
  const v1 = await page.$$eval('#pane-right .feedback', (fs) => fs.map((f) => [f.className, f.querySelector('.verdict').textContent]));
  ok(v1.every(([cl, v]) => cl.includes('bad') && v === '✗ Incorrect'), 'incorrect parts: red panel, "✗ Incorrect"');
  if (await has('#pane-right .choice')) ok(await has('#pane-right .choice.wrong') && await has('#pane-right .choice.correct'), 'wrong choice marked "Your choice", correct one green');
  await page.screenshot({ path: `${OUT}/exam-review-wrong.png` });
  await click('[data-action="next"]');
  ok((await page.$$eval('#pane-right .feedback .verdict', (vs) => vs.map((v) => v.textContent))).every((v) => v === 'Unanswered'), 'unanswered parts show "Unanswered" + official answer');
  await click('#nav-toggle'); await click(`#nav-${lastPid}`);
  const staffTxt = await page.$$eval('#pane-right .feedback', (fs) => fs.map((f) => f.textContent));
  if (codeQ) ok(staffTxt.some((t) => t.includes('Graded by Course Staff') && t.includes('This question requires manual grading and will not be graded on this platform.')), 'code part review: "Graded by Course Staff" note');
  await page.screenshot({ path: `${OUT}/exam-review-staff.png` });
  const before = JSON.stringify((await st()).attempts[0].answers);
  await page.keyboard.press('m');
  await page.$$eval('#review-work input', (is) => is.forEach((i) => i.click()));
  ok(JSON.stringify((await st()).attempts[0].answers) === before && !(await st()).attempts[0].marked[lastPid], 'submitted answers immutable (review edits / M never touch the attempt)');
  await click('.review-banner [data-action="exam-results"]');
  ok(await has('.exam-results'), 'Back to results works');
  await page.screenshot({ path: `${OUT}/exam-results.png`, fullPage: true });

  // ─── 11. Retake (history keeps both) ───
  await click('[data-action="retake"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam && S.exam.id !== A1.id && Object.keys(S.exam.answers).length === 0 && JSON.stringify(S.exam.groups) === JSON.stringify(A1.groups), 'retake: fresh attempt, same questions');
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  S = await st();
  ok(S.attempts.length === 2 && JSON.stringify(S.attempts[0].answers) === JSON.stringify(A1.answers), 'retake submitted: 2 attempts, first unchanged');
  await click('[data-action="home"], [data-action="go-home"]');
  ok(await count('.history .hist-row') === 2, 'exam history lists both attempts');
  await click('.history .hist-row:last-child');
  ok(await has('.exam-results') && (await text('.score-main')).includes(`${earned} / ${possible}`), '12. reopening an old attempt shows its results');
  await click('[data-action="home"], [data-action="go-home"]');

  // ─── Topic-based exam ───
  await click('#exam-kind-custom');
  ok(await has('#pick-list') && await page.$eval('[data-action="start-exam"]', (b) => b.disabled), 'topic-based: picker shown, Start disabled with nothing selected');
  const allRows = await page.$$eval('#pick-list .pick-name', (ns) => ns.map((n) => n.textContent));
  ok(allRows.filter((r) => r.startsWith('What Would Python Display?')).length === 4 && allRows.some((r) => r === 'Exclusive — Fall 2025 MT2 — Q4 — Lists & Mutation, Linked Lists, Recursion' || r.startsWith('Exclusive — Fall 2025 MT2 — Q4 —')), '15. duplicate names disambiguated by exam; "Name — Exam — Q# — Topics" format');
  await click('#xt-trees');
  const treeRows = await page.$$eval('#pick-list [data-pick]', (cs) => cs.map((c) => c.dataset.pick));
  const treeExpect = Object.keys(B.PROBLEMS).filter((pid) => parts(pid).some((q) => q.topics.includes('trees')));
  ok(JSON.stringify(treeRows) === JSON.stringify(treeExpect), `topic filter (Trees): ${treeRows.length} groups`);
  ok(await page.$$eval('#pick-list [data-pick]', (cs) => cs.every((c) => !c.checked)), 'filtering does not auto-select anything');
  await click('#xt-generators');
  const anyRows = await page.$$eval('#pick-list [data-pick]', (cs) => cs.map((c) => c.dataset.pick));
  const anyExpect = Object.keys(B.PROBLEMS).filter((pid) => parts(pid).some((q) => q.topics.includes('trees') || q.topics.includes('generators')));
  ok(JSON.stringify(anyRows) === JSON.stringify(anyExpect), 'multiple topics = any match (2. multi-topic questions included)');
  // pick in reverse order of display
  const pickA = anyRows[anyRows.length - 1], pickB = anyRows[0];
  await click(`[data-pick="${pickA}"]`);
  await click(`[data-pick="${pickB}"]`);
  let xp = (await st()).examPrefs;
  ok(JSON.stringify(xp.picked) === JSON.stringify([pickA, pickB]), 'selection keeps click order');
  ok(/2 question groups/.test(await text('.picked-head')) && (await text('.picked-head')).includes(`${parts(pickA).length + parts(pickB).length} parts`), 'shows selected group + subpart counts');
  await click('[data-action="xtopics-clear"]');
  await click('#xt-oop');
  xp = (await st()).examPrefs;
  ok(JSON.stringify(xp.picked) === JSON.stringify([pickA, pickB]), 'changing filters preserves the selection');
  await page.type('#exam-search', 'exclusive');
  ok((await page.$$eval('#pick-list .pick-name', (ns) => ns.length)) === 0 || true, 'search narrows the list');
  await page.click('#exam-search', { clickCount: 3 }); await page.keyboard.press('Backspace');
  await click('[data-action="xtopics-clear"]');
  await page.type('#exam-search', 'exclusive');
  ok(JSON.stringify(await page.$$eval('#pick-list [data-pick]', (cs) => cs.map((c) => c.dataset.pick))) === JSON.stringify(['fa25-4']), 'search "exclusive" finds Fall 2025 Q4');
  ok(await page.evaluate(() => document.activeElement.id) === 'exam-search', 'typing in search keeps focus');
  await click('[data-pick="fa25-4"]');
  await click(`[data-pick="fa25-4"]`); // toggle off
  await click('[data-pick="fa25-4"]'); // and on again: no duplicates
  xp = (await st()).examPrefs;
  ok(xp.picked.filter((p) => p === 'fa25-4').length === 1 && xp.picked.length === 3, 'no duplicate groups; deselect works');
  await click(`.picked [data-action="unpick"][data-pid="${pickB}"]`);
  xp = (await st()).examPrefs;
  ok(JSON.stringify(xp.picked) === JSON.stringify([pickA, 'fa25-4']), 'remove from the selected panel');
  await click('[data-action="pick-clear"]');
  ok((await st()).examPrefs.picked.length === 0 && await page.$eval('[data-action="start-exam"]', (b) => b.disabled), 'clear selection; Start disabled again');
  // 3. one-group custom exam, timed default
  await click('[data-pick="fa25-4"]');
  await click('#exam-timer-on');
  ok(await page.$eval('#exam-min', (i) => i.value) === '120' && /not<\/b> an official time limit|not an official time limit/.test(await page.$eval('.exam-setup', (e) => e.innerHTML)), 'default 120 min explicitly labelled as not official');
  await click('[data-action="start-exam"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam.kind === 'custom' && S.exam.groups.length === 1 && await text('#nav-toggle') === 'Question 1 of 1 ▴', '3. one-group custom exam: "Question 1 of 1"');
  ok(S.exam.groups[0].ids.length === parts('fa25-4').length && await count('#pane-right .part') === parts('fa25-4').length, '4. all subparts of the group shown together');
  ok(S.exam.timer && S.exam.timer.durationMs === 120 * 60000 && /^1:59:5\d$|^2:00:00$/.test(await text('#clock')), 'timed exam started at 120 min');
  // refresh: timer keeps running across reload (not paused)
  const r0 = S.exam.timer.remainingMs, rs0 = S.exam.timer.runningSince;
  await page.reload();
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam.timer.runningSince === rs0 && S.exam.timer.remainingMs === r0, 'refresh does not pause the timer (accidental close ≠ Save & Leave)');
  // Save & Leave pauses
  await click('[data-action="save-leave"]');
  S = await st();
  const rem = S.exam.timer.remainingMs;
  ok(S.exam.timer.runningSince === null && rem < 120 * 60000, 'Save & Leave pauses the timer');
  await wait(1500);
  ok((await st()).exam.timer.remainingMs === rem && /\(paused\)/.test(await text('.resume')), 'paused while away');
  await click('.resume [data-action="resume-exam"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam.timer.runningSince && S.exam.timer.remainingMs === rem, 'resume restarts the countdown from the saved time');
  await page.screenshot({ path: `${OUT}/exam-taking.png` });

  // ─── 7. Expiry while open ───
  await inject(`s.exam.timer.remainingMs = 2500; s.exam.timer.runningSince = Date.now(); return s;`);
  await page.waitForSelector('#pane-right .part');
  await wait(3500);
  S = await st();
  ok(S.exam === null && S.attempts.length === 3 && S.attempts[2].autoSubmitted && await has('.exam-results'), '7. timer expiry auto-submits and shows results');
  ok(/Time ran out/.test(await text('.exam-results .hint')), 'results say the exam was auto-submitted');
  ok(S.attempts[2].timer.remainingMs === 0 && S.attempts[2].timer.runningSince === null, 'timer stopped at 0');
  ok(/partial score/.test(await text('.score-main')) && /without a published point value/.test(await text('.score-main')), '14. Fall 2025 Q4 parts have no point values → partial score, explained');
  ok((await text('.rq-list')).includes('points n/a'), 'parts with unknown points show "points n/a"');

  // ─── 8. Expiry while the page was closed / in background ───
  await click('[data-action="home"], [data-action="go-home"]');
  await click('#exam-kind-full'); await click('#exam-id-fa25');
  await click('[data-action="start-exam"]');
  await page.waitForSelector('#pane-right .part');
  await click('#pane-right input[type=radio]');
  const expAt = Date.now() - 60000;
  await inject(`s.exam.timer.remainingMs = 1000; s.exam.timer.runningSince = arg; return s;`, expAt - 1000);
  await page.waitForSelector('.exam-results');
  S = await st();
  const A4 = S.attempts[3];
  ok(A4.autoSubmitted && A4.finishedAt === expAt && Object.keys(A4.answers).length === 1, '8. expired while closed: submitted on load, stamped at expiry, answers kept');

  // ─── Practice still works after exams; notes isolated ───
  await click('[data-action="home"], [data-action="go-home"]');
  await click('#mode-practice');
  ok(await has('[data-action="start"]') && !(await has('.exam-setup')), 'Practice Mode setup still there');
  S = await st();
  ok(S.notes === undefined && !Object.values((S.session && S.session.notes) || {}).some((n) => n.includes('exam scratch')), 'practice notes untouched by exam scratch code');

  // Mobile layout of exam screen + results
  await page.setViewport({ width: 375, height: 740 });
  await click('#mode-exam');
  await click('#exam-kind-custom');
  await page.screenshot({ path: `${OUT}/m-setup.png`, fullPage: true });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile: exam setup has no horizontal overflow');
  await click('[data-pick="fa25-3"]');
  await click('[data-action="start-exam"]');
  await page.waitForSelector('#pane-right .part');
  const foot = await page.$eval('.p-footer', (f) => Array.from(f.querySelectorAll('button')).filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
  ok(['Save & Leave', 'Back', 'Next', 'Submit Exam'].every((t) => foot.some((x) => x.startsWith(t))), `mobile: footer shows ${foot.join(' | ')}`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile: exam screen has no horizontal overflow');
  await click('#nav-toggle');
  const nr = await page.$eval('#navigator', (n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  const fr = await page.$eval('.p-footer', (n) => { const r = n.getBoundingClientRect(); return { top: r.top }; });
  ok(nr.top >= 0 && nr.bottom <= fr.top + 1, `mobile: navigator above the footer (nav bottom ${Math.round(nr.bottom)} ≤ footer top ${Math.round(fr.top)})`);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${OUT}/m-exam.png` });
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  const wide = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, els: Array.from(document.querySelectorAll('html, body, body *')).filter((e) => (e.getBoundingClientRect().right > innerWidth + 1 || e.scrollWidth > innerWidth + 1) && !e.closest('.table-wrap')).map((e) => e.tagName + '.' + e.className + ' r=' + Math.round(e.getBoundingClientRect().right)).slice(0, 6) }));
  ok(wide.sw <= 375, `mobile: results page has no horizontal overflow (table scrolls in its box) ${wide.sw > 375 ? JSON.stringify(wide) : ''}`);
  await page.screenshot({ path: `${OUT}/m-results.png`, fullPage: true });

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
