// Supabase Phase 2: usage tracking (app/analytics.js). No real Supabase project is contacted: the app is served from a
// local server inside this test, every request leaving it is blocked, and Supabase is a fake client that keeps a
// small "database" in localStorage following the real tables' keys and guards, including finalize_session() (the last
// block runs the real vendored supabase-js against mocked responses, to check the exact requests). The SQL itself
// (policies, guards, finalize_session) is tested against Postgres separately.
// Covers: sessions created once and kept through refresh / Save & Leave / Resume; part rows for every kind of result;
// repeated Checks and first-check preservation; finishing = one finalize call with the final snapshot; Review edits,
// refreshes, retries and stale in-progress writes never change a finalized session; offline finish then delayed
// sync; discards; Run Code counted (retries and stale totals never inflate or lower it, two tabs); Gleam and mixed
// sets; active days with their date; no answers or code ever sent; waiting for sign-in; network failures and refused
// rows; out-of-date tabs track nothing; ids for older sets on reopening; engaged time with an idle cutoff; off by
// config and in automated browsers.
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { CHROME, skipTour } = require('./config');
const KEY = 'cs61a-practice:v1';
const AKEY = 'cs61a-analytics:v1';
const APP_DIR = path.join(__dirname, '..', '..', 'app');
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SB = 'https://test-project.supabase.co';
const PUB = 'sb_publishable_TEST_ONLY_not_a_real_key';
const SECRET = 'SECRET_ANSWER_zq81'; // typed into answers and code; must never appear in anything sent

// Fake supabase-js. Auth like the real one (session in localStorage); tables and finalize_session() follow the real
// migration's rules: upserts by key, finalized/discarded sessions and their part rows frozen (later writes ignored),
// counters and run counts only grow, first check kept.
function installFake() {
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const opts = () => get('fake-sb-opts', {});
  const KEYS = { practice_sessions: ['id'], question_attempts: ['session_id', 'question_id'], feature_events: ['user_id', 'dedupe_key'], activity_days: ['user_id', 'day'] };
  const UID = '00000000-0000-4000-8000-000000000001';
  function apply(db, table, r, ignore) {
    const t = db[table] || (db[table] = {});
    const k = KEYS[table].map((c) => r[c]).join('|');
    const old = t[k];
    const sess = (id) => (db.practice_sessions || {})[id];
    if (table === 'question_attempts' && sess(r.session_id) && sess(r.session_id).status !== 'in_progress') return; // frozen
    if (!old) { t[k] = Object.assign({}, r); return; }
    if (ignore) return;
    if (table === 'practice_sessions' && old.status !== 'in_progress') return; // frozen
    const n = Object.assign({}, old, r);
    if (table === 'practice_sessions') { n.active_seconds = Math.max(old.active_seconds, r.active_seconds); }
    if (table === 'question_attempts') { n.checks = Math.max(old.checks, r.checks); n.first_check = old.first_check || r.first_check; n.solution_viewed = old.solution_viewed || r.solution_viewed; }
    if (table === 'feature_events') { Object.assign(n, old, { count: Math.max(old.count, r.count) }); }
    t[k] = n;
  }
  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() { return { data: { session: get('fake-sb-session', null) }, error: null }; },
          async signInAnonymously() {
            if (opts().signInFail) return { data: { user: null }, error: { name: 'AuthApiError', message: 'down', status: 503 } };
            const user = { id: UID, is_anonymous: true };
            put('fake-sb-session', { user });
            return { data: { user, session: { user } }, error: null };
          },
        },
        async rpc(name, args) {
          put('fake-sb-calls', [...get('fake-sb-calls', []), { table: 'rpc:' + name, args }]);
          const f = (opts().fail || {}).finalize;
          if (f) return { error: { message: f.message || 'boom' }, status: f.status, data: null };
          const db = get('fake-db', {});
          const s = args.p_session;
          const cur = (db.practice_sessions || {})[s.id];
          if (cur && cur.status !== 'in_progress') return { data: 'already_final', error: null, status: 200 };
          if (!cur) apply(db, 'practice_sessions', Object.assign({}, s, { status: 'in_progress', user_id: UID }));
          args.p_attempts.forEach((a) => apply(db, 'question_attempts', Object.assign({}, a, { user_id: UID })));
          db.practice_sessions[s.id] = Object.assign({}, db.practice_sessions[s.id], s, { status: 'completed', finalized: true });
          put('fake-db', db);
          return { data: 'finalized', error: null, status: 200 };
        },
        from(table) {
          if (table === 'profiles') {
            return {
              select() { return { eq() { return { async maybeSingle() { return { data: get('fake-sb-profile', null), error: null }; } }; } }; },
              async insert(row) { put('fake-sb-profile', row); return { error: null }; },
            };
          }
          return {
            async upsert(rows, o) {
              put('fake-sb-calls', [...get('fake-sb-calls', []), { table, rows, o }]);
              const f = (opts().fail || {})[table];
              if (f) return { error: { message: f.message || 'boom', code: f.code || null }, status: f.status, data: null };
              if (rows.find((r) => r.result === 'REFUSE_ME')) return { error: { message: 'violates check constraint', code: '23514' }, status: 400 };
              // like the real database: only finalize_session() may complete a session
              if (table === 'practice_sessions' && rows.some((r) => r.status === 'completed')) {
                return { error: { message: 'a session is completed only through finalize_session()', code: '42501' }, status: 403 };
              }
              const db = get('fake-db', {});
              rows.forEach((r) => apply(db, table, r, o && o.ignoreDuplicates));
              put('fake-db', db);
              return { error: null, status: 201 };
            },
          };
        },
      };
    },
  };
}

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const p = path.join(APP_DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(APP_DIR)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.wasm': 'application/wasm' }[path.extname(p)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://localhost:${server.address().port}`;
  const URL_ = `${ORIGIN}/index.html`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const outside = [];
  const errors = [];
  const CFG = (extra = {}) => ({ supabase: { url: SB, publishableKey: PUB, hosts: ['localhost'], allowAutomation: true }, analytics: { enabled: true, idleSeconds: 2, ...extra } });
  async function openTab(cfg, { fake = true, mock = null } = {}) {
    const page = await browser.newPage();
    await skipTour(page);
    await page.setViewport({ width: 1300, height: 850 });
    await page.evaluateOnNewDocument((c) => { Object.defineProperty(window, 'CS61A_CONFIG', { configurable: false, get: () => c, set: () => {} }); }, cfg);
    if (fake) await page.evaluateOnNewDocument(installFake);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (u.startsWith(ORIGIN) || u.startsWith('data:') || u.startsWith('blob:')) { req.continue(); return; }
      if (mock && u.startsWith(SB)) { mock(req); return; }
      outside.push(u); req.abort();
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource|pyodide|Python/i.test(m.text())) errors.push(m.text()); });
    page.on('dialog', (d) => d.accept());
    return page;
  }
  const db = (page, table) => page.evaluate((t) => Object.values((JSON.parse(localStorage.getItem('fake-db') || '{}'))[t] || {}), table);
  const allCalls = [];
  const calls = async (page) => { const c = await page.evaluate(() => JSON.parse(localStorage.getItem('fake-sb-calls') || '[]')); allCalls.push(...c); return c; };
  const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const aState = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), AKEY);
  const astatus = (page) => page.evaluate(() => window.CS61A_ANALYTICS.status());
  const setOpts = (page, o) => page.evaluate((x) => localStorage.setItem('fake-sb-opts', JSON.stringify(x)), o);
  const until = async (page, fn, arg, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(200); } return false; };
  const queueEmpty = () => { const st = JSON.parse(localStorage.getItem('cs61a-analytics:v1') || '{"queue":[]}'); return st.queue.length === 0; };
  const settle = async (page) => {
    await until(page, () => window.CS61A_AUTH.status().status === 'ready', null, 15000);
    await until(page, queueEmpty, null, 15000); await wait(1800); await until(page, queueEmpty, null, 8000);
  };
  const click = async (page, sel) => { await page.waitForSelector(sel, { visible: true, timeout: 10000 }); await page.$eval(sel, (b) => b.click()); await wait(80); };
  const type = async (page, qid, v) => { await page.$eval(`#ta-${qid}`, (t, x) => { t.value = x; t.dispatchEvent(new Event('input', { bubbles: true })); }, v); await wait(80); };
  const seed = (page, obj) => page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
  const clean = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k !== 'cs61a-practice:tour').forEach((k) => localStorage.removeItem(k)));
  const SP = ['sp25-4d', 'sp25-4e', 'sp25-4f', 'sp25-4g', 'fa25-6aplus'];
  const practiceSet = (list = SP, extra) => ({ version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: list, index: 0, title: 'Tracked set', answers: {}, timer: null, startedAt: Date.now() - 1000, finished: false, notes: {}, annotations: {}, ...(extra || {}) } });
  const rowsOf = async (page) => Object.fromEntries((await db(page, 'question_attempts')).map((r) => [r.question_id, r]));
  const finish = async (page) => { await click(page, '#nav-toggle'); await click(page, '.navigator [data-action="finish"]'); await page.waitForSelector('.results'); };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

  // ── Off: automated browser by default, analytics disabled in config ──
  for (const [label, cfg] of [['automated browser (default)', { supabase: { url: SB, publishableKey: PUB, hosts: ['localhost'] } }], ['analytics.enabled: false', CFG({ enabled: false })]]) {
    const t = await openTab(cfg);
    await t.goto(URL_); await clean(t); await seed(t, practiceSet()); await t.goto(URL_);
    await click(t, '.landing-resume[data-action="resume"]'); await click(t, 'label[for="c-sp25-4e-1"]'); await click(t, '#part-sp25-4e [data-action="check"]'); await wait(2500);
    ok(!(await astatus(t)).enabled && !(await aState(t)) && (await calls(t)).length === 0 && !(await store(t)).session.aid, `off (${label}): nothing stored, nothing sent, saved data untouched`);
    await t.close();
  }

  // ── A set saved before tracking: id given on load, before any click ──
  const page = await openTab(CFG());
  await page.goto(URL_); await clean(page); await seed(page, practiceSet()); await page.goto(URL_);
  await page.waitForSelector('.landing'); await wait(300);
  ok(/^[0-9a-f-]{36}$/.test((await store(page)).session.aid || ''), 'an older unfinished set gets its tracking id as soon as the page loads (before reopening it)');
  await click(page, '.landing-resume[data-action="resume"]');
  await settle(page);
  let S = await store(page);
  const aid = S.session.aid;
  let sess = await db(page, 'practice_sessions');
  ok(sess.length === 1 && sess[0].id === aid && sess[0].status === 'in_progress' && sess[0].mode === 'practice' && sess[0].parts === 5 && sess[0].question_groups === 2 && sess[0].language === 'python',
    'one in_progress practice session row');
  ok((await db(page, 'question_attempts')).length === 0, 'no part rows before anything is answered');

  // ── Practice: results, checks, solutions, Run Code ──
  await click(page, 'label[for="c-sp25-4e-1"]'); await click(page, '#part-sp25-4e [data-action="check"]');
  await click(page, 'label[for="c-sp25-4e-2"]'); await click(page, '#part-sp25-4e [data-action="check"]');
  await click(page, '#part-sp25-4e [data-action="check"]');
  await type(page, 'sp25-4d', 'result[node.label]'); await click(page, '#part-sp25-4d [data-action="check"]');
  await type(page, 'sp25-4g', `visit(b) # ${SECRET}`); await click(page, '#part-sp25-4g [data-action="check"]');
  await click(page, '#part-sp25-4g [data-action="reveal"]'); await click(page, '#reveal-yes-sp25-4g');
  await click(page, '#part-sp25-4g [data-action="self"][data-v="correct"]');
  await click(page, '#nav-toggle'); await click(page, '#nav-fa25-6aplus');
  await type(page, 'fa25-6aplus', `def f(): return "${SECRET}"`);
  for (let i = 0; i < 3; i++) { await page.$eval('[data-action="run-code"]', (b) => b.click()).catch(() => {}); await wait(500); }
  await settle(page);
  let rows = await rowsOf(page);
  ok(rows['sp25-4e'] && rows['sp25-4e'].result === 'correct' && rows['sp25-4e'].first_check === 'incorrect' && rows['sp25-4e'].checks === 3 && rows['sp25-4e'].auto_gradable === true,
    `MC: final correct, first check incorrect, 3 checks (${JSON.stringify(rows['sp25-4e'] && [rows['sp25-4e'].result, rows['sp25-4e'].first_check, rows['sp25-4e'].checks])})`);
  ok(rows['sp25-4d'] && rows['sp25-4d'].result === 'correct' && rows['sp25-4d'].first_check === 'correct' && rows['sp25-4d'].checks === 1, 'short answer exact match: correct on the first check');
  ok(rows['sp25-4g'] && rows['sp25-4g'].result === 'self_correct' && rows['sp25-4g'].first_check === 'unmatched' && rows['sp25-4g'].solution_viewed === true,
    'not an exact match: first check "unmatched" (not incorrect), self-grade kept separate, solution viewed');
  ok(rows['fa25-6aplus'] && rows['fa25-6aplus'].result === 'not_graded' && rows['fa25-6aplus'].auto_gradable === false, 'code-writing part: not_graded, not auto-gradable');
  ok(!rows['sp25-4f'], 'an untouched part has no row while the set is in progress');
  let runs = (await db(page, 'feature_events')).filter((x) => x.event === 'run_code');
  ok(runs.length === 1 && runs[0].count === 3 && runs[0].problem_id === 'fa25-6aplus' && runs[0].session_id === aid, `Run Code 3 times: one row, count 3 (${JSON.stringify(runs.map((x) => x.count))})`);
  const days = await db(page, 'activity_days');
  ok(days.length === 1 && days[0].day === today && (await calls(page)).filter((c) => c.table === 'activity_days').every((c) => c.o.ignoreDuplicates), `one active-day mark, with today's Pacific date (${days[0] && days[0].day})`);

  // refresh: same session, nothing re-sent
  const before = (await calls(page)).length;
  await page.reload(); await click(page, '.landing-resume[data-action="resume"]'); await settle(page);
  ok((await store(page)).session.aid === aid && (await db(page, 'practice_sessions')).length === 1, 'refresh + resume: same session id, one session row');
  ok((await calls(page)).slice(before).every((c) => c.table === 'practice_sessions'), 'refresh resends no part rows');
  // run counter: a retry can't inflate it, a stale smaller total can't lower it
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const c = Object.entries(st.counts)[0];
    const row = { id: c[1].id, session_id: null, event: 'run_code', problem_id: 'fa25-6aplus', source_id: 'fa25', dedupe_key: c[0], count: 1 };
    st.queue.push({ k: 'f:stale', table: 'feature_events', row, h: 'x1', t: Date.now(), tries: 0, next: 0, mode: 'merge' });
    st.queue.push({ k: 'f:retry', table: 'feature_events', row: Object.assign({}, row, { count: 3 }), h: 'x2', t: Date.now(), tries: 0, next: 0, mode: 'merge' });
    localStorage.setItem(k, JSON.stringify(st));
  }, AKEY);
  await page.evaluate(() => window.CS61A_ANALYTICS.flush()); await settle(page);
  runs = (await db(page, 'feature_events')).filter((x) => x.event === 'run_code');
  ok(runs.length === 1 && runs[0].count === 3, `a stale total (1) and a retried total (3): count stays 3 (${runs.map((x) => x.count)})`);
  // two tabs flushing at once: still one row, right count
  const t2 = await openTab(CFG());
  await t2.goto(URL_); await t2.waitForSelector('.landing');
  await page.$eval('[data-action="run-code"]', (b) => b.click()).catch(() => {}); await wait(300);
  await Promise.all([page.evaluate(() => window.CS61A_ANALYTICS.flush()), t2.evaluate(() => window.CS61A_ANALYTICS.flush())]);
  await settle(page);
  runs = (await db(page, 'feature_events')).filter((x) => x.event === 'run_code');
  ok(runs.length === 1 && runs[0].count === 4, `a 4th run, flushed by two tabs at once: one row, count 4 (${runs.map((x) => x.count)})`);
  await t2.close();

  // ── Finish: one finalize call with the final snapshot ──
  const nCalls = (await calls(page)).length;
  await finish(page);
  await settle(page);
  const fin = (await calls(page)).slice(nCalls).filter((c) => c.table === 'rpc:finalize_session');
  sess = await db(page, 'practice_sessions');
  rows = await rowsOf(page);
  ok(fin.length === 1 && fin[0].args.p_session.id === aid && fin[0].args.p_session.status === 'completed' && fin[0].args.p_attempts.length === 5, `Finish: exactly one finalize_session call with the session and all 5 parts (${fin.length})`);
  ok(sess[0].status === 'completed' && sess[0].completed_at && sess[0].wall_seconds >= 1 && rows['sp25-4f'].result === 'unanswered' && rows['sp25-4e'].first_check === 'incorrect' && rows['sp25-4e'].checks === 3,
    'finalized: completed, every part has its final row, first check and counts preserved');
  const accuracy = Object.values(rows).filter((r) => r.auto_gradable && ['correct', 'incorrect'].includes(r.result));
  ok(accuracy.length === 2 && accuracy.every((r) => r.result === 'correct'), 'accuracy uses only automatic grades (self-graded, unmatched, code, unanswered left out)');
  // Review after finishing: change answers, Check → nothing sent, nothing changes
  const frozen = JSON.stringify([await db(page, 'practice_sessions'), await db(page, 'question_attempts')]);
  const nAfter = (await calls(page)).filter((c) => c.table !== 'feature_events').length;
  await click(page, '.results [data-action="review"]');
  await page.waitForSelector('#pane-right .part');
  await click(page, 'label[for="c-sp25-4e-0"]'); await click(page, '#part-sp25-4e [data-action="check"]');
  await click(page, 'label[for="c-sp25-4f-1"]'); await click(page, '#part-sp25-4f [data-action="check"]');
  await wait(2500); await page.reload(); await wait(2500);
  ok((await calls(page)).filter((c) => c.table !== 'feature_events').length === nAfter && JSON.stringify([await db(page, 'practice_sessions'), await db(page, 'question_attempts')]) === frozen,
    'Review after Finish (new answers, Checks) and a refresh: nothing sent, the finalized snapshot is unchanged');
  // stale in-progress writes and a retried finalize after finalization: ignored
  await click(page, '[data-action="enter"]'); // past the welcome page, so sign-in runs again after the reload
  const staleRow = Object.assign({}, fin[0].args.p_session, { status: 'in_progress', completed_at: null, wall_seconds: null, parts: 99 });
  await page.evaluate((k, r) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.queue.push({ k: 's:stale', table: 'practice_sessions', row: r, h: 'y1', t: Date.now(), tries: 0, next: 0 });
    st.queue.push({ k: 'a:stale', table: 'question_attempts', row: { session_id: r.id, question_id: 'sp25-4f', problem_id: 'sp25-4b', source_id: 'sp25', topics: [], auto_gradable: true, result: 'correct', first_check: 'correct', checks: 9, solution_viewed: false, first_checked_at: null }, h: 'y2', t: Date.now(), tries: 0, next: 0 });
    st.queue.push({ k: 'fin:again', table: 'finalize', row: { session: Object.assign({}, r, { status: 'completed', completed_at: new Date().toISOString(), parts: 1 }), attempts: [] }, h: 'y3', t: Date.now(), tries: 0, next: 0 });
    localStorage.setItem(k, JSON.stringify(st));
  }, AKEY, staleRow);
  await page.evaluate(() => window.CS61A_ANALYTICS.flush()); await settle(page);
  ok(JSON.stringify([await db(page, 'practice_sessions'), await db(page, 'question_attempts')]) === frozen && (await aState(page)).queue.length === 0,
    'stale in-progress writes and a repeated finalize after finalization: accepted, but nothing changes');

  // ── Offline: finish while offline, finalize later ──
  await clean(page);
  await setOpts(page, { fail: { practice_sessions: { status: 0, message: 'Failed to fetch' }, question_attempts: { status: 0, message: 'Failed to fetch' }, finalize: { status: 0, message: 'Failed to fetch' } } });
  await seed(page, practiceSet()); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]');
  await click(page, 'label[for="c-sp25-4e-2"]'); await click(page, '#part-sp25-4e [data-action="check"]');
  await wait(2500);
  await finish(page); await wait(2500);
  const offAid = (await store(page)).session.aid;
  let st = await aState(page);
  ok((await db(page, 'practice_sessions')).length === 0 && st.queue.some((x) => x.k === `fin:${offAid}`) && !st.queue.some((x) => x.k === `s:${offAid}` || x.k.startsWith(`a:${offAid}:`)),
    'finished offline: the finalize call waits in the queue (its earlier in-progress writes are no longer needed and were dropped)');
  await click(page, '.results [data-action="review"]'); await page.waitForSelector('#pane-right .part');
  await click(page, 'label[for="c-sp25-4e-0"]'); await wait(2000);
  const queued = (await aState(page)).queue.find((x) => x.k === `fin:${offAid}`);
  ok(queued && queued.row.attempts.find((a) => a.question_id === 'sp25-4e').result === 'correct', 'a Review edit while still offline does not change the queued final snapshot');
  await setOpts(page, {});
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await settle(page);
  sess = await db(page, 'practice_sessions'); rows = await rowsOf(page);
  ok(sess.length === 1 && sess[0].id === offAid && sess[0].status === 'completed' && rows['sp25-4e'].result === 'correct' && rows['sp25-4e'].first_check === 'correct' && Object.keys(rows).length === 5,
    'back online: finalize creates the session, all 5 final rows and the completed status in one go');

  // ── A new set over an unfinished one: the old one moves to My History and stays in progress ──
  await clean(page); await seed(page, practiceSet()); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]'); await settle(page);
  const oldAid = (await store(page)).session.aid;
  await click(page, '[data-action="home"]'); await click(page, '#mode-practice').catch(() => {});
  await click(page, '[data-action="start"]'); await page.waitForSelector('#pane-right .part');
  await settle(page);
  const newAidv = (await store(page)).session.aid;
  let byId = Object.fromEntries((await db(page, 'practice_sessions')).map((r) => [r.id, r]));
  ok(newAidv && newAidv !== oldAid && byId[oldAid].status === 'in_progress' && byId[newAidv].status === 'in_progress' && !(await aState(page)).closed[oldAid],
    'starting a new set over an unfinished one: the old one is shelved in My History and stays in progress (not discarded)');
  // continue the old set from My History, answer, finish: one finalize as completed
  await click(page, '[data-action="home"]'); await click(page, '[data-action="progress"]');
  await click(page, `.mh-card [data-action="open-set"][data-id="${(await store(page)).practice[0].id}"]`); await page.waitForSelector('#pane-right .part');
  ok((await store(page)).session.aid === oldAid, 'continuing it from My History keeps its tracking id');
  await type(page, 'sp25-4d', (await page.evaluate(() => window.CS61A_BANK.ANSWER_KEY['sp25-4d'].accepted[0])));
  await finish(page); await settle(page);
  byId = Object.fromEntries((await db(page, 'practice_sessions')).map((r) => [r.id, r]));
  let fins = (await calls(page)).filter((c) => c.table === 'rpc:finalize_session' && c.args.p_session.id === oldAid);
  rows = Object.fromEntries((await db(page, 'question_attempts')).filter((r) => r.session_id === oldAid).map((r) => [r.question_id, r]));
  ok(byId[oldAid].status === 'completed' && fins.length === 1 && rows['sp25-4d'] && rows['sp25-4d'].result === 'correct' && byId[newAidv].status === 'in_progress',
    'finished after being shelved: recorded once as completed with its answers; the other set is still in progress');
  // deleting the unfinished one from My History: discarded
  await click(page, '[data-action="go-home"]'); await click(page, '[data-action="progress"]');
  await click(page, `.mh-card [data-action="delete-set"][data-id="${(await store(page)).practice.find((x) => !x.finished).id}"]`);
  await settle(page);
  byId = Object.fromEntries((await db(page, 'practice_sessions')).map((r) => [r.id, r]));
  ok(byId[newAidv].status === 'discarded' && byId[oldAid].status === 'completed', 'deleting an unfinished set from My History: discarded; the finished one is untouched');
  ok((await calls(page)).filter((c) => c.table === 'rpc:finalize_session' && c.args.p_session.id === oldAid).length === 1, 'a finished set is never sent again');

  // ── Gleam and mixed sets ──
  await clean(page); await seed(page, practiceSet(['gl-ep11-3a', 'gl-ep11-3b', 'gl-ep11-3c'])); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]');
  await click(page, 'label[for="c-gl-ep11-3a-0"]'); await click(page, '#part-gl-ep11-3a [data-action="check"]');
  await settle(page);
  sess = await db(page, 'practice_sessions'); rows = await rowsOf(page);
  ok(sess[0].language === 'gleam' && rows['gl-ep11-3a'] && rows['gl-ep11-3a'].result === 'correct' && rows['gl-ep11-3a'].source_id === 'gl-ep11' && rows['gl-ep11-3a'].topics.includes('gl-recursion'),
    `Gleam set: language gleam, part row with its worksheet and Gleam topic (${sess[0].language}, ${rows['gl-ep11-3a'] && rows['gl-ep11-3a'].source_id})`);
  await clean(page); await seed(page, practiceSet(['sp25-4d', 'sp25-4e', 'sp25-4f', 'sp25-4g', 'gl-ep11-3a', 'gl-ep11-3b', 'gl-ep11-3c'])); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]'); await settle(page);
  ok((await db(page, 'practice_sessions'))[0].language === 'all', 'mixed Python + Gleam set: language all');

  // ── Exam: nothing until submission, then one finalize with the frozen grades ──
  await clean(page);
  await seed(page, { version: 5, prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['sp25-4b', 'fa25-6aplus'], timerOn: false, minutes: 120 } });
  await page.goto(URL_); await click(page, '[data-action="enter"]'); await click(page, '[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  await type(page, 'sp25-4d', 'result[node.label]'); await click(page, 'label[for="c-sp25-4e-1"]');
  await settle(page);
  const exAid = (await store(page)).exam.aid;
  sess = await db(page, 'practice_sessions');
  ok(sess.length === 1 && sess[0].id === exAid && sess[0].mode === 'exam' && sess[0].exam_kind === 'topic' && sess[0].status === 'in_progress' && (await db(page, 'question_attempts')).length === 0,
    'exam in progress: one exam session, no part rows');
  await click(page, '.p-footer [data-action="save-leave"]'); await settle(page);
  await page.reload(); await click(page, '[data-action="enter"]').catch(() => {});
  await click(page, '.resume [data-action="resume-exam"]'); await page.waitForSelector('#pane-right .part');
  await click(page, '#nav-toggle'); await click(page, '#nav-fa25-6aplus');
  await type(page, 'fa25-6aplus', `def g(): return "${SECRET}"`);
  await settle(page);
  ok((await db(page, 'practice_sessions')).length === 1, 'Save & Leave, refresh, Resume: still one exam session');
  const nx = (await calls(page)).length;
  await click(page, '.p-footer [data-action="submit-exam"]'); await page.waitForSelector('.exam-results');
  await settle(page);
  const exFin = (await calls(page)).slice(nx).filter((c) => c.table === 'rpc:finalize_session');
  rows = await rowsOf(page);
  ok(exFin.length === 1 && (await db(page, 'practice_sessions'))[0].status === 'completed', 'submit: one finalize call; session completed');
  ok(rows['sp25-4d'].result === 'correct' && rows['sp25-4e'].result === 'incorrect' && rows['sp25-4f'].result === 'unanswered' && rows['fa25-6aplus'].result === 'staff' && Object.values(rows).every((r) => r.checks === 0 && !r.first_check),
    'exam rows are the frozen grades: correct / incorrect / unanswered / staff');
  const exFrozen = JSON.stringify(await db(page, 'question_attempts'));
  await click(page, '.actions [data-action="exam-review"]'); await page.waitForSelector('#review-work .part, #pane-right .part');
  await page.$eval('label[for="c-sp25-4e-2"]', (l) => l.click()).catch(() => {});
  await type(page, 'sp25-4d', 'something else').catch(() => {});
  for (let i = 0; i < 2; i++) { await page.$eval('[data-action="run-code"]', (b) => b.click()).catch(() => {}); await wait(400); }
  await click(page, '[data-action="go-home"]').catch(() => {});
  await click(page, '[data-action="progress"]'); await click(page, '.mh-card [data-action="open-attempt"]'); await page.waitForSelector('.exam-results .btn-walk');
  for (let i = 0; i < 2; i++) await page.$eval('.exam-results .btn-walk', (a) => { a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
  await click(page, '.actions [data-action="exam-review"]'); await wait(300);
  await settle(page);
  const ev = await db(page, 'feature_events');
  ok(JSON.stringify(await db(page, 'question_attempts')) === exFrozen, 'Review edits after submission don\'t change the exam\'s rows');
  ok(ev.filter((x) => x.event === 'review_open').length === 1 && ev.filter((x) => x.event === 'walkthrough_open').length === 1 && ev.filter((x) => x.event === 'walkthrough_open')[0].session_id === exAid,
    'review opened twice / walkthrough clicked twice: one row each, tied to the attempt');
  const exRuns = ev.filter((x) => x.event === 'run_code' && x.session_id === exAid);
  ok(exRuns.length === 1 && exRuns[0].count === 2, `Run Code in Review is counted for the attempt (feature use after submission is allowed): ${exRuns.map((x) => x.count)}`);
  // full exam discarded
  await seed(page, { version: 5, prefs: { mode: 'exam' }, examPrefs: { kind: 'full', examId: 'fa24', topics: [], picked: [], timerOn: false, minutes: 120 } });
  await page.goto(URL_); await click(page, '[data-action="enter"]'); await click(page, '#exam-id-fa24'); await click(page, '[data-action="start-exam"]'); await page.waitForSelector('#pane-right .part');
  await settle(page);
  const fullAid = (await store(page)).exam.aid;
  await click(page, '.p-footer [data-action="save-leave"]'); await click(page, '.resume [data-action="discard-exam"]'); await settle(page);
  const f2 = Object.fromEntries((await db(page, 'practice_sessions')).map((r) => [r.id, r]));
  ok(f2[fullAid].exam_kind === 'full' && f2[fullAid].exam_id === 'fa24' && f2[fullAid].status === 'discarded', 'full exam (fa24) discarded: kept as discarded, not deleted');

  // ── No answers or code in anything sent or queued ──
  const everything = JSON.stringify(await calls(page)) + JSON.stringify(await aState(page));
  ok(!everything.includes(SECRET) && !everything.includes('result[node.label]') && !everything.includes('something else'), 'no answer text or code was ever sent or queued');
  ok((await calls(page)).filter((c) => c.rows).every((c) => c.rows.every((r) => r.user_id === '00000000-0000-4000-8000-000000000001')), 'every row is written as the signed-in anonymous user');

  // ── Network failure and refused rows ──
  await clean(page); await setOpts(page, { fail: { practice_sessions: { status: 0, message: 'Failed to fetch' } } }); await seed(page, practiceSet()); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]'); await click(page, 'label[for="c-sp25-4e-2"]'); await click(page, '#part-sp25-4e [data-action="check"]');
  await until(page, () => window.CS61A_ANALYTICS.status().failed > 0);
  st = await aState(page);
  ok(st.queue.length >= 2 && (await db(page, 'practice_sessions')).length === 0 && (await calls(page)).filter((c) => c.table === 'question_attempts').length === 0, 'offline: rows stay queued, nothing claimed as sent, part rows wait for their session');
  await setOpts(page, {});
  await page.evaluate(() => window.dispatchEvent(new Event('online'))); await settle(page);
  ok((await db(page, 'practice_sessions')).length === 1 && (await db(page, 'question_attempts')).length === 1, 'back online: everything sent');
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const s = JSON.parse(localStorage.getItem('cs61a-practice:v1')).session;
    const mk = (q, result) => ({ k: `a:${s.aid}:${q}`, table: 'question_attempts', h: q, t: Date.now(), tries: 0, next: 0, row: { session_id: s.aid, question_id: q, problem_id: 'sp25-4b', source_id: 'sp25', topics: [], auto_gradable: true, result, first_check: null, checks: 0, solution_viewed: false, first_checked_at: null } });
    st.queue.push(mk('sp25-4f', 'REFUSE_ME'), mk('sp25-4g', 'unanswered'));
    localStorage.setItem(k, JSON.stringify(st));
  }, AKEY);
  await page.evaluate(() => window.CS61A_ANALYTICS.flush()); await wait(300); await page.evaluate(() => window.CS61A_ANALYTICS.flush()); await wait(500);
  rows = await rowsOf(page);
  ok(rows['sp25-4g'] && !rows['sp25-4f'] && (await aState(page)).queue.length === 0 && (await astatus(page)).dropped >= 1, 'a refused row is dropped and counted; the good row in its batch still goes');

  // ── No sign-in yet: rows wait ──
  await clean(page); await setOpts(page, { signInFail: true }); await seed(page, practiceSet()); await page.goto(URL_);
  await click(page, '.landing-resume[data-action="resume"]'); await click(page, 'label[for="c-sp25-4e-2"]'); await click(page, '#part-sp25-4e [data-action="check"]'); await wait(3000);
  ok((await page.evaluate(() => window.CS61A_AUTH.status().status)) === 'error' && (await aState(page)).queue.length >= 2 && (await calls(page)).length === 0, 'sign-in failing: rows queued, nothing sent, practice unaffected');
  await setOpts(page, {});
  await page.evaluate(() => window.CS61A_AUTH.retry()); await settle(page);
  ok((await db(page, 'practice_sessions')).length === 1 && (await db(page, 'question_attempts')).length === 1, 'once signed in, the queued rows are sent');

  // ── Out-of-date tab: tracks nothing (no writes, no engaged time, no false "discarded") ──
  const t3 = await openTab(CFG());
  await t3.goto(URL_); await click(t3, '.landing-resume[data-action="resume"]');
  await click(t3, 'label[for="c-sp25-4f-1"]'); await click(t3, '#part-sp25-4f [data-action="check"]'); await settle(t3);
  ok(await page.$('.stale-overlay'), 'the first tab is now out of date');
  const n1 = (await calls(t3)).length;
  const meta1 = JSON.stringify((await aState(t3)).meta);
  for (let i = 0; i < 4; i++) { await page.mouse.click(600, 400); await wait(1500); }
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(2500);
  ok((await calls(t3)).length === n1 && JSON.stringify((await aState(t3)).meta) === meta1 && !(await db(t3, 'practice_sessions')).some((r) => r.status === 'discarded'),
    'the out-of-date tab sends nothing, adds no engaged time, and marks nothing discarded');
  await t3.close();
  await page.close();

  // ── Engaged time: counted while visible and recently used; idle time not counted ──
  const p4 = await openTab(CFG());
  await p4.goto(URL_); await clean(p4); await seed(p4, practiceSet()); await p4.goto(URL_);
  await click(p4, '.landing-resume[data-action="resume"]'); await wait(2000);
  for (let i = 0; i < 12; i++) { await p4.mouse.click(700, 400); await wait(1000); }
  await wait(5200);
  const sec1 = await p4.evaluate((k) => Object.values(JSON.parse(localStorage.getItem(k)).meta)[0].sec, AKEY);
  await wait(11000);
  const sec2 = await p4.evaluate((k) => Object.values(JSON.parse(localStorage.getItem(k)).meta)[0].sec, AKEY);
  ok(sec1 >= 8 && sec1 <= 22, `engaged time while clicking for ~12 s: ${sec1.toFixed(1)} s`);
  ok(sec2 - sec1 <= 3, `11 s idle adds at most the cutoff: +${(sec2 - sec1).toFixed(1)} s`);
  await p4.close();

  // ── Real supabase-js against mocked responses: the exact requests ──
  const seen = [];
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Expose-Headers': '*' };
  const mock = (req) => {
    const u = new URL(req.url());
    const json = (status, body) => req.respond({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors });
    if (u.pathname === '/auth/v1/signup') {
      const now = Math.floor(Date.now() / 1000);
      return json(200, { access_token: 'mock-access', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r', user: { id: '11111111-2222-4333-8444-555555555555', aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() } });
    }
    if (u.pathname === '/rest/v1/profiles') return req.method() === 'GET' ? json(200, []) : json(201);
    seen.push({ method: req.method(), path: u.pathname, query: u.search, prefer: req.headers().prefer || '', auth: req.headers().authorization, body: req.postData() || '' });
    return u.pathname === '/rest/v1/rpc/finalize_session' ? json(200, 'finalized') : json(201);
  };
  const real = await openTab(CFG(), { fake: false, mock });
  await real.goto(URL_); await clean(real); await seed(real, practiceSet()); await real.goto(URL_);
  await click(real, '.landing-resume[data-action="resume"]'); await click(real, 'label[for="c-sp25-4e-2"]'); await click(real, '#part-sp25-4e [data-action="check"]');
  for (let i = 0; i < 2; i++) { await real.$eval('[data-action="run-code"]', (b) => b.click()).catch(() => {}); await wait(400); }
  await until(real, () => window.CS61A_AUTH.status().status === 'ready', null, 15000); await until(real, queueEmpty, null, 15000);
  await finish(real); await until(real, queueEmpty, null, 15000);
  const by = (p) => seen.filter((x) => x.path === p);
  const ps = by('/rest/v1/practice_sessions')[0], qq = by('/rest/v1/question_attempts')[0], dd = by('/rest/v1/activity_days')[0];
  const fe = by('/rest/v1/feature_events'), fr = by('/rest/v1/rpc/finalize_session');
  ok(ps && /on_conflict=id/.test(ps.query) && /resolution=merge-duplicates/.test(ps.prefer) && ps.auth === 'Bearer mock-access', 'practice_sessions: upsert on id, as the signed-in user');
  ok(qq && /on_conflict=session_id%2Cquestion_id|on_conflict=session_id,question_id/.test(qq.query), 'question_attempts: upsert on (session_id, question_id)');
  ok(dd && /resolution=ignore-duplicates/.test(dd.prefer) && JSON.parse(dd.body)[0].day === today, `activity_days: insert-or-ignore with the day (${dd && JSON.parse(dd.body)[0].day})`);
  ok(fe.length >= 1 && /resolution=merge-duplicates/.test(fe[fe.length - 1].prefer) && /on_conflict=user_id%2Cdedupe_key|on_conflict=user_id,dedupe_key/.test(fe[fe.length - 1].query) && JSON.parse(fe[fe.length - 1].body)[0].count === 2,
    'feature_events (Run Code): merge on (user_id, dedupe_key) with the running total 2');
  ok(fr.length === 1 && fr[0].method === 'POST' && JSON.parse(fr[0].body).p_session.status === 'completed' && JSON.parse(fr[0].body).p_attempts.length === 5, 'Finish: POST /rest/v1/rpc/finalize_session with the session and its 5 parts');
  ok(seen.every((x) => !x.body.includes(SECRET)), 'no answers in any request body');
  await real.close();

  ok(!allCalls.some((c) => c.table === 'practice_sessions' && c.rows.some((r) => r.status === 'completed')), 'the browser never tried to mark a session completed directly (only through finalize_session)');
  const unexpected = outside.filter((u) => !u.startsWith('https://cdn.jsdelivr.net/pyodide/'));
  ok(unexpected.length === 0 && !outside.some((u) => /supabase/.test(u)), `nothing reached Supabase or anywhere else (blocked: ${outside.length ? [...new Set(outside)].join(', ') : 'nothing'})`);
  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 400) : ''}`);
  await browser.close();
  server.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
