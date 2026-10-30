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
  const requested = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => requested.push(r.url()));
  page.on('dialog', (d) => d.accept());

  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const inject = async (src) => {
    await page.evaluate((k, src) => { const s = JSON.parse(localStorage.getItem(k)) || {}; const out = new Function('s', src)(s) || s; localStorage.setItem(k, JSON.stringify(out)); Storage.prototype.setItem = function () {}; }, KEY, src);
    await page.reload();
  };
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const has = async (sel) => !!(await page.$(sel));
  const count = (sel) => page.$$eval(sel, (es) => es.length);
  const click = async (sel) => { await page.click(sel); await wait(40); };
  const cmValue = () => page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue());

  await page.goto(URL);
  const B = await page.evaluate(() => window.CS61A_BANK);
  const G = await page.evaluate(() => window.CS61A_GUIDES);
  const parts = (pid) => B.QUESTIONS.filter((q) => q.problem === pid);

  // Custom exam: fa25-1 (a: choice, b: short, c: choice) + sp25-5d (code, staff-graded)
  const startCustom = async (pids) => {
    await inject(`s.prefs = Object.assign(s.prefs || {}, { mode: 'exam' }); s.examPrefs = { kind: 'custom', topics: [], picked: ${JSON.stringify(pids)}, timerOn: false, minutes: 120 }; return s;`);
    if (await has('[data-action="enter"]')) await click('[data-action="enter"]');
    await click('[data-action="start-exam"]');
    await page.waitForSelector('#pane-right .part');
  };
  const keyA = B.ANSWER_KEY['fa25-1a'].correct;
  await startCustom(['fa25-1', 'sp25-5d']);
  await click(`label[for="c-fa25-1a-${keyA}"]`);                 // (a) correct
  await page.focus('#ta-fa25-1b'); await page.keyboard.type('[1, 2]'); // (b) incorrect
  // (c) left unanswered
  await click('[data-action="next"]');
  await page.focus('#ta-sp25-5h'); await page.keyboard.type("'+' + x"); // code part → staff
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# submitted scratch\n', { line: 0, ch: 0 }));
  await wait(400);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  let S = await st();
  const A1 = S.attempts[S.attempts.length - 1];
  const A1snap = JSON.stringify({ answers: A1.answers, graded: A1.graded, score: A1.score, notes: A1.notes, eliminated: A1.eliminated });

  // ── 1. score: only auto-gradable parts, staff excluded from numerator AND denominator ──
  const autoPts = ['fa25-1a', 'fa25-1b', 'fa25-1c'].reduce((t, id) => t + B.QUESTIONS.find((q) => q.id === id).points, 0);
  const pa = B.QUESTIONS.find((q) => q.id === 'fa25-1a').points;
  ok(A1.graded['fa25-1a'] === 'correct' && A1.graded['fa25-1b'] === 'incorrect' && A1.graded['fa25-1c'] === 'skipped' && A1.graded['sp25-5h'] === 'staff', 'grades frozen on the attempt at submission');
  ok(A1.score.earned === pa && A1.score.possible === autoPts && A1.score.auto === 3 && A1.score.staff === 1, `score ${A1.score.earned}/${A1.score.possible}: staff part excluded from both`);
  const sm = await text('.score-main');
  ok(sm.startsWith('Automatically graded · partial score') && sm.includes(`${pa} / ${autoPts} pts`) && /1 part graded by course staff/.test(sm), `headline: "${sm.slice(0, 70)}…"`);
  ok(await text('.disclaimer-strong') === 'All grades on this platform are for practice purposes only and do not predict your actual exam scores.', 'practice-only disclaimer shown');
  const stats = await page.$$eval('.score-card .stat', (ss) => ss.map((x) => x.querySelector('.v').textContent + ' ' + x.querySelector('.k').textContent));
  ok(JSON.stringify(stats) === JSON.stringify(['1 Correct parts', '1 Incorrect parts', '1 Unanswered parts', '1 Graded by Course Staff']), `per-part counts: ${stats.join(' | ')}`);
  ok(!/sent to|submitted to course staff|staff will grade/i.test(await text('.exam-results')), 'never claims answers were sent to staff');

  // ── 2. question list: groups in exam order, statuses, direct navigation ──
  const grp = await page.$$eval('.rq-group', (gs) => gs.map((g) => [g.querySelector('.rq-title').textContent.trim(), g.open, Array.from(g.querySelectorAll('.part-row .badge')).map((b) => b.textContent)]));
  ok(grp.length === 2 && grp[0][0].startsWith(B.PROBLEMS['fa25-1'].title) && grp[1][0].startsWith(B.PROBLEMS['sp25-5d'].title), 'groups listed in exam order');
  ok(JSON.stringify(grp[0][2]) === JSON.stringify(['Correct', 'Incorrect', 'Unanswered']) && JSON.stringify(grp[1][2]) === JSON.stringify(['Graded by Course Staff']), 'subpart statuses listed per group');
  ok(grp[0][1] === true && grp[1][1] === false, 'groups with a miss start expanded; others collapsed');
  await page.focus('.rq-group:nth-child(2) > summary'); await page.keyboard.press('Enter');
  ok(await page.$eval('.rq-group:nth-child(2)', (d) => d.open), 'expand/collapse works from the keyboard');
  await click('.rq-group:first-child [data-q="fa25-1c"]');
  await page.waitForSelector('#review-work .part');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.closest('#part-fa25-1c') !== null), 'Review on a part opens that question and focuses that part');
  ok(await has('#rv-fa25-1c'), 'right pane has the matching submitted/official panel');

  // ── D. layout + content ──
  ok(await has('#pane-left #problem-article') && await has('#pane-left #review-work') && await has('#pane-right .rv-part'), 'left: question + editable workspace; right: submitted + official');
  ok(await has('#annot-bar') && await has('#review-work .elim-btn'), 'annotation + elimination tools available in review');
  ok(await page.evaluate(() => !document.querySelector('.CodeMirror').CodeMirror.getOption('readOnly')), 'scratch editor editable');
  ok((await cmValue()) === B.PROBLEMS['fa25-1'].code, 'fa25-1 scratch code = submitted version (unedited template)');
  const rvB = await text('#rv-fa25-1b');
  ok(/Your submitted answer/.test(rvB) && rvB.includes('[1, 2]') && /Official answer/.test(rvB) && /✗ Incorrect/.test(rvB), 'panel: submitted answer, verdict, official answer');
  const rvA = await text('#rv-fa25-1a');
  if (B.ANSWER_KEY['fa25-1a'].explanation) ok(/Explanation written for this site, not official/.test(rvA), 'explanations labelled as not official');
  ok(await has('#rv-fa25-1a .choices.static .choice.correct'), 'submitted correct choice shown in green');
  ok(!(await has('#pane-right input')), 'submitted answers are drawn without inputs (cannot be edited)');

  // ── 6/7. edit MCQ, short answer, scratch code; persistence; attempt untouched ──
  const wrongA = (keyA + 1) % parts('fa25-1')[0].choices.length;
  await click(`label[for="c-fa25-1a-${wrongA}"]`);
  ok(/Current review answer/.test(await text('#rv-fa25-1a')) && /doesn’t match the official answer/.test(await text('#rv-fa25-1a')), 'changed MCQ shows current review answer (not scored)');
  ok(await page.$eval('#rv-fa25-1a .badge', (b) => b.textContent) === 'Correct', 'original grade badge unchanged');
  await page.click('#ta-fa25-1b', { clickCount: 3 }); await page.keyboard.press('Backspace');
  await page.keyboard.type(B.ANSWER_KEY['fa25-1b'].accepted[0]);
  ok(/matches the official answer/.test(await text('#rv-fa25-1b')), 'typing updates the review panel live (matches official)');
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# review edit\n', { line: 0, ch: 0 }));
  await click('[data-action="next"]');
  ok((await cmValue()).startsWith('# submitted scratch'), 'sp25-5d scratch code starts from the submitted (edited) version');
  await page.focus('#ta-sp25-5h'); await page.$eval('#ta-sp25-5h', (t) => t.setSelectionRange(t.value.length, t.value.length)); await page.keyboard.type(' # more');
  await wait(400);
  S = await st();
  const W1 = S.reviews[A1.id];
  ok(W1 && W1.answers['fa25-1a'] === wrongA && W1.answers['fa25-1b'] === B.ANSWER_KEY['fa25-1b'].accepted[0] && /# more$/.test(W1.answers['sp25-5h']) && W1.notes['fa25-1'].startsWith('# review edit'), 'review edits saved in a separate workspace');
  ok(JSON.stringify({ answers: S.attempts.find((a) => a.id === A1.id).answers, graded: S.attempts.find((a) => a.id === A1.id).graded, score: S.attempts.find((a) => a.id === A1.id).score, notes: S.attempts.find((a) => a.id === A1.id).notes, eliminated: S.attempts.find((a) => a.id === A1.id).eliminated }) === A1snap, 'attempt answers, grades, score, notes unchanged by review edits');
  // reload → reopen from history
  await page.reload();
  await click('[data-action="enter"]');
  await click('#mode-exam');
  await click(`.hist-row[data-id="${A1.id}"]`);
  ok((await text('.score-main')).includes(`${pa} / ${autoPts} pts`), 'reopened from history: original score unchanged');
  await click('.actions [data-action="exam-review"]');
  await page.waitForSelector('#review-work .part');
  ok(await has(`#c-fa25-1a-${wrongA}:checked`) && (await page.$eval('#ta-fa25-1b', (t) => t.value)) === B.ANSWER_KEY['fa25-1b'].accepted[0] && (await cmValue()).startsWith('# review edit'), 'review edits restored after reload + reopen from history');
  // resets
  await click('#rv-fa25-1a [data-action="reset-answer"]');
  ok(await has(`#c-fa25-1a-${keyA}:checked`) && /same as what you submitted/.test(await text('#rv-fa25-1a')), 'Reset to submitted answer (MCQ)');
  await click('#rv-fa25-1b [data-action="reset-answer"]');
  ok((await page.$eval('#ta-fa25-1b', (t) => t.value)) === '[1, 2]', 'Reset to submitted answer (short answer)');
  await click('#editor-reset');
  ok((await cmValue()) === B.PROBLEMS['fa25-1'].code, 'Reset code to submitted version (fa25-1)');
  await wait(400);
  S = await st();
  const At = S.attempts.find((a) => a.id === A1.id);
  ok(JSON.stringify({ answers: At.answers, graded: At.graded, score: At.score, notes: At.notes, eliminated: At.eliminated }) === A1snap, 'attempt still unchanged after resets');
  ok(/# more$/.test(S.reviews[A1.id].answers['sp25-5h']), 'resets only touch the selected part');

  // ── 3/4/5. Learning insights ──
  await click('.review-banner [data-action="exam-results"]');
  await click('[data-action="goto-insights"]');
  ok(await page.evaluate(() => document.activeElement.id === 'insights'), 'Learning Insights button moves to the section');
  const topics = await page.$$eval('.topic-list li b', (bs) => bs.map((b) => b.textContent));
  const expectTopics = B.QUESTIONS.find((q) => q.id === 'fa25-1b').topics.map((t) => B.TOPICS.find((x) => x.id === t).name);
  ok(JSON.stringify(topics.slice().sort()) === JSON.stringify(expectTopics.slice().sort()), `topics only from the incorrect auto-graded part: ${topics.join(', ')}`);
  const cTopics = B.QUESTIONS.find((q) => q.id === 'fa25-1c').topics.filter((t) => !B.QUESTIONS.find((q) => q.id === 'fa25-1b').topics.includes(t));
  ok(cTopics.every((t) => !topics.includes(B.TOPICS.find((x) => x.id === t).name)) && /1 unanswered part and 1 part graded by course staff aren’t used/.test(await text('#insights')), 'unanswered / staff parts not used as diagnosis (and say so)');
  ok(await count('.guide') === topics.length && await page.$$eval('.guide', (gs) => gs.every((g) => !g.open)), 'one collapsed study guide per topic');
  await page.focus('.guide > summary'); await page.keyboard.press('Enter');
  const g0 = await page.$eval('.guide[open] .guide-body', (b) => ({ concepts: b.querySelectorAll('.concept').length, code: b.querySelectorAll('.concept-code').length, pitfalls: b.querySelectorAll('.pitfall').length, text: b.textContent.length }));
  ok(g0.concepts >= 2 && g0.concepts <= 4 && g0.code >= 1 && g0.pitfalls === g0.concepts && g0.text > 600, `expanded guide: ${g0.concepts} concepts, ${g0.code} code examples, tips (${g0.text} chars)`);
  ok(/written for this site \(not official course material\)/.test(await text('#insights')) && /Concepts worth reviewing/.test(await text('#insights')), 'guides labelled as non-official, "concepts worth reviewing"');
  const recs = await page.$$eval('[data-action="practice-group"]', (bs) => bs.map((b) => b.dataset.pid));
  const inAttempt = new Set(['fa25-1', 'sp25-5d']);
  ok(recs.length > 0 && recs.every((pid) => B.PROBLEMS[pid]) && new Set(recs).size === recs.length, `recommendations are real, unique groups: ${recs.join(', ')}`);
  ok(recs.every((pid) => !inAttempt.has(pid)), 'recommendations exclude questions from this exam (alternatives exist)');
  const recTopicsOk = recs.every((pid) => parts(pid).some((q) => q.topics.some((t) => B.QUESTIONS.find((x) => x.id === 'fa25-1b').topics.includes(t))));
  ok(recTopicsOk && (await page.$$eval('.rec-topic', (ts) => ts.every((t) => t.querySelectorAll('.rec-row').length <= 3))), 'each recommendation shares a missed topic; at most 3 per topic');
  const recLabel = await page.$eval('.rec-row', (r) => r.textContent.replace(/\s+/g, ' ').trim());
  ok(/Midterm 2 · Q/.test(recLabel), `recommendation shows exam/term + question: "${recLabel.slice(0, 70)}"`);
  // Practice action
  const target = recs[0];
  await click(`[data-action="practice-group"][data-pid="${target}"]`);
  await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.session && JSON.stringify(S.session.ids) === JSON.stringify(parts(target).map((q) => q.id)) && await has('[data-action="check"]'), 'Practice opens that question group (all parts) in a new Practice Mode set');
  ok(JSON.stringify((({ answers, graded, score, notes, eliminated }) => ({ answers, graded, score, notes, eliminated }))(S.attempts.find((a) => a.id === A1.id))) === A1snap, 'practicing a recommendation leaves the attempt unchanged');

  // ── 8. two attempts of the same exam have isolated workspaces ──
  await click('[data-action="home"]');
  await click('#mode-exam');
  await click(`.hist-row[data-id="${A1.id}"]`);
  await click('[data-action="retake"]');
  await page.waitForSelector('#pane-right .part');
  await click(`label[for="c-fa25-1a-${wrongA}"]`);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  S = await st();
  const A2 = S.attempts[S.attempts.length - 1];
  ok(A2.id !== A1.id && A2.graded['fa25-1a'] === 'incorrect', 'second attempt of the same exam submitted');
  await click('.actions [data-action="exam-review"]');
  await page.waitForSelector('#review-work .part');
  ok(await has(`#c-fa25-1a-${wrongA}:checked`) && (await page.$eval('#ta-fa25-1b', (t) => t.value)) === '' && !(await cmValue()).includes('# submitted scratch'), 'attempt 2 review starts from attempt 2’s own answers and code');
  await page.focus('#ta-fa25-1b'); await page.keyboard.type('attempt two edit');
  await wait(400);
  S = await st();
  ok(S.reviews[A2.id].answers['fa25-1b'] === 'attempt two edit' && S.reviews[A1.id].answers['fa25-1b'] === '[1, 2]', 'workspaces isolated between attempts');

  // ── 9. empty states ──
  // all correct → no topics; only staff-graded → "No automatically graded questions"
  await startCustom(['fa25-2']);
  await page.focus('#ta-fa25-2a'); await page.keyboard.type(B.ANSWER_KEY['fa25-2a'].accepted[0]);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  ok(/no topics to flag/.test(await text('#insights')) && !(await has('.guide')) && !(await has('.rec-row')), 'all correct: neutral empty state, no invented weaknesses');
  await startCustom(['sp25-5d']);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  const sm0 = await text('.score-main');
  ok(/No automatically graded questions/.test(sm0) && !/0 \/ 0|0%/.test(sm0), `zero auto-gradable: "${sm0.slice(0, 60)}"`);
  // a topic without a guide → fallback (simulate by checking guide coverage: every bank topic with questions has a guide)
  const bankTopics = [...new Set(B.QUESTIONS.flatMap((q) => q.topics))];
  ok(bankTopics.every((t) => G[t] && G[t].length >= 2 && G[t].length <= 4), `every topic in the bank has a 2–4 concept guide (${bankTopics.length} topics)`);
  ok(Object.values(G).flat().every((c) => c.title && c.body && c.body.length > 80 && c.pitfall), 'every concept has a title, a substantive explanation and a tip');

  // corrupt / old records
  await inject(`const id = s.attempts[0].id; s.reviews[id] = 'garbage'; delete s.attempts[1].graded; s.attempts[1].score = { earned: 1, possible: 2, partial: false }; return s;`);
  await click('[data-action="enter"]'); // any action saves the repaired store
  S = await st();
  ok(S.reviews[S.attempts[0].id] === undefined || typeof S.reviews[S.attempts[0].id] === 'object', 'corrupt review record dropped on load');
  ok(S.attempts[1].graded && S.attempts[1].score.v === 2, 'older attempt without frozen grades gets a snapshot on load');
  ok(errors.length === 0, 'no errors after loading corrupt/old records');

  // ── 10. no runtime ──
  ok(!requested.some((u) => /pyodide|worker/i.test(u)), 'no Pyodide / worker requested');
  await click('#mode-exam');
  await click(`.hist-row[data-id="${A1.id}"]`);
  await click('.actions [data-action="exam-review"]');
  await page.waitForSelector('#review-work .part');
  ok(await page.$$eval('button', (bs) => bs.filter((b) => /run code/i.test(b.textContent)).length) === 1 && !(await page.$$eval('button', (bs) => bs.some((b) => /run tests|save & grade/i.test(b.textContent)))), 'review: exactly one Run Code button (Phase 6A), no Run Tests / Save & Grade');
  await page.screenshot({ path: `${OUT}/p4-review.png` });

  // ── responsive ──
  await page.setViewport({ width: 375, height: 740 });
  await wait(200);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile review: no horizontal overflow');
  const order = await page.evaluate(() => { const a = document.getElementById('review-work').getBoundingClientRect().top; const b = document.querySelector('#pane-right .rv-part').getBoundingClientRect().top; return a < b; });
  ok(order, 'mobile review: stacked — question + workspace first, then submitted/official answers');
  const edW = await page.$eval('.CodeMirror', (e) => e.getBoundingClientRect().width);
  ok(edW >= 300, `mobile: code editor stays readable (${Math.round(edW)}px wide)`);
  await click('.review-banner [data-action="exam-results"]');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile results: no horizontal overflow');
  await page.screenshot({ path: `${OUT}/p4-results-mobile.png`, fullPage: true });
  await page.setViewport({ width: 1400, height: 900 });
  await page.screenshot({ path: `${OUT}/p4-results.png`, fullPage: true });

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
