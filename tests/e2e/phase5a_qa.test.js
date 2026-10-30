// Phase 5A: QA regression suite (fixed defects, grading audit, navigation, data integrity, Phase 6 readiness).
const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const URL = APP_URL;
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const st = async (p = page) => { await wait(400); return p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  // Replace the stored state, then load the app without the old page saving over it.
  const seed = async (raw, p = page) => {
    await p.evaluate((k, raw) => { localStorage.setItem(k, raw); Storage.prototype.setItem = function () {}; }, KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
    await p.goto(URL); await wait(150);
  };
  const click = async (sel, p = page) => { await p.waitForSelector(sel, { visible: true, timeout: 8000 }); await p.click(sel); await wait(60); };
  const has = async (sel, p = page) => !!(await p.$(sel));
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());

  await page.goto(URL);
  const B = await page.evaluate(() => window.CS61A_BANK);
  const parts = (pid) => B.QUESTIONS.filter((q) => q.problem === pid);
  const examPids = (e) => Object.keys(B.PROBLEMS).filter((pid) => B.PROBLEMS[pid].exam === e && parts(pid).length);
  const autoGradable = (q) => q.type === 'single_choice' || q.type === 'multi_select' || (q.type === 'short_answer' && B.ANSWER_KEY[q.id] && (B.ANSWER_KEY[q.id].accepted || []).length);

  // ── §10 malformed / outdated saved data never crashes ──
  const bad = {
    'not JSON': '{oops', 'a number': '42', 'an array': '[1,2]',
    'prefs wrong types': { prefs: { topics: 'trees', exams: null, difficulties: 5, types: {}, size: 'x', minutes: 'y', mode: 'zzz' } },
    'session index out of range': { session: { ids: ['fa25-1a'], groups: [{ pid: 'fa25-1', ids: ['fa25-1a'] }], index: 9, title: 't', answers: {}, timer: null, startedAt: 1, finished: false } },
    'session missing answers': { session: { ids: ['fa25-1a'], index: 0, title: 't', timer: null, startedAt: 1, finished: false } },
    'session groups mismatched': { session: { ids: ['fa25-1a'], groups: [{ pid: 'zzz', ids: ['nope'] }], index: 0, title: 't', answers: {}, timer: null, startedAt: 1 } },
    'session unknown question id': { session: { ids: ['nope-1'], index: 0, title: 't', answers: {} } },
    'session timer malformed': { session: { ids: ['fa25-1a'], index: 0, title: 't', answers: {}, timer: { runningSince: 'x' }, startedAt: 1 } },
    'attempt missing answers': { attempts: [{ id: 'x1', mode: 'exam', submitted: true, kind: 'full', examId: 'fa25', title: 'T', ids: ['fa25-1a'], index: 0, finishedAt: 1, startedAt: 0 }] },
    'attempt without id': { attempts: [{ mode: 'exam', submitted: true, ids: ['fa25-1a'], answers: {} }] },
    'attempts not an array': { attempts: { a: 1 } },
    'examPrefs wrong types': { prefs: { mode: 'exam' }, examPrefs: { topics: 'trees', picked: 'fa25-1', kind: 'weird', minutes: 'z', timerOn: 'yes' } },
    'exam timer malformed': { exam: { id: 'e1', mode: 'exam', ids: ['fa25-1a'], index: 0, title: 'T', answers: {}, timer: { runningSince: 'x' }, kind: 'custom', startedAt: 1 } },
    'review workspace corrupt': { attempts: [{ id: 'x2', mode: 'exam', submitted: true, kind: 'full', examId: 'fa25', title: 'T', ids: ['fa25-1a'], answers: { 'fa25-1a': 3 }, finishedAt: 1, startedAt: 0 }], reviews: { x2: { reviewOf: 'x2', answers: 5 } } },
  };
  for (const [name, raw] of Object.entries(bad)) {
    const before = errors.length;
    await seed(raw);
    for (const sel of ['[data-action="enter"]', '.resume [data-action="resume"]', '[data-action="resume-exam"]', '#mode-exam', '[data-action="open-attempt"]', '.actions [data-action="exam-review"]', '[data-action="exam-results"]', '#mode-practice']) {
      const el = await page.$(sel);
      if (el && await el.isIntersectingViewport().catch(() => false)) { try { await el.click(); await wait(80); } catch (e) { /* element went away */ } }
    }
    ok(errors.length === before, `malformed data handled: ${name}${errors.length > before ? ' → ' + errors.slice(before).join(' | ').slice(0, 140) : ''}`);
  }
  // valid data still loads after repair: a good attempt next to a bad one is kept
  await seed({ attempts: [{ mode: 'exam' }, { id: 'ok1', mode: 'exam', submitted: true, kind: 'custom', title: 'Good', ids: ['fa25-1a'], answers: { 'fa25-1a': 3 }, finishedAt: 5, startedAt: 0 }] });
  await click('[data-action="enter"]'); await click('#mode-exam');
  ok(await page.$$eval('.hist-row', (r) => r.length) === 1 && /Good/.test(await text('.history')), 'a valid attempt next to a damaged one is preserved');

  // ── §5 grading audit: every question, official answers → everything auto-gradable correct ──
  for (const exam of ['fa25', 'sp25']) {
    await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'full', examId: exam, topics: [], picked: [], timerOn: false, minutes: 120 } });
    await click('[data-action="enter"]'); await click('[data-action="start-exam"]');
    const pids = examPids(exam);
    for (let gi = 0; gi < pids.length; gi++) {
      for (const q of parts(pids[gi])) {
        const key = B.ANSWER_KEY[q.id];
        if (q.type === 'single_choice') await click(`label[for="c-${q.id}-${key.correct}"]`);
        else if (q.type === 'multi_select') { for (const i of key.correct) await click(`label[for="c-${q.id}-${i}"]`); }
        else if (key && key.accepted) await page.$eval(`#ta-${q.id}`, (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, key.accepted[0]);
      }
      if (gi < pids.length - 1) await click('[data-action="next"]');
    }
    await click('.p-footer [data-action="submit-exam"]');
    await page.waitForSelector('.exam-results');
    const S = await st();
    const a = S.attempts[S.attempts.length - 1];
    const auto = a.ids.map((id) => B.QUESTIONS.find((q) => q.id === id)).filter(autoGradable);
    const wrong = auto.filter((q) => a.graded[q.id] !== 'correct').map((q) => q.id);
    const pts = auto.filter((q) => typeof q.points === 'number').reduce((t, q) => t + q.points, 0);
    ok(!wrong.length, `${exam}: all ${auto.length} auto-gradable parts graded correct with the official answer${wrong.length ? ' — wrong: ' + wrong.join(', ') : ''}`);
    ok(a.score.earned === pts && a.score.possible === pts, `${exam}: score ${a.score.earned}/${a.score.possible} = full auto-gradable points ${pts}`);
    ok(a.ids.filter((id) => B.QUESTIONS.find((q) => q.id === id).type === 'code').every((id) => a.graded[id] === 'staff' || a.graded[id] === 'skipped'), `${exam}: code parts never auto-graded`);
    // consistency: Results headline / Exam History badge / Review badges
    const head = await text('.score-main .v');
    await click('[data-action="go-home"]');
    const badge = await page.$eval(`.hist-row[data-id="${a.id}"] .badge`, (b) => b.textContent);
    ok(head.replace(/\s+/g, '') === `${pts}/${pts}pts` && badge === `Auto-graded ${pts} / ${pts} pts`, `${exam}: Results "${head}" and History "${badge}" agree`);
  }
  // wrong / partial / whitespace & quote-insensitive / unanswered
  const multi = B.QUESTIONS.find((q) => q.type === 'multi_select' && B.ANSWER_KEY[q.id].correct.length >= 1);
  const sa = B.QUESTIONS.find((q) => q.type === 'short_answer' && /'/.test(B.ANSWER_KEY[q.id].accepted[0] || '') || false) || B.QUESTIONS.find((q) => q.id === 'fa25-3b');
  await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: [multi.problem, 'fa25-3'], timerOn: false, minutes: 120 } });
  await click('[data-action="enter"]'); await click('[data-action="start-exam"]');
  const mk = B.ANSWER_KEY[multi.id].correct;
  const extra = multi.choices.findIndex((_, i) => !mk.includes(i));
  for (const i of [...mk, extra]) await click(`label[for="c-${multi.id}-${i}"]`); // correct ones + one extra → incorrect
  await click('[data-action="next"]');
  const k3b = B.ANSWER_KEY['fa25-3b'].accepted[0];
  await page.$eval('#ta-fa25-3b', (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, '  ' + k3b.replace(/ /g, '   ').replace(/'/g, '"') + ' ');
  await page.$eval('#ta-fa25-3c', (t) => { t.value = '   '; t.dispatchEvent(new Event('input', { bubbles: true })); });
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  let S = await st();
  let a = S.attempts[S.attempts.length - 1];
  ok(a.graded[multi.id] === 'incorrect', 'select-all: correct choices plus an extra one is incorrect (all-or-nothing)');
  ok(a.graded['fa25-3b'] === 'correct', 'short answer: extra spaces and quote style ignored');
  ok(a.graded['fa25-3c'] === 'skipped' && a.graded['fa25-3a'] === 'skipped', 'whitespace-only and empty answers count as unanswered');
  ok(/practice purposes only and do not predict your actual exam scores/.test(await text('.exam-results')), 'exam results disclaimer present');

  // ── §1 / §9 practice isolation (eliminations + answers + code) ──
  await seed({ prefs: { mode: 'practice', timerOn: false, size: 'all', types: ['single_choice'], exams: ['fa25'], difficulties: ['easy', 'medium', 'hard'], topics: [] } });
  await click('[data-action="enter"]'); await click('[data-action="start"]');
  await page.waitForSelector('.elim-btn');
  const firstPart = await page.$eval('#pane-right .part', (p) => p.dataset.part);
  await click(`#x-${firstPart}-0`); await click(`label[for="c-${firstPart}-1"]`);
  ok(await has(`#part-${firstPart} .choice.eliminated`), 'elimination applied in set A');
  await click('[data-action="home"]'); await click('[data-action="start"]'); // new set B, same filters → same question
  await page.waitForSelector('.elim-btn');
  await click('#nav-toggle'); await click(`#nav-${B.QUESTIONS.find((q) => q.id === firstPart).problem}`);
  ok(!(await has('.choice.eliminated')) && !(await has(`#c-${firstPart}-1:checked`)), 'new set: no eliminations or answers inherited');

  // ── §3 practice Exit pauses the timer; Resume restarts it ──
  await seed({ prefs: { mode: 'practice', timerOn: true, minutes: 25, size: 5 } });
  await click('[data-action="enter"]'); await click('[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  await click('[data-action="home"]');
  S = await st();
  const rem = S.session.timer.remainingMs;
  ok(S.session.timer.runningSince === null && S.session.timer.pausedByExit, 'Exit pauses a running practice timer');
  ok(/\(paused\)/.test(await text('.resume')), 'home shows the practice timer as paused');
  await wait(1200);
  ok((await st()).session.timer.remainingMs === rem, 'no time lost while away');
  await click('.resume [data-action="resume"]');
  S = await st();
  ok(S.session.timer.runningSince && S.session.timer.remainingMs === rem && !S.session.timer.pausedByExit, 'Resume restarts it from the same time');
  // a timer the student paused themselves stays paused after Exit → Resume
  await click('[data-action="pause"]'); await click('[data-action="home"]'); await click('.resume [data-action="resume"]');
  ok((await st()).session.timer.runningSince === null, 'a manually paused timer stays paused through Exit → Resume');

  // ── §2 Go to Home (Practice Summary) ──
  await click('#nav-toggle'); await click('.navigator [data-action="finish"]'); await page.waitForSelector('.results');
  const actions = await page.$$eval('.results .actions .btn', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  ok(actions.length === 4 && /^Retry incorrect & unanswered/.test(actions[0]) && actions[1] === 'Review answers' && actions[2] === 'New set' && actions[3] === 'Go to Home', `Practice Summary actions: ${actions.join(' | ')}`);
  ok(await page.$eval('[data-action="go-home"]', (b) => b.classList.contains('btn') && !b.classList.contains('btn-primary') && !!b.querySelector('svg')), 'Go to Home uses the outline button style with a home icon');
  ok(/practice purposes only/.test(await text('.results')), 'Practice Summary shows the practice-only disclaimer');
  const sessBefore = JSON.stringify((await st()).session);
  const histBefore = JSON.stringify({ attempts: (await st()).attempts, reviews: (await st()).reviews });
  await page.focus('[data-action="go-home"]'); await page.keyboard.press('Enter'); await wait(150);
  ok(await has('.home') && !(await has('.results')), 'Go to Home (keyboard Enter) shows the home page');
  S = await st();
  ok(JSON.stringify(S.session) === sessBefore, 'no new practice set created; finished set unchanged');
  ok(JSON.stringify({ attempts: S.attempts, reviews: S.reviews }) === histBefore, 'Exam History and review workspaces unchanged');
  // New set → practice setup even if Exam Mode was last used
  await click('#mode-exam');
  await click('.resume [data-action="show-results"]').catch(() => {});
  if (await has('.results')) {
    await click('[data-action="new-set"]');
    ok(await has('[data-action="start"]') && !(await has('.exam-setup')), '"New set" opens the practice setup (even after Exam Mode)');
  }

  // ── §2 Go to Home from exam Results and from Interactive Review ──
  // (keep the practice set; add one submitted attempt so there is history to check)
  await page.evaluate((k) => { const x = JSON.parse(localStorage.getItem(k)); x.examPrefs = { kind: 'custom', topics: [], picked: ['fa25-2'], timerOn: false, minutes: 120 }; x.prefs.mode = 'exam'; localStorage.setItem(k, JSON.stringify(x)); Storage.prototype.setItem = function () {}; }, KEY);
  await page.goto(URL); await click('[data-action="enter"]'); await click('[data-action="start-exam"]');
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  await click('[data-action="go-home"]');
  ok(await has('.resume [data-action="resume"]') || await has('.resume [data-action="show-results"]'), 'practice set still offered after an exam');
  const hist = await page.$$eval('.hist-row', (r) => r.map((x) => x.dataset.id));
  await click(`.hist-row[data-id="${hist[0]}"]`);
  await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
  ok(await has('.review-banner [data-action="go-home"]'), 'Interactive Review has a Go to Home button');
  await click('.review-banner [data-action="go-home"]');
  ok(await has('.home .history') && await page.$$eval('.hist-row', (r) => r.length) === hist.length, 'Review → Go to Home: home with Exam History intact');
  await click(`.hist-row[data-id="${hist[0]}"]`);
  ok(await has('.exam-results'), 'completed attempt reopens from history');

  // ── §10 two tabs: a stale tab can no longer overwrite exam history ──
  await seed({ prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['fa25-2'], timerOn: false, minutes: 120 } });
  await click('[data-action="enter"]'); await click('[data-action="start-exam"]'); await wait(300);
  const tabB = await browser.newPage(); tabB.on('dialog', (d) => d.accept()); await tabB.setViewport({ width: 1400, height: 900 });
  await tabB.goto(URL); await tabB.waitForSelector('#ta-fa25-2a');
  await page.bringToFront(); await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results'); await wait(300);
  const n1 = (await st()).attempts.length;
  await tabB.bringToFront(); await wait(200);
  ok(await has('.stale-overlay', tabB) && await tabB.evaluate(() => document.getElementById('app').inert && document.activeElement.id === 'stale-reload'), 'stale tab shows "out of date" notice, page inert, Reload focused');
  await tabB.evaluate(() => { const t = document.getElementById('ta-fa25-2a'); t.value = 'x'; t.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(600);
  await tabB.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  await wait(200);
  S = await st();
  ok(S.attempts.length === n1 && !S.exam, `stale tab didn't overwrite history (attempts ${S.attempts.length}, exam in progress: ${!!S.exam})`);
  await tabB.click('#stale-reload'); await tabB.waitForSelector('.landing', { timeout: 5000 });
  ok(!(await has('.stale-overlay', tabB)), 'Reload picks up the current state');
  await tabB.close(); await page.bringToFront();

  // ── §13 Phase 6A readiness ──
  await click('[data-action="go-home"]'); await click('#mode-exam');
  await click('.hist-row'); await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part');
  const ready = await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.replaceRange('# probe\n', { line: 0, ch: 0 });
    const slot = document.querySelector('.run-slot');
    return { value: cm.getValue().startsWith('# probe'), slot: !!slot && slot.hidden && !!slot.dataset.runSlot };
  });
  await wait(400);
  S = await st();
  const wid = Object.keys(S.reviews)[0];
  ok(ready.value && Object.values(S.reviews[wid].notes).some((n) => n.startsWith('# probe')), 'CodeMirror text is retrievable and saved to the review workspace only');
  ok(!S.attempts.some((x) => Object.values(x.notes || {}).some((n) => n.startsWith('# probe'))), 'submitted attempts unaffected by editor changes');
  ok(ready.slot, 'reserved run slot exists next to the editor (hidden, keyed by problem)');

  // ── §11 responsive: results action rows wrap, no overflow ──
  await page.setViewport({ width: 375, height: 740 });
  await click('.review-banner [data-action="exam-results"]');
  const wrapOk = await page.evaluate(() => { const r = document.querySelector('.results .actions'); return getComputedStyle(r).flexWrap === 'wrap' && document.documentElement.scrollWidth <= innerWidth; });
  ok(wrapOk, 'mobile: results action row wraps without horizontal overflow');
  await page.setViewport({ width: 768, height: 1024 });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'tablet: results fit');
  await page.setViewport({ width: 1400, height: 900 });

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
