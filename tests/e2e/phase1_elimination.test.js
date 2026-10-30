const puppeteer = require('puppeteer-core');
const { APP_URL, CHROME } = require('./config');
const URL = APP_URL;
const OUT = require('os').tmpdir();
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const sess = async () => { await new Promise((r) => setTimeout(r, 50)); return (await store()).session; };
  const choiceState = (qid) => page.evaluate((qid) => Array.from(document.querySelectorAll(`#part-${qid} .choices li`)).map((li) => ({
    elim: li.querySelector('.choice').classList.contains('eliminated'),
    checked: li.querySelector('input').checked,
    btn: li.querySelector('.elim-btn').getAttribute('aria-label'),
    deco: getComputedStyle(li.querySelector('.txt')).textDecorationLine,
  })), qid);
  const elim = (qid, i) => page.click(`#x-${qid}-${i}`);
  const pick = (qid, i) => page.click(`label[for="c-${qid}-${i}"]`);

  await page.goto(URL);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ prefs: { topics: [], exams: ['fa25mt2', 'sp25mt2'], difficulties: ['easy', 'medium', 'hard'], types: ['single_choice', 'multi_select'], size: 'all', timerOn: true, minutes: 25 } })), KEY);
  // exam ids may differ; fall back to whatever the bank has
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.prefs.exams = Object.keys(window.CS61A_BANK.EXAMS); localStorage.setItem(k, JSON.stringify(s)); Storage.prototype.setItem = function () {}; }, KEY);
  await page.reload();
  await page.click('[data-action="enter"]');
  await page.click('[data-action="start"]');
  await page.waitForSelector('.choices');

  // Find a single_choice part with >= 4 options in the current group, else navigate.
  const findPart = async (type, minChoices) => {
    for (let n = 0; n < 60; n++) {
      const qid = await page.evaluate((type, minChoices) => {
        const { QUESTIONS } = window.CS61A_BANK;
        const parts = Array.from(document.querySelectorAll('#pane-right .part'));
        const p = parts.find((el) => { const q = QUESTIONS.find((x) => x.id === el.dataset.part); return q.type === type && q.choices.length >= minChoices; });
        return p ? p.dataset.part : null;
      }, type, minChoices);
      if (qid) return qid;
      const next = await page.$('[data-action="next"]');
      if (!next) return null;
      await next.click();
    }
    return null;
  };

  const qid = await findPart('single_choice', 4);
  ok(!!qid, `found single-choice part ${qid}`);
  const qIndex = (await sess()).index;

  // Eliminate A and B
  await elim(qid, 0); await elim(qid, 1);
  let st = await choiceState(qid);
  ok(st[0].elim && st[1].elim && !st[2].elim, 'A and B eliminated, C normal');
  ok(st[0].deco.includes('line-through'), 'eliminated text has line-through');
  ok(st[0].btn === 'Undo elimination of option A' && st[2].btn === 'Eliminate option C', 'aria labels switch to Undo');
  ok(!st.some((c) => c.checked), 'eliminating does not select anything');
  let s = await sess();
  ok(s.answers[qid] === undefined, 'no answer recorded after eliminating');
  ok(JSON.stringify(s.eliminated[qid]) === '[0,1]', 'eliminated persisted to localStorage by question id');

  await page.screenshot({ path: `${OUT}/elim-single.png` });

  // Select C
  await pick(qid, 2);
  st = await choiceState(qid);
  ok(st[0].elim && st[1].elim && st[2].checked && !st[2].elim && !st[3].elim, 'A,B eliminated; C selected; D normal');

  // Select eliminated A → un-eliminated & selected
  await pick(qid, 0);
  st = await choiceState(qid);
  s = await sess();
  ok(st[0].checked && !st[0].elim && st[1].elim, 'selecting eliminated A restores it and selects it');
  ok(s.answers[qid] === 0 && JSON.stringify(s.eliminated[qid]) === '[1]', 'state: answer 0, eliminated [1]');

  // Eliminate the selected option → answer unchanged
  await elim(qid, 0);
  st = await choiceState(qid);
  s = await sess();
  ok(st[0].checked && st[0].elim && s.answers[qid] === 0, 'eliminating selected A keeps it selected');

  // Undo B
  await elim(qid, 1);
  st = await choiceState(qid);
  ok(!st[1].elim && st[1].btn === 'Eliminate option B' && !st[1].deco.includes('line-through'), 'Undo restores B');

  // Eliminate all
  const nChoices = st.length;
  for (let i = 0; i < nChoices; i++) if (!st[i].elim) await elim(qid, i);
  st = await choiceState(qid);
  ok(st.every((c) => c.elim) && st[0].checked, 'all options eliminated; selection intact');

  // Check answer: grading matches gradeMC regardless of elimination
  await page.click(`#part-${qid} [data-action="check"]`);
  s = await sess();
  const expected = await page.evaluate((qid) => window.CS61A_BANK.ANSWER_KEY[qid].correct === 0 ? 'correct' : 'incorrect', qid);
  ok(s.checked[qid] === expected, `Check Answer grades normally (${s.checked[qid]})`);

  // Keyboard: focus an elim button, press Enter / Space
  await page.focus(`#x-${qid}-2`);
  await page.keyboard.press('Enter');
  st = await choiceState(qid);
  ok(!st[2].elim, 'Enter on focused Undo restores option C');
  const focusedId = await page.evaluate(() => document.activeElement.id);
  ok(focusedId === `x-${qid}-2`, 'focus stays on the elimination button after re-render');
  await page.keyboard.press('Space');
  st = await choiceState(qid);
  ok(st[2].elim, 'Space re-eliminates option C');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok(ring !== 'none', `visible focus indicator (${ring})`);

  // Navigate away and back
  const before = JSON.stringify((await sess()).eliminated[qid]);
  if (await page.$('[data-action="next"]')) { await page.click('[data-action="next"]'); await page.click('[data-action="prev"]'); }
  else { await page.click('[data-action="prev"]'); await page.click('[data-action="next"]'); }
  st = await choiceState(qid);
  ok(JSON.stringify(st.map((c, i) => c.elim ? i : -1).filter((i) => i >= 0)) === before, 'eliminations persist across navigation');

  // Other questions are unaffected
  s = await sess();
  ok(Object.keys(s.eliminated).length === 1, 'no leakage to other questions');

  // Refresh
  await page.reload();
  await page.click('[data-action="resume"]');
  await page.waitForSelector(`#part-${qid}`);
  st = await choiceState(qid);
  ok(JSON.stringify(st.map((c, i) => c.elim ? i : -1).filter((i) => i >= 0)) === before && st[0].checked, 'eliminations + answer restored after refresh');

  // Multi-select
  const mid = await findPart('multi_select', 3);
  ok(!!mid, `found multi-select part ${mid}`);
  if (mid) {
    await pick(mid, 0);
    await elim(mid, 1);
    await elim(mid, 2);
    st = await choiceState(mid);
    s = await sess();
    ok(st[0].checked && !st[0].elim && st[1].elim && st[2].elim && JSON.stringify(s.answers[mid]) === '[0]', 'multi: eliminating others keeps [0] selected');
    await pick(mid, 1);
    st = await choiceState(mid);
    s = await sess();
    ok(st[1].checked && !st[1].elim && st[2].elim && JSON.stringify(s.answers[mid]) === '[0,1]', 'multi: checking eliminated option un-eliminates it, keeps others');
    await elim(mid, 0);
    s = await sess();
    ok(JSON.stringify(s.answers[mid]) === '[0,1]', 'multi: eliminating a checked option leaves the answer');
    await page.screenshot({ path: `${OUT}/elim-multi.png` });
  }

  // Multi-part problem: different parts in same group keep separate state
  const groupInfo = await page.evaluate(() => Array.from(document.querySelectorAll('#pane-right .part .choices')).map((c) => c.closest('.part').dataset.part));
  if (groupInfo.length > 1) {
    const [p1, p2] = groupInfo;
    const e1 = JSON.stringify((await sess()).eliminated[p1] || []);
    await elim(p2, 0);
    ok(JSON.stringify((await sess()).eliminated[p1] || []) === e1 || p1 === mid, `parts ${p1}/${p2} sharing a problem keep separate state`);
  } else console.log('INFO  current group has a single MC part; multi-part check skipped');

  // Reveal solution still works with eliminations
  await page.click(`#part-${mid} [data-action="reveal"]`);
  await page.click(`#part-${mid} [data-action="reveal-yes"]`);
  ok(!!(await page.$(`#part-${mid} .feedback`)), 'Show Solution still works');

  // New session clears eliminations
  await page.click('[data-action="home"]');
  page.once('dialog', (d) => d.accept());
  await page.click('[data-action="start"]');
  await page.waitForSelector('#pane-right .part');
  s = await sess();
  ok(s.eliminated && Object.keys(s.eliminated).length === 0, 'new session starts with no eliminations');
  ok(!(await page.$('.choice.eliminated')), 'no eliminated options rendered in new session');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
