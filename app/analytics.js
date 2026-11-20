// Usage tracking (Supabase Phase 2; docs/supabase-phase2.md). It sends small summaries to the four Phase 2 tables:
//   practice_sessions  one row per practice set / exam attempt (mode, status, counts, times)
//   question_attempts  one row per session × question part: its result, how often it was checked, solution opened
//   feature_events     one row per session × problem × feature; Run Code keeps a count of runs
//   activity_days      "this user did something meaningful on this (Pacific-time) day"
// Never sent: answers, code, notes, highlights, drawings, timer ticks. An exam's parts are sent only when it is
// submitted, as their frozen grades.
//
// How it works: after every save, app.js calls changed(). A moment later the module works out what the rows should
// look like from the app's saved state and queues only the rows that changed since they were last queued. The
// queue lives in localStorage (cs61a-analytics:v1), so nothing is lost on refresh or offline, and it is sent once
// the anonymous session (auth.js) is ready. Writes are upserts keyed by ids made in the browser, so sending the same
// row twice (a retry, a second tab) never creates duplicates.
//
// Finishing: when a practice set is finished or an exam submitted, its final snapshot (the session as completed plus
// every part row) is captured at that moment and queued as ONE call to finalize_session(), which writes it in a
// single database transaction. From then on the session is never tracked again in this browser (Review edits change
// nothing), and the database ignores any later write for it (retries, stale in-progress updates). A session finished
// offline is finalized whenever the browser reconnects, within the queue's 30 days.
//
// It never blocks the app: everything runs later, in the background, and every failure is caught and logged. It is
// off (does nothing, stores nothing) when config.js turns analytics off or when sign-in can't run here (not
// configured, another host, opened as a file, automated tests), and an out-of-date tab (see app.js) does nothing.
window.CS61A_ANALYTICS = (() => {
  const TAG = '[CS61A analytics]';
  const KEY = 'cs61a-analytics:v1';
  const SYNC_DELAY_MS = 1500;           // after the last save, before working out what changed
  const MAX_OPS = 300;                  // pending items kept at most (oldest feature rows go first)
  const MAX_AGE_MS = 30 * 86400000;     // pending items older than this are dropped
  const COUNT_AGE_MS = 90 * 86400000;   // Run Code counters for sessions not used this long are forgotten
  const BATCH = 100;                    // rows per request
  const BACKOFF_MS = [5000, 15000, 60000, 300000];
  const TICK_MS = 5000;                 // engaged-time sampling
  const AUTH = window.CS61A_AUTH || null;
  const cfg = (window.CS61A_CONFIG && window.CS61A_CONFIG.analytics) || {};
  const IDLE_MS = Math.max(1, Number(cfg.idleSeconds) || 60) * 1000;

  let app = null;
  let on = false;
  let syncTimer = null;
  let flushTimer = null;
  let flushing = false;
  let waitingForAuth = false;
  let lastInput = 0;
  let lastTick = Date.now();
  let lastActiveSync = 0;
  const stats = { sent: 0, failed: 0, dropped: 0, lastError: null };
  const stale = () => !!(app && app.isStale && app.isStale());

  // ── storage (its own key; re-read before every change so several tabs cooperate) ──
  // queue: pending items · sent: hash of each row as last queued · open: in-progress session rows (to notice discards)
  // closed: sessions already finalized or discarded · meta: per-session counters · counts: Run Code totals · day: last day marked
  const empty = () => ({ v: 1, queue: [], sent: {}, open: {}, closed: {}, meta: {}, counts: {}, day: null });
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.v === 1 ? Object.assign(empty(), v) : empty(); } catch (e) { return empty(); }
  }
  function write(st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage full or blocked: tracking just stops */ }
  }
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  // A short hash, so the queue can tell "changed since last time" without keeping the data itself.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  const iso = (ms) => new Date(ms).toISOString();
  const pacificDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

  // ── the queue ──
  // item: { k: unique key, table, row, h: row hash, t: queued at, tries, next: not before, mode?, solo? }
  // table 'finalize' items carry { session, attempts } and become one finalize_session() call.
  const PRIORITY = { feature_events: 0, activity_days: 1, question_attempts: 2, practice_sessions: 3, finalize: 4 };
  function enqueue(st, k, table, row, mode) {
    const h = hash(JSON.stringify(row));
    if (st.sent[k] === h) return false;
    st.sent[k] = h;
    st.queue = st.queue.filter((op) => op.k !== k);
    st.queue.push({ k, table, row, h, t: Date.now(), tries: 0, next: 0, mode });
    if (st.queue.length > MAX_OPS) {
      const victim = st.queue.slice().sort((a, b) => PRIORITY[a.table] - PRIORITY[b.table] || a.t - b.t)[0];
      st.queue = st.queue.filter((op) => op !== victim);
      stats.dropped++;
      console.warn(TAG, 'Pending queue full; dropped the oldest low-priority row.', victim.k);
    }
    return true;
  }

  // ── what the rows should be, from the app's state ──
  function metaFor(st, s) {
    return st.meta[s.aid] || (st.meta[s.aid] = { act: s.startedAt || Date.now(), sec: 0, fp: null, checks: {}, first: {} });
  }
  function language(s) {
    const g = s.groups.map((x) => app.isGleam(x.pid));
    return g.every(Boolean) ? 'gleam' : g.some(Boolean) ? 'all' : 'python';
  }
  function sessionRow(kind, s, m) {
    const exam = kind !== 'practice';
    const done = kind === 'attempt' || (kind === 'practice' && s.finished);
    const end = done ? (s.finishedAt || Date.now()) : null;
    return {
      id: s.aid, mode: exam ? 'exam' : 'practice',
      exam_kind: exam ? (s.kind === 'full' ? 'full' : 'topic') : null,
      exam_id: exam && s.kind === 'full' ? s.examId : null,
      language: language(s), status: done ? 'completed' : 'in_progress',
      auto_submitted: kind === 'attempt' && !!s.autoSubmitted, timed: !!s.timer,
      question_groups: s.groups.length, parts: s.ids.length,
      started_at: iso(s.startedAt), completed_at: end ? iso(end) : null,
      // to the minute / 10 seconds, so typing doesn't make a new version of the row every few seconds
      last_activity_at: iso(Math.floor(Math.max(m.act, end || 0) / 60000) * 60000),
      active_seconds: Math.min(86400, Math.floor(m.sec / 10) * 10),
      wall_seconds: end ? Math.min(31536000, Math.max(0, Math.round((end - s.startedAt) / 1000))) : null,
    };
  }
  const EXAM_RESULT = { correct: 'correct', incorrect: 'incorrect', skipped: 'unanswered', staff: 'staff' };
  function partRow(kind, s, m, id) {
    const p = app.part(id);
    if (!p) return null;
    const first = m.first[id];
    return {
      session_id: s.aid, question_id: id, problem_id: p.problem, source_id: p.source, topics: p.topics.slice(0, 8),
      auto_gradable: p.auto,
      result: kind === 'attempt' ? (EXAM_RESULT[s.graded && s.graded[id]] || 'unanswered') : app.practiceResult(s, id),
      first_check: kind === 'practice' && first ? first[0] : null,
      checks: kind === 'practice' ? (m.checks[id] || 0) : 0,
      solution_viewed: kind === 'practice' && !!(s.revealed && s.revealed[id]),
      first_checked_at: kind === 'practice' && first ? first[1] : null,
    };
  }

  // Sets and exams still going get their id as soon as they are seen (also ones saved before tracking existed), so
  // everything done in them (Run Code right after reopening, say) is filed under them.
  // Unfinished practice sets in My History (moved there when another set started). They can be continued later, so
  // they stay in progress; one counts as discarded only once it is deleted. Finished ones were finalized when finished.
  const shelved = (S) => (Array.isArray(S.practice) ? S.practice : []).filter((s) => s && !s.finished);
  function ensureIds() {
    const S = app.getStore();
    let assigned = false;
    [S.session && !S.session.finished ? S.session : null, ...shelved(S), S.exam].forEach((s) => { if (s && !s.aid) { s.aid = uuid(); assigned = true; } });
    if (assigned) app.save();
  }

  function sync() {
    clearTimeout(syncTimer);
    syncTimer = null;
    if (!on || stale()) return;
    try {
      ensureIds();
      const S = app.getStore();
      const st = load();
      const live = [];
      if (S.session && S.session.aid && !st.closed[S.session.aid]) live.push([S.session.finished ? 'done-practice' : 'practice', S.session]);
      shelved(S).forEach((s) => { if (s.aid && !st.closed[s.aid]) live.push(['practice', s]); });
      if (S.exam && S.exam.aid && !st.closed[S.exam.aid]) live.push(['exam', S.exam]);
      (S.attempts || []).forEach((a) => { if (a.aid && !st.closed[a.aid]) live.push(['attempt', a]); });
      const liveIds = new Set(live.map(([, s]) => s.aid));
      let recent = false; // something meaningful happened in the last minute (answer, Check, start, resume, finish)
      live.forEach(([kind, s]) => {
        const m = metaFor(st, s);
        // An answer or self-grade change is activity; only a hash of them is kept, never the answers.
        const fp = hash(JSON.stringify([s.answers, s.selfGrade || {}]));
        if (m.fp !== null && m.fp !== fp) m.act = Date.now();
        m.fp = fp;
        const k = kind === 'done-practice' ? 'practice' : kind;
        const row = sessionRow(k, s, m);
        if (Date.now() - Math.max(m.act, row.completed_at ? Date.parse(row.completed_at) : 0) < 60000) recent = true;
        if (row.status === 'completed') {
          // Final snapshot, captured now: the session as completed plus every part, as one finalize call.
          const attempts = s.ids.map((id) => partRow(k, s, m, id)).filter(Boolean);
          // finalize_session() requires exactly one row per part; a part no longer in the question bank has no row
          if (attempts.length !== row.parts) row.parts = attempts.length;
          st.queue = st.queue.filter((op) => !(op.k === `s:${s.aid}` || op.k.startsWith(`a:${s.aid}:`)));
          enqueue(st, `fin:${s.aid}`, 'finalize', { session: row, attempts });
          st.closed[s.aid] = 1;
          delete st.open[s.aid];
          forget(st, s.aid);
          return;
        }
        enqueue(st, `s:${s.aid}`, 'practice_sessions', row);
        st.open[s.aid] = row;
        if (kind === 'exam') return; // nothing about an exam's answers until it is submitted
        s.ids.filter((id) => m.checks[id] || (s.revealed && s.revealed[id]) || app.practiceResult(s, id) !== 'unanswered')
          .forEach((id) => { const r = partRow(k, s, m, id); if (r) enqueue(st, `a:${s.aid}:${id}`, 'question_attempts', r); });
      });
      // Sessions that were in progress and are gone (a practice set deleted from My History, an exam discarded or
      // replaced by a new exam / retake): final as discarded.
      Object.keys(st.open).forEach((aid) => {
        if (liveIds.has(aid)) return;
        enqueue(st, `s:${aid}`, 'practice_sessions', Object.assign({}, st.open[aid], { status: 'discarded' }));
        delete st.open[aid];
        st.closed[aid] = 1;
        forget(st, aid);
      });
      Object.keys(st.meta).forEach((aid) => { if (!liveIds.has(aid)) forget(st, aid); });
      // One "active" mark per Pacific-time day, with the day it happened (kept if it is sent days later).
      const today = pacificDay();
      if (st.day !== today && recent) { enqueue(st, `d:${today}`, 'activity_days', { day: today }, 'ignore'); st.day = today; }
      const old = Date.now() - COUNT_AGE_MS;
      Object.keys(st.counts).forEach((k) => { if (st.counts[k].t < old) delete st.counts[k]; });
      write(st);
      scheduleFlush(0);
    } catch (e) {
      console.warn(TAG, 'Could not work out what to send.', e);
    }
  }
  function forget(st, aid) {
    delete st.meta[aid];
    Object.keys(st.sent).forEach((k) => { if (k === `s:${aid}` || k.startsWith(`a:${aid}:`)) delete st.sent[k]; });
  }

  // ── sending ──
  const retryable = (status, error) => !status || status === 401 || status === 408 || status === 429 || status >= 500
    || /fetch|network|timeout/i.test(String((error && error.message) || ''));
  const CONFLICT = { practice_sessions: 'id', question_attempts: 'session_id,question_id', feature_events: 'user_id,dedupe_key', activity_days: 'user_id,day' };
  const ORDER = ['practice_sessions', 'question_attempts', 'finalize', 'feature_events', 'activity_days']; // sessions before what refers to them
  const describe = (res) => [res.status && `status ${res.status}`, res.error && (res.error.code || res.error.name), res.error && res.error.message].filter(Boolean).join(' · ');

  function scheduleFlush(ms) {
    if (!on) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, ms);
  }
  const exclusive = (fn) => (navigator.locks && navigator.locks.request
    ? navigator.locks.request('cs61a-analytics-flush', { ifAvailable: true }, (lock) => (lock ? fn() : null))
    : fn());

  async function send(client, userId, table, ops) {
    try {
      if (table === 'finalize') {
        const { session, attempts } = ops[0].row;
        return await client.rpc('finalize_session', { p_session: session, p_attempts: attempts });
      }
      const rows = ops.map((op) => Object.assign({}, op.row, { user_id: userId }));
      const opts = ops[0].mode === 'ignore' ? { onConflict: CONFLICT[table], ignoreDuplicates: true } : { onConflict: CONFLICT[table] };
      return await client.from(table).upsert(rows, opts);
    } catch (e) {
      return { error: e, status: 0 };
    }
  }

  async function flush() {
    if (!on || flushing || stale()) return;
    const client = AUTH.getClient();
    const userId = AUTH.status().userId;
    if (!client || !userId) {
      if (!waitingForAuth) { waitingForAuth = true; AUTH.onReady(() => { waitingForAuth = false; scheduleFlush(0); }); }
      return;
    }
    flushing = true;
    try {
      await exclusive(async () => {
        let st = load();
        const now = Date.now();
        const before = st.queue.length;
        st.queue = st.queue.filter((op) => now - op.t < MAX_AGE_MS);
        if (st.queue.length < before) { stats.dropped += before - st.queue.length; console.warn(TAG, `Dropped ${before - st.queue.length} items older than 30 days.`); }
        write(st);
        for (const table of ORDER) {
          const due = st.queue.filter((op) => op.table === table && op.next <= now);
          // finalize calls go one by one; rows go in batches of the same kind (merge or insert-or-ignore). A row that
          // failed in a batch is retried by itself, so one bad row can't block the rest.
          const batches = [];
          due.filter((op) => op.solo || table === 'finalize').forEach((op) => batches.push([op]));
          const rest = due.filter((op) => !op.solo && table !== 'finalize');
          ['merge', 'ignore'].forEach((mode) => {
            const same = rest.filter((op) => (op.mode || 'merge') === mode);
            for (let i = 0; i < same.length; i += BATCH) batches.push(same.slice(i, i + BATCH));
          });
          for (const ops of batches) {
            const res = await send(client, userId, table, ops);
            st = load();
            const mine = (op) => st.queue.find((x) => x.k === op.k && x.h === op.h);
            const ok = !res.error;
            if (ok) {
              st.queue = st.queue.filter((x) => !ops.some((op) => op.k === x.k && op.h === x.h));
              stats.sent += ops.length;
            } else if (retryable(res.status, res.error)) {
              ops.forEach((op) => { const x = mine(op); if (x) { x.tries++; x.next = Date.now() + BACKOFF_MS[Math.min(x.tries - 1, BACKOFF_MS.length - 1)]; } });
              stats.failed++;
              stats.lastError = describe(res);
              console.warn(TAG, `Could not send ${ops.length} ${table} item(s); will retry.`, stats.lastError);
            } else if (ops.length > 1) {
              ops.forEach((op) => { const x = mine(op); if (x) x.solo = true; });
              stats.lastError = describe(res);
            } else {
              st.queue = st.queue.filter((x) => !(x.k === ops[0].k && x.h === ops[0].h));
              stats.dropped++;
              stats.lastError = describe(res);
              console.warn(TAG, `The database refused a ${table} item; it was dropped.`, stats.lastError, ops[0].k);
            }
            write(st);
            // what follows refers to sessions: wait until sessions (and finalized sessions) are through
            if (!ok && (table === 'practice_sessions' || table === 'finalize') && retryable(res.status, res.error)) return;
          }
        }
      });
    } finally {
      flushing = false;
    }
    const st = load();
    if (st.queue.length) {
      const soonest = Math.min(...st.queue.map((op) => op.next || 0));
      scheduleFlush(Math.max(1000, soonest - Date.now()));
    }
  }

  // ── engaged time: visible, and a click / key / scroll / touch in the last IDLE_MS ──
  function tickActive() {
    const now = Date.now();
    const span = Math.min(now - lastTick, TICK_MS * 2);
    lastTick = now;
    if (!on || stale() || document.visibilityState !== 'visible' || !lastInput) return;
    const aid = app.activeAid();
    if (!aid) return;
    const counted = Math.max(0, Math.min(span, lastInput + IDLE_MS - (now - span)));
    if (!counted) return;
    const st = load();
    if (!st.meta[aid] || st.closed[aid]) return; // not seen by sync yet, or already final
    st.meta[aid].sec += counted / 1000;
    write(st);
    if (now - lastActiveSync > 60000) { lastActiveSync = now; changed(); } // engaged time reaches the database about once a minute
  }

  // ── what app.js calls ──
  function init(opts) {
    app = opts;
    on = cfg.enabled !== false && !!AUTH && typeof AUTH.available === 'function' && AUTH.available()
      && !!window.localStorage && typeof Intl === 'object';
    if (!on) return;
    ensureIds();
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => window.addEventListener(t, () => { lastInput = Date.now(); }, { capture: true, passive: true }));
    setInterval(tickActive, TICK_MS);
    // leaving the tab: write down what changed now (sent now if possible, otherwise on the next visit)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sync(); });
    window.addEventListener('online', () => scheduleFlush(0));
    changed();
  }
  // now = true: work it out right away (a set was just finished / an exam submitted: capture the final snapshot now)
  function changed(now) {
    if (!on || stale()) return;
    clearTimeout(syncTimer);
    if (now) sync(); else syncTimer = setTimeout(sync, SYNC_DELAY_MS);
  }
  // A practice Check: counted here, because a repeated Check on the same answer leaves the saved state unchanged.
  function checked(s, qid, result) {
    if (!on || stale() || !s || !s.aid) return;
    const st = load();
    if (st.closed[s.aid]) return; // finished: Review changes nothing
    const m = metaFor(st, s);
    m.checks[qid] = Math.min(1000, (m.checks[qid] || 0) + 1);
    if (!m.first[qid]) m.first[qid] = [result, iso(Date.now())];
    m.act = Date.now();
    write(st);
    changed();
  }
  // Resuming a set or exam counts as activity (a long-unfinished session is no longer abandoned).
  function activity(s) {
    if (!on || stale() || !s || !s.aid) return;
    const st = load();
    if (st.closed[s.aid]) return;
    metaFor(st, s).act = Date.now();
    write(st);
    changed();
  }
  const EVENTS = new Set(['run_code', 'python_tutor', 'walkthrough_open', 'review_open', 'diagram_edit']);
  // Feature use, one row per (event, session, problem or exam). Run Code counts every run; the rest are recorded once.
  function feature(event, { session = null, problem = null, source = null } = {}) {
    if (!on || stale() || !EVENTS.has(event)) return;
    try {
      const aid = session && session.aid ? session.aid : null;
      const dedupe = [event, aid || (session && session.id) || 'none', problem || source || ''].join(':').slice(0, 160);
      const k = `f:${dedupe}`;
      const st = load();
      if (event === 'run_code') {
        // The running total for this session and problem; sending the total (not "+1") makes retries harmless and
        // the database keeps the larger of two totals.
        const c = st.counts[dedupe] || (st.counts[dedupe] = { id: uuid(), n: 0, t: 0 });
        c.n = Math.min(1000000, c.n + 1);
        c.t = Date.now();
        enqueue(st, k, 'feature_events', { id: c.id, session_id: aid, event, problem_id: problem, source_id: source, dedupe_key: dedupe, count: c.n }, 'merge');
      } else {
        if (st.sent[k]) return;
        enqueue(st, k, 'feature_events', { id: uuid(), session_id: aid, event, problem_id: problem, source_id: source, dedupe_key: dedupe, count: 1 }, 'ignore');
        st.sent[k] = 'sent'; // recorded once; never queued again
      }
      write(st);
      scheduleFlush(SYNC_DELAY_MS);
    } catch (e) {
      console.warn(TAG, 'Could not record feature use.', e);
    }
  }
  const newId = uuid;
  function status() {
    const st = on ? load() : empty();
    return { enabled: on, queued: st.queue.length, ...stats };
  }

  return { init, changed, checked, activity, feature, newId, status, flush: () => flush() };
})();
