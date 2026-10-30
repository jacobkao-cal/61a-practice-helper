// Bug fix: practice annotations / code / answers must be scoped to the practice session.
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
  const st = async () => { await wait(400); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY); };
  const inject = async (src) => {
    await page.evaluate((k, src) => { const s = JSON.parse(localStorage.getItem(k)) || {}; const out = new Function('s', src)(s) || s; localStorage.setItem(k, JSON.stringify(out)); Storage.prototype.setItem = function () {}; }, KEY, src);
    await page.reload();
  };
  const click = async (sel) => { await page.click(sel); await wait(50); };
  const has = async (sel) => !!(await page.$(sel));
  const marks = () => page.evaluate(() => ({ hl: document.querySelectorAll('#problem-article mark.hl').length, pen: document.querySelectorAll('#problem-article .annot-layer path:not(.live)').length, codeHl: document.querySelectorAll('.cm-hl').length }));
  const cm = () => page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue());

  await page.goto(URL);
  const B = await page.evaluate(() => window.CS61A_BANK);
  // A practice set of exactly fa25-1 and fa25-3 (so "same question" is controlled), all types, no timer.
  const practiceSet = (pids) => `s.prefs = Object.assign(s.prefs || {}, { mode: 'practice', timerOn: false }); return s;`;
  await inject(practiceSet());
  await click('[data-action="enter"]');
  // start a real practice set through the UI, then pin its content to fa25-1 + fa25-3 via the app's own action:
  // use a Learning-Insights-style handoff is exam-only, so instead start a set and drive it to fa25-1.
  await page.evaluate(() => {});
  await click('[data-action="start"]');
  await page.waitForSelector('#pane-right .part');
  let S = await st();
  const first = S.session.groups[0].pid;
  const firstQ = B.QUESTIONS.find((q) => q.problem === first);

  // ── annotate: highlight + pen + code edit + code highlight + an answer ──
  const highlight = async () => {
    await page.evaluate(() => {
      const p = document.querySelector('#problem-article [data-annot="intro"] p') || document.querySelector('#problem-article [data-annot="intro"]');
      const r = document.createRange(); r.selectNodeContents(p); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    });
    await click('[data-ann="hl"]'); await click('[data-ann="hl"]'); // highlight selection, then leave highlighter mode
  };
  const pen = async () => {
    await click('[data-ann="pen"]');
    const box = await (await page.$('#problem-article .annot-layer')).boundingBox();
    await page.mouse.move(box.x + 40, box.y + 50); await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + 70); await page.mouse.up();
    await click('[data-ann="pen"]');
  };
  await highlight();
  await pen();
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# my old note\n', { line: 0, ch: 0 }));
  const answerFirst = async () => {
    if (firstQ.type === 'single_choice' || firstQ.type === 'multi_select') await click(`label[for="c-${firstQ.id}-0"]`);
    else { await page.focus(`#ta-${firstQ.id}`); await page.keyboard.type('old answer'); }
  };
  await answerFirst();
  let m = await marks();
  ok(m.hl >= 1 && m.pen === 1, `annotated Q1: ${m.hl} highlight, ${m.pen} pen stroke`);

  // ── leave the question and come back in the same session ──
  if (S.session.groups.length > 1) { await click('[data-action="next"]'); await click('[data-action="prev"]'); }
  m = await marks();
  ok(m.hl >= 1 && m.pen === 1 && (await cm()).startsWith('# my old note'), 'leave + return within the session: annotations and code kept');
  ok(!(await page.$eval('[data-ann="undo"]', (b) => b.disabled)), 'undo history kept within the session');

  // ── Exit then Resume (practice's save-and-leave), and a full reload + resume ──
  await click('[data-action="home"], [data-action="go-home"]');
  await click('[data-action="resume"]');
  m = await marks();
  ok(m.hl >= 1 && m.pen === 1 && (await cm()).startsWith('# my old note'), 'Exit → Resume: annotations, code and answers kept');
  await page.reload();
  await click('[data-action="resume"]');
  await page.waitForSelector('#problem-article');
  m = await marks();
  ok(m.hl >= 1 && m.pen === 1 && (await cm()).startsWith('# my old note'), 'reload → Resume: annotations and code restored');
  S = await st();
  ok(S.notes === undefined && S.annotations === undefined && S.session.notes[first] && S.session.annotations[first].length === 2, 'stored on the practice session (no store-wide notes/annotations)');

  // snapshot exam history / review state, to prove the fix doesn't touch it
  // (create one submitted attempt + a review edit first)
  await inject(`s.prefs.mode = 'exam'; s.examPrefs = { kind: 'custom', topics: [], picked: ['${first}'], timerOn: false, minutes: 120 }; return s;`);
  await click('[data-action="enter"]');
  await click('[data-action="start-exam"]');
  await page.waitForSelector('#pane-right .part');
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# exam note\n', { line: 0, ch: 0 }));
  ok(!(await cm()).includes('# my old note') && (await marks()).pen === 0, 'exam on the same question starts clean (no practice notes/annotations)');
  await wait(400);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  await click('.actions [data-action="exam-review"]');
  await page.waitForSelector('#review-work .part');
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# review note\n', { line: 0, ch: 0 }));
  await wait(400);
  S = await st();
  const histSnap = JSON.stringify({ attempts: S.attempts, reviews: S.reviews });

  // ── start a NEW practice set containing the same question ──
  await click('.review-banner [data-action="exam-results"]');
  await click('[data-action="home"], [data-action="go-home"]');
  await click('#mode-practice');
  await inject(`s.examPrefs.picked = []; return s;`); // reload with the store as saved
  await click('[data-action="enter"]');
  // Start Over (restart from scratch) then a new set that is forced to contain the same question
  await click('[data-action="discard"]');
  S = await st();
  ok(S.session === null, 'Start Over discards the practice set (and its notes/annotations with it)');
  await inject(`s.prefs.exams = ['${B.PROBLEMS[first].exam}']; s.prefs.topics = []; s.prefs.size = 'all'; return s;`);
  await click('[data-action="enter"]');
  await click('[data-action="start"]');
  await page.waitForSelector('#pane-right .part');
  S = await st();
  const gi = S.session.groups.findIndex((g) => g.pid === first);
  ok(gi >= 0, `new set contains the same question (${first})`);
  await click('#nav-toggle'); await click(`#nav-${first}`);
  m = await marks();
  ok(m.hl === 0 && m.pen === 0 && m.codeHl === 0, 'new set: no old highlights or pen strokes');
  ok((await cm()) === B.PROBLEMS[first].code, 'new set: scratch code is the original exam code');
  ok(await page.$eval('[data-ann="undo"]', (b) => b.disabled), 'new set: undo history is empty');
  ok(!(await has('#pane-right input:checked')) && (await page.$$eval('#pane-right textarea', (ts) => ts.every((t) => t.value === ''))), 'new set: answers start empty');

  // ── same page, no reload: practice set A → new set B with the same first problem (in-memory caches) ──
  await highlight(); await pen();
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.replaceRange('# set B note\n', { line: 0, ch: 0 }));
  await click('[data-action="home"], [data-action="go-home"]');
  await click('[data-action="start"]'); // replaces set B (confirm accepted) without reloading the page
  await page.waitForSelector('#pane-right .part');
  await click('#nav-toggle'); await click(`#nav-${first}`);
  m = await marks();
  ok(m.hl === 0 && m.pen === 0 && !(await cm()).includes('# set B note'), 'new set started without a reload: nothing carried over from the cached editor');

  // ── retry-missed is also a new set ──
  await click('#nav-toggle'); await click('.navigator [data-action="finish"]');
  await page.waitForSelector('.results');
  if (!(await page.$eval('[data-action="retry-missed"]', (b) => b.disabled))) {
    await click('[data-action="retry-missed"]');
    await page.waitForSelector('#pane-right .part');
    m = await marks();
    ok(m.hl === 0 && m.pen === 0, 'Retry incorrect & unanswered starts with clean annotations');
  }

  // ── exam history and review workspaces untouched ──
  S = await st();
  ok(JSON.stringify({ attempts: S.attempts, reviews: S.reviews }) === histSnap, 'exam history and review workspaces unchanged by new practice sets');

  // ── v3 → v4 migration: shared notes move onto the unfinished set (only its own problems) ──
  await inject(`s.version = 3; s.notes = { '${first}': '# legacy note\\n' + 'x', 'sp25-1': '# other' }; s.annotations = { '${first}': [{ id: 'a1', kind: 'pen', block: 0, pts: [[1,1],[20,20]] }], 'sp25-1': [] };
    s.session = { ids: ${JSON.stringify(B.QUESTIONS.filter((q) => q.problem === first).map((q) => q.id))}, index: 0, title: 'Legacy', answers: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, timer: null, startedAt: Date.now(), finished: false };
    delete s.session.notes; return s;`);
  await click('[data-action="resume"]');
  await page.waitForSelector('#problem-article');
  ok((await cm()).startsWith('# legacy note') && (await marks()).pen === 1, 'saved v3 practice set keeps its own notes + annotations');
  await click('[data-action="home"], [data-action="go-home"]');
  S = await st();
  ok(S.version === 4 && S.notes === undefined && !S.session.notes['sp25-1'], 'old notes for other problems are not carried into the set');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
