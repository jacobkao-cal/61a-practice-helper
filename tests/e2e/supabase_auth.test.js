// Backend Phase 1: anonymous Supabase sign-in (app/auth.js). No real Supabase project is ever contacted: the app is
// served from a local server inside this test, every request leaving it is blocked, and Supabase itself is either a
// fake client (most checks) or the real vendored supabase-js talking to mocked responses (the last block).
//   - nothing on the welcome page; the first step past it (Start Practicing, Resume set, Resume exam, an exam
//     reopening by itself) signs in without waiting for it, and only once
//   - a saved session is reused (no second user), a profile is created once and never duplicated
//   - failures (sign-in error, network trouble, missing profile permissions) leave practice working, are logged, and
//     are retried; a saved session is never replaced because of a network error
//   - off without configuration, on other hosts, in automated browsers unless allowed, and with a secret key
//   - the app's saved data (practice, exams, history) is untouched
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { CHROME, skipTour } = require('./config');
const KEY = 'cs61a-practice:v1';
const APP_DIR = path.join(__dirname, '..', '..', 'app');
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SB = 'https://test-project.supabase.co'; // never a real project: requests to it are answered by this test or blocked
const PUB = 'sb_publishable_TEST_ONLY_not_a_real_key';

// A fake supabase-js: the session lives in localStorage like the real one; users, profiles, a call log and the
// behaviour switches (fake-sb-opts) are kept in localStorage too, so they carry across reloads and tabs.
function installFake() {
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const log = (what) => put('fake-sb-log', [...get('fake-sb-log', []), what]);
  const opts = () => get('fake-sb-opts', {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.supabase = {
    createClient(url, key, o) {
      log({ call: 'createClient', url, key, persist: o && o.auth && o.auth.persistSession });
      return {
        auth: {
          async getSession() {
            log({ call: 'getSession' });
            if (opts().getSessionNetworkError) return { data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } };
            return { data: { session: get('fake-sb-session', null) }, error: null };
          },
          async signInAnonymously() {
            log({ call: 'signInAnonymously' });
            await sleep(opts().delayMs || 0);
            if (opts().signInFail) return { data: { user: null, session: null }, error: { name: 'AuthApiError', message: 'Anonymous sign-ins are disabled', status: 422 } };
            const users = get('fake-sb-users', []);
            const user = { id: `00000000-0000-4000-8000-${String(users.length + 1).padStart(12, '0')}`, is_anonymous: true };
            put('fake-sb-users', [...users, user.id]);
            put('fake-sb-session', { access_token: 't', user });
            return { data: { user, session: { user } }, error: null };
          },
        },
        from(table) {
          return {
            select(cols) {
              return { eq(col, id) {
                return { async maybeSingle() {
                  log({ call: 'select', table, cols, col, id });
                  if (opts().profileSelectFail) return { data: null, error: { code: '42501', message: 'permission denied for table profiles' } };
                  return { data: get('fake-sb-profiles', []).includes(id) && !opts().hideProfiles ? { id } : null, error: null };
                } };
              } };
            },
            async insert(row) {
              log({ call: 'insert', table, row });
              const rows = get('fake-sb-profiles', []);
              if (rows.includes(row.id)) return { error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' } };
              put('fake-sb-profiles', [...rows, row.id]);
              return { error: null };
            },
          };
        },
      };
    },
  };
}

(async () => {
  const missing = []; // paths the local server didn't have
  // Static server for app/ (sign-in only runs over http(s) on a listed host, never from file://).
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; } // the site has none; a file:// page never asks
    const p = path.join(APP_DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(APP_DIR)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p, (err, data) => {
      if (err) { missing.push(req.url); res.writeHead(404); res.end(); return; }
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://localhost:${server.address().port}`;
  const URL_ = `${ORIGIN}/index.html`;

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const outside = []; // every request that tried to leave the local server
  const errors = [];
  const warnings = [];
  const libLoads = [];
  // A tab with the given config (replacing config.js) and either the fake client or the real vendored library.
  async function openTab(cfg, { fake = true, mock = null } = {}) {
    const page = await browser.newPage();
    await skipTour(page);
    await page.setViewport({ width: 1300, height: 850 });
    await page.evaluateOnNewDocument((c) => {
      Object.defineProperty(window, 'CS61A_CONFIG', { configurable: false, get: () => c, set: () => {} });
    }, cfg);
    if (fake) await page.evaluateOnNewDocument(installFake);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (u.startsWith(ORIGIN)) { if (u.includes('vendor/supabase/')) libLoads.push(u); req.continue(); return; }
      if (mock && u.startsWith(SB)) { mock(req); return; }
      outside.push(u); req.abort();
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warn' || m.type() === 'warning') warnings.push(m.text()); });
    page.on('dialog', (d) => d.accept());
    return page;
  }
  // Usage tracking (Phase 2) has its own suite (analytics.test.js); here it stays off so only sign-in is exercised.
  const ON = { supabase: { url: SB, publishableKey: PUB, hosts: ['localhost'], allowAutomation: true }, analytics: { enabled: false } };
  const status = (page) => page.evaluate(() => window.CS61A_AUTH.status());
  const settled = (page) => page.waitForFunction(() => !['idle', 'pending'].includes(window.CS61A_AUTH.status().status), { timeout: 8000, polling: 100 }).then(() => status(page)); // timed polling: a background tab gets no animation frames
  const fakeLog = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('fake-sb-log') || '[]'));
  const calls = async (page, name) => (await fakeLog(page)).filter((c) => c.call === name).length;
  const reset = (page, opts) => page.evaluate((o) => {
    Object.keys(localStorage).filter((k) => k.startsWith('fake-sb-') || k === 'cs61a-practice:v1').forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('fake-sb-opts', JSON.stringify(o || {}));
  }, opts);
  const setOpts = (page, o) => page.evaluate((x) => localStorage.setItem('fake-sb-opts', JSON.stringify(x)), o);
  const seed = (page, obj) => page.evaluate((k, v) => { localStorage.setItem(k, v); Storage.prototype.setItem = function () {}; }, KEY, JSON.stringify(obj));
  const click = async (page, sel) => { await page.waitForSelector(sel, { visible: true, timeout: 8000 }); await page.$eval(sel, (b) => b.click()); await wait(60); };

  // ── Welcome page, then Start Practicing: first-time sign-in ──
  const page = await openTab(ON);
  await page.goto(URL_); await reset(page, { delayMs: 1500 });
  await page.goto(URL_); await page.waitForSelector('.landing'); await wait(400);
  ok((await status(page)).status === 'idle' && (await fakeLog(page)).length === 0 && libLoads.length === 0, 'welcome page: no sign-in, nothing loaded');
  await click(page, '[data-action="enter"]');
  ok(!(await page.$('.landing')) && (await status(page)).status === 'pending', 'Start Practicing goes straight to Home while sign-in is still running (not waited on)');
  let S = await settled(page);
  ok(S.status === 'ready' && S.session === 'created' && S.profile === 'created' && S.isAnonymous && /^0{8}-/.test(S.userId), `first visit: anonymous user created, profile created (${S.userId})`);
  let L = await fakeLog(page);
  ok(L.filter((c) => c.call === 'signInAnonymously').length === 1 && L.filter((c) => c.call === 'createClient').length === 1, 'exactly one signInAnonymously and one client');
  ok(L.find((c) => c.call === 'createClient').url === SB && L.find((c) => c.call === 'createClient').key === PUB && L.find((c) => c.call === 'createClient').persist === true, 'client built from config.js: Project URL + publishable key, session persisted');
  ok(L.some((c) => c.call === 'insert' && c.table === 'profiles' && JSON.stringify(c.row) === JSON.stringify({ id: S.userId })), 'profile row is { id: the user’s UUID } in public.profiles');
  ok(libLoads.length === 0, 'with a client already present, the vendored library is not loaded again');
  // more renders and clicks: nothing more
  await click(page, '#mode-exam'); await click(page, '#mode-practice'); await wait(200);
  ok(await calls(page, 'signInAnonymously') === 1 && await calls(page, 'getSession') === 1 && await calls(page, 'insert') === 1, 'later screens don’t sign in again');

  // ── Reload: the saved session is reused, the profile is found, no duplicates ──
  const userId = S.userId;
  await page.goto(URL_); await click(page, '[data-action="enter"]');
  S = await settled(page);
  ok(S.status === 'ready' && S.session === 'restored' && S.userId === userId && S.profile === 'existing', 'reload: same user restored, profile already there');
  ok(await calls(page, 'signInAnonymously') === 1 && await calls(page, 'insert') === 1, 'no second user and no second profile insert');
  // a profile created meanwhile by another tab: the insert hits the primary key and counts as existing
  await setOpts(page, { hideProfiles: true });
  await page.goto(URL_); await click(page, '[data-action="enter"]');
  S = await settled(page);
  ok(S.status === 'ready' && S.profile === 'existing' && await page.evaluate(() => JSON.parse(localStorage.getItem('fake-sb-profiles')).length) === 1, 'duplicate insert (23505) is treated as existing; still one profile');

  // ── Every entry point past the welcome page ──
  for (const [name, store, sel] of [
    ['Resume your unfinished set', { version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: ['fa25-1a', 'fa25-1b', 'fa25-1c'], index: 0, title: 'x', answers: {}, timer: null, startedAt: Date.now(), finished: false, notes: {}, annotations: {} } }, '.landing-resume[data-action="resume"]'],
  ]) {
    await reset(page, {}); await seed(page, store); await page.goto(URL_); await page.waitForSelector('.landing');
    ok((await status(page)).status === 'idle', `${name}: nothing before the click`);
    await click(page, sel); S = await settled(page);
    ok(S.status === 'ready' && S.session === 'created' && await calls(page, 'signInAnonymously') === 1 && await page.$('#pane-right .part'), `${name}: signs in and opens the questions`);
  }
  // an exam in progress: made with sign-in off, then Save & Leave → Resume exam; and a refresh mid-exam reopens it by itself
  const offTab = await openTab({ supabase: { url: '', publishableKey: '', hosts: ['localhost'] } });
  await offTab.goto(URL_); await reset(offTab, {});
  await seed(offTab, { version: 5, prefs: { mode: 'exam' }, examPrefs: { kind: 'custom', topics: [], picked: ['fa25-1'], timerOn: false, minutes: 120 } });
  await offTab.goto(URL_); await click(offTab, '[data-action="enter"]'); await click(offTab, '[data-action="start-exam"]'); await offTab.waitForSelector('#pane-right .part');
  ok((await status(offTab)).status === 'disabled' && (await status(offTab)).reason === 'not configured' && await calls(offTab, 'createClient') === 0, 'no URL/key in config: sign-in off, the exam works as before');
  await click(offTab, '.p-footer [data-action="save-leave"]'); await wait(400);
  await offTab.close();
  await page.evaluate(() => { ['fake-sb-log', 'fake-sb-session', 'fake-sb-users', 'fake-sb-profiles'].forEach((k) => localStorage.removeItem(k)); });
  await page.goto(URL_); await page.waitForSelector('.landing-resume[data-action="resume-exam"]');
  ok((await status(page)).status === 'idle', 'Resume your exam: nothing before the click');
  await click(page, '.landing-resume[data-action="resume-exam"]'); S = await settled(page);
  ok(S.status === 'ready' && S.session === 'created' && await page.$('#pane-right .part'), 'Resume your exam: signs in and reopens the exam');
  const examBefore = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).exam.id, KEY);
  await page.evaluate(() => { ['fake-sb-log', 'fake-sb-session', 'fake-sb-users', 'fake-sb-profiles'].forEach((k) => localStorage.removeItem(k)); });
  await page.reload(); await page.waitForSelector('#pane-right .part');
  S = await settled(page);
  ok(!(await page.$('.landing')) && S.status === 'ready' && S.session === 'created' && await calls(page, 'signInAnonymously') === 1, 'exam reopening by itself after a refresh: signs in with no click');
  ok(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).exam.id, KEY) === examBefore, 'the exam in progress is unchanged');

  // ── Saved data is untouched ──
  await reset(page, {});
  const history = { version: 5, prefs: { mode: 'exam', timerOn: false }, session: null, exam: null,
    attempts: [{ id: 'a1', mode: 'exam', submitted: true, title: 'Old attempt', kind: 'custom', ids: ['fa25-1a'], groups: [{ pid: 'fa25-1', ids: ['fa25-1a'] }], index: 0, answers: { 'fa25-1a': 1 }, notes: {}, annotations: {}, eliminated: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, startedAt: 1, finishedAt: 2, finished: true }], reviews: {} };
  await seed(page, history); await page.goto(URL_);
  const before = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await click(page, '[data-action="enter"]'); S = await settled(page);
  await click(page, '[data-action="progress"]'); await page.waitForSelector('.mh-card [data-action="open-attempt"][data-id="a1"]');
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  ok(S.status === 'ready' && keys.filter((k) => !k.startsWith('fake-sb-')).join() === 'cs61a-practice:tour,cs61a-practice:v1', `only the app’s own keys besides the session (${keys.join(', ')})`);
  const after = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY));
  ok(after.attempts.length === 1 && after.attempts[0].id === 'a1' && JSON.stringify(after.attempts[0].answers) === JSON.stringify(JSON.parse(before).attempts[0].answers), 'Exam History and its answers are kept');

  // ── Failures: practice continues, the error is logged, retried later ──
  await reset(page, { signInFail: true });
  await seed(page, { version: 5, prefs: { mode: 'practice', timerOn: false }, session: { ids: ['fa25-1a', 'fa25-1b', 'fa25-1c'], index: 0, title: 'x', answers: {}, timer: null, startedAt: Date.now(), finished: false, notes: {}, annotations: {} } });
  warnings.length = 0;
  await page.goto(URL_); await click(page, '.landing-resume[data-action="resume"]');
  S = await settled(page);
  ok(S.status === 'error' && /disabled/.test(S.error) && warnings.some((w) => /\[CS61A auth\]/.test(w)), `sign-in error: status error, logged as a warning (${S.error})`);
  await click(page, '#part-fa25-1a label.choice'); await wait(400);
  ok(await page.evaluate((k) => Number.isInteger(JSON.parse(localStorage.getItem(k)).session.answers['fa25-1a']), KEY), 'practice still works: the answer is saved');
  await click(page, '[data-action="next"]').catch(() => {}); await wait(200);
  ok(await calls(page, 'signInAnonymously') === 1, 'no immediate retry on every screen change (waits before retrying)');
  await setOpts(page, {});
  S = await page.evaluate(() => window.CS61A_AUTH.retry());
  ok(S.status === 'ready' && S.session === 'created' && await calls(page, 'signInAnonymously') === 2, 'retry() after the problem is fixed: signed in');
  // a saved session that can't be refreshed (offline): never replaced by a new user
  await setOpts(page, { getSessionNetworkError: true });
  await page.goto(URL_); await click(page, '[data-action="enter"]');
  S = await settled(page);
  ok(S.status === 'error' && await calls(page, 'signInAnonymously') === 2 && await page.evaluate(() => JSON.parse(localStorage.getItem('fake-sb-users')).length) === 1, 'network error with a saved session: no new user created, error recorded');
  await setOpts(page, {});
  await page.evaluate(() => window.dispatchEvent(new Event('online'))); await wait(300);
  S = await status(page);
  ok(S.status === 'ready' && S.session === 'restored', 'back online: retried, the saved session is restored');
  // missing SELECT permission on profiles: logged, practice unaffected
  await setOpts(page, { profileSelectFail: true });
  await page.goto(URL_); await click(page, '[data-action="enter"]');
  S = await settled(page);
  ok(S.status === 'error' && /42501|permission/.test(S.error) && await page.$('.setup-card, .exam-setup'), `profile permission error: reported (${S.error}), Home works`);
  // two tabs opening at once on a fresh browser: one user, one profile
  await reset(page, { delayMs: 800 });
  const t2 = await openTab(ON);
  await Promise.all([page.goto(URL_), t2.goto(URL_)]);
  await Promise.all([click(page, '[data-action="enter"]'), click(t2, '[data-action="enter"]')]);
  const [s1, s2] = await Promise.all([settled(page), settled(t2)]);
  ok(s1.status === 'ready' && s2.status === 'ready' && s1.userId === s2.userId && await calls(page, 'signInAnonymously') === 1 && await page.evaluate(() => JSON.parse(localStorage.getItem('fake-sb-profiles')).length) === 1, `two tabs at once: one anonymous user and one profile (${s1.session}/${s2.session})`);
  await t2.close();

  // ── Off where it should be ──
  for (const [label, cfg, reason] of [
    ['another host', { supabase: { url: SB, publishableKey: PUB, hosts: ['jacobkao-cal.github.io'], allowAutomation: true } }, 'not enabled on this host'],
    ['an automated browser (the default)', { supabase: { url: SB, publishableKey: PUB, hosts: ['localhost'] } }, 'automated browser'],
    ['a secret key', { supabase: { url: SB, publishableKey: 'sb_secret_abc123', hosts: ['localhost'], allowAutomation: true } }, 'secret key refused'],
    ['a service_role JWT', { supabase: { url: SB, publishableKey: `x.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.y`, hosts: ['localhost'], allowAutomation: true } }, 'secret key refused'],
  ]) {
    const t = await openTab(cfg);
    await t.goto(URL_); await reset(t, {}); await t.goto(URL_);
    const errsBefore = errors.length;
    await click(t, '[data-action="enter"]'); S = await settled(t);
    ok(S.status === 'disabled' && S.reason === reason && await calls(t, 'createClient') === 0 && await t.$('.setup-card, .exam-setup'), `${label}: sign-in off (${S.reason}), Home works`);
    if (/secret|service_role/.test(label)) { ok(errors.slice(errsBefore).some((e) => /Refusing to sign in/.test(e)), `${label}: refused with a console error`); errors.splice(errsBefore); }
    await t.close();
  }
  // the shipped config.js: empty URL and key, so nothing runs
  // the shipped config.js holds no secret key, and only the published site and a local server are listed
  global.window = {};
  require(path.join(APP_DIR, 'config.js'));
  const shipped = window.CS61A_CONFIG.supabase;
  ok(!/sb_secret_|service_role/.test(fs.readFileSync(path.join(APP_DIR, 'config.js'), 'utf8').replace(/\/\/.*$/gm, '')) && JSON.stringify(shipped.hosts) === JSON.stringify(['jacobkao-cal.github.io', 'localhost', '127.0.0.1']) && shipped.allowAutomation !== true,
    'shipped config.js: no secret key, hosts are the site + local server, automation not allowed');

  // ── The real vendored supabase-js, against mocked Supabase responses ──
  libLoads.length = 0;
  const seen = [];
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': '*' };
  const UID = '11111111-2222-4333-8444-555555555555';
  const profiles = [];
  const mock = (req) => {
    const u = new URL(req.url());
    seen.push(`${req.method()} ${u.pathname}${u.search}`);
    const json = (status, body) => req.respond({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors });
    const h = req.headers();
    if (h.apikey !== PUB) return json(401, { message: 'bad apikey' });
    if (u.pathname === '/auth/v1/signup' && req.method() === 'POST') {
      const now = Math.floor(Date.now() / 1000);
      return json(200, { access_token: 'mock-access', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'mock-refresh',
        user: { id: UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() } });
    }
    if (u.pathname === '/rest/v1/profiles' && req.method() === 'GET') {
      if (h.authorization !== 'Bearer mock-access') return json(401, { message: 'no user token' });
      return json(200, profiles.filter((id) => u.search.includes(`id=eq.${id}`)).map((id) => ({ id })));
    }
    if (u.pathname === '/rest/v1/profiles' && req.method() === 'POST') {
      if (h.authorization !== 'Bearer mock-access') return json(401, { message: 'no user token' });
      const row = JSON.parse(req.postData() || '{}');
      if (profiles.includes(row.id)) return json(409, { code: '23505', message: 'duplicate key' });
      profiles.push(row.id); return json(201);
    }
    return json(404, { message: 'unexpected ' + u.pathname });
  };
  const real = await openTab(ON, { fake: false, mock });
  await real.goto(URL_);
  await real.evaluate(() => Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)));
  await real.evaluate(() => localStorage.setItem('cs61a-practice:tour', '{"asked":true,"on":false,"seen":{}}'));
  await real.goto(URL_); await real.waitForSelector('.landing'); await wait(300);
  ok(libLoads.length === 0, 'real library: not loaded on the welcome page');
  await click(real, '[data-action="enter"]');
  S = await settled(real);
  ok(libLoads.length === 1 && S.status === 'ready' && S.userId === UID && S.session === 'created' && S.profile === 'created', `real supabase-js 2.119.0: loaded on demand, signed in anonymously, profile created (${S.status}${S.error ? ': ' + S.error : ''})`);
  ok(seen.some((x) => x.startsWith('POST /auth/v1/signup')) && seen.some((x) => x.startsWith('GET /rest/v1/profiles?select=id&id=eq.' + UID)) && seen.some((x) => x.startsWith('POST /rest/v1/profiles')), `requests: anonymous signup, profile lookup, profile insert (${seen.filter((x) => !x.startsWith('OPTIONS')).join(' | ')})`);
  ok(profiles.length === 1 && profiles[0] === UID, 'the profile row carries the user’s UUID');
  ok(await real.evaluate(() => Object.keys(localStorage).some((k) => /^sb-test-project-auth-token$/.test(k))), 'supabase-js keeps its session under its own key (sb-test-project-auth-token)');
  seen.length = 0;
  await real.goto(URL_); await click(real, '[data-action="enter"]');
  S = await settled(real);
  ok(S.status === 'ready' && S.session === 'restored' && S.userId === UID && S.profile === 'existing' && !seen.some((x) => /signup|POST \/rest/.test(x)), 'real library, reload: session restored from storage, no new user, no insert');
  await real.close();

  ok(outside.length === 0, `no request ever left the local server${outside.length ? ': ' + outside.slice(0, 3).join(', ') : ''}`);
  ok(missing.length === 0, `every file the page asked for exists${missing.length ? ': ' + missing.join(', ') : ''}`);
  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ').slice(0, 400) : ''}`);
  await browser.close();
  server.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
