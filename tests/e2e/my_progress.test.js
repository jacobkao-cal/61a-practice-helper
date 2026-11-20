// My Progress: a page of its own (button on the home page) with
//   - the summary, from Exam Mode only: Full Exams Completed, Questions Practiced (each question once), Automatic
//     Accuracy (latest automatic result of each part; skipped and code parts not counted)
//   - My History: every practice set and exam, newest first, Completed / Incomplete / In Progress (0-point parts
//     need no answer), a Filter menu (type, status, exam year), open / continue / review / delete
//   - Topics to Review: topics by parts whose latest exam result is incorrect, each with "Start topic exam"
//     (5 random questions on the topic; numbered "<Topic> Review #n", marked Auto-generated in My History)
// Practice sets are all kept (finished or not); reviewing a finished set has "← Summary" / "Back to summary"; a
// storage warning shows at 90% of the browser's storage.
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
  const dialogs = [];
  let answer = true;
  page.on('dialog', (d) => { dialogs.push(d.message()); answer ? d.accept() : d.dismiss(); });

  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(100); };
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const has = async (sel) => !!(await page.$(sel));
  const st = async () => { await wait(300); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const seed = async (obj) => {
    await page.goto(APP_URL);
    await page.evaluate((k, v) => { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); Storage.prototype.setItem = function () {}; }, KEY, obj ? JSON.stringify(obj) : null);
    await wait(obj && JSON.stringify(obj).length > 1e6 ? 1500 : 50); // Chrome commits a large write asynchronously
    await page.goto(APP_URL);
    await click('[data-action="enter"]');
  };
  const toProgress = async () => { if (!(await has('.progress'))) await click('[data-action="progress"]'); await page.waitForSelector('.progress'); };
  const toHome = async () => { if (await has('.progress')) await click('.progress [data-action="go-home"]'); await page.waitForSelector('.home .mode-switch'); };
  // My History cards (all, or one type)
  const cards = async (type) => { await toProgress(); return page.$$eval('.mh-card', (items, t) => items.filter((i) => !t || i.dataset.type === t).map((i) => ({
    id: (i.querySelector('.mh-open').dataset.id || i.querySelector('.mh-del').dataset.id),
    type: i.dataset.type, status: i.dataset.status,
    title: i.querySelector('.mh-title').firstChild.textContent.trim(),
    auto: !!i.querySelector('.mh-auto'),
    meta: i.querySelector('.mh-meta').textContent,
    tag: i.querySelector('.mh-status').textContent,
    bg: getComputedStyle(i.querySelector('.mh-status')).backgroundColor,
    action: i.querySelector('.mh-open').dataset.action,
  })), type); };
  const setSize = async (n) => { await toHome(); await page.$eval('#set-size', (i, n) => { i.value = String(n); i.dispatchEvent(new Event('change', { bubbles: true })); }, n); await wait(100); };
  const GREEN = 'rgb(230, 244, 234)', RED = 'rgb(251, 233, 231)', GOLD = 'rgb(255, 246, 220)';

  // ── home: a My Progress button; no history sections in either mode ──
  await seed(null);
  ok(!(await has('.home-head [data-action="progress"]')), 'no My Progress button in the header any more');
  const card = await page.evaluate(() => {
    const c = document.querySelector('.mp-teaser'), m = document.querySelector('.mode-switch');
    if (!c || !m) return null;
    const a = c.getBoundingClientRect(), b = m.getBoundingClientRect();
    return { tag: c.tagName, action: c.dataset.action, above: a.bottom <= b.top, wide: Math.abs(a.width - b.width) < 2, tall: a.height > b.height, rings: c.querySelectorAll('.ring').length,
      done: c.querySelector('.ring-done .ring-mid b').textContent, acc: c.querySelector('.ring-pct .ring-mid b').textContent, cap: c.querySelector('.ring-done figcaption').textContent };
  });
  ok(card && card.tag === 'BUTTON' && card.action === 'progress', 'a My Progress card on the home page; the whole card is one button');
  ok(card && card.above && card.wide && card.tall, `it sits right above Practice Mode / Exam Mode, as wide as both, and taller (${JSON.stringify(card && { above: card.above, wide: card.wide, tall: card.tall })})`);
  ok(card && card.rings === 2 && card.done === '0%' && card.acc === '—' && card.cap.startsWith("0/") && card.cap.endsWith(" done"), `it shows questions done (${card && card.done}, ${card && card.cap}) and accuracy (${card && card.acc}) as rings`);
  ok(!(await has('.history')) && !(await has('.practice-history')), 'Practice Mode: no history at the bottom of the home page');
  await click('#mode-exam');
  ok(!(await has('.history')) && !(await has('.hist-row')), 'Exam Mode: no Exam history at the bottom of the home page');
  await click('#mode-practice');
  await toProgress();
  ok(/My Progress/.test(await text('.progress h1')) && (await text('.mp-sub')) === 'Summary from your practice sets and exams', 'My Progress page: heading and "Summary from your practice sets and exams"');
  const empty = await page.$$eval('.mp-stat b', (b) => b.map((x) => x.textContent));
  ok(empty[0] === '0/17' && /^0\/\d{3,}$/.test(empty[1]) && empty[2] === '—', `nothing done yet: 0 of the 17 full exams, 0 of all questions, — accuracy (${empty.join(', ')})`);
  ok(await page.$eval('.mp-stat b small', (s) => parseFloat(getComputedStyle(s).fontSize) < parseFloat(getComputedStyle(s.parentElement).fontSize) * 0.6), 'the total ("/17") is about half the size of the number');
  ok(/Nothing here yet/.test(await text('#mh-h ~ .mp-empty, .mp-card:nth-of-type(2) .mp-empty')) && !(await has('.mh-filter')), 'empty My History: a hint and no Filter button');
  ok(/Answer questions in Practice or Exam Mode/.test(await text('#tr-sec .mp-empty')), 'empty Topics to Review: a hint');
  await toHome();

  // ── practice set A: start, answer one part, leave unfinished ──
  await setSize(2);
  await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  await page.evaluate(() => { const r = document.querySelector('#pane-right .part input[type=radio], #pane-right .part input[type=checkbox]'); if (r) r.click(); else { const t = document.querySelector('#pane-right textarea[data-qid]'); t.value = 'x'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
  await wait(150);
  await click('[data-action="next"]');
  let S = await st();
  const A = S.session;
  ok(typeof A.id === 'string' && A.index === 1, 'a new set gets an id');
  await click('[data-action="home"]');
  let R = await cards('practice');
  ok(R.length === 1 && R[0].id === A.id && R[0].tag === 'In Progress' && R[0].action === 'open-set' && /Practice · .* · 2 questions · \d+ of \d+ parts answered/.test(R[0].meta), `the unfinished set is In Progress; its card continues it (${R[0] && R[0].meta})`);
  const layout = await page.$eval('.mh-card', (c) => { const st = c.querySelector('.mh-status').getBoundingClientRect(), del = c.querySelector('.mh-del').getBoundingClientRect();
    return { inCard: !!c.querySelector('.mh-open .mh-status'), links: c.querySelectorAll('a, .link').length, beside: del.left >= st.right && Math.abs((del.top + del.bottom) / 2 - (st.top + st.bottom) / 2) < 6, small: del.width <= 28 }; });
  ok(layout.inCard && layout.links === 0 && layout.beside && layout.small, `the whole card is one button (no Continue / Review link); a small Delete sits right of the status label (${JSON.stringify(layout)})`);
  ok(R[0].bg === GOLD, `In Progress is gold (${R[0].bg})`);
  ok((await page.$$eval('.mp-stat b', (b) => b.map((x) => x.textContent.split('/')[0]))).join() === '0,1,—', 'an answered part counts toward Questions Practiced (fill-in-the-blank too) but not accuracy until it is Checked');

  // ── set B: starting a new set keeps A, no warning dialog ──
  dialogs.length = 0;
  await setSize(1);
  await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  ok(dialogs.length === 0, 'starting a new set does not ask to replace the unfinished one');
  S = await st();
  const B = S.session;
  ok(B.id !== A.id && S.practice.length === 1 && S.practice[0].id === A.id, 'the unfinished set moved to My History');
  // answer every part of B, so it is Completed
  await page.evaluate(() => document.querySelectorAll('#pane-right .part').forEach((p) => {
    const r = p.querySelector('input[type=radio], input[type=checkbox]');
    if (r) r.click(); else { const t = p.querySelector('textarea[data-qid]'); if (t) { t.value = 'x'; t.dispatchEvent(new Event('input', { bubbles: true })); } }
  }));
  await wait(200);
  answer = true;
  await click('[data-action="finish"]'); await page.waitForSelector('.results');

  // ── reviewing a finished set: back to its summary ──
  await click('.results .result-row[data-action="review"]'); await page.waitForSelector('#pane-right .part');
  ok(/Reviewing a finished set/.test(await text('#p-banner')) && await has('#p-banner [data-action="show-results"]'), 'reviewing a finished set shows a banner with Back to summary');
  ok((await text('.p-footer .left .btn')) === '← Summary' && !(await has('.p-footer [data-action="home"]')), 'the bottom-left button is "← Summary" instead of Exit');
  await click('.p-footer [data-action="show-results"]'); await page.waitForSelector('.results');
  ok(/Practice summary/.test(await text('.results h1')), '← Summary goes back to the Practice summary');

  // ── My History: B (finished, all answered) above A (unfinished) ──
  await click('.results [data-action="go-home"]');
  R = await cards('practice');
  const Bs = (await st()).session;
  const bDone = Bs.ids.every((id) => Bs.answers[id] !== undefined && Bs.answers[id] !== '' && !(Array.isArray(Bs.answers[id]) && !Bs.answers[id].length));
  ok(R.length === 2 && R[0].id === B.id && R[1].id === A.id && R[1].tag === 'In Progress', `My History lists B above A: ${R.map((r) => r.tag).join(', ')}`);
  ok(R[0].tag === (bDone ? 'Completed' : 'Incomplete') && R[0].bg === (bDone ? GREEN : RED) && R[0].action === 'open-set', `a finished set: ${R[0].tag} (${Object.keys(Bs.answers).length} of ${Bs.ids.length} parts answered), opened by its card`);

  // ── open A: it continues where it was left, B goes to My History ──
  await click(`.mh-card [data-action="open-set"][data-id="${A.id}"]`); await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.session.id === A.id && S.session.index === 1 && Object.keys(S.session.answers).length >= 1 && S.practice.some((x) => x.id === B.id), 'clicking an unfinished set’s card continues it where it was left (answers kept)');
  // finish A with parts unanswered: Incomplete
  await click('[data-action="finish"]'); await page.waitForSelector('.results');
  await click('.results [data-action="go-home"]');
  R = await cards('practice');
  ok(R.find((r) => r.id === A.id).tag === 'Incomplete' && R.find((r) => r.id === A.id).bg === RED, 'a finished set with unanswered parts is Incomplete (red)');
  // ── open B: its summary ──
  await click(`.mh-card [data-action="open-set"][data-id="${B.id}"]`); await page.waitForSelector('.results');
  ok((await st()).session.id === B.id, 'clicking a finished set’s card opens its summary');
  await click('.results [data-action="go-home"]');

  // ── delete (cancel, then confirm) ──
  await toProgress();
  answer = false;
  await click(`.mh-card [data-action="delete-set"][data-id="${A.id}"]`);
  ok((await cards('practice')).length === 2 && /Delete .* from My History/.test(dialogs[dialogs.length - 1]), 'Delete asks first; Cancel keeps the set');
  answer = true;
  await click(`.mh-card [data-action="delete-set"][data-id="${A.id}"]`);
  R = await cards('practice');
  ok(R.length === 1 && R[0].id === B.id && !(await st()).practice.some((x) => x.id === A.id), 'confirming deletes it');

  // ── Start Over moves the unfinished set to My History ──
  await setSize(1);
  await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  const C = (await st()).session;
  await click('[data-action="home"]');
  dialogs.length = 0;
  await click('.resume [data-action="discard"]');
  S = await st();
  ok(dialogs.length === 0 && S.session === null && S.practice.some((x) => x.id === C.id) && (await cards('practice')).some((r) => r.id === C.id && r.tag === 'In Progress'), 'Start Over keeps the unfinished set in My History (no dialog)');

  // ── a running timer is paused when its set is set aside, and restarts when it is continued ──
  await setSize(1);
  await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  const D = (await st()).session;
  ok(D.timer && D.timer.runningSince, 'the new set has a running timer');
  await click('[data-action="home"]');
  await setSize(1);
  await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  S = await st();
  const Dk = S.practice.find((x) => x.id === D.id);
  ok(Dk && Dk.timer.runningSince === null && Dk.timer.remainingMs > 0, 'a set in My History has its timer paused');
  await click('[data-action="home"]');
  await toProgress();
  await click(`.mh-card [data-action="open-set"][data-id="${D.id}"]`); await page.waitForSelector('#pane-right .part');
  ok(!!(await st()).session.timer.runningSince, 'continuing it restarts the timer');

  // ── the summary: Exam Mode only, each question once, latest automatic result per part ──
  // Seeded attempts: A1 a full Fall 2025 Midterm 2 with every part answered except one 0-point (A+) part (Completed);
  // A2 a retake with one part left unanswered (Incomplete); A3 a topic-based exam with a Fall 2024 part.
  const plan = await page.evaluate(() => {
    const Bk = window.CS61A_BANK;
    const parts = Bk.QUESTIONS.filter((q) => q.problem.startsWith('fa25-') && !q.problem.startsWith('fa25f'));
    const mc = parts.filter((q) => q.type === 'single_choice');
    const zero = parts.find((q) => (typeof q.points === 'number' ? q.points : Bk.PROBLEMS[q.problem].points) === 0);
    const p3 = Bk.QUESTIONS.find((q) => q.problem.startsWith('fa24-') && q.type === 'single_choice' && q.topics.length);
    return { ids: parts.map((q) => q.id), p1: mc[0].id, p2: mc.find((q) => q.problem !== mc[0].problem).id, zero: zero.id, p3: p3.id, p3problem: p3.problem, p3topics: p3.topics,
      problemOf: Object.fromEntries(parts.concat(p3).map((q) => [q.id, q.problem])) };
  });
  const groupsOf = (ids) => { const g = []; ids.forEach((id) => { const pid = plan.problemOf[id]; const last = g[g.length - 1]; if (last && last.pid === pid) last.ids.push(id); else g.push({ pid, ids: [id] }); }); return g; };
  const answersFor = (ids, skip = []) => Object.fromEntries(ids.filter((id) => !skip.includes(id)).map((id) => [id, 0]));
  const score = { v: 2, earned: 1, possible: 2, auto: 2, counts: { correct: 1, incorrect: 1, staff: 0, skipped: 0 }, staff: 0, unknown: 0, partial: false };
  const attempt = (id, kind, examId, title, ids, graded, skip, at) => ({ id, aid: null, mode: 'exam', kind, examId, title, ids, groups: groupsOf(ids), index: 0, answers: answersFor(ids, skip), graded,
    score, notes: {}, annotations: {}, eliminated: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, timer: null, startedAt: at - 1000, finishedAt: at, finished: true, submitted: true, autoSubmitted: false });
  const gradedAll = (ids, over) => Object.assign(Object.fromEntries(ids.map((id) => [id, 'staff'])), over);
  const now = Date.now();
  const A1 = attempt('xa1', 'full', 'fa25', 'Fall 2025 Midterm 2', plan.ids, gradedAll(plan.ids, { [plan.p1]: 'incorrect', [plan.p2]: 'correct', [plan.zero]: 'skipped' }), [plan.zero], now - 300000);
  const A2 = attempt('xa2', 'full', 'fa25', 'Fall 2025 Midterm 2', plan.ids, gradedAll(plan.ids, { [plan.p1]: 'correct', [plan.p2]: 'skipped' }), [plan.p2], now - 200000);
  const A3 = attempt('xa3', 'custom', null, 'Custom exam · 1 question', [plan.p3], { [plan.p3]: 'incorrect' }, [], now - 100000);
  const practiceWrong = { id: 'pw', ids: [plan.p3], index: 0, title: 'Practice with a wrong answer', answers: { [plan.p3]: 0 }, timer: null, startedAt: now - 50000, finishedAt: now - 40000, finished: true, notes: {}, annotations: {} };
  await seed({ version: 5, prefs: { mode: 'practice' }, attempts: [A1, A2, A3], practice: [practiceWrong] });
  await toProgress();
  // questions with an answered part in the Completed exams (A1 skipped its A+ part; A2 is Incomplete, so it is left out)
  const problems = new Set(plan.ids.map((id) => plan.problemOf[id]).concat(plan.p3problem));
  const stats = await page.$$eval('.mp-stat b', (b) => b.map((x) => x.textContent));
  ok(stats[0] === '1/17', `Full Exams Completed: full exams with every part answered (A+ excepted), out of all 17: ${stats[0]}`);
  ok(stats[1].split('/')[0] === String(problems.size), `Questions Practiced: every submitted exam (the Incomplete retake too), each question once (${stats[1]}, expected ${problems.size})`);
  ok(stats[2] === '33%', `Automatic Accuracy: each part's first try (the retake that got Q1 right comes later, so Q1 stays wrong; unchecked practice is left out): ${stats[2]}`);
  R = await cards();
  ok(R.find((r) => r.id === 'xa1').tag === 'Completed' && R.find((r) => r.id === 'xa2').tag === 'Incomplete' && R.find((r) => r.id === 'xa1').action === 'open-attempt', 'exams: Completed (A+ unanswered is fine) / Incomplete (a part left unanswered), opened by their cards');
  ok(R.find((r) => r.id === 'xa1').meta.startsWith('Full Exam · ') && R.find((r) => r.id === 'xa3').meta.startsWith('Topic-based Exam · '), 'cards show the type: Full Exam / Topic-based Exam');
  ok(R.map((r) => r.id).join() === 'pw,xa3,xa2,xa1', `newest first (${R.map((r) => r.id).join(', ')})`);
  const topics = await page.$$eval('#tr-sec .mp-topic', (t) => t.map((x) => [x.dataset.topic, x.querySelector('.mp-topic-n').textContent]));
  ok(plan.p3topics.every((t) => topics.some(([id, n]) => id === t && n.startsWith('1 incorrect'))) && topics[0][1].startsWith('1 incorrect')
    && topics.filter(([id]) => !plan.p3topics.includes(id)).every(([, n]) => n.startsWith('0 incorrect')), `Topics to Review: the topics whose latest exam result is incorrect (${topics.map((t) => t.join(' ')).join('; ')})`);

  // ── Filter ──
  ok(/^Filter/.test(await text('.mh-filter-btn')), 'My History has a Filter button');
  await click('[data-action="menu"][data-id="hfilter"]');
  const groups = await page.$$eval('.mh-filter .dd-group', (g) => g.map((x) => x.textContent));
  ok(groups.join() === 'Type,Status,Exam year', `the Filter menu has Type, Status and Exam year (${groups.join(', ')})`);
  const years = await page.$$eval('.mh-filter input[data-hf="year"]', (i) => i.map((x) => x.value));
  ok(years.join() === '2025,2024', `exam years come from the sets' past exams, newest first (${years.join(', ')})`);
  const pick = async (key, v) => { await page.click(`.mh-filter input[data-hf="${key}"][value="${v}"]`); await wait(150); };
  const ids = () => page.$$eval('.mh-card', (c) => c.map((x) => (x.querySelector('.mh-open').dataset.id || x.querySelector('.mh-del').dataset.id)));
  await pick('type', 'exam');
  ok((await ids()).join() === 'xa3,xa2,xa1' && /Filter · 1/.test(await text('.mh-filter-btn')) && await has('.mh-filter .dd-panel'), 'Type Exam: only exams; the button shows 1 filter; the menu stays open');
  await pick('status', 'incomplete');
  ok((await ids()).join() === 'xa2', 'Type Exam + Status Incomplete: only the incomplete retake');
  await pick('status', 'incomplete'); await pick('type', 'exam');
  await pick('year', '2024');
  ok((await ids()).join() === 'pw,xa3', 'Exam year 2024: the sets with Fall 2024 questions');
  await pick('status', 'progress');
  ok(/No sets match/.test(await text('.mp-card:nth-of-type(2)')), 'no match: "No sets match these filters"');
  await click('[data-action="hfilter-clear"]');
  ok((await ids()).length === 4 && /^Filter ▾$/.test(await text('.mh-filter-btn')), 'Clear filters shows everything again');
  await page.mouse.click(5, 5); await wait(150);
  ok(!(await has('.mh-filter .dd-panel')), 'clicking outside closes the Filter menu');

  // ── Topics to Review → Start topic exam ──
  const topic = plan.p3topics[0];
  await click(`.mp-topic-go[data-topic="${topic}"]`); await page.waitForSelector('#pane-right .part');
  S = await st();
  const ex = S.exam;
  const topicName = await page.evaluate((t) => (window.CS61A_BANK.TOPICS || []).concat(window.CS61A_GLEAM ? window.CS61A_GLEAM.TOPICS || [] : []).find((x) => x.id === t), topic);
  const pool = await page.evaluate((t) => [...new Set(window.CS61A_BANK.QUESTIONS.filter((q) => q.topics.includes(t)).map((q) => q.problem))].length, topic);
  ok(ex && ex.kind === 'custom' && ex.auto && ex.auto.topic === topic && ex.auto.n === 1 && ex.groups.length === Math.min(5, pool), `Start topic exam: a topic-based exam of ${ex && ex.groups.length} questions (5, or all if fewer)`);
  ok(ex.title === `${topicName ? topicName.name : ''} Review #1`, `named "<Topic> Review #1" (${ex.title})`);
  const allHaveTopic = await page.evaluate((g, t) => g.every((x) => x.ids.some((id) => window.CS61A_BANK.QUESTIONS.find((q) => q.id === id).topics.includes(t))), ex.groups, topic);
  ok(allHaveTopic, 'every question in it has that topic');
  ok(!ex.timer, 'it starts without a timer');
  await click('[data-action="save-leave"]');
  R = await cards();
  const live = R.find((r) => r.type === 'review');
  ok(live && live.auto && live.tag === 'In Progress' && live.action === 'resume-exam' && live.meta.startsWith('Topic Review Exam · '), 'in My History: Auto-generated, Topic Review Exam, In Progress, its card resumes it');
  // a second one: confirms discarding the unfinished exam, and is #2
  dialogs.length = 0;
  await click(`.mp-topic-go[data-topic="${topic}"]`); await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(/unfinished exam/.test(dialogs[0] || '') && S.exam.title.endsWith('Review #2') && S.autoCounts[topic] === 2, `a second topic exam asks before replacing the unfinished one and is numbered #2 (${S.exam.title})`);
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  S = await st();
  const sub = S.attempts[S.attempts.length - 1];
  ok(sub.auto && sub.auto.n === 2 && sub.title.endsWith('Review #2'), 'submitted: it stays a Topic Review exam');
  await click('[data-action="retake"]'); await page.waitForSelector('#pane-right .part');
  S = await st();
  ok(S.exam.auto && S.exam.title === sub.title, 'Retake keeps its name and Topic Review type');
  await click('[data-action="save-leave"]');
  await toProgress();
  await click('[data-action="menu"][data-id="hfilter"]'); await pick('type', 'review');
  ok((await cards()).every((r) => r.type === 'review' && r.auto) && (await cards()).length === 2, 'Type Topic Review: only the auto-generated exams');
  await click('[data-action="hfilter-clear"]'); await page.mouse.click(5, 5); await wait(150);
  // deleting a submitted exam
  await click(`.mh-card [data-action="delete-attempt"][data-id="${sub.id}"]`);
  S = await st();
  ok(!S.attempts.some((a) => a.id === sub.id) && !(await cards()).some((r) => r.id === sub.id), 'Delete removes a submitted exam from My History');
  // Resume from My History
  await click('.mh-card [data-action="resume-exam"]'); await page.waitForSelector('#pane-right .part');
  ok((await st()).exam && (await st()).exam.title === sub.title, 'Resume continues the exam in progress');
  await click('[data-action="save-leave"]');

  // ── a later Completed retake that gets the part right: its latest result counts ──
  const A4 = attempt('xa4', 'full', 'fa25', 'Fall 2025 Midterm 2', plan.ids, gradedAll(plan.ids, { [plan.p1]: 'correct', [plan.zero]: 'skipped' }), [plan.zero], now - 10000);
  await seed({ version: 5, prefs: { mode: 'practice' }, attempts: [A1, A2, A3, A4] });
  await toProgress();
  const stats2 = await page.$$eval('.mp-stat b', (b) => b.map((x) => x.textContent));
  ok(stats2[0] === '1/17' && stats2[1] === stats[1] && stats2[2] === '33%', `a Completed retake of the same exam: still 1 of 17 full exams, questions still counted once (${stats2[1]}), accuracy keeps each part's first try (${stats2[2]})`);

  // ── phone width: no sideways scroll ──
  await toProgress();
  await page.setViewport({ width: 390, height: 900 }); await wait(200);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'My Progress fits a phone screen (no sideways scroll)');
  await page.setViewport({ width: 1400, height: 900 });

  // ── older saves: the last finished set (no id) appears in My History ──
  await seed({ version: 5, prefs: { mode: 'practice' }, session: { ids: ['fa25-1a'], index: 0, title: 'Old finished set', answers: { 'fa25-1a': 3 }, timer: null, startedAt: Date.now() - 86400000, finishedAt: Date.now() - 86000000, finished: true } });
  R = await cards();
  ok(R.length === 1 && R[0].title === 'Old finished set' && R[0].tag === 'Completed', 'a finished set saved before My History is listed');

  // ── storage warning ──
  await seed({ version: 5, prefs: { mode: 'practice' }, practice: [{ id: 'big', ids: ['fa25-1a'], index: 0, title: 'Big notes', answers: {}, notes: { 'fa25-1': 'x'.repeat(4600000) }, timer: null, startedAt: Date.now(), finished: false }] });
  ok(/Storage almost full \(9\d%\)/.test(await text('.storage-warn')) && /My History/.test(await text('.storage-warn')), `the home page warns at 90% of storage and points to My History: "${(await text('.storage-warn')).slice(0, 40)}"`);
  await toProgress();
  ok(await has('.progress .storage-warn'), 'the warning also shows on My Progress');
  // Chrome can commit the 4.6 MB write late; clear it and give it time, so the next seed is what loads
  await page.goto(APP_URL); await page.evaluate((k) => localStorage.removeItem(k), KEY); await wait(1500);
  await seed({ version: 5, prefs: { mode: 'practice' } });
  ok(!(await has('.storage-warn')), 'no warning when there is room');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nAll My Progress checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
