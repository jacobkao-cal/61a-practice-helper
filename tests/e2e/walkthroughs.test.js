// Walkthrough videos: one official YouTube playlist per past exam (app/data/walkthroughs.js), linked only from
// after-the-fact pages. Full Exam Results: one Walkthrough link beside “Questions”. Topic-based exam results: one
// per question group header (never per part), found from the group's own exam. Practice Summary: a collapsible
// “Walkthrough Videos” section between the action buttons and the question list, one row per source exam with its
// number of question groups. Never during an exam in progress or on exam setup; no link without a playlist.
const puppeteer = require('puppeteer-core');
const path = require('path');
const { APP_URL, CHROME, skipTour } = require('./config');
const KEY = 'cs61a-practice:v1';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

global.window = {};
require(path.join(__dirname, '..', '..', 'app', 'data', 'questions.js'));
require(path.join(__dirname, '..', '..', 'app', 'data', 'final_questions.js'));
require(path.join(__dirname, '..', '..', 'app', 'data', 'walkthroughs.js'));
const B = window.CS61A_BANK;
const W = window.CS61A_WALKTHROUGHS;
const idsOf = (pid) => B.QUESTIONS.filter((q) => q.problem === pid).map((q) => q.id);
const URLS = {
  fa25: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZdHLeNazq9I_9fq7RNi88_3',
  sp25: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZdplR_nWuFysBTGb6vS1lPf',
  fa24: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZdLRCSh96VduetN63u1RzEC',
  sp24: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZfbmnkOylwvn2E3G6mhAIYj',
  fa23: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZdFxYu7LlJI8DLhfxpqnSkO',
  sp23: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZenSsdPn9cE8-OOM3nGcg5V',
  fa22: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcAajfg4WZT-DyuhXMlR_hJ',
  fa21: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcwZ1N5xCL2y48ca2U9dbw5',
  // Finals (Fall 2020 Final has no playlist)
  fa25f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZee1n-ukPBeLEhAfAUYXngC',
  sp25f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZeyOevOODbw2tKFLlQGQ3NI',
  fa24f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcwzHlkGBWsNm9ti2c7Q1O3',
  sp24f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcmxfWmIQpkzFsT03tbUWct',
  fa23f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZddSeGrdHHiRlHu07nXxgnT',
  sp23f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcAyMGQiKmKotYDcjgXRnMx',
  fa22f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZcRqzzMB-kDTSH6FLx6uQ84',
  fa21f: 'https://www.youtube.com/playlist?list=PLx38hZJ5RLZdqzIVxJ_gTbtHchjBNaw9N',
};

// ── Playlist mapping (data only) ──
ok(Object.entries(URLS).every(([e, u]) => W.getWalkthroughPlaylist(e) === u) && Object.keys(W.PLAYLISTS).length === 16, 'the eight midterms and eight finals provided map to their exact playlist URLs, and nothing else is listed');
ok(Object.keys(URLS).every((e) => B.EXAMS[e]), 'every mapped id is an exam id in the question bank');
ok(['fa20', 'sp22', '', null, undefined, 'constructor', '__proto__', 'toString', 42].every((e) => W.getWalkthroughPlaylist(e) === null), 'unknown or odd exam ids → null');
const byQ = (qid) => W.getWalkthroughPlaylist(B.PROBLEMS[B.QUESTIONS.find((q) => q.id === qid).problem].exam);
ok(W.getWalkthroughPlaylist('fa20f') === null && byQ('fa25f-3a') === URLS.fa25f && byQ('fa25f-3a') !== URLS.fa25, 'Fall 2020 Final has no playlist; a final question opens its Final playlist, not the Midterm 2 one');
ok(['fa25-1a', 'fa25-4c', 'fa25-6e'].map(byQ).every((u) => u === URLS.fa25), 'different questions from one exam resolve to the same playlist');
const mixed = ['sp23-5a-a', 'fa25-3a', 'sp23-1a', 'fa24-5e', 'fa22-1a'].filter((id) => B.QUESTIONS.some((q) => q.id === id));
ok(mixed.length >= 4 && mixed.every((id) => byQ(id) === URLS[B.PROBLEMS[B.QUESTIONS.find((q) => q.id === id).problem].exam]), `a mixed list resolves each question to its own exam (${mixed.join(', ')})`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await skipTour(page);
  await page.setViewport({ width: 1400, height: 900 });
  // New tabs (YouTube) are recorded and closed straight away, without loading.
  const opened = [];
  browser.on('targetcreated', async (t) => { if (t.type() === 'page' && /youtube\.com/.test(t.url())) { opened.push(t.url()); const p = await t.page().catch(() => null); if (p) await p.close().catch(() => {}); } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const seed = async (obj) => { await page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj)); await page.goto(APP_URL); await wait(150); };
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.click(sel); await wait(80); };
  const has = (sel) => page.$(sel).then(Boolean);
  // The landing page animates in; click its Enter button through the DOM so a moving button can't be missed.
  const enter = async (pg) => { await pg.waitForSelector('[data-action="enter"]'); await pg.$eval('[data-action="enter"]', (b) => b.click()); await pg.waitForSelector('.landing', { hidden: true }).catch(() => {}); await wait(80); };
  const links = (sel) => page.$$eval(sel, (as) => as.map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent.trim() })));
  const linkOk = (l, url) => l.href === url && l.target === '_blank' && l.rel === 'noopener noreferrer' && l.text === 'Walkthrough';
  const examPrefs = (o) => ({ version: 5, prefs: { mode: 'exam', exams: Object.keys(B.EXAMS), examsKnown: Object.keys(B.EXAMS) }, examPrefs: { kind: 'full', examId: 'fa25', topics: [], picked: [], timerOn: false, minutes: 120, ...o } });
  const clickOpens = async (sel) => { opened.length = 0; await page.click(sel); for (let i = 0; i < 30 && !opened.length; i++) await wait(100); return opened[0]; };
  await page.goto(APP_URL);

  // ── Test E: nothing on exam setup or during an exam in progress ──
  await seed(examPrefs({}));
  await enter(page); await page.waitForSelector('.exam-setup');
  ok(!(await has('.btn-walk')) && !(await has('#walk-sec')), 'exam setup: no Walkthrough links');
  await click('#exam-id-fa25'); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await page.evaluate(() => document.body.innerHTML.includes('youtube.com'))) && !(await has('.btn-walk')), 'exam in progress: no Walkthrough link and no YouTube URL anywhere on the page');
  await click('#nav-toggle');
  ok(!(await has('.btn-walk')), 'exam in progress, navigator open: still none');

  // ── Test A: full exam results ──
  await page.keyboard.press('Escape'); await wait(100);
  await click('.p-footer [data-action="submit-exam"]');
  await page.waitForSelector('.exam-results');
  let L = await links('.exam-results .btn-walk');
  ok(L.length === 1 && linkOk(L[0], URLS.fa25), 'full exam (Fall 2025): exactly one Walkthrough link, to the Fall 2025 playlist, new tab, noopener noreferrer');
  ok(await page.$eval('.rq-head', (h) => { const kids = [...h.children]; return kids[0].matches('h2.rq-h') && kids[0].textContent === 'Questions' && kids[1].matches('.btn-walk'); }), 'it sits beside the Questions heading, to its right');
  ok(await page.$eval('.rq-head', (h) => { const a = h.querySelector('h2').getBoundingClientRect(), b = h.querySelector('.btn-walk').getBoundingClientRect(); return b.left > a.right && Math.abs(b.bottom - a.bottom) < 16; }), 'desktop: the link is on the same line as the heading, at the right');
  ok(!(await has('.rq-group .btn-walk')) && !(await has('.part-row .btn-walk')), 'full exam: no Walkthrough links in question groups or parts');
  ok((await clickOpens('.rq-head .btn-walk')) === URLS.fa25 && await has('.exam-results'), 'clicking opens the Fall 2025 playlist in a new tab; Exam Results stays open');
  const fullId = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).attempts.slice(-1)[0].id, KEY);

  // My History reopens the same results page with its link
  await click('[data-action="go-home"]'); await click('[data-action="progress"]'); await page.waitForSelector(`.mh-card [data-action="open-attempt"][data-id="${fullId}"]`);
  ok(!(await has('.btn-walk')), 'My Progress / My History: no Walkthrough links');
  await click(`.mh-card [data-action="open-attempt"][data-id="${fullId}"]`); await page.waitForSelector('.exam-results');
  L = await links('.exam-results .btn-walk');
  ok(L.length === 1 && linkOk(L[0], URLS.fa25), 'reopened from My History: the same single Fall 2025 link');
  // review of the attempt: none
  await click('.actions [data-action="exam-review"]'); await page.waitForSelector('#pane-right');
  ok(!(await has('.btn-walk')), 'reviewing the attempt: no Walkthrough links in the question workspace');

  // ── Test B: topic-based exam from Spring 2023 and Fall 2025 ──
  const picked = ['sp23-5a', 'sp23-5b', 'fa25-3'];
  await seed(examPrefs({ kind: 'custom', picked }));
  await enter(page); await click('[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await has('.btn-walk')), 'topic-based exam in progress: no Walkthrough links');
  await click('.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  ok(!(await has('.rq-head .btn-walk')), 'topic-based: no link beside the Questions heading');
  const G = await page.$$eval('.rq-group', (gs) => gs.map((g) => ({ src: g.querySelector('.rq-title small').textContent, links: [...g.querySelectorAll('.btn-walk')].map((a) => ({ href: a.getAttribute('href'), inSummary: !!a.closest('summary'), target: a.target, rel: a.rel, text: a.textContent.trim() })) })));
  const want = picked.map((pid) => URLS[B.PROBLEMS[pid].exam]);
  ok(G.length === 3 && G.every((g, i) => g.links.length === 1 && g.links[0].inSummary && linkOk(g.links[0], want[i])), `each group header has one link to its own exam's playlist (${G.map((g) => g.src.split(' · ')[0]).join(' / ')})`);
  ok(G[0].links[0].href === G[1].links[0].href && G[0].links[0].href !== G[2].links[0].href, 'the two Spring 2023 groups share a playlist; Fall 2025 Q3 has its own');
  ok(!(await has('.part-row .btn-walk')), 'no Walkthrough links next to the parts’ Review buttons');
  // visible collapsed and expanded; clicking it does not toggle the group
  const st = (i) => page.$eval(`.rq-group:nth-child(${i + 1})`, (g) => ({ open: g.open, vis: g.querySelector('.btn-walk').getBoundingClientRect().height > 0 }));
  await page.$$eval('.rq-group', (gs) => gs.forEach((g) => { g.open = false; }));
  ok((await st(0)).vis && !(await st(0)).open, 'collapsed group: link visible');
  ok((await clickOpens('.rq-group:nth-child(1) .btn-walk')) === URLS.sp23 && !(await st(0)).open, 'clicking it on a collapsed group opens the Spring 2023 playlist and leaves the group collapsed');
  await page.$eval('.rq-group:nth-child(3)', (g) => { g.open = true; });
  ok((await clickOpens('.rq-group:nth-child(3) .btn-walk')) === URLS.fa25 && (await st(2)).open && (await st(2)).vis, 'on an expanded group: opens Fall 2025, the group stays expanded');
  await click('.rq-group:nth-child(2) > summary .rq-title');
  ok((await st(1)).open, 'clicking the header elsewhere still expands the group');
  await click('.rq-group:nth-child(2) > summary .rq-title');
  ok(!(await st(1)).open, '…and collapses it again');
  // phone width: header readable, link doesn't overlap the status summary, no horizontal overflow
  await page.setViewport({ width: 390, height: 800 }); await wait(150);
  ok(await page.$eval('.rq-group:nth-child(1) > summary', (s) => { const a = s.querySelector('.rq-sum').getBoundingClientRect(), b = s.querySelector('.btn-walk').getBoundingClientRect(); return b.top >= a.bottom - 1 || b.left >= a.right; }), 'phone width: the link sits below the group summary, not over it');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'phone width: no horizontal scrolling');
  await page.setViewport({ width: 1400, height: 900 });

  // ── Test C: Practice Summary with Fall 2025 (2 groups), Spring 2025 (1), Fall 2024 (1) ──
  const set = ['fa24-5b', 'fa25-6b', 'sp25-2', 'fa25-1'];
  await seed({ version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: set.flatMap(idsOf), index: 0, title: 'Mixed set', answers: {}, timer: null, startedAt: Date.now(), finished: false, notes: {}, annotations: {} } });
  await enter(page); await click('.resume [data-action="resume"]'); await page.waitForSelector('#pane-right .part');
  ok(!(await has('.btn-walk')) && !(await has('#walk-sec')), 'practice question workspace: no Walkthrough links');
  await click('#nav-toggle'); await click('.navigator [data-action="finish"]'); await page.waitForSelector('.results');
  ok(await page.$eval('#walk-sec', (s) => {
    const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return before(document.querySelector('.results .stats'), s) && before(document.querySelector('.results .actions'), s) && before(s, document.querySelector('.results .result-list'));
  }), 'Walkthrough Videos sits below the stats and the action buttons, above the question list');
  ok(await page.$eval('#walk-sec', (s) => s.querySelector('.walk-title').textContent === 'Walkthrough Videos' && !!s.querySelector('.walk-ic svg') && s.querySelector('.walk-desc').textContent === 'Watch walkthrough playlists for the past exams included in your practice set.'), 'title, video icon and description');
  const rows = await page.$$eval('.walk-row', (rs) => rs.map((r) => ({ exam: r.dataset.exam, name: r.querySelector('.walk-ex').firstChild.textContent, count: r.querySelector('small').textContent, href: r.querySelector('.btn-walk').getAttribute('href'), n: r.querySelectorAll('.btn-walk').length })));
  ok(rows.length === 3 && rows.map((r) => r.exam).join() === 'fa25,sp25,fa24' && rows.every((r) => r.n === 1), `one row per source exam, each once (${rows.map((r) => r.name).join(', ')})`);
  ok(rows[0].count === '2 question groups in this practice set' && rows[1].count === '1 question group in this practice set' && rows[2].count === '1 question group in this practice set', `counts are question groups, not parts: Fall 2025 Q1 (3 parts) + Q6(b) (3 parts) = 2 (${rows.map((r) => r.count.split(' ')[0]).join('/')})`);
  ok(rows.every((r) => r.href === URLS[r.exam]) && (await links('.walk-row .btn-walk')).every((l) => linkOk(l, l.href)), 'each row links its own exam’s playlist, new tab, noopener noreferrer');
  ok((await clickOpens('.walk-row[data-exam="sp25"] .btn-walk')) === URLS.sp25 && await has('.results'), 'clicking Spring 2025 opens its playlist; the summary stays open');
  ok((await page.$$('.result-list .btn-walk')).length === 0, 'no Walkthrough links in the question results list');
  // collapse / expand (default expanded), mouse and keyboard
  const exp = () => page.$eval('#walk-toggle', (b) => ({ ex: b.getAttribute('aria-expanded'), hidden: document.getElementById('walk-body').hidden, rows: [...document.querySelectorAll('.walk-row')].filter((r) => r.getBoundingClientRect().height > 0).length }));
  let x = await exp();
  ok(x.ex === 'true' && !x.hidden && x.rows === 3, 'expanded by default');
  await click('#walk-toggle'); x = await exp();
  ok(x.ex === 'false' && x.hidden && x.rows === 0 && await page.$eval('#walk-sec', (s) => s.getBoundingClientRect().height < 60), 'clicking the heading collapses it to just the heading');
  await page.focus('#walk-toggle'); await page.keyboard.press('Enter'); await wait(80); x = await exp();
  ok(x.ex === 'true' && !x.hidden && x.rows === 3, 'Enter on the focused heading expands it again');
  await page.keyboard.press('Space'); await wait(80);
  ok((await exp()).ex === 'false', 'Space collapses it');
  await page.keyboard.press('Space'); await wait(80);
  ok(await page.$eval('#walk-sec', (s) => s.getBoundingClientRect().height) < await page.$eval('.results .stats', (s) => s.getBoundingClientRect().height + 200), 'the section stays compact');
  await page.setViewport({ width: 390, height: 800 }); await wait(150);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth) && await page.$eval('.walk-row .btn-walk', (a) => a.getBoundingClientRect().height >= 28), 'phone width: no horizontal scrolling, tap-sized buttons');
  await page.setViewport({ width: 1400, height: 900 });
  // same exam only → one row
  await seed({ version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: ['fa25-6b', 'fa25-6c', 'fa25-6d'].flatMap(idsOf), index: 0, title: 'One exam', answers: {}, timer: null, startedAt: Date.now(), finished: true, finishedAt: Date.now(), notes: {}, annotations: {} } });
  await enter(page); await click('.resume [data-action="show-results"]'); await page.waitForSelector('.results');
  ok((await page.$$eval('.walk-row', (rs) => rs.map((r) => r.dataset.exam + ':' + r.querySelector('small').textContent))).join() === 'fa25:3 question groups in this practice set', 'a set from one exam: one row, Q6(b), Q6(c), Q6(d) count as 3 groups');

  // ── Test D: an exam with no playlist shows no link (Fall 2025 removed from the mapping for this page) ──
  const p2 = await browser.newPage();
  await skipTour(p2);
  await p2.evaluateOnNewDocument(() => {
    let v; Object.defineProperty(window, 'CS61A_WALKTHROUGHS', { configurable: true, get: () => v, set: (x) => { delete x.PLAYLISTS.fa25; v = x; } });
  });
  p2.on('dialog', (d) => d.accept());
  p2.on('pageerror', (e) => errors.push(String(e)));
  const seed2 = async (obj) => { await p2.goto(APP_URL); await p2.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj)); await p2.goto(APP_URL); await wait(150); };
  const c2 = async (sel) => { await p2.waitForSelector(sel, { visible: true, timeout: 8000 }); await p2.click(sel); await wait(80); };
  await seed2({ version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: ['fa25-1', 'sp25-2', 'fa25-3'].flatMap(idsOf), index: 0, title: 'x', answers: {}, timer: null, startedAt: Date.now(), finished: true, finishedAt: Date.now(), notes: {}, annotations: {} } });
  ok(await p2.evaluate(() => window.CS61A_WALKTHROUGHS.getWalkthroughPlaylist('fa25') === null && window.CS61A_WALKTHROUGHS.getWalkthroughPlaylist('sp23') !== null), '(setup) Fall 2025 has no playlist on this page');
  await enter(p2); await c2('.resume [data-action="show-results"]'); await p2.waitForSelector('.results');
  ok((await p2.$$eval('.walk-row', (rs) => rs.map((r) => r.dataset.exam))).join() === 'sp25', 'Practice Summary: the exam without a playlist is left out; the others stay');
  await seed2({ version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: ['fa25-1', 'fa25-3'].flatMap(idsOf), index: 0, title: 'x', answers: {}, timer: null, startedAt: Date.now(), finished: true, finishedAt: Date.now(), notes: {}, annotations: {} } });
  await enter(p2); await c2('.resume [data-action="show-results"]'); await p2.waitForSelector('.results');
  ok(!(await p2.$('#walk-sec')) && (await p2.$$('.results .btn-walk')).length === 0, 'Practice Summary: no section at all when no exam in the set has a playlist');
  await seed2(examPrefs({}));
  await enter(p2); await c2('#exam-id-fa25'); await c2('[data-action="start-exam"]'); await p2.waitForSelector('#pane-right .part');
  await c2('.p-footer [data-action="submit-exam"]'); await p2.waitForSelector('.exam-results');
  ok((await p2.$$('.exam-results .btn-walk')).length === 0 && await p2.$('.rq-head h2.rq-h'), 'full exam without a playlist: no link, the Questions heading as usual');
  await seed2(examPrefs({ kind: 'custom', picked: ['sp23-5a', 'fa25-3'] }));
  await enter(p2); await c2('[data-action="start-exam"]'); await p2.waitForSelector('#pane-right .part');
  await c2('.p-footer [data-action="submit-exam"]'); await p2.waitForSelector('.exam-results');
  ok((await p2.$$eval('.rq-group', (gs) => gs.map((g) => g.querySelectorAll('.btn-walk').length))).join() === '1,0', 'topic-based: the Spring 2023 group has its link, the Fall 2025 group none');
  await p2.close();

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 300) : ''}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
