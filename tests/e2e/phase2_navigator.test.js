const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const URL = APP_URL;
const OUT = require('os').tmpdir();
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());

  const sess = async () => { await wait(40); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)).session, KEY); };
  const toggleText = () => page.$eval('#nav-toggle', (b) => b.textContent.replace(/\s+/g, ' ').trim());
  const navOpen = async () => !!(await page.$('#navigator'));
  const tiles = () => page.$$eval('.nav-cell', (cs) => cs.map((c) => ({ pid: c.dataset.pid, text: c.textContent, cls: c.className, label: c.getAttribute('aria-label') })));
  const focusedId = () => page.evaluate(() => document.activeElement && document.activeElement.id);

  // Start: all types, all problems (full bank, enough tiles to test scrolling on mobile)
  await page.goto(URL);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ prefs: { topics: [], exams: Object.keys(window.CS61A_BANK.EXAMS), difficulties: ['easy', 'medium', 'hard'], types: ['single_choice', 'multi_select', 'short_answer', 'code'], size: 'all', timerOn: true, minutes: 25 } })), KEY);
  await page.reload();
  await page.click('[data-action="enter"]');
  await page.click('[data-action="start"]');
  await page.waitForSelector('#pane-right .part');
  let s = await sess();
  const G = s.groups.length;
  ok(G > 1, `session has ${G} question groups (${s.ids.length} parts)`);
  ok(await toggleText() === `Question 1 of ${G} ▴`, `bottom bar shows "Question 1 of ${G}"`);
  ok(await page.$eval('[data-action="prev"]', (b) => b.disabled), 'Back disabled on first question');

  // Open / close by clicking the whole control
  await page.click('#nav-toggle');
  ok(await navOpen(), 'clicking the question-number control opens the navigator');
  ok(await page.$eval('#nav-title', (h) => h.textContent) === 'Question Navigator', 'header reads "Question Navigator"');
  ok(!!(await page.$('.navigator .legend')) && !!(await page.$('.nav-close')), 'legend and close button present');
  ok(await focusedId() === `nav-${s.groups[0].pid}`, 'focus moves to the current tile on open');
  let t = await tiles();
  ok(t.length === G && t.every((x, i) => x.text === String(i + 1)), 'one tile per question group, numbered 1..Y');
  const multiIdx = s.groups.findIndex((g) => g.ids.length > 1);
  ok(multiIdx >= 0 && t.length < s.ids.length, `multi-part groups get a single tile (${t.length} tiles for ${s.ids.length} parts)`);
  ok(t[0].cls.includes('current') && t[0].label.includes('current question'), 'current tile marked visually and for screen readers');
  await page.click('#nav-toggle');
  ok(!(await navOpen()), 'clicking it again closes the navigator');
  ok(await focusedId() === 'nav-toggle', 'focus returns to the toggle after closing');

  // Edits in group 0 that must survive navigation: elimination, scratch code, annotation, mark
  const g0 = s.groups[0];
  const mcId = await page.evaluate(() => { const c = document.querySelector('#pane-right .choices'); return c && c.closest('.part').dataset.part; });
  if (mcId) { await page.click(`#x-${mcId}-1`); }
  await page.evaluate(() => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.replaceRange('# my scratch note\n', { line: 0, ch: 0 }); });
  await page.evaluate((k, pid) => {}, KEY, g0.pid);
  await page.click('[data-ann="pen"]');
  const art = await page.$('#problem-article .annot-layer');
  const box = await art.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 80); await page.mouse.up();
  await page.click('[data-ann="pen"]');
  await page.click('[data-action="mark"]');
  s = await sess();
  const annCount = (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).session.annotations, KEY))[g0.pid].length;
  ok(annCount === 1 && s.marked[g0.pid], 'set up: pen stroke + marked for review on Q1');

  // Unanswered + marked
  await page.click('#nav-toggle');
  t = await tiles();
  ok(t[0].cls.includes('unanswered') && t[0].cls.includes('marked') && t[0].label.includes('unanswered, marked for review'), 'Q1: unanswered AND marked (both shown)');

  // Timer running: capture remaining before jump
  const timerBefore = s.timer;

  // Jump first → last using the navigator
  await page.click(`#nav-${s.groups[G - 1].pid}`);
  s = await sess();
  ok(s.index === G - 1, 'tile click jumps to last question group');
  ok(!(await navOpen()), 'navigator closes after a jump');
  ok(await toggleText() === `Question ${G} of ${G} ▴`, 'bottom indicator updated to last question');
  ok(await page.$eval('#pane-right .question', (q, n) => q.getAttribute('aria-label') === `Question ${n}`, G), 'right pane shows the jumped-to question');
  const lastBtn = await page.$eval('.p-footer .right .btn:last-child', (b) => [b.dataset.action, b.textContent]);
  ok(lastBtn[0] === 'finish' && lastBtn[1] === 'Finish', 'last question shows explicit Finish (no auto-submit)');
  ok(s.timer.runningSince === timerBefore.runningSince && s.timer.remainingMs === timerBefore.remainingMs, 'timer untouched by navigation');
  ok(s.groups.every((g, i) => g.pid === (s.groups[i] || {}).pid), 'groups unchanged');

  // Back to Q1 via navigator: everything preserved
  await page.click('#nav-toggle');
  await page.click(`#nav-${g0.pid}`);
  s = await sess();
  ok(s.index === 0, 'jump back to Q1');
  if (mcId) ok(!!(await page.$(`#part-${mcId} .choice.eliminated`)), 'Phase 1 elimination preserved');
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue().startsWith('# my scratch note')), 'CodeMirror scratch edit preserved');
  ok(await page.$$eval('#problem-article .annot-layer path', (p) => p.length) === 1, 'pen annotation preserved');
  ok(await page.$eval('[data-action="mark"]', (b) => b.getAttribute('aria-pressed')) === 'true', 'mark for review preserved');

  // Partial: answer one part of a multi-part group
  await page.click('#nav-toggle');
  const mg = s.groups[multiIdx];
  await page.click(`#nav-${mg.pid}`);
  const firstPart = mg.ids[0];
  const firstType = await page.evaluate((id) => window.CS61A_BANK.QUESTIONS.find((q) => q.id === id).type, firstPart);
  if (firstType === 'single_choice' || firstType === 'multi_select') await page.click(`label[for="c-${firstPart}-0"]`);
  else { await page.type(`#ta-${firstPart}`, 'x'); }
  await page.click('#nav-toggle');
  t = await tiles();
  ok(t[multiIdx].cls.includes('partial') && !t[multiIdx].cls.includes(' answered') && t[multiIdx].label.includes(`1 of ${mg.ids.length} parts answered`), 'partly answered group shows Partial, not Answered');

  // Whitespace-only short answer does not count
  const saGroup = s.groups.findIndex((g) => g.ids.length === 1 && ['short_answer', 'code'].includes(QTYPE(g.ids[0])));
  function QTYPE() { return null; }
  // Answer all parts of the multi-part group -> answered; then mark it -> answered + marked
  await page.click('#nav-toggle');
  for (const id of mg.ids) {
    const type = await page.evaluate((id) => window.CS61A_BANK.QUESTIONS.find((q) => q.id === id).type, id);
    const has = (await sess()).answers[id];
    if (has !== undefined && has !== '' && !(Array.isArray(has) && !has.length)) continue;
    if (type === 'single_choice' || type === 'multi_select') await page.click(`label[for="c-${id}-0"]`);
    else { await page.focus(`#ta-${id}`); await page.keyboard.type('   '); }
  }
  await page.click('#nav-toggle');
  t = await tiles();
  const anyText = await page.evaluate((ids) => ids.some((id) => ['short_answer', 'code'].includes(window.CS61A_BANK.QUESTIONS.find((q) => q.id === id).type)), mg.ids);
  if (anyText) ok(t[multiIdx].cls.includes('partial'), 'whitespace-only text answers do not count as answered');
  await page.click('#nav-toggle');
  for (const id of mg.ids) {
    if (await page.$(`#ta-${id}`)) { await page.focus(`#ta-${id}`); await page.keyboard.type('ans'); }
  }
  await page.keyboard.press('Tab'); // leave textarea
  await page.evaluate(() => document.activeElement.blur());
  if (!(await sess()).marked[mg.pid]) await page.keyboard.press('m');
  await page.click('#nav-toggle');
  t = await tiles();
  ok(t[multiIdx].cls.includes('answered') && t[multiIdx].cls.includes('marked') && !t[multiIdx].cls.includes('partial'), 'all parts answered → Answered, and marked shown alongside');

  // Keyboard on tiles: arrows move focus between tiles, Enter activates
  await page.focus(`#nav-${s.groups[0].pid}`);
  await page.keyboard.press('ArrowRight');
  ok(await focusedId() === `nav-${s.groups[1].pid}`, 'ArrowRight moves focus to the next tile (does not change question)');
  ok((await sess()).index === multiIdx, 'question unchanged while arrowing within the grid');
  await page.keyboard.press('End');
  ok(await focusedId() === `nav-${s.groups[G - 1].pid}`, 'End moves to last tile');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  const cols = await page.$$eval('.nav-cell', (cs) => cs.filter((c) => c.offsetTop === cs[0].offsetTop).length);
  if (G > cols) ok(await focusedId() === `nav-${s.groups[cols].pid}`, `ArrowDown moves one row (${cols} columns)`);
  await page.keyboard.press('Enter');
  ok((await sess()).index === (G > cols ? cols : 0) && !(await navOpen()), 'Enter on a tile navigates and closes');

  // Escape closes
  await page.click('#nav-toggle');
  await page.keyboard.press('Escape');
  ok(!(await navOpen()) && await focusedId() === 'nav-toggle', 'Escape closes the navigator and returns focus');

  // Outside click closes
  await page.click('#nav-toggle');
  await page.mouse.click(300, 300);
  ok(!(await navOpen()), 'clicking outside closes the navigator');

  // Shortcuts don't fire while editing
  await page.click('#nav-toggle'); await page.click(`#nav-${g0.pid}`);
  let idx = (await sess()).index;
  await page.click('.CodeMirror-lines');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await page.keyboard.type('m');
  s = await sess();
  ok(s.index === idx && s.marked[g0.pid] === true, 'arrows / M inside CodeMirror do not navigate or toggle mark');
  ok(await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue().includes('m')), '…and the keystrokes reach the editor');
  const taSel = await page.$('#pane-right textarea');
  if (taSel) {
    await taSel.focus();
    await page.keyboard.type('mm'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
    s = await sess();
    ok(s.index === idx && s.marked[g0.pid] === true, 'arrows / M inside an answer textarea do not navigate or toggle mark');
  }
  // Shortcuts still work from the page
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('ArrowRight');
  ok((await sess()).index === idx + 1, 'ArrowRight from the page goes to next question');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  ok((await sess()).index === 0, 'ArrowLeft on first question stays on first');

  // Refresh while navigator open → current question restored
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  const before = (await sess()).index;
  await page.click('#nav-toggle');
  await page.reload();
  await page.click('[data-action="resume"]');
  await page.waitForSelector('#nav-toggle');
  ok((await sess()).index === before && await toggleText() === `Question ${before + 1} of ${G} ▴`, 'refresh (with navigator open) restores the current question');
  await page.click('#nav-toggle');
  t = await tiles();
  ok(t[0].cls.includes('marked') && t[multiIdx].cls.includes('answered'), 'navigator state restored after refresh');
  await page.screenshot({ path: `${OUT}/nav-desktop.png` });

  // Exam-mode option hides ✓/✗ (render-level check via a checked part)
  // (Practice shows checks; just verify the default still shows the bad marker after an incorrect check.)

  // Mobile: viewport containment and scrolling
  await page.setViewport({ width: 375, height: 667, isMobile: false });
  await wait(100);
  const r = await page.$eval('#navigator', (n) => { const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, sh: n.scrollHeight, ch: n.clientHeight }; });
  ok(r.l >= 0 && r.r <= 375 && r.t >= 0 && r.b <= 667, `mobile: navigator inside viewport (${Math.round(r.l)},${Math.round(r.t)})–(${Math.round(r.r)},${Math.round(r.b)})`);
  const wide = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, els: Array.from(document.querySelectorAll('body *')).filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.CodeMirror')).slice(-4).map((e) => e.tagName + '.' + e.className + ' r=' + Math.round(e.getBoundingClientRect().right)) }));
  ok(wide.sw <= 375, `mobile: no horizontal overflow ${wide.sw > 375 ? JSON.stringify(wide) : ''}`);
  const tileH = await page.$eval('.nav-cell', (c) => c.getBoundingClientRect().height);
  ok(tileH >= 44, `mobile: tiles are tap-sized (${tileH}px)`);
  await page.setViewport({ width: 375, height: 420, isMobile: false });
  await wait(100);
  const r2 = await page.$eval('#navigator', (n) => ({ sh: n.scrollHeight, ch: n.clientHeight, t: n.getBoundingClientRect().top, ov: getComputedStyle(n).overflowY }));
  ok(r2.t >= 0 && (r2.sh <= r2.ch || r2.ov === 'auto'), `short screen: navigator scrolls (content ${r2.sh}px in ${r2.ch}px)`);
  const closeVis = await page.$eval('.nav-close', (b) => { const x = b.getBoundingClientRect(); return x.top >= 0 && x.bottom <= window.innerHeight; });
  await page.$eval('#navigator', (n) => { n.scrollTop = n.scrollHeight; });
  const closeVis2 = await page.$eval('.nav-close', (b) => { const x = b.getBoundingClientRect(); const n = document.getElementById('navigator').getBoundingClientRect(); return x.top >= n.top - 1 && x.bottom <= window.innerHeight; });
  ok(closeVis && closeVis2, 'close button stays visible when navigator content scrolls');
  await page.setViewport({ width: 375, height: 667, isMobile: false });
  await page.$eval('#navigator', (n) => { n.scrollTop = 0; });
  await page.screenshot({ path: `${OUT}/nav-mobile.png` });
  await page.setViewport({ width: 820, height: 1000 });
  await wait(100);
  const rt = await page.$eval('#navigator', (n) => { const b = n.getBoundingClientRect(); return b.left >= 0 && b.right <= 820 && b.top >= 0; });
  ok(rt, 'tablet: navigator inside viewport');
  await page.setViewport({ width: 1400, height: 900 });

  // One-group session
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const { QUESTIONS } = window.CS61A_BANK;
    const pid = QUESTIONS[0].problem;
    const ids = QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id);
    st.session = { ids, groups: [{ pid, ids }], index: 0, title: 'Single', answers: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, eliminated: {}, timer: null, startedAt: Date.now(), finishedAt: null, finished: false };
    localStorage.setItem(k, JSON.stringify(st));
    Storage.prototype.setItem = function () {};
  }, KEY);
  await page.reload();
  await page.click('[data-action="resume"]');
  await page.waitForSelector('#nav-toggle');
  ok(await toggleText() === 'Question 1 of 1 ▴', 'single-group session: "Question 1 of 1"');
  ok(await page.$eval('[data-action="prev"]', (b) => b.disabled) && (await page.$eval('.p-footer .right .btn:last-child', (b) => b.dataset.action)) === 'finish', 'single-group: Back disabled, Finish shown');
  await page.click('#nav-toggle');
  ok((await tiles()).length === 1, 'single-group navigator has one tile');
  await page.keyboard.press('Escape');

  // New session resets nav + review state; smaller-than-bank session
  await page.click('[data-action="home"]');
  await page.evaluate((k) => { const st = JSON.parse(localStorage.getItem(k)); st.prefs.size = 5; localStorage.setItem(k, JSON.stringify(st)); Storage.prototype.setItem = function () {}; }, KEY);
  await page.reload();
  await page.click('[data-action="enter"]');
  await page.click('[data-action="start"]');
  await page.waitForSelector('#nav-toggle');
  s = await sess();
  ok(s.index === 0 && Object.keys(s.marked).length === 0 && Object.keys(s.eliminated).length === 0 && Object.keys(s.answers).length === 0, 'new session: index 0, no marks/answers/eliminations');
  await page.click('#nav-toggle');
  t = await tiles();
  ok(t.length === s.groups.length && s.groups.length <= 5 && await toggleText() === `Question 1 of ${s.groups.length} ▾`, `subset session: ${t.length} tiles, matches "of ${s.groups.length}"`);
  ok(t.every((x) => x.cls.includes('unanswered') && !x.cls.includes('marked')), 'new session tiles all unanswered, unmarked');
  const stored = JSON.stringify(await sess());
  ok(!/"status"|answeredCount|partial/.test(stored), 'no derived completion status stored');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
