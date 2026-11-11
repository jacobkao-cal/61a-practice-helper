// CS 61A Practice — prototype app (no build step; CodeMirror 5 is vendored).
// Screens: landing → home → practice → results. All state lives in `store` and is mirrored to localStorage.
//
// Practice model: a session holds question parts (`ids`) grouped by problem (`groups`). Navigation moves
// between groups; every part of the current group is shown together in the right pane, while the left pane
// (problem text, scratch editor, annotations) is built once per group and left untouched by re-renders.
(function () {
  'use strict';

  // Python bank. TOPICS, EXAMS, PROBLEMS and QUESTIONS below are Python only: Exam Mode lists and builds exams from
  // them, so it never sees a Gleam question.
  const { TOPICS, EXAMS, PROBLEMS, BUBBLE_NOTE } = window.CS61A_BANK;
  const ALL_QUESTIONS = window.CS61A_BANK.QUESTIONS;
  // Gleam bank (data/gleam_questions.js), Practice Mode only. Its entries are merged into the id lookups below
  // (PMAP, SRC, QMAP, ANSWER_KEY, topic names), which work the same for both languages.
  const GL = Object.assign({ TOPICS: [], SOURCES: {}, PROBLEMS: {}, QUESTIONS: [], ANSWER_KEY: {}, TESTS: {}, FILES: {}, RUN_LIMITS: {} }, window.CS61A_GLEAM_BANK || {});
  const PMAP = Object.assign({}, PROBLEMS, GL.PROBLEMS);    // problem id -> problem (either language)
  const SRC = Object.assign({}, EXAMS, GL.SOURCES);         // problem.exam -> its exam or Gleam source
  const ANSWER_KEY = Object.assign({}, window.CS61A_BANK.ANSWER_KEY, GL.ANSWER_KEY);
  const ALL_TOPICS = TOPICS.concat(GL.TOPICS);
  const topicById = (id) => ALL_TOPICS.find((t) => t.id === id);
  const isGleam = (pid) => Object.prototype.hasOwnProperty.call(GL.PROBLEMS, pid);
  const LANGS = [
    { id: 'all', name: 'All' }, // every question of every available language
    { id: 'python', name: 'Python' },
    { id: 'gleam', name: 'Gleam' },
    { id: 'sql', name: 'SQL', soon: true },
  ];
  // Scope for this semester (data/in_scope.js). Out-of-scope parts stay in the bank, so saved sessions and past
  // attempts that include them still load (QMAP and ORDER cover every part); they are only left out of new
  // practice sets and exams, which are all built from QUESTIONS.
  const SCOPE = window.CS61A_SCOPE || {};
  const OUT_TOPICS = new Set(SCOPE.outOfScopeTopics || []);
  const scopeEntry = (map, id) => (SCOPE[map] && Object.prototype.hasOwnProperty.call(SCOPE[map], id) ? SCOPE[map][id] : null);
  function inScope(q) {
    const p = scopeEntry('problems', q.problem), own = scopeEntry('questions', q.id);
    if ((p && p.status === 'out') || (own && own.status === 'out')) return false;
    return !(q.topics.length && q.topics.every((t) => OUT_TOPICS.has(t)));
  }
  const QUESTIONS = ALL_QUESTIONS.filter(inScope);
  const GL_QUESTIONS = GL.QUESTIONS.filter(inScope);
  const EVERY_QUESTION = ALL_QUESTIONS.concat(GL.QUESTIONS); // id lookups and blank links, both languages
  // Exam Mode: the Python bank, plus the Gleam exam-prep worksheets in topic-based exams only (the "Gleam" chip).
  // Full past exams stay Python midterms. Gleam lecture examples are Practice Mode only.
  const isExamPrep = (pid) => isGleam(pid) && GL.SOURCES[GL.PROBLEMS[pid].exam].kind === 'exam-prep';
  const EXAM_QUESTIONS = QUESTIONS.concat(GL_QUESTIONS.filter((q) => isExamPrep(q.problem)));
  const EXAM_PIDS = Object.keys(PROBLEMS).concat(Object.keys(GL.PROBLEMS).filter(isExamPrep));
  const GLEAM_CHIP = 'gleam'; // the topic-based exam filter chip for Gleam questions (kept with the topic chips)
  const scopeNote = (map, id) => { const e = scopeEntry(map, id); return e && e.status === 'note' && e.note ? e.note : ''; };
  const scopeNoteHTML = (text) => (text ? `<div class="scope-note" role="note"><b>Scope note:</b> ${inline(text)}</div>` : '');
  const TOPICS_IN_SCOPE = TOPICS.map((t) => t.id).filter((id) => !OUT_TOPICS.has(id));
  const GUIDES = window.CS61A_GUIDES || {}; // topic id -> study-guide concepts (data/study_guides.js)
  const TOUR = window.CS61A_TOUR || null;   // first-visit tour and one-time tips (tour.js)
  const QMAP = Object.fromEntries(EVERY_QUESTION.map((q) => [q.id, q]));
  const ORDER = Object.fromEntries(EVERY_QUESTION.map((q, i) => [q.id, i]));
  const STORE_KEY = 'cs61a-practice:v1';
  const DIFFS = ['easy', 'medium', 'hard'];
  const TYPE_LABEL = { single_choice: 'Multiple choice', multi_select: 'Select all that apply', short_answer: 'Short answer', code: 'Code response · self-check' };

  const app = document.getElementById('app');
  const live = document.getElementById('sr-live');

  // ───────────────────────────── State & persistence ─────────────────────────────
  // Practice Mode filters. lang picks the bank; topics/exams filter Python, glTopics/glSources filter Gleam (each
  // language keeps its own selection when you switch).
  const DEFAULT_PREFS = { mode: 'practice', lang: 'python', topics: [], exams: Object.keys(EXAMS), glTopics: [], glSources: Object.keys(GL.SOURCES), difficulties: DIFFS.slice(), size: 5, timerOn: true, minutes: 25 };
  // Neither exam PDF states a time limit, so exams start from this editable default (labeled as such in the UI).
  const EXAM_DEFAULT_MINUTES = 120;
  const EXAM_MAX_MINUTES = 300;
  const DEFAULT_EXAM_PREFS = { kind: 'full', examId: Object.keys(EXAMS)[0], topics: [], picked: [], timerOn: true, minutes: EXAM_DEFAULT_MINUTES };
  const STORE_VERSION = 5; // v1: prefs/session/notes/annotations; v2: + exam, attempts, examPrefs; v3: + reviews, frozen grades;
                           // v4: practice notes/annotations move onto the practice session (no longer shared across sessions)
                           // v5: bold around code renders as bold, so text highlights in that prose are moved to match

  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  function load() {
    try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); return isObj(v) ? v : null; } catch (e) { return null; }
  }
  // If another tab writes the store, this tab's copy is out of date: saving it would overwrite the other tab's
  // work (e.g. erase an exam submitted there). Stop saving and ask for a reload instead (see the 'storage' listener).
  let staleTab = false;
  function save() {
    if (staleTab) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable: work lives in memory only */ }
  }
  let saveTimer = null;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }

  // Group part ids by problem, keeping first-appearance order.
  function groupIds(ids) {
    const groups = [];
    const at = {};
    ids.forEach((id) => {
      const pid = QMAP[id].problem;
      if (!(pid in at)) { at[pid] = groups.length; groups.push({ pid, ids: [] }); }
      groups[at[pid]].ids.push(id);
    });
    return groups;
  }
  // Sessions saved before grouping existed navigated per part; convert them in place. Also repairs records
  // that are damaged or from older versions (missing maps, groups that don't match the ids, a bad index or
  // timer) instead of crashing; a record with no usable question ids is dropped.
  function migrateSession(s) {
    if (!isObj(s) || !Array.isArray(s.ids) || !s.ids.length || !s.ids.every((id) => QMAP[id])) return null;
    const groupsOk = Array.isArray(s.groups) && s.groups.length && s.groups.every((g) => isObj(g) && PMAP[g.pid] &&
      Array.isArray(g.ids) && g.ids.length && g.ids.every((id) => QMAP[id] && QMAP[id].problem === g.pid)) &&
      s.groups.reduce((t, g) => t + g.ids.length, 0) === s.ids.length;
    if (!groupsOk) {
      const curId = s.ids[s.index] || s.ids[0];
      const legacy = !s.groups; // v1: index and marks were per part
      s.groups = groupIds(s.ids);
      s.index = legacy ? Math.max(0, s.groups.findIndex((g) => g.ids.includes(curId))) : 0;
      if (legacy) {
        const marked = {};
        Object.keys(isObj(s.marked) ? s.marked : {}).forEach((id) => { if (QMAP[id]) marked[QMAP[id].problem] = true; });
        s.marked = marked;
      }
    }
    ['answers', 'checked', 'revealed', 'selfGrade', 'marked', 'eliminated'].forEach((k) => { if (!isObj(s[k])) s[k] = {}; });
    if (!Number.isInteger(s.index) || s.index < 0 || s.index >= s.groups.length) s.index = 0;
    const t = s.timer;
    if (t && !(isObj(t) && typeof t.durationMs === 'number' && typeof t.remainingMs === 'number' && (t.runningSince === null || typeof t.runningSince === 'number'))) s.timer = null;
    if (typeof s.title !== 'string') s.title = 'Practice set';
    if (typeof s.startedAt !== 'number') s.startedAt = Date.now();
    return s;
  }
  // Keep only valid values in saved preference lists (they drive filtering on the home page).
  function cleanPrefs(p, d, lists) {
    Object.keys(lists).forEach((k) => { p[k] = Array.isArray(p[k]) ? [...new Set(p[k].filter((v) => lists[k].includes(v)))] : d[k].slice(); });
    if (typeof p.timerOn !== 'boolean') p.timerOn = d.timerOn;
    if (typeof p.minutes !== 'number') p.minutes = d.minutes;
    return p;
  }
  // Older notes used ___(a)___ placeholders; the editor now keeps the template token ⟦a⟧.
  function migrateNotes(notes) {
    Object.keys(notes).forEach((pid) => {
      if (!PMAP[pid]) delete notes[pid];
      else notes[pid] = notes[pid].replace(/___\(([^)]+)\)___/g, '⟦$1⟧');
    });
    return notes;
  }

  // Exam attempts have the same shape as a practice session plus mode: 'exam'. They carry their own
  // scratch notes and annotations, so practice work never shows up inside an exam (or the reverse).
  function migrateAttempt(a) {
    if (!isObj(a) || a.mode !== 'exam' || typeof a.id !== 'string' || !migrateSession(a)) return null;
    a.notes = migrateNotes(a.notes || {});
    a.annotations = a.annotations || {};
    a.eliminated = a.eliminated || {};
    return a;
  }

  const saved = load();
  const store = {
    version: STORE_VERSION, // same storage key as v1, so practice sessions saved before exams existed still load
    prefs: cleanPrefs(Object.assign({}, DEFAULT_PREFS, isObj(saved && saved.prefs) ? saved.prefs : {}), DEFAULT_PREFS,
      { topics: TOPICS_IN_SCOPE, exams: Object.keys(EXAMS), glTopics: GL.TOPICS.map((t) => t.id), glSources: Object.keys(GL.SOURCES), difficulties: DIFFS }),
    session: migrateSession(saved && saved.session), // the practice set; carries its own notes/annotations (see below)
    examPrefs: cleanPrefs(Object.assign({}, DEFAULT_EXAM_PREFS, isObj(saved && saved.examPrefs) ? saved.examPrefs : {}), DEFAULT_EXAM_PREFS,
      { topics: TOPICS_IN_SCOPE.concat(GLEAM_CHIP), picked: EXAM_PIDS }),
    exam: migrateAttempt(saved && saved.exam),         // the exam in progress (never submitted), or null
    attempts: (Array.isArray(saved && saved.attempts) ? saved.attempts : []).map(migrateAttempt).filter(Boolean), // submitted exams, oldest first
    reviews: (saved && saved.reviews && typeof saved.reviews === 'object') ? saved.reviews : {}, // attemptId -> review workspace
  };
  // Scratch code and annotations belong to the session they were made in. Before v4, practice kept them in
  // store-wide maps keyed by problem, so they leaked into every later set with the same question. A saved
  // practice set takes over the entries for its own problems; the rest belonged to finished sets and are dropped.
  if (store.session && !store.session.notes) {
    const oldNotes = migrateNotes((saved && saved.notes) || {});
    const oldAnns = (saved && saved.annotations) || {};
    const own = new Set(store.session.groups.map((g) => g.pid));
    store.session.notes = Object.fromEntries(Object.entries(oldNotes).filter(([pid]) => own.has(pid)));
    store.session.annotations = Object.fromEntries(Object.entries(oldAnns).filter(([pid]) => own.has(pid) && Array.isArray(oldAnns[pid])));
  }
  if (store.session) store.session.annotations = store.session.annotations || {};
  // Drop review workspaces whose attempt is gone or whose record is damaged (they are rebuilt from the attempt on open).
  Object.keys(store.reviews).forEach((id) => {
    const w = store.reviews[id];
    const a = store.attempts.find((x) => x.id === id);
    if (!a || !w || w.reviewOf !== id || !w.answers || typeof w.answers !== 'object' || !Array.isArray(w.groups)) delete store.reviews[id];
  });
  // Exams added to the bank later: a saved practice filter that had every exam of its time selected (the
  // "all midterms" default) also gets the new ones; a filter narrowed on purpose is left as it was.
  // prefs.examsKnown records the exams that existed when the filter was saved (absent before Fall/Spring 2024).
  const knownExams = Array.isArray(saved && saved.prefs && saved.prefs.examsKnown) ? saved.prefs.examsKnown : ['fa25', 'sp25'];
  if (knownExams.every((id) => !EXAMS[id] || store.prefs.exams.includes(id))) {
    store.prefs.exams = Object.keys(EXAMS).filter((id) => store.prefs.exams.includes(id) || !knownExams.includes(id));
  }
  store.prefs.examsKnown = Object.keys(EXAMS);
  // The same for Gleam sources (lectures and worksheets are added during the semester).
  const knownSources = Array.isArray(saved && saved.prefs && saved.prefs.glSourcesKnown) ? saved.prefs.glSourcesKnown : null;
  if (knownSources && knownSources.every((id) => !GL.SOURCES[id] || store.prefs.glSources.includes(id))) {
    store.prefs.glSources = Object.keys(GL.SOURCES).filter((id) => store.prefs.glSources.includes(id) || !knownSources.includes(id));
  }
  store.prefs.glSourcesKnown = Object.keys(GL.SOURCES);
  if (!LANGS.some((l) => l.id === store.prefs.lang && !l.soon)) store.prefs.lang = 'python';
  // Before v5, bold around code (e.g. **Do not mutate `s`.**) showed its ** as text. Those characters are gone now, so
  // a highlight saved before v5 in such prose is moved to the same words: each offset in the old text maps to the
  // matching position in the new text (the new text is the old one with only those characters removed).
  if (saved && !(Number(saved.version) >= 5)) {
    const remap = {};
    Object.entries(PROBLEMS).forEach(([pid, p]) => ['intro', 'outro'].forEach((where) => {
      const before = proseText(p[where], true), now = proseText(p[where], false);
      if (before === now) return;
      const map = []; let j = 0;
      for (let i = 0; i <= before.length; i++) { map[i] = j; if (i < before.length && before[i] === now[j]) j++; }
      if (j === now.length) remap[`${pid}:${where}`] = map; // only when the new text is the old one minus some characters
    }));
    const owners = [store.session, store.exam, ...store.attempts, ...Object.values(store.reviews)];
    owners.forEach((o) => Object.entries((isObj(o) && isObj(o.annotations) && o.annotations) || {}).forEach(([pid, list]) => {
      (Array.isArray(list) ? list : []).forEach((a) => {
        const map = isObj(a) && a.kind === 'hl' && remap[`${pid}:${a.where}`];
        if (map && Number.isInteger(a.start) && Number.isInteger(a.end)) { a.start = map[Math.min(a.start, map.length - 1)]; a.end = map[Math.min(a.end, map.length - 1)]; }
      });
    }));
  }
  if (!EXAMS[store.examPrefs.examId]) store.examPrefs.examId = DEFAULT_EXAM_PREFS.examId;
  // Set size is any whole number of question groups (up to how many match; see sizeMax). Older saves could hold
  // 'all' from the former dropdown, which now starts again from the default. The former Question Types filter is gone,
  // so a saved selection of types is dropped and never narrows a new set.
  if (!(Number.isInteger(store.prefs.size) && store.prefs.size >= 1)) store.prefs.size = DEFAULT_PREFS.size;
  delete store.prefs.types;
  if (!['practice', 'exam'].includes(store.prefs.mode)) store.prefs.mode = 'practice';
  if (!['full', 'custom'].includes(store.examPrefs.kind)) store.examPrefs.kind = 'full';
  // A saved pick can be a question that is now wholly out of scope; drop it so it can't start an empty group.
  store.examPrefs.picked = [...new Set(store.examPrefs.picked)].filter((pid) => PMAP[pid] && EXAM_QUESTIONS.some((q) => q.problem === pid));
  // view: which session the question screen shows. 'practice' | 'exam' (in progress) | 'review' (a submitted attempt)
  const ui = { screen: 'landing', view: 'practice', attemptId: null, menu: null, navOpen: false, dirOpen: false, hideClock: false, confirmReveal: null, annMode: 'none', examQuery: '', sizeDraft: null, walkCollapsed: false };

  const attemptById = (id) => store.attempts.find((a) => a.id === id) || null;
  function cur() {
    if (ui.view === 'exam') return store.exam;
    if (ui.view === 'review') return workspaceFor(ui.attemptId);
    return store.session;
  }
  const isExam = (s) => !!s && s.mode === 'exam';
  const locked = (s) => isExam(s) && !!s.submitted; // a submitted attempt itself is never edited
  const isReview = (s) => !!s && !!s.reviewOf;    // a review workspace (editable copy of a submitted attempt)

  // Review workspace: an editable, session-shaped copy of a submitted attempt, created once from the submitted
  // answers and stored separately (store.reviews). The attempt itself — answers, grades, score — never changes.
  function workspaceFor(id) {
    const a = attemptById(id);
    if (!a) return null;
    if (!store.reviews[id]) {
      const copy = (x) => JSON.parse(JSON.stringify(x || {}));
      store.reviews[id] = {
        reviewOf: id, mode: 'exam', title: a.title, kind: a.kind, examId: a.examId,
        ids: a.ids.slice(), groups: copy(a.groups), index: 0,
        answers: copy(a.answers), eliminated: copy(a.eliminated), notes: copy(a.notes), annotations: copy(a.annotations), diagrams: copy(a.diagrams),
        marked: {}, checked: {}, revealed: {}, selfGrade: {}, timer: null, startedAt: Date.now(),
      };
    }
    return store.reviews[id];
  }
  // Every session (practice set, exam, review workspace) keeps its own scratch code and annotations.
  const notesOf = () => cur().notes || (cur().notes = {});
  const annotationsOf = () => cur().annotations || (cur().annotations = {});
  const diagramsOf = () => cur().diagrams || (cur().diagrams = {});

  function announce(msg) {
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 30);
  }

  // ───────────────────────────── Text rendering (escaped) ─────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Code spans are set aside first, so bold and italic can wrap them (**Do not mutate `s`.**) and a * inside code is
  // never read as markup. Until store v5 the text was split at code spans instead, which showed such bold as literal **.
  function inline(s) {
    const codes = [];
    return esc(String(s).replace(/`([^`]*)`/g, (m, c) => `\u0000${codes.push(c) - 1}\u0000`))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>')
      .replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(codes[i])}</code>`);
  }
  // The text a reader sees (what highlights count offsets in), as rendered now or (legacy) before store v5.
  function plainInline(s, legacy) {
    const marks = (t) => t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\s][^*]*?)\*/g, '$1');
    if (legacy) return String(s).split(/(`[^`]*`)/).map((p) => (p.startsWith('`') && p.endsWith('`') && p.length > 1 ? p.slice(1, -1) : marks(p))).join('');
    const codes = [];
    return marks(String(s).replace(/`([^`]*)`/g, (m, c) => `\u0000${codes.push(c) - 1}\u0000`)).replace(/\u0000(\d+)\u0000/g, (m, i) => codes[i]);
  }
  function proseText(s, legacy) {
    if (!s) return '';
    const paras = (t) => t.split(/\n\n/).map((p) => plainInline(p, legacy)).join('');
    if (!s.includes('```')) return paras(s);
    return s.split(/```\n?([\s\S]*?)\n?```/).map((part, i) => (i % 2 ? part : paras(part.replace(/^\n+|\n+$/g, '')))).join('');
  }
  function rich(s) {
    if (!s) return '';
    const paras = (t) => t.split(/\n\n/).map((p) => `<p>${inline(p)}</p>`).join('');
    if (!s.includes('```')) return paras(s);
    // ``` fences hold code shown as printed in the exam (indentation and blank lines kept); text between them is paragraphs.
    return s.split(/```\n?([\s\S]*?)\n?```/).map((part, i) => (i % 2
      ? `<pre class="rich-pre"><code>${esc(part)}</code></pre>`
      : paras(part.replace(/^\n+|\n+$/g, '')))).filter((h) => h !== '<p></p>').join('');
  }

  // ───────────────────────────── Grading ─────────────────────────────
  // Only for comparing a typed answer with the accepted ones: whitespace and quote style don't count, including the
  // curly quotes ‘ ’ “ ” some keyboards substitute. The answer itself, and the code Run Code executes, are unchanged.
  const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/["‘’“”]/g, "'").replace(/[;,]+$/, '');
  const isMC = (q) => q.type === 'single_choice' || q.type === 'multi_select';

  function hasAnswer(s, id) {
    const a = s.answers[id];
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) return a.length > 0;
    return String(a).trim() !== '';
  }
  function gradeMC(q, a) {
    const key = ANSWER_KEY[q.id];
    if (q.type === 'single_choice') return a === key.correct;
    const want = key.correct.slice().sort().join(',');
    return (a || []).slice().sort().join(',') === want;
  }
  function matchesOfficial(q, a) {
    const key = ANSWER_KEY[q.id];
    return !!(key && key.accepted && key.accepted.some((x) => norm(x) === norm(a)));
  }
  // Answer elimination: a visual study aid kept per part in s.eliminated[qid] = [choice indices].
  // Never read by grading. Lives on the session, so a new session starts clean and resuming restores it.
  const letter = (i) => String.fromCharCode(65 + i);
  function eliminated(s, qid) {
    return (s.eliminated && s.eliminated[qid]) || [];
  }
  function setEliminated(s, qid, i, on) {
    const list = eliminated(s, qid).filter((x) => x !== i);
    if (on) list.push(i);
    if (!s.eliminated) s.eliminated = {};
    if (list.length) s.eliminated[qid] = list.sort((x, y) => x - y);
    else delete s.eliminated[qid];
  }
  // Final status used by the navigator & results: correct | incorrect | ungraded | skipped
  function statusOf(s, id) {
    const q = QMAP[id];
    if (!hasAnswer(s, id)) return 'skipped';
    const a = s.answers[id];
    if (isMC(q)) return gradeMC(q, a) ? 'correct' : 'incorrect';
    if (q.type === 'short_answer' && matchesOfficial(q, a)) return 'correct';
    if (s.selfGrade[id]) return s.selfGrade[id];
    return 'ungraded';
  }
  // Exam grading (no self-grading): correct | incorrect | skipped | staff.
  // Choices and short answers with accepted answers are graded here; everything else (code writing)
  // is 'staff': shown as "Graded by Course Staff", never scored, never counted as zero.
  function examStatus(s, id) {
    const q = QMAP[id];
    if (!hasAnswer(s, id)) return 'skipped';
    if (isMC(q)) return gradeMC(q, s.answers[id]) ? 'correct' : 'incorrect';
    const key = ANSWER_KEY[id];
    if (q.type === 'short_answer' && key && key.accepted && key.accepted.length) return matchesOfficial(q, s.answers[id]) ? 'correct' : 'incorrect';
    return 'staff';
  }
  const hasPoints = (q) => typeof q.points === 'number';
  // Gradable here at all (by question type, whatever the answer): choices, and short answers with accepted answers.
  const autoGradable = (q) => isMC(q) || (q.type === 'short_answer' && !!(ANSWER_KEY[q.id] && ANSWER_KEY[q.id].accepted && ANSWER_KEY[q.id].accepted.length));
  // Grades are computed once, at submission, and stored on the attempt (graded + score), so later changes
  // to the question bank or answer key never silently change an old attempt's result.
  function gradeAttempt(a) {
    const graded = {};
    a.ids.forEach((id) => { graded[id] = examStatus(a, id); });
    return { graded, score: scoreFrom(a.ids, graded) };
  }
  // "Automatically graded" score: only auto-gradable parts with a published point value count, in both
  // numerator and denominator. Staff-graded parts and parts without point values are excluded (and reported).
  function scoreFrom(ids, graded) {
    const r = { v: 2, earned: 0, possible: 0, auto: 0, counts: { correct: 0, incorrect: 0, staff: 0, skipped: 0 }, staff: 0, unknown: 0 };
    ids.forEach((id) => {
      const q = QMAP[id];
      r.counts[graded[id]]++;
      if (!autoGradable(q)) { r.staff++; return; }
      if (!hasPoints(q)) { r.unknown++; return; }
      r.auto++;
      r.possible += q.points;
      if (graded[id] === 'correct') r.earned += q.points;
    });
    r.partial = r.staff > 0 || r.unknown > 0;
    return r;
  }
  const statusIn = (a, id) => (a.graded && a.graded[id]) || examStatus(a, id);
  const fmtPts = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  // ───────────────────────────── Scratch code editor (left pane) ─────────────────────────────
  // The editor document starts as the problem's code template, where each blank is the token ⟦a⟧.
  // Each token is covered by a read-only CodeMirror widget whose *display* is derived from state:
  // the student's selected/typed answer for the linked part (q.blank === 'a'), or ___(a)___ if none.
  // The template text itself is never rewritten, so changing an answer only changes that one widget,
  // and the student's own edits elsewhere in the code are untouched.
  const TOKEN_RE = /⟦([^⟧]+)⟧/g;
  const editors = {}; // problemId -> { pid, wrap, cm, blanks, hl, current } — kept alive across re-renders

  function fileName(pid) {
    if (isGleam(pid)) {
      const g = PMAP[pid].code.match(/^(?:pub\s+)?fn\s+(\w+)/m);
      return `${g ? g[1] : 'your_code'}.gleam`;
    }
    const m = PMAP[pid].code.match(/^(?:def|class)\s+(\w+)/m);
    return m ? `${m[1]}.py` : `problem_${PMAP[pid].number.replace(/\W+/g, '')}.py`;
  }
  // The code a problem's editor starts from (and resets to): the exam template, or in a review workspace
  // the scratch code as it was when the attempt was submitted.
  function notesBase(pid) {
    const s = cur();
    const a = isReview(s) && attemptById(s.reviewOf);
    return a && a.notes[pid] !== undefined ? a.notes[pid] : PMAP[pid].code;
  }
  function editedNotes(pid) {
    const notes = notesOf();
    return notes[pid] !== undefined && notes[pid] !== notesBase(pid);
  }
  function partForBlank(pid, name) {
    const s = cur();
    const ids = s ? s.ids : [];
    return EVERY_QUESTION.find((q) => q.problem === pid && q.blank === name && ids.includes(q.id)) || null;
  }
  // What a blank should display: { text, kind: 'mc' | 'typed' } or null when unanswered.
  function blankFill(pid, name) {
    const q = partForBlank(pid, name);
    const s = cur();
    if (!q || !s) return null;
    const a = s.answers[q.id];
    if (q.type === 'single_choice') return Number.isInteger(a) ? { text: q.choices[a], kind: 'mc' } : null;
    if (q.type === 'multi_select') return a && a.length ? { text: a.map((i) => q.choices[i]).join(' | '), kind: 'mc' } : null;
    return hasAnswer(s, q.id) ? { text: String(a).replace(/\s+$/, ''), kind: 'typed' } : null;
  }
  // Exam Settings → Auto-fill Code (an exam in progress only). On by default for every new exam; the choice is kept on
  // the exam itself, so Save & Leave / Resume keeps it for that attempt. Off only changes what the blanks *display*:
  // answers stay saved and graded as before. Practice and review always fill the blanks.
  const examActive = (s) => isExam(s) && !isReview(s) && !locked(s);
  const autoFillOn = (s) => !(examActive(s) && s.autoFill === false);
  function fillBlanks(ed) {
    if (!ed || !ed.cm) return;
    const show = autoFillOn(cur());
    ed.blanks.forEach((b) => {
      const pos = b.mark.find();
      if (!pos) return;
      const f = show ? blankFill(ed.pid, b.name) : null;
      // Continuation lines of a multi-line answer are indented to the blank's column.
      const col = pos.from.ch;
      const text = f ? f.text.split('\n').map((l, i) => (i ? ' '.repeat(col) + l : l)).join('\n') : `___(${b.name})___`;
      const cls = `cm-slot ${f ? `filled filled-${f.kind}` : 'empty'}${ed.current === b.name ? ' current' : ''}`;
      if (b.el.textContent !== text) { b.el.textContent = text; b.mark.changed(); }
      if (b.el.className !== cls) b.el.className = cls;
      b.el.title = f ? `Blank (${b.name}): your answer. Click to go to this part.` : `Blank (${b.name}). Click to go to this part.`;
    });
    updateTutorBtn(ed.pid);
  }
  // Blanks in a problem's code that have no answer yet, in code order. Python Tutor can't run code with blanks in it.
  function emptyBlanks(pid) {
    const ed = editors[pid];
    if (!ed) return [];
    const text = ed.cm ? ed.cm.getValue() : ed.wrap.querySelector('textarea').value;
    return [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[1]))].filter((name) => !blankFill(pid, name));
  }
  // What still blocks Python Tutor. A part left out of this practice set (by its filters) can't be answered here.
  function tutorNeeds(pid, empty) {
    const names = (list) => list.map((n) => `(${n})`).join(', ');
    const open = empty.filter((n) => partForBlank(pid, n)), absent = empty.filter((n) => !partForBlank(pid, n));
    return [open.length ? `Fill in every blank first. Still empty: ${names(open)}.` : '',
      absent.length ? `${absent.length === 1 ? 'Blank' : 'Blanks'} ${names(absent)} ${absent.length === 1 ? 'isn’t' : 'aren’t'} in this practice set, so the code can’t be completed here.` : ''].filter(Boolean).join(' ');
  }
  // The Python Tutor button looks unavailable until every blank is filled (any answer counts, right or wrong).
  // It stays clickable, so a click can say what's missing.
  function updateTutorBtn(pid) {
    const btn = document.getElementById('tutor-btn');
    if (!btn || leftPid !== pid) return;
    const empty = emptyBlanks(pid);
    btn.setAttribute('aria-disabled', String(empty.length > 0));
    btn.title = empty.length ? tutorNeeds(pid, empty)
      : 'Step through this code in Python Tutor. Opens pythontutor.com in a new tab with the code from the editor.';
    const msg = document.getElementById('tutor-msg');
    if (msg && !msg.hidden) {
      if (empty.length) msg.textContent = btn.title; // keep the list current as blanks are filled
      else { msg.hidden = true; msg.textContent = ''; }
    }
  }
  function buildBlanks(ed) {
    ed.blanks.forEach((b) => b.mark.clear());
    ed.blanks = [];
    const cm = ed.cm;
    cm.eachLine((line) => {
      const no = cm.getLineNumber(line);
      for (const m of line.text.matchAll(TOKEN_RE)) {
        const el = document.createElement('span');
        el.dataset.blank = m[1];
        el.addEventListener('mousedown', (e) => { e.preventDefault(); focusPart(m[1]); });
        const mark = cm.markText({ line: no, ch: m.index }, { line: no, ch: m.index + m[0].length },
          { replacedWith: el, atomic: true, readOnly: true, handleMouseEvents: true });
        ed.blanks.push({ name: m[1], el, mark });
      }
    });
    fillBlanks(ed);
  }
  function setCurrentBlank(name) {
    const ed = leftPid && editors[leftPid];
    if (!ed) return;
    ed.current = name || null;
    fillBlanks(ed);
  }
  function createEditor(pid) {
    const wrap = document.createElement('div');
    wrap.className = 'editor-body';
    const notes = notesOf(); // captured: this editor only ever writes to the session it was built for
    const value = notes[pid] !== undefined ? notes[pid] : notesBase(pid);
    if (!window.CodeMirror) { // fallback if the vendored editor failed to load
      const ta = document.createElement('textarea');
      ta.className = 'editor-fallback';
      ta.value = value;
      ta.spellcheck = false;
      ta.setAttribute('aria-label', 'Scratch code editor');
      ta.addEventListener('input', () => { notes[pid] = ta.value; saveSoon(); });
      wrap.appendChild(ta);
      return { pid, wrap, cm: null, blanks: [], hl: {}, current: null };
    }
    // Gleam code uses the Gleam mode (gleam_mode.js) and 2-space indents, as Gleam's formatter does.
    const gleam = isGleam(pid);
    const unit = gleam ? 2 : 4;
    const cm = window.CodeMirror(wrap, {
      value, mode: gleam ? 'gleam' : 'python', theme: 'monokai', lineNumbers: true, indentUnit: unit, tabSize: unit,
      indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      screenReaderLabel: 'Scratch code editor',
      extraKeys: {
        Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection(' '.repeat(unit))),
        'Shift-Tab': (c) => c.indentSelection('subtract'),
        'Cmd-/': 'toggleComment', 'Ctrl-/': 'toggleComment',
        Esc: (c) => c.getInputField().blur(),
      },
    });
    const ed = { pid, wrap, cm, blanks: [], hl: {}, current: null };
    buildBlanks(ed);
    anns(pid).filter((a) => a.kind === 'code').forEach((a) => markCode(ed, a));
    cm.on('change', (c, ch) => {
      notes[pid] = cm.getValue();
      if ([...ch.text, ...ch.removed].join('\n').includes('⟦')) buildBlanks(ed); // a token was pasted
      syncCodeHighlights(ed);
      saveSoon();
      const st = document.getElementById('editor-status');
      if (st) st.textContent = 'Saved in this browser';
      const rb = document.getElementById('editor-reset');
      if (rb) rb.disabled = !editedNotes(pid);
    });
    return ed;
  }
  function mountEditor(pid) {
    const host = document.getElementById('editor-host');
    if (!host) return;
    const ed = editors[pid] || (editors[pid] = createEditor(pid));
    host.appendChild(ed.wrap);
    if (ed.cm) { ed.cm.refresh(); fillBlanks(ed); }
  }
  // Pull live editors out of the DOM before innerHTML replaces their container
  // (keeps them alive, and avoids CodeMirror's blur handler firing mid-replacement).
  function detachEditors() {
    Object.values(editors).forEach((ed) => {
      if (ed.cm && ed.cm.hasFocus()) ed.cm.getInputField().blur();
      if (ed.wrap.parentNode) ed.wrap.parentNode.removeChild(ed.wrap);
    });
  }
  function resetEditor(pid) {
    const base = notesBase(pid);
    delete notesOf()[pid];
    annotationsOf()[pid] = anns(pid).filter((a) => a.kind !== 'code'); // code highlights can't survive a reset
    const ed = editors[pid];
    if (ed && ed.cm) {
      Object.values(ed.hl).forEach((m) => m.clear());
      ed.hl = {};
      ed.cm.setValue(base);
      buildBlanks(ed);
    } else delete editors[pid];
    save();
  }

  // ───────────────────────────── Annotations (left pane) ─────────────────────────────
  // Stored per problem in annotationsOf()[pid], i.e. on the session being shown:
  //   { id, kind: 'hl',   where: 'intro' | 'outro', start, end }    text-offset highlight in the prose
  //   { id, kind: 'code', from: {line, ch}, to: {line, ch} }         highlight inside the code editor
  //   { id, kind: 'pen',  block, pts: [[x, y], …] }                  freehand stroke, relative to a block
  //   { id, kind: 'note', pane, x, y, w, h, t, items, ink? }          sticky note (see Sticky notes below)
  // Pen strokes are anchored to the block (paragraph, editor, …) they start on, so they move with it
  // when the layout changes. Undo/redo history is kept in memory per problem as lists of add/remove ops.
  const history = {}; // pid -> { undo: [ops], redo: [ops] }
  let leftPid = null;
  let leftObserver = null;
  let drawing = null; // in-progress pen stroke or eraser drag

  const anns = (pid) => { const all = annotationsOf(); return all[pid] || (all[pid] = []); };
  const hist = (pid) => history[pid] || (history[pid] = { undo: [], redo: [] });
  const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const article = () => document.getElementById('problem-article');

  function markCode(ed, a) {
    if (!ed || !ed.cm || ed.hl[a.id]) return;
    ed.hl[a.id] = ed.cm.markText(a.from, a.to, { className: 'cm-hl', attributes: { 'data-aid': a.id } });
  }
  function syncCodeHighlights(ed) {
    const list = anns(ed.pid);
    Object.entries(ed.hl).forEach(([id, mk]) => {
      const r = mk.find();
      const a = list.find((x) => x.id === id);
      if (!r || (r.from.line === r.to.line && r.from.ch === r.to.ch)) { // text was deleted
        mk.clear();
        delete ed.hl[id];
        if (a) list.splice(list.indexOf(a), 1);
      } else if (a) {
        a.from = { line: r.from.line, ch: r.from.ch };
        a.to = { line: r.to.line, ch: r.to.ch };
      }
    });
  }

  function renderProse(pid, where) {
    const root = document.querySelector(`#problem-article [data-annot="${where}"]`);
    if (!root || leftPid !== pid) return;
    root.innerHTML = rich(PMAP[pid][where]);
    anns(pid).filter((a) => a.kind === 'hl' && a.where === where).forEach((a) => wrapRange(root, a.start, a.end, a.id));
  }
  function wrapRange(root, start, end, aid) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const targets = [];
    let pos = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.data.length;
      const s = Math.max(start, pos);
      const e = Math.min(end, pos + len);
      if (s < e) targets.push([node, s - pos, e - pos]);
      pos += len;
    }
    targets.forEach(([node, s, e]) => {
      let n = node;
      if (e < n.data.length) n.splitText(e);
      if (s > 0) n = n.splitText(s);
      const mk = document.createElement('mark');
      mk.className = 'hl';
      mk.dataset.aid = aid;
      n.parentNode.insertBefore(mk, n);
      mk.appendChild(n);
    });
  }
  function textOffset(root, node, offset) {
    const r = document.createRange();
    r.selectNodeContents(root);
    r.setEnd(node, offset);
    return r.toString().length;
  }

  function blocks(art) {
    return Array.from(art.children).filter((el) => !el.classList.contains('annot-layer'));
  }
  function strokePath(pts) {
    if (!pts.length) return '';
    const [x0, y0] = pts[0];
    if (pts.length === 1) return `M${x0} ${y0}l0.01 0`;
    return `M${x0} ${y0}` + pts.slice(1).map(([x, y]) => `L${x} ${y}`).join('');
  }
  function absPoints(art, a) {
    const bl = blocks(art);
    const b = bl[a.block] || bl[0];
    const ox = b ? b.offsetLeft : 0;
    const oy = b ? b.offsetTop : 0;
    return a.pts.map(([x, y]) => [x + ox, y + oy]);
  }
  function layoutStrokes() {
    const art = article();
    if (!art) return;
    const svg = art.querySelector('.annot-layer');
    svg.setAttribute('width', 0); // measure without the layer itself, so it can shrink when the window does
    svg.setAttribute('height', 0);
    svg.setAttribute('width', art.scrollWidth);
    svg.setAttribute('height', art.scrollHeight);
    const paths = anns(leftPid).filter((a) => a.kind === 'pen')
      .map((a) => `<path d="${strokePath(absPoints(art, a))}" data-aid="${a.id}"/>`).join('');
    const livePath = drawing && drawing.kind === 'pen' ? `<path class="live" d="${strokePath(drawing.pts)}"/>` : '';
    svg.innerHTML = paths + livePath;
    layoutNotes();
  }

  // Apply one annotation change to state and to whatever is on screen.
  function addAnn(pid, a) {
    anns(pid).push(a.kind === 'note' ? normNote(cloneAnn(a)) : a); // notes are edited in place, so the list keeps its own copy
    if (a.kind === 'code') markCode(editors[pid], a);
    if (pid !== leftPid) return;
    if (a.kind === 'hl') renderProse(pid, a.where);
    if (a.kind === 'pen') layoutStrokes();
    if (a.kind === 'note') renderNotes();
  }
  function removeAnn(pid, id) {
    const list = anns(pid);
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const [a] = list.splice(i, 1);
    const ed = editors[pid];
    if (a.kind === 'code' && ed && ed.hl[id]) { ed.hl[id].clear(); delete ed.hl[id]; }
    if (pid === leftPid) {
      if (a.kind === 'hl') renderProse(pid, a.where);
      if (a.kind === 'pen') layoutStrokes();
      if (a.kind === 'note') renderNotes();
    }
    return a;
  }
  function applyOps(pid, ops) {
    ops.forEach((o) => (o.op === 'add' ? addAnn(pid, o.ann) : removeAnn(pid, o.ann.id)));
  }
  const invert = (ops) => ops.slice().reverse().map((o) => ({ op: o.op === 'add' ? 'remove' : 'add', ann: o.ann }));
  function record(pid, ops) { // ops already applied
    if (!ops.length) return;
    const h = hist(pid);
    h.undo.push(ops);
    h.redo = [];
    save();
    updateToolbar();
  }
  function commit(pid, ops) {
    applyOps(pid, ops);
    record(pid, ops);
  }
  function undo(pid) {
    const h = hist(pid);
    const ops = h.undo.pop();
    if (!ops) return;
    applyOps(pid, invert(ops));
    h.redo.push(ops);
    save();
    updateToolbar();
  }
  function redo(pid) {
    const h = hist(pid);
    const ops = h.redo.pop();
    if (!ops) return;
    applyOps(pid, ops);
    h.undo.push(ops);
    save();
    updateToolbar();
  }

  // Highlight the current text selection (prose and/or code). Returns true if anything was highlighted.
  function highlightSelection() {
    const pid = leftPid;
    const art = article();
    if (!pid || !art) return false;
    const ops = [];
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      ['intro', 'outro'].forEach((where) => {
        const root = art.querySelector(`[data-annot="${where}"]`);
        if (!root || !range.intersectsNode(root)) return;
        const start = root.contains(range.startContainer) ? textOffset(root, range.startContainer, range.startOffset) : 0;
        const end = root.contains(range.endContainer) ? textOffset(root, range.endContainer, range.endOffset) : root.textContent.length;
        if (end > start) ops.push({ op: 'add', ann: { id: newId(), kind: 'hl', where, start, end } });
      });
      if (ops.length) sel.removeAllRanges();
    }
    const ed = editors[pid];
    if (!ops.length && ed && ed.cm && ed.cm.somethingSelected()) {
      const from = ed.cm.getCursor('from');
      const to = ed.cm.getCursor('to');
      ops.push({ op: 'add', ann: { id: newId(), kind: 'code', from: { line: from.line, ch: from.ch }, to: { line: to.line, ch: to.ch } } });
      ed.cm.setCursor(to);
    }
    commit(pid, ops);
    return ops.length > 0;
  }

  function distToSegment(px, py, [x1, y1], [x2, y2]) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))) : 0;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function eraseAt(x, y, clientX, clientY) {
    const pid = leftPid;
    const art = article();
    const hits = new Set();
    anns(pid).filter((a) => a.kind === 'pen').forEach((a) => {
      const pts = absPoints(art, a);
      const near = pts.length === 1 ? Math.hypot(x - pts[0][0], y - pts[0][1]) < 9
        : pts.some((p, i) => i && distToSegment(x, y, pts[i - 1], p) < 9);
      if (near) hits.add(a.id);
    });
    document.elementsFromPoint(clientX, clientY).forEach((el) => {
      const hl = el.closest && el.closest('mark.hl, .cm-hl');
      if (hl && hl.dataset.aid) hits.add(hl.dataset.aid);
    });
    hits.forEach((id) => {
      const a = removeAnn(pid, id);
      if (a) drawing.ops.push({ op: 'remove', ann: a });
    });
  }

  function examSettingsHTML() {
    const on = autoFillOn(cur());
    return `<span class="exam-settings-wrap">
        <button class="ann-btn" data-ann="settings" id="exam-settings-btn" title="Exam settings" aria-label="Exam settings" aria-haspopup="true" aria-expanded="false" aria-controls="exam-settings">${icon('more')}</button>
        <div class="exam-settings" id="exam-settings" role="group" aria-labelledby="exam-settings-title" hidden>
          <div class="exam-settings-title" id="exam-settings-title">Exam Settings</div>
          <div class="exam-setting">
            <span class="exam-setting-text"><span class="exam-setting-name" id="autofill-label">Auto-fill Code</span>
              <span class="exam-setting-desc" id="autofill-desc">Show your selected answers in the code blanks.</span></span>
            <button class="switch" data-ann="autofill" id="autofill-switch" role="switch" aria-checked="${on}" aria-labelledby="autofill-label" aria-describedby="autofill-desc"><span class="switch-knob"></span></button>
          </div>
        </div>
      </span>`;
  }
  // The first sentence of the hint under the editor; in an exam it follows the Auto-fill Code setting.
  const fillHintHTML = (on) => (on ? 'Your answers on the right appear in the blanks automatically: <span class="key-fill key-mc">selected choice</span> <span class="key-fill key-typed">typed answer</span>.'
    : 'Auto-fill Code is off (<b>⋮</b> above): your answers are saved but don’t appear in the blanks.');
  function setSettingsOpen(open, focusBtn) {
    const panel = document.getElementById('exam-settings');
    const btn = document.getElementById('exam-settings-btn');
    if (!panel || !btn) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-pressed', String(open));
    if (open) document.getElementById('autofill-switch').focus();
    else if (focusBtn) btn.focus();
  }
  function toggleAutoFill() {
    const s = cur();
    if (!examActive(s)) return;
    s.autoFill = !autoFillOn(s); // stored on the exam in progress only
    save();
    const sw = document.getElementById('autofill-switch');
    if (sw) sw.setAttribute('aria-checked', String(s.autoFill));
    const hint = document.getElementById('fill-hint');
    if (hint) hint.innerHTML = fillHintHTML(s.autoFill);
    if (leftPid) fillBlanks(editors[leftPid]);
    announce(s.autoFill ? 'Auto-fill Code on: your selected answers show in the code.' : 'Auto-fill Code off: code blanks stay empty. Your answers are still saved.');
  }
  function setAnnMode(mode) {
    ui.annMode = ui.annMode === mode ? 'none' : mode;
    const art = article();
    if (art) art.dataset.mode = ui.annMode;
    updateToolbar();
  }
  function updateToolbar() {
    const bar = document.getElementById('annot-bar');
    if (!bar || !leftPid) return;
    const h = hist(leftPid);
    bar.querySelectorAll('[data-ann]').forEach((b) => {
      const k = b.dataset.ann;
      if (['hl', 'pen', 'eraser'].includes(k)) b.setAttribute('aria-pressed', String(ui.annMode === k));
      if (k === 'undo') b.disabled = !h.undo.length;
      if (k === 'redo') b.disabled = !h.redo.length;
      if (k === 'clear') b.disabled = !anns(leftPid).length;
    });
    const hint = document.getElementById('annot-hint');
    if (hint) {
      hint.textContent = {
        none: '',
        hl: 'Select text or code to highlight it.',
        pen: 'Draw with the mouse or trackpad. Scrolling still works.',
        eraser: 'Click or drag over a mark to erase it.',
      }[ui.annMode];
    }
  }

  // Pointer handling for the pen / eraser overlay.
  function overlayPoint(e) {
    const r = article().getBoundingClientRect();
    return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
  }
  function onOverlayDown(e) {
    if (e.button !== 0 || !['pen', 'eraser'].includes(ui.annMode)) return;
    e.preventDefault();
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    const [x, y] = overlayPoint(e);
    if (ui.annMode === 'pen') {
      drawing = { kind: 'pen', pts: [[x, y]] };
      layoutStrokes();
    } else {
      drawing = { kind: 'eraser', ops: [] };
      eraseAt(x, y, e.clientX, e.clientY);
    }
  }
  function onOverlayMove(e) {
    if (!drawing) return;
    const [x, y] = overlayPoint(e);
    if (drawing.kind === 'pen') {
      const last = drawing.pts[drawing.pts.length - 1];
      if (Math.hypot(x - last[0], y - last[1]) < 1.5) return;
      drawing.pts.push([x, y]);
      const lp = article().querySelector('.annot-layer path.live');
      if (lp) lp.setAttribute('d', strokePath(drawing.pts));
    } else {
      eraseAt(x, y, e.clientX, e.clientY);
    }
  }
  function onOverlayUp() {
    if (!drawing) return;
    const d = drawing;
    drawing = null;
    if (d.kind === 'pen') {
      const art = article();
      const bl = blocks(art);
      const y0 = d.pts[0][1];
      let bi = bl.findIndex((b) => y0 >= b.offsetTop && y0 < b.offsetTop + b.offsetHeight);
      if (bi < 0) bi = y0 < (bl[0] ? bl[0].offsetTop : 0) ? 0 : bl.length - 1;
      const b = bl[bi];
      const pts = d.pts.map(([x, y]) => [Math.round((x - b.offsetLeft) * 10) / 10, Math.round((y - b.offsetTop) * 10) / 10]);
      commit(leftPid, [{ op: 'add', ann: { id: newId(), kind: 'pen', block: bi, pts } }]);
      layoutStrokes();
    } else {
      record(leftPid, d.ops);
    }
  }

  // ── Sticky notes ──
  // Stored with the other annotations as { id, kind: 'note', pane, x, y, w, h, t, items: [item, …], ink?: [stroke, …] }.
  // Notes live in #note-layer, which covers both panes, so a note can sit anywhere and be dragged across the divider.
  // Each note belongs to the pane its top-left corner is in ('left' or 'right'); x, y are in that pane's scrolling
  // content, so the note scrolls with the problem or with the answers. `t` is when the note was made: notes are numbered
  // 1, 2, … in that order. w, h is the size picked by resizing; a note is never drawn smaller than what is in it.
  // Inside a note everything is placed from the top-left corner of its body, so resizing only adds or removes space:
  //   { id, type: 'text', x, y, text, hls? }      a text box, as wide as its text; it wraps at the note's right edge or
  //                                               at a tree beside it. hls are highlighted [start, end) ranges of its text
  //   { id, type: 'tree', x, y, tree }            a tree { label, kids: [tree, …], hl? }; a node is addressed by its
  //                                               path ('0' is the root, '0.1' its second branch)
  //   ink: { id, pts, item? }                     a red-pen stroke; with `item`, pts are relative to that item and the
  //                                               stroke moves with it, otherwise they are relative to the body
  // Items never overlap: a dropped item slides to the nearest free spot, and an item that grows pushes the ones it
  // reaches downward. Every change is one undo step that swaps the old note for the new one; the list keeps its own
  // copy of each note (addAnn clones), so history entries never change afterwards. Typing edits the stored note directly
  // and is recorded as one step when the field loses focus (or before undo, redo, clear and leaving the question).
  // Each note also keeps its own undo history for its toolbar (noteHist). Whether a note is minimized is stored on the
  // session (noteMin), not on the note, so undo never opens or closes one; minimized notes are numbered icons in the
  // bottom bar, between Exit and the question navigator (#note-dock, part of footerHTML). Notes saved before items existed
  // ({ type: 'text' | 'tree', text | tree }) are converted when shown (normNote). Note highlights are blue, so they
  // show on yellow.
  const NOTE_MIN = { w: 228, h: 110 };
  const NOTE_NEW = { w: 260, h: 170 };
  const NOTE_PAD = 8;  // space between the body's edge and what is in it
  const NOTE_GAP = 8;  // the smallest space between two items
  const GRIP = 12;     // the drag strip at the top of each item
  const TEXT_MIN = 60; // a text box is as wide as its text, at least this, and wraps at the note's edge or a tree beside it
  const TN = { d: 34, gapX: 20, gapY: 46, pad: 12 }; // node diameter, space between leaves and between levels, padding
  const NOTE_TOOLS = [['select', 'Type and move'], ['hl', 'Highlighter'], ['pen', 'Red pen'], ['eraser', 'Eraser'], ['tree', 'New tree']];
  const cloneAnn = (a) => JSON.parse(JSON.stringify(a));
  let noteEdit = null;  // { pid, id, before } while text or a node label is being typed
  let noteDrag = null;  // { id, kind: 'move' | 'size', el, start, orig, min, moved } while a note is dragged or resized
  let itemDrag = null;  // { id, item, el, noteEl, start, orig, before, sizes, moved } while a text box or tree is dragged
  let noteInk = null;   // { id, kind: 'pen' | 'eraser', el, pts | before, changed } while drawing or erasing on a note
  let noteClickSkip = null; // a click that only ends typing or a selection in this note doesn't start a text box
  const noteTool = {};  // note id -> the tool picked in its toolbar (default 'select')
  const noteSel = {};   // note id -> the selected item
  const noteHist = {};  // note id -> { undo: [{ before, after }], redo: [...] }, for the note's own undo / redo

  const noteLayer = () => document.getElementById('note-layer');
  const noteById = (id) => anns(leftPid).find((a) => a.kind === 'note' && a.id === id);
  const noteEl = (id) => { const l = noteLayer(); return l ? l.querySelector(`.snote[data-aid="${id}"]`) : null; };
  const paneEl = (side) => document.getElementById(side === 'right' ? 'pane-right' : 'pane-left');
  const minMap = () => { const s = cur(); return s.noteMin || (s.noteMin = {}); };
  const toolOf = (id) => noteTool[id] || 'select';
  const nhist = (id) => noteHist[id] || (noteHist[id] = { undo: [], redo: [] });
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const noteTime = (a) => a.t || parseInt(String(a.id).slice(1, 9), 36) || 0;
  const r1 = (v) => Math.round(v * 10) / 10;

  function normNote(a) {
    if (a.items) return a;
    const it = { id: `${a.id}-1`, x: 0, y: 0 };
    a.items = [];
    if (a.type === 'tree' && a.tree) a.items.push(Object.assign(it, { type: 'tree', tree: a.tree }));
    else if (a.text || (a.hls && a.hls.length)) {
      a.items.push(Object.assign(it, { type: 'text', text: a.text || '' }, a.hls ? { hls: a.hls } : {}));
    }
    ['type', 'text', 'tree', 'hls'].forEach((k) => delete a[k]);
    return a;
  }
  // The notes of the question being shown, oldest first.
  function notesInOrder() {
    return anns(leftPid).filter((a) => a.kind === 'note').map(normNote)
      .map((a, i) => [a, i]).sort((p, q) => noteTime(p[0]) - noteTime(q[0]) || p[1] - q[1]).map((p) => p[0]);
  }
  // The pane under a point given in layer pixels (the nearest one when the point is on neither).
  function paneAt(x, y) {
    const L = noteLayer().getBoundingClientRect();
    const cx = L.left + x;
    const cy = L.top + y;
    const dist = (side) => {
      const r = paneEl(side).getBoundingClientRect();
      return Math.hypot(Math.max(r.left - cx, 0, cx - r.right), Math.max(r.top - cy, 0, cy - r.bottom));
    };
    return dist('right') < dist('left') ? 'right' : 'left';
  }
  function anchorAt(x, y) { // a point in layer pixels as { pane, x, y } in that pane's scrolling content
    const pane = paneAt(x, y);
    const L = noteLayer().getBoundingClientRect();
    const el = paneEl(pane);
    const r = el.getBoundingClientRect();
    return { pane, x: Math.round(L.left + x - r.left + el.scrollLeft), y: Math.round(L.top + y - r.top + el.scrollTop) };
  }
  function notePos(a) { // where a note is drawn now, in layer pixels
    const L = noteLayer().getBoundingClientRect();
    const el = paneEl(a.pane);
    const r = el.getBoundingClientRect();
    return [Math.round(r.left - L.left + a.x - el.scrollLeft), Math.round(r.top - L.top + a.y - el.scrollTop)];
  }
  function nodeAt(tree, path) {
    return path.split('.').slice(1).reduce((t, i) => (t && t.kids ? t.kids[Number(i)] : null), tree);
  }
  const itemOf = (a, itemId) => a.items.find((it) => it.id === itemId);

  // Tidy layout: leaves left to right, each parent centered over its first and last branch.
  function treeLayout(tree) {
    const nodes = [];
    const edges = [];
    let leaves = 0;
    let depth = 0;
    (function walk(t, path, d) {
      depth = Math.max(depth, d);
      const kids = (t.kids || []).map((k, i) => walk(k, `${path}.${i}`, d + 1));
      const x = kids.length ? (kids[0].x + kids[kids.length - 1].x) / 2 : TN.pad + TN.d / 2 + (leaves++) * (TN.d + TN.gapX);
      const n = { t, path, x, y: TN.pad + TN.d / 2 + d * (TN.d + TN.gapY) };
      nodes.push(n);
      kids.forEach((k) => edges.push([n, k]));
      return n;
    })(tree, '0', 0);
    return { nodes, edges, w: 2 * TN.pad + leaves * (TN.d + TN.gapX) - TN.gapX, h: 2 * TN.pad + TN.d + depth * (TN.d + TN.gapY) };
  }
  function edgeHTML([p, c], marker) {
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const r = TN.d / 2;
    return `<line x1="${r1(p.x + dx / len * r)}" y1="${r1(p.y + dy / len * r)}" x2="${r1(c.x - dx / len * (r + 1))}" y2="${r1(c.y - dy / len * (r + 1))}" marker-end="url(#${marker})"/>`;
  }
  function treeHTML(it) {
    const L = treeLayout(it.tree);
    const marker = `tn-arrow-${it.id}`;
    return `<div class="tree-canvas" style="width:${L.w}px;height:${L.h}px">
        <svg class="tree-edges" width="${L.w}" height="${L.h}" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>${L.edges.map((e) => edgeHTML(e, marker)).join('')}</svg>
        ${L.nodes.map((n) => `<div class="tnode" data-path="${n.path}" style="left:${n.x - TN.d / 2}px;top:${n.y - TN.d / 2}px">
          <input class="tnode-input${n.t.hl ? ' hl' : ''}" data-path="${n.path}" value="${esc(n.t.label)}" aria-label="${n.path === '0' ? 'Root label' : `Label of node ${esc(n.path.slice(2))}`}" autocomplete="off" spellcheck="false">
          <button type="button" class="tnode-btn tnode-add" data-tn="add" title="Add a branch" aria-label="Add a branch">+</button>
          ${n.path === '0' ? '' : '<button type="button" class="tnode-btn tnode-del" data-tn="del" title="Remove this node and everything below it" aria-label="Remove this node and everything below it">×</button>'}
        </div>`).join('')}
      </div>`;
  }

  // ── Where things are inside a note (body pixels, from the top-left corner of the note's canvas) ──
  function itemSizes(el) { // text boxes are measured on screen; a tree's size comes from its layout
    const out = {};
    if (el) el.querySelectorAll('.nitem').forEach((n) => { out[n.dataset.item] = { w: n.offsetWidth, h: n.offsetHeight }; });
    return out;
  }
  function itemRect(it, sizes) {
    if (it.type === 'tree') { const L = treeLayout(it.tree); return { x: it.x, y: it.y, w: L.w, h: L.h + GRIP }; }
    const s = sizes && sizes[it.id];
    return { x: it.x, y: it.y, w: s ? s.w : TEXT_MIN, h: s ? s.h : GRIP + 27 };
  }
  // How wide text box `it` may get before it wraps: up to the note's right edge, or to the nearest item beside it.
  function textRoom(a, it, sizes, bodyW) {
    const me = itemRect(it, sizes);
    let right = bodyW;
    a.items.forEach((o) => {
      if (o === it) return;
      const r = itemRect(o, sizes);
      if (r.x >= it.x + 12 && r.y < me.y + me.h + NOTE_GAP && me.y < r.y + r.h + NOTE_GAP) right = Math.min(right, r.x - NOTE_GAP);
    });
    return Math.max(TEXT_MIN, Math.floor(right - it.x));
  }
  function fitTexts(el, a, width) { // width: the note's width now (while resizing), else its saved one
    const bodyW = (width || Math.max(a.w, parseFloat(el.style.width) || 0)) - 2 * NOTE_PAD - 2;
    const sizes = itemSizes(el);
    a.items.forEach((it) => {
      const n = it.type === 'text' && el.querySelector(`.nitem[data-item="${it.id}"]`);
      if (n) n.style.maxWidth = `${textRoom(a, it, sizes, bodyW)}px`;
    });
  }
  const rectsOf = (a, sizes) => Object.fromEntries(a.items.map((it) => [it.id, itemRect(it, sizes)]));
  const clash = (p, q) => p.x < q.x + q.w + NOTE_GAP && q.x < p.x + p.w + NOTE_GAP && p.y < q.y + q.h + NOTE_GAP && q.y < p.y + p.h + NOTE_GAP;
  // The free spot nearest to `want` for item `id`: where it is, or just beside, above or below another item.
  function freeSpot(rects, id, want) {
    const me = rects[id];
    const others = Object.keys(rects).filter((k) => k !== id).map((k) => rects[k]);
    const wx = Math.max(0, Math.round(want.x));
    const wy = Math.max(0, Math.round(want.y));
    const fits = ([x, y]) => x >= 0 && y >= 0 && others.every((o) => !clash({ x, y, w: me.w, h: me.h }, o));
    if (fits([wx, wy])) return { x: wx, y: wy };
    const bottom = Math.max(0, ...others.map((o) => o.y + o.h + NOTE_GAP));
    const spots = [[wx, bottom], [0, bottom]];
    others.forEach((o) => spots.push([o.x - me.w - NOTE_GAP, wy], [o.x + o.w + NOTE_GAP, wy], [wx, o.y - me.h - NOTE_GAP],
      [wx, o.y + o.h + NOTE_GAP], [o.x + o.w + NOTE_GAP, o.y], [o.x, o.y + o.h + NOTE_GAP]));
    const [x, y] = spots.filter(fits).sort((p, q) => Math.hypot(p[0] - wx, p[1] - wy) - Math.hypot(q[0] - wx, q[1] - wy))[0];
    return { x, y };
  }
  // Item `id` grew: push whatever it now reaches down below it (and so on). Returns true if anything moved.
  function pushFrom(a, rects, id) {
    const queue = [id];
    let moved = false;
    for (let n = 0; queue.length && n < 300; n++) {
      const f = rects[queue.shift()];
      a.items.forEach((it) => {
        const r = rects[it.id];
        if (it.id === id || r === f || !clash(f, r)) return;
        r.y = it.y = f.y + f.h + NOTE_GAP;
        moved = true;
        queue.push(it.id);
      });
    }
    return moved;
  }
  function strokeAbs(a, k) {
    if (!k.item) return k.pts;
    const it = itemOf(a, k.item);
    return it ? k.pts.map(([x, y]) => [r1(x + it.x), r1(y + it.y)]) : null;
  }
  const inkHTML = (a) => (a.ink || []).map((k) => { const p = strokeAbs(a, k); return p ? `<path d="${strokePath(p)}"/>` : ''; }).join('');
  // The smallest size that shows everything in the note.
  function noteMinSize(el, a) {
    let w = 0;
    let h = 0;
    const rects = rectsOf(a, itemSizes(el));
    a.items.forEach((it) => { // a text box can wrap narrower, so it only needs its smallest width
      const r = rects[it.id];
      w = Math.max(w, r.x + (it.type === 'text' ? TEXT_MIN : r.w));
      h = Math.max(h, r.y + r.h);
    });
    (a.ink || []).forEach((k) => (strokeAbs(a, k) || []).forEach(([x, y]) => { w = Math.max(w, x + 2); h = Math.max(h, y + 2); }));
    const body = el.querySelector('.snote-body');
    return { w: Math.ceil(Math.max(NOTE_MIN.w, w + 2 * NOTE_PAD + 2)), h: Math.ceil(Math.max(NOTE_MIN.h, (body ? body.offsetTop : 52) + h + 2 * NOTE_PAD + 2)) };
  }

  // ── Drawing notes ──
  function itemHTML(a, it) {
    const sel = noteSel[a.id] === it.id ? ' sel' : '';
    const grip = '<span class="nitem-grip" title="Drag to move" aria-hidden="true"></span>';
    if (it.type === 'tree') {
      return `<div class="nitem nitem-tree${sel}" data-item="${it.id}" style="left:${it.x}px;top:${it.y}px">${grip}${treeHTML(it)}</div>`;
    }
    return `<div class="nitem nitem-text${sel}" data-item="${it.id}" style="left:${it.x}px;top:${it.y}px">${grip}<div class="snote-textwrap"><div class="snote-mirror" aria-hidden="true">${mirrorHTML(it)}</div><textarea class="snote-text" rows="1" aria-label="Note text" placeholder="Type…" spellcheck="false">${esc(it.text)}</textarea></div></div>`;
  }
  function noteHTML(a, n) {
    const tool = toolOf(a.id);
    const h = nhist(a.id);
    if (noteSel[a.id] && !itemOf(a, noteSel[a.id])) delete noteSel[a.id];
    const filled = a.items.length || (a.ink || []).length;
    const btn = (k, label, extra) => `<button type="button" class="ann-btn" data-nt="${k}" title="${label}" aria-label="${label}" ${extra || ''}>${icon(k)}</button>`;
    return `<div class="snote" data-aid="${a.id}" data-tool="${tool}" role="group" aria-label="Sticky note ${n}">
        <div class="snote-bar" data-nd="move" title="Drag to move"><span class="snote-title">Note ${n}</span><span class="snote-btns"><button type="button" class="snote-hbtn" data-nd="min" title="Minimize" aria-label="Minimize note ${n}">–</button><button type="button" class="snote-hbtn snote-x" data-nd="delete" title="Delete this note" aria-label="Delete note ${n}">×</button></span></div>
        <div class="snote-tools" role="toolbar" aria-label="Note ${n} tools">${NOTE_TOOLS.map(([k, label]) => btn(k, label, `aria-pressed="${tool === k}"`)).join('')}<span class="ann-sep" aria-hidden="true"></span>${btn('undo', 'Undo in this note', h.undo.length ? '' : 'disabled')}${btn('redo', 'Redo in this note', h.redo.length ? '' : 'disabled')}${btn('del', 'Delete selected', noteSel[a.id] ? '' : 'disabled')}${btn('clear', 'Clear this note', filled ? '' : 'disabled')}</div>
        <div class="snote-body">${filled ? '' : '<p class="snote-empty">Type here, draw, or add a tree.</p>'}<div class="snote-canvas">${a.items.map((it) => itemHTML(a, it)).join('')}<svg class="snote-ink" aria-hidden="true">${inkHTML(a)}</svg></div></div>
        <div class="snote-size" data-nd="size" title="Drag to resize"></div>
      </div>`;
  }
  // The icons of the minimized notes of the question being shown, for #note-dock in the bottom bar.
  function dockButtons() {
    if (!leftPid) return '';
    const order = notesInOrder();
    const mins = minMap();
    return order.map((a, i) => {
      if (!mins[a.id]) return '';
      const n = i + 1;
      return `<button type="button" class="dock-note" data-nd="restore" data-aid="${a.id}" title="${ordinal(n)} note" aria-label="Open the ${ordinal(n)} note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v12l-6 6H3z"/><path d="M15 21v-6h6"/></svg><span class="dock-num">${n}</span></button>`;
    }).join('');
  }
  const dockEl = () => document.getElementById('note-dock');
  function renderNotes() {
    const layer = noteLayer();
    if (!layer || !leftPid) return;
    const act = document.activeElement;
    if (act && layer.contains(act)) act.blur();
    const order = notesInOrder();
    const mins = minMap();
    layer.innerHTML = order.map((a, i) => (mins[a.id] ? '' : noteHTML(a, i + 1))).join('');
    if (dockEl()) dockEl().innerHTML = dockButtons();
    layoutNotes();
  }
  // The text again, behind the (transparent) text box, with the highlighted ranges marked. A trailing zero-width
  // space keeps a final empty line the same height as in the text box.
  function mirrorHTML(it) {
    const text = it.text || '';
    let out = '';
    let at = 0;
    (it.hls || []).map((h, i) => [h, i]).sort((x, y) => x[0][0] - y[0][0]).forEach(([[s0, e0], i]) => {
      if (s0 < at) return;
      out += esc(text.slice(at, s0)) + `<mark data-i="${i}">${esc(text.slice(s0, e0))}</mark>`;
      at = e0;
    });
    return `${out}${esc(text.slice(at))}​`;
  }
  // Keep highlights on their words when the text changes: find what was replaced, shift what is after it,
  // and drop a highlight whose words are all gone.
  function shiftHls(hls, before, after) {
    if (!hls || !hls.length) return hls;
    let p = 0;
    while (p < before.length && p < after.length && before[p] === after[p]) p++;
    let q = 0;
    while (q < before.length - p && q < after.length - p && before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
    const oldEnd = before.length - q;
    const delta = after.length - before.length;
    const added = after.length - q - p;
    return hls.map(([s0, e0]) => [
      s0 < p ? s0 : s0 >= oldEnd ? s0 + delta : p + added,
      e0 <= p ? e0 : e0 >= oldEnd ? e0 + delta : p,
    ]).filter(([s0, e0]) => e0 > s0);
  }
  function mergeHls(hls) {
    const out = [];
    hls.slice().sort((x, y) => x[0] - y[0]).forEach(([s0, e0]) => {
      const last = out[out.length - 1];
      if (last && s0 <= last[1]) last[1] = Math.max(last[1], e0); else out.push([s0, e0]);
    });
    return out;
  }
  function layoutNotes() {
    const layer = noteLayer();
    if (!layer || !leftPid) return;
    anns(leftPid).forEach((a) => {
      if (a.kind !== 'note' || !a.items) return;
      const el = noteEl(a.id);
      if (!el || (noteDrag && noteDrag.id === a.id)) return;
      const [x, y] = notePos(a);
      fitTexts(el, a);
      const m = noteMinSize(el, a);
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(a.w, m.w)}px`, height: `${Math.max(a.h, m.h)}px` });
    });
  }
  function placeItems(el, a) { // move items on screen to their stored spots, and their strokes with them
    a.items.forEach((it) => {
      const n = el.querySelector(`.nitem[data-item="${it.id}"]`);
      if (n) Object.assign(n.style, { left: `${it.x}px`, top: `${it.y}px` });
    });
    el.querySelector('.snote-ink').innerHTML = inkHTML(a);
  }
  function syncNoteBtns(id) {
    const el = noteEl(id);
    const a = noteById(id);
    if (!el || !a) return;
    const h = nhist(id);
    const set = (k, on) => { const b = el.querySelector(`[data-nt="${k}"]`); if (b) b.disabled = !on; };
    set('undo', h.undo.length);
    set('redo', h.redo.length);
    set('del', !!itemOf(a, noteSel[id]));
    set('clear', a.items.length || (a.ink || []).length);
  }
  function selectItem(id, itemId) {
    const el = noteEl(id);
    if (itemId) noteSel[id] = itemId; else delete noteSel[id];
    if (el) el.querySelectorAll('.nitem').forEach((n) => n.classList.toggle('sel', n.dataset.item === itemId));
    syncNoteBtns(id);
  }
  function focusNote(id, itemId, path) {
    const el = noteEl(id);
    const box = el && itemId && el.querySelector(`.nitem[data-item="${itemId}"]`);
    const f = box && (path ? box.querySelector(`.tnode-input[data-path="${path}"]`) : box.querySelector('.snote-text'));
    if (f) f.focus({ preventScroll: true });
  }

  // ── Changing notes ──
  function recordNote(pid, before, after) {
    record(pid, [{ op: 'remove', ann: before }, { op: 'add', ann: after }]);
    const h = nhist(after.id);
    h.undo.push({ before: cloneAnn(before), after: cloneAnn(after) });
    h.redo = [];
  }
  function flushNoteEdit() {
    if (!noteEdit) return;
    const { pid, id, before } = noteEdit;
    noteEdit = null;
    const live = anns(pid).find((a) => a.id === id);
    if (!live || !live.items) return;
    const empty = live.items.filter((it) => it.type === 'text' && !it.text && !(it.hls && it.hls.length));
    if (empty.length) { // a text box left empty goes away when it loses focus
      const gone = new Set(empty.map((it) => it.id));
      live.items = live.items.filter((it) => !gone.has(it.id));
      if (live.ink) { live.ink = live.ink.filter((k) => !gone.has(k.item)); if (!live.ink.length) delete live.ink; }
      const el = pid === leftPid && noteEl(id);
      if (el) gone.forEach((itemId) => { const n = el.querySelector(`.nitem[data-item="${itemId}"]`); if (n) n.remove(); });
      if (gone.has(noteSel[id])) delete noteSel[id];
    }
    if (JSON.stringify(live) !== JSON.stringify(before)) recordNote(pid, before, cloneAnn(live));
    if (pid === leftPid) syncNoteBtns(id);
  }
  // Apply a change to a copy of note `id` and record it as one step.
  function changeNote(id, fn) {
    flushNoteEdit();
    const live = noteById(id);
    if (!live) return null;
    const before = cloneAnn(live);
    const after = cloneAnn(live);
    const out = fn(after);
    if (JSON.stringify(before) === JSON.stringify(after)) return out;
    applyOps(leftPid, [{ op: 'remove', ann: before }, { op: 'add', ann: after }]);
    recordNote(leftPid, before, after);
    return out;
  }
  // The note's own undo / redo. A step only applies if the note still looks the way that step left it (the main
  // toolbar's undo may have changed it since); otherwise the note's history is out of date and is dropped.
  function noteUndo(id, isRedo) {
    flushNoteEdit();
    const live = noteById(id);
    const h = nhist(id);
    const from = isRedo ? h.redo : h.undo;
    const step = from[from.length - 1];
    if (!live || !step) return;
    if (JSON.stringify(live) !== JSON.stringify(isRedo ? step.before : step.after)) {
      h.undo = [];
      h.redo = [];
      syncNoteBtns(id);
      announce('This note was changed with the main Undo, so its own undo history was reset.');
      return;
    }
    from.pop();
    (isRedo ? h.undo : h.redo).push(step);
    const ops = [{ op: 'remove', ann: cloneAnn(live) }, { op: 'add', ann: cloneAnn(isRedo ? step.after : step.before) }];
    applyOps(leftPid, ops);
    record(leftPid, ops);
  }
  function canvasPoint(el, e) {
    const c = el.querySelector('.snote-canvas').getBoundingClientRect();
    return [r1(e.clientX - c.left), r1(e.clientY - c.top)];
  }
  // A new text box at a point of note `id` (or the nearest free spot), ready to type. It is kept only if something is
  // typed in it, and adding it plus the typing is one undo step.
  function startText(id, [x, y]) {
    flushNoteEdit();
    const layer = noteLayer();
    if (document.activeElement && layer.contains(document.activeElement)) document.activeElement.blur();
    const live = noteById(id);
    const el = noteEl(id);
    if (!live || !el) return;
    const it = { id: newId(), type: 'text', x: 0, y: 0, text: '' };
    const rects = rectsOf(live, itemSizes(el));
    rects[it.id] = itemRect(it);
    Object.assign(it, freeSpot(rects, it.id, { x, y: y - GRIP - 4 }));
    noteEdit = { pid: leftPid, id, before: cloneAnn(live) };
    live.items.push(it);
    noteSel[id] = it.id;
    renderNotes();
    focusNote(id, it.id);
  }
  function startTree(id, [x, y]) {
    const sizes = itemSizes(noteEl(id));
    noteTool[id] = 'select';
    const itemId = changeNote(id, (a) => {
      const it = { id: newId(), type: 'tree', x: 0, y: 0, tree: { label: '', kids: [] } };
      const rects = rectsOf(a, sizes);
      rects[it.id] = itemRect(it);
      Object.assign(it, freeSpot(rects, it.id, { x: x - TN.pad - TN.d / 2, y: y - GRIP - TN.pad - TN.d / 2 }));
      a.items.push(it);
      return it.id;
    });
    if (!itemId) return;
    selectItem(id, itemId);
    renderNotes();
    focusNote(id, itemId, '0');
    announce('Tree added. Type the root label; + on a node adds a branch.');
  }
  function setNoteTool(id, k) {
    if (k === 'pen' || k === 'eraser') flushNoteEdit();
    noteTool[id] = toolOf(id) === k && k !== 'select' ? 'select' : k;
    const el = noteEl(id);
    if (!el) return;
    el.dataset.tool = noteTool[id];
    el.querySelectorAll('.snote-tools [aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.nt === noteTool[id])));
  }
  // The note button makes a note right away, in the middle of the work area (both panes). If another note already
  // starts there, the new one steps down and to the right so it doesn't hide it.
  function createNote() {
    const layer = noteLayer();
    if (!layer || !leftPid) return;
    flushNoteEdit();
    let px = Math.round((layer.clientWidth - NOTE_NEW.w) / 2);
    let py = Math.round((layer.clientHeight - NOTE_NEW.h) / 2);
    const taken = () => [...layer.querySelectorAll('.snote')].some((n) => Math.abs(n.offsetLeft - px) < 12 && Math.abs(n.offsetTop - py) < 12);
    for (let i = 0; i < 12 && taken(); i++) { px += 28; py += 28; }
    px = Math.max(0, Math.min(px, layer.clientWidth - NOTE_NEW.w));
    py = Math.max(0, Math.min(py, layer.clientHeight - NOTE_NEW.h));
    const a = Object.assign({ id: newId(), kind: 'note' }, anchorAt(px, py), NOTE_NEW, { t: Date.now(), items: [] });
    if (['pen', 'eraser'].includes(ui.annMode)) setAnnMode('none'); // type in the new note, not draw on the page
    commit(leftPid, [{ op: 'add', ann: a }]);
    startText(a.id, [0, GRIP]);
    announce('Note added. Type, or use its toolbar to highlight, draw or add a tree.');
  }

  // ── Minimizing: a note is pulled into its numbered icon in the bottom-left corner, and pushed back out of it ──
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function genie(el, to, closing) {
    if (!el.animate) return null;
    if (reduceMotion()) return el.animate(closing ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: closing ? 'forwards' : 'none' });
    const r = el.getBoundingClientRect();
    const ox = to.left + to.width / 2 - r.left;
    const oy = to.top + to.height / 2 - r.top;
    const fx = Math.max(0, Math.min(100, (ox / Math.max(1, r.width)) * 100));
    const pinch = (k) => `polygon(0% 0%, 100% 0%, ${(100 - (100 - fx) * k).toFixed(1)}% 100%, ${(fx * k).toFixed(1)}% 100%)`;
    const frames = [
      { transform: 'none', clipPath: pinch(0), opacity: 1, offset: 0 },
      { transform: 'scale(.9, .78)', clipPath: pinch(0.8), opacity: 1, offset: 0.45 },
      { transform: 'scale(.04)', clipPath: pinch(1), opacity: 0.3, offset: 1 },
    ];
    el.style.transformOrigin = `${r1(ox)}px ${r1(oy)}px`;
    const anim = el.animate(closing ? frames : frames.slice().reverse().map((f) => Object.assign({}, f, { offset: 1 - f.offset })),
      { duration: 440, easing: closing ? 'cubic-bezier(.55, 0, .8, .3)' : 'cubic-bezier(.2, .7, .45, 1)', fill: closing ? 'forwards' : 'none' });
    if (!closing) anim.finished.then(() => { el.style.transformOrigin = ''; }, () => {});
    return anim;
  }
  function pulse(el) { if (el && el.animate && !reduceMotion()) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 260 }); }
  // A copy of a note, fixed over the whole page, to animate on its way to or from the bottom bar (the note layer
  // stops above the bar and would cut it off).
  function ghostOf(el) {
    const r = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    const fields = el.querySelectorAll('textarea, input');
    ghost.querySelectorAll('textarea, input').forEach((f, i) => { f.value = fields[i].value; f.tabIndex = -1; });
    ghost.classList.add('snote-ghost');
    ghost.removeAttribute('data-aid');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, visibility: 'visible' });
    document.body.appendChild(ghost);
    return ghost;
  }
  const dockBtn = (id) => document.querySelector(`#note-dock .dock-note[data-aid="${id}"]`);
  function minimizeNote(id) {
    flushNoteEdit();
    const el = noteEl(id);
    if (!el) return;
    const ghost = ghostOf(el); // the note as it looks now, pulled into its icon while the real one is gone
    const n = notesInOrder().findIndex((a) => a.id === id) + 1;
    minMap()[id] = true;
    delete noteSel[id];
    save();
    renderNotes();
    const dock = dockBtn(id);
    const done = () => { ghost.remove(); pulse(dock); };
    const anim = dock && genie(ghost, dock.getBoundingClientRect(), true);
    if (anim) anim.finished.then(done, done); else done();
    announce(`${ordinal(n)} note minimized. Its icon is in the bar at the bottom.`);
  }
  function restoreNote(id) {
    const a = noteById(id);
    const dock = dockBtn(id);
    if (!a) return;
    const from = dock && dock.getBoundingClientRect();
    pulse(dock);
    delete minMap()[id];
    save();
    const pane = paneEl(a.pane); // bring it into view if its side has scrolled away from it
    if (a.y < pane.scrollTop || a.y > pane.scrollTop + pane.clientHeight - 60) pane.scrollTop = Math.max(0, a.y - 40);
    renderNotes();
    const el = noteEl(id);
    if (!el || !from) return;
    el.style.visibility = 'hidden'; // a copy comes out of the icon, then the real note shows
    const ghost = ghostOf(el);
    const done = () => { ghost.remove(); el.style.visibility = ''; };
    const anim = genie(ghost, from, false);
    if (anim) anim.finished.then(done, done); else done();
  }
  function onDockClick(e) {
    const b = e.target.closest && e.target.closest('#note-dock [data-nd="restore"]');
    if (b && leftPid) restoreNote(b.dataset.aid);
  }

  // ── Pointer and keyboard ──
  function onNoteClick(e) {
    const sn = e.target.closest('.snote');
    const id = sn && sn.dataset.aid;
    const live = id && noteById(id);
    if (!live) return;
    const tool = toolOf(id);
    const nt = e.target.closest('[data-nt]');
    if (nt) {
      if (nt.disabled) return;
      const k = nt.dataset.nt;
      if (NOTE_TOOLS.some(([t]) => t === k)) setNoteTool(id, k);
      else if (k === 'undo' || k === 'redo') noteUndo(id, k === 'redo');
      else if (k === 'del') {
        const sel = noteSel[id];
        changeNote(id, (a) => {
          a.items = a.items.filter((it) => it.id !== sel);
          if (a.ink) { a.ink = a.ink.filter((s) => s.item !== sel); if (!a.ink.length) delete a.ink; }
        });
        selectItem(id, null);
        announce('Deleted. Use Undo to bring it back.');
      } else if (k === 'clear') {
        flushNoteEdit();
        if (!confirm('Clear everything in this note?')) return;
        changeNote(id, (a) => { a.items = []; delete a.ink; });
        announce('Note cleared. Use Undo to bring it back.');
      }
      return;
    }
    const nd = e.target.closest('[data-nd]');
    if (nd) {
      if (nd.dataset.nd === 'min') minimizeNote(id);
      if (nd.dataset.nd === 'delete') {
        flushNoteEdit();
        const n = noteById(id);
        if (n) { delete minMap()[id]; commit(leftPid, [{ op: 'remove', ann: n }]); announce('Note deleted. Use Undo to bring it back.'); }
      }
      return;
    }
    const box = e.target.closest('.nitem');
    const node = tool === 'hl' && e.target.closest('.tnode-input');
    if (node && box) { // highlighter on: a click highlights the whole node, or takes the highlight off
      const path = node.dataset.path;
      let on = false;
      changeNote(id, (a) => { const t = nodeAt(itemOf(a, box.dataset.item).tree, path); on = t.hl = !t.hl; if (!on) delete t.hl; });
      announce(on ? 'Node highlighted.' : 'Highlight removed.');
      return;
    }
    const tn = e.target.closest('[data-tn]');
    if (tn && box) {
      const itemId = box.dataset.item;
      const path = tn.closest('.tnode').dataset.path;
      if (tn.dataset.tn === 'add') {
        const sizes = itemSizes(sn);
        const focus = changeNote(id, (a) => {
          const t = nodeAt(itemOf(a, itemId).tree, path);
          t.kids.push({ label: '', kids: [] });
          pushFrom(a, rectsOf(a, sizes), itemId); // a wider or taller tree moves what it now reaches
          return `${path}.${t.kids.length - 1}`;
        });
        if (focus) focusNote(id, itemId, focus);
      } else {
        const parent = path.slice(0, path.lastIndexOf('.'));
        changeNote(id, (a) => { nodeAt(itemOf(a, itemId).tree, parent).kids.splice(Number(path.slice(path.lastIndexOf('.') + 1)), 1); });
        focusNote(id, itemId, parent);
        announce('Branch removed. Use Undo to bring it back.');
      }
      return;
    }
    if (!e.target.closest('.snote-body') || box) return;
    const skip = noteClickSkip === id;
    noteClickSkip = null;
    if (tool === 'tree') startTree(id, canvasPoint(sn, e));
    else if (tool === 'select') { if (skip) selectItem(id, null); else startText(id, canvasPoint(sn, e)); }
  }
  function onNoteInput(e) {
    const el = e.target;
    const sn = el.closest('.snote');
    const box = el.closest('.nitem');
    const live = sn && noteById(sn.dataset.aid);
    const it = live && box && itemOf(live, box.dataset.item);
    if (!it) return;
    if (!noteEdit || noteEdit.id !== live.id) { flushNoteEdit(); noteEdit = { pid: leftPid, id: live.id, before: cloneAnn(live) }; }
    if (el.classList.contains('snote-text')) {
      it.hls = shiftHls(it.hls, it.text || '', el.value);
      if (it.hls && !it.hls.length) delete it.hls;
      it.text = el.value;
      el.previousElementSibling.innerHTML = mirrorHTML(it); // the box grows with its mirror, then wraps at its room
      fitTexts(sn, live);
      if (pushFrom(live, rectsOf(live, itemSizes(sn)), it.id)) placeItems(sn, live); // a taller text box moves what is below it
      layoutNotes(); // and the note grows if it has to
    } else if (el.classList.contains('tnode-input')) { const n = nodeAt(it.tree, el.dataset.path); if (n) n.label = el.value; }
    saveSoon();
  }
  function onNoteSelect(e) { // highlighter on: selecting text in a text box highlights it
    const ta = e.target;
    if (!ta.matches || !ta.matches('.snote-text') || ta.selectionEnd <= ta.selectionStart) return;
    const id = ta.closest('.snote').dataset.aid;
    if (toolOf(id) !== 'hl') return;
    const itemId = ta.closest('.nitem').dataset.item;
    const range = [ta.selectionStart, ta.selectionEnd];
    changeNote(id, (a) => { const it = itemOf(a, itemId); if (it) it.hls = mergeHls([...(it.hls || []), range]); });
  }
  function onNoteKey(e) {
    if (e.key === 'Escape' && e.target.closest('.snote')) { e.target.blur(); e.stopPropagation(); }
  }
  // Erase what is under the pointer on note `live`: strokes, highlighted text, highlighted nodes. Updates the note in
  // place (the drag keeps its pointer capture); the whole drag is recorded as one step on release.
  function eraseOnNote(live, el, e) {
    const [x, y] = canvasPoint(el, e);
    let hit = false;
    const near = (k) => {
      const p = strokeAbs(live, k);
      return !!p && (p.length === 1 ? Math.hypot(x - p[0][0], y - p[0][1]) < 9 : p.some((pt, i) => i && distToSegment(x, y, p[i - 1], pt) < 9));
    };
    if ((live.ink || []).some(near)) { live.ink = live.ink.filter((k) => !near(k)); hit = true; }
    const inRect = (n) => [...n.getClientRects()].some((r) => e.clientX >= r.left - 2 && e.clientX <= r.right + 2 && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 2);
    el.querySelectorAll('.nitem-text').forEach((box) => {
      const it = itemOf(live, box.dataset.item);
      const gone = [...box.querySelectorAll('.snote-mirror mark')].filter(inRect).map((m) => Number(m.dataset.i));
      if (!it || !gone.length) return;
      it.hls = it.hls.filter((h, i) => !gone.includes(i));
      if (!it.hls.length) delete it.hls;
      box.querySelector('.snote-mirror').innerHTML = mirrorHTML(it);
      hit = true;
    });
    el.querySelectorAll('.tnode-input.hl').forEach((inp) => {
      const it = itemOf(live, inp.closest('.nitem').dataset.item);
      const n = inRect(inp) && it && nodeAt(it.tree, inp.dataset.path);
      if (n) { delete n.hl; inp.classList.remove('hl'); hit = true; }
    });
    if (!hit) return;
    noteInk.changed = true;
    if (live.ink && !live.ink.length) delete live.ink;
    el.querySelector('.snote-ink').innerHTML = inkHTML(live);
  }
  function onNoteDown(e) {
    if (e.button !== 0) return;
    const sn = e.target.closest('.snote');
    const id = sn && sn.dataset.aid;
    const live = id && noteById(id);
    if (!live) return;
    const h = e.target.closest('[data-nd="move"], [data-nd="size"]');
    if (h) { // moving or resizing the note
      if (e.target.closest('.snote-hbtn')) return;
      e.preventDefault();
      flushNoteEdit();
      if (document.activeElement && sn.contains(document.activeElement)) document.activeElement.blur();
      if (h.setPointerCapture) h.setPointerCapture(e.pointerId);
      noteDrag = { id, kind: h.dataset.nd, el: sn, start: [e.clientX, e.clientY], moved: false,
        orig: { x: sn.offsetLeft, y: sn.offsetTop, w: sn.offsetWidth, h: sn.offsetHeight }, min: noteMinSize(sn, live) };
      sn.classList.add('dragging');
      return;
    }
    if (!e.target.closest('.snote-body')) return;
    const tool = toolOf(id);
    if (tool === 'pen' || tool === 'eraser') { // drawing or erasing on the note
      e.preventDefault();
      flushNoteEdit();
      if (sn.setPointerCapture) sn.setPointerCapture(e.pointerId);
      if (tool === 'pen') {
        noteInk = { id, kind: 'pen', el: sn, pts: [canvasPoint(sn, e)] };
        sn.querySelector('.snote-ink').insertAdjacentHTML('beforeend', `<path class="live" d="${strokePath(noteInk.pts)}"/>`);
      } else {
        noteInk = { id, kind: 'eraser', el: sn, before: cloneAnn(live), changed: false };
        eraseOnNote(live, sn, e);
      }
      return;
    }
    if (tool !== 'select') return;
    const box = e.target.closest('.nitem');
    if (!box) { noteClickSkip = (noteEdit && noteEdit.id === id) || noteSel[id] ? id : null; return; }
    const grab = e.target.closest('.nitem-grip') || (box.classList.contains('nitem-tree') && !e.target.closest('.tnode'));
    if (!grab) { selectItem(id, box.dataset.item); return; }
    e.preventDefault();
    flushNoteEdit();
    if (document.activeElement && sn.contains(document.activeElement)) document.activeElement.blur();
    const now = noteById(id);
    const it = now && itemOf(now, box.dataset.item);
    if (!it) return;
    selectItem(id, it.id);
    if (sn.setPointerCapture) sn.setPointerCapture(e.pointerId);
    itemDrag = { id, item: it.id, el: box, noteEl: sn, start: [e.clientX, e.clientY], orig: { x: it.x, y: it.y },
      before: cloneAnn(now), sizes: itemSizes(sn), moved: false };
    box.classList.add('dragging');
  }
  function onNoteMove(e) {
    if (noteInk) {
      const k = noteInk;
      if (k.kind === 'pen') {
        const pt = canvasPoint(k.el, e);
        const last = k.pts[k.pts.length - 1];
        if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 1.5) return;
        k.pts.push(pt);
        const lp = k.el.querySelector('.snote-ink path.live');
        if (lp) lp.setAttribute('d', strokePath(k.pts));
      } else {
        const live = noteById(k.id);
        if (live) eraseOnNote(live, k.el, e);
      }
      return;
    }
    if (itemDrag) { // the item follows the pointer; a red outline warns when it is on top of another one
      const d = itemDrag;
      const dx = e.clientX - d.start[0];
      const dy = e.clientY - d.start[1];
      if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
      const live = noteById(d.id);
      const it = live && itemOf(live, d.item);
      if (!it) return;
      it.x = Math.max(0, Math.round(d.orig.x + dx));
      it.y = Math.max(0, Math.round(d.orig.y + dy));
      placeItems(d.noteEl, live);
      const rects = rectsOf(live, d.sizes);
      d.el.classList.toggle('clash', Object.keys(rects).some((k) => k !== d.item && clash(rects[d.item], rects[k])));
      layoutNotes();
      return;
    }
    const d = noteDrag;
    if (!d) return;
    const dx = e.clientX - d.start[0];
    const dy = e.clientY - d.start[1];
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
    if (d.kind === 'move') { // anywhere in the work area, keeping the top bar on screen
      const layer = noteLayer();
      d.el.style.left = `${Math.round(Math.max(0, Math.min(d.orig.x + dx, layer.clientWidth - 60)))}px`;
      d.el.style.top = `${Math.round(Math.max(0, Math.min(d.orig.y + dy, layer.clientHeight - 24)))}px`;
    } else { // never smaller than what is in the note; nothing inside moves, text boxes rewrap to the new width
      const live = noteById(d.id);
      const w = Math.round(Math.max(d.min.w, d.orig.w + dx));
      d.el.style.width = `${w}px`;
      if (live) { fitTexts(d.el, live, w); d.min = noteMinSize(d.el, live); }
      d.el.style.height = `${Math.round(Math.max(d.min.h, d.orig.h + dy))}px`;
    }
  }
  function onNoteUp() {
    if (noteInk) {
      const k = noteInk;
      noteInk = null;
      const live = noteById(k.id);
      if (!live) return;
      if (k.kind === 'pen') { // a stroke that starts on a text box or tree belongs to it and moves with it
        const sizes = itemSizes(k.el);
        changeNote(k.id, (a) => {
          const [x0, y0] = k.pts[0];
          const rects = rectsOf(a, sizes);
          const on = a.items.find((it) => { const r = rects[it.id]; return x0 >= r.x && x0 <= r.x + r.w && y0 >= r.y && y0 <= r.y + r.h; });
          const pts = on ? k.pts.map(([x, y]) => [r1(x - on.x), r1(y - on.y)]) : k.pts;
          a.ink = [...(a.ink || []), Object.assign({ id: newId(), pts }, on ? { item: on.id } : {})];
        });
      } else if (k.changed) { recordNote(leftPid, k.before, cloneAnn(live)); renderNotes(); }
      return;
    }
    if (itemDrag) { // dropped on top of something: slide to the nearest free spot
      const d = itemDrag;
      itemDrag = null;
      d.el.classList.remove('dragging', 'clash');
      const live = noteById(d.id);
      const it = live && itemOf(live, d.item);
      if (!it || !d.moved) { if (it) Object.assign(it, d.orig); return; }
      Object.assign(it, freeSpot(rectsOf(live, d.sizes), d.item, { x: it.x, y: it.y }));
      if (JSON.stringify(live) !== JSON.stringify(d.before)) recordNote(leftPid, d.before, cloneAnn(live));
      renderNotes();
      return;
    }
    const d = noteDrag;
    if (!d) return;
    noteDrag = null;
    d.el.classList.remove('dragging');
    if (!d.moved || !noteById(d.id)) { layoutNotes(); return; }
    const sizes = itemSizes(d.el);
    changeNote(d.id, (a) => {
      if (d.kind === 'move') Object.assign(a, anchorAt(d.el.offsetLeft, d.el.offsetTop));
      else { // a text box that rewrapped taller pushes what it now reaches downward
        a.w = d.el.offsetWidth;
        a.h = d.el.offsetHeight;
        const rects = rectsOf(a, sizes);
        a.items.forEach((it) => { if (it.type === 'text') pushFrom(a, rects, it.id); });
      }
    });
  }
  // The layer and both panes belong to the practice screen and outlive a question, so they are wired once each.
  let dockWired = false;
  function wireNotes() {
    if (!dockWired) { dockWired = true; document.addEventListener('click', onDockClick); } // the bottom bar is redrawn often
    const layer = noteLayer();
    if (!layer || layer.dataset.wired) return;
    layer.dataset.wired = '1';
    ['pane-left', 'pane-right'].forEach((id) => document.getElementById(id).addEventListener('scroll', layoutNotes, { passive: true }));
    layer.addEventListener('mousedown', (e) => { if (e.target.closest('.snote-tools button, .snote-hbtn')) e.preventDefault(); }); // keep typing focus
    layer.addEventListener('click', onNoteClick);
    layer.addEventListener('input', onNoteInput);
    layer.addEventListener('focusout', (e) => { if (e.target.matches('.snote-text, .tnode-input')) flushNoteEdit(); });
    layer.addEventListener('keydown', onNoteKey);
    layer.addEventListener('mouseup', onNoteSelect);
    layer.addEventListener('keyup', onNoteSelect);
    layer.addEventListener('pointerdown', onNoteDown);
    layer.addEventListener('pointermove', onNoteMove);
    layer.addEventListener('pointerup', onNoteUp);
    layer.addEventListener('pointercancel', onNoteUp);
  }

  // ───────────────────────────── Diagram workspace (right pane) ─────────────────────────────
  // Scratch work over the exam's own environment diagram image, for problems with a `figure`. Never graded.
  // Stored per problem in diagramsOf()[pid], i.e. on the session being shown, in image pixels (shown at 1:1):
  //   { id, kind: 'pen',   pts: [[x, y], …] }                 freehand stroke
  //   { id, kind: 'text',  x, y, text, slot? }                text, top-left corner at x, y; `slot` when it fills a blank
  //   { id, kind: 'list',  x, y, cells: ['', …] }             list object, top-left corner at x, y
  //   { id, kind: 'arrow', from, to, fromRef?, toRef? }       arrow; an end with a ref is attached and follows its target
  // A ref is { slot: i } (a value blank), { text: id } (a text box) or { list: id, cell: i } (a list cell).
  // Every blank in figure.slots ([x, line y, width]) is a typing spot from the start; it only gets a stored item once
  // something is typed in it. Clicking anywhere else starts a free text box, which can also be dragged.
  // Undo/redo snapshots the whole list, kept in memory per list, so each session and problem has its own.
  const DG_ROOM = { w: 340, h: 200 }; // blank space right of and below the image, for lists and other objects
  const DG_SLOT_RISE = 21; // a blank's typing spot starts this far above its line, so the text sits on the line
  const DG_VALUE_WIDTH = 50; // blanks narrower than this are value slots (arrows attach there), wider ones hold names
  const DG_SNAP = 14; // an arrow end this close to a target attaches to it
  const DG_HINTS = {
    select: 'Click a blank or anywhere to type. Tab goes to the next blank. Drag text boxes, lists and arrows to move them.',
    pen: 'Draw with the mouse or trackpad.',
    eraser: 'Click or drag over a mark to erase it.',
    list: 'Click where the list should go.',
    arrow: 'Click a value or list cell, then click its target (or drag between them). Ends snap into place. Esc cancels.',
  };
  const dgHistory = new WeakMap(); // diagram list -> { undo: [snapshots], redo: [snapshots] }
  const dgGeom = new Map();        // arrow -> { pts, d } from the last layout, for drawing and hit tests
  const dg = { pid: null, list: null, canvas: null, slots: [], mode: 'select', selected: null, drag: null, editBefore: null };

  const dgHist = () => { if (!dgHistory.has(dg.list)) dgHistory.set(dg.list, { undo: [], redo: [] }); return dgHistory.get(dg.list); };
  const dgSnapshot = () => JSON.stringify(dg.list);
  const dgItem = (id) => dg.list.find((a) => a.id === id) || null;
  const dgTextEl = (id) => dg.canvas.querySelector(`.dg-text[data-did="${id}"]`);
  const dgListEl = (id) => dg.canvas.querySelector(`.dg-list[data-did="${id}"]`);
  const dgIsEditing = (el) => !!el && !!el.matches && el.matches('.dg-text, .dg-cell-input');
  function dgBlur() { if (dgIsEditing(document.activeElement)) document.activeElement.blur(); }
  function dgRecord(before) { // the change is already made
    if (before === dgSnapshot()) return;
    const h = dgHist();
    h.undo.push(before);
    h.redo = [];
    save();
    updateDgToolbar();
  }
  function dgRestore(from, to) {
    const snap = from.pop();
    if (snap === undefined) return;
    to.push(dgSnapshot());
    dg.list.splice(0, dg.list.length, ...JSON.parse(snap));
    dg.selected = null;
    save();
    drawDiagram();
    updateDgToolbar();
  }

  // ── Arrow targets ──
  function dgRefEl(ref) {
    if (!ref) return null;
    if (ref.slot !== undefined) return dg.canvas.querySelector(`.dg-slot[data-slot="${ref.slot}"]`);
    if (ref.text) return dgTextEl(ref.text);
    const l = dgListEl(ref.list);
    return l && l.querySelector(`.dg-cell[data-i="${ref.cell}"]`);
  }
  function dgRect(el) {
    const c = dg.canvas.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { l: b.left - c.left, t: b.top - c.top, r: b.right - c.left, b: b.bottom - c.top };
  }
  function dgTargets() {
    const out = [];
    dg.canvas.querySelectorAll('.dg-slot').forEach((el) => { if (Number(el.dataset.min) < DG_VALUE_WIDTH) out.push({ el, ref: { slot: Number(el.dataset.slot) } }); });
    dg.canvas.querySelectorAll('.dg-text:not(.dg-slot)').forEach((el) => out.push({ el, ref: { text: el.dataset.did } }));
    dg.canvas.querySelectorAll('.dg-cell').forEach((el) => out.push({ el, ref: { list: el.closest('.dg-list').dataset.did, cell: Number(el.dataset.i) } }));
    return out;
  }
  function dgNearest([x, y], except) { // the closest target within snapping distance, or null
    let best = null;
    let bestDist = DG_SNAP;
    dgTargets().forEach((t) => {
      if (except && JSON.stringify(t.ref) === JSON.stringify(except)) return;
      const r = dgRect(t.el);
      const dist = Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b));
      if (dist < bestDist) { best = t; bestDist = dist; }
    });
    return best;
  }
  function dgShowSnap(t) {
    dg.canvas.querySelectorAll('.dg-snap').forEach((el) => el.classList.remove('dg-snap'));
    if (t) t.el.classList.add('dg-snap');
  }
  function dgSetArrowEnd(a, end, p) {
    const key = end === 'from' ? 'fromRef' : 'toRef';
    const t = dgNearest(p, end === 'from' ? a.toRef : a.fromRef);
    dgShowSnap(t);
    if (t) a[key] = t.ref;
    else { delete a[key]; a[end] = p; }
  }

  // ── Arrow layout ──
  // Attached ends are recomputed from what they point at. Arrows arriving at the same side of the same target are
  // spread along that side, in the order of where they come from, so they don't cross or pile up.
  const dgRound = (v) => Math.round(v * 10) / 10;
  function dgArrivalSide(from, r, cell) {
    const [x, y] = from;
    if (x <= r.l) return !cell ? 'left' : y <= (r.t + r.b) / 2 ? 'top' : 'bottom'; // a later cell's left side is inside its list
    if (y < r.t) return 'top';
    if (y > r.b) return 'bottom';
    return 'right';
  }
  function dgLayoutArrows(arrows) {
    dgGeom.clear();
    arrows.forEach((a) => {
      const el = dgRefEl(a.fromRef);
      if (a.fromRef && !el) delete a.fromRef; // its target is gone: the end stays where it was
      if (el) { const r = dgRect(el); a.from = [dgRound((r.l + r.r) / 2), dgRound((r.t + r.b) / 2)]; }
    });
    const groups = new Map();
    const tangent = new Map();
    arrows.forEach((a) => {
      const el = dgRefEl(a.toRef);
      if (a.toRef && !el) delete a.toRef;
      if (!el) return;
      const r = dgRect(el);
      const side = dgArrivalSide(a.from, r, !!a.toRef.list && a.toRef.cell > 0);
      const key = `${JSON.stringify(a.toRef)}:${side}`;
      if (!groups.has(key)) groups.set(key, { r, side, list: [] });
      groups.get(key).list.push(a);
    });
    groups.forEach(({ r, side, list }) => {
      const upright = side === 'left' || side === 'right';
      const room = upright ? r.b - r.t : r.r - r.l;
      const step = Math.min(9, (room - 4) / list.length);
      list.sort((p, q) => (upright ? p.from[1] - q.from[1] : p.from[0] - q.from[0]));
      list.forEach((a, i) => {
        const off = (i - (list.length - 1) / 2) * step;
        const midX = (r.l + r.r) / 2;
        const midY = (r.t + r.b) / 2;
        a.to = { left: [r.l, midY + off], right: [r.r, midY + off], top: [midX + off, r.t], bottom: [midX + off, r.b] }[side].map(dgRound);
        tangent.set(a, { left: [1, 0], right: [-1, 0], top: [0, 1], bottom: [0, -1] }[side]);
      });
    });
    arrows.forEach((a) => {
      const [x1, y1] = a.from;
      const [x2, y2] = a.to;
      const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
      const head = (t) => { // the two strokes of the arrowhead
        const wing = (w) => {
          const c = Math.cos(w);
          const s = Math.sin(w);
          return `${dgRound(x2 - 10 * (t[0] * c - t[1] * s))} ${dgRound(y2 - 10 * (t[0] * s + t[1] * c))}`;
        };
        return `M${wing(0.45)}L${x2} ${y2}L${wing(-0.45)}`;
      };
      const t = tangent.get(a);
      if (!a.fromRef && !a.toRef) {
        dgGeom.set(a, { pts: [a.from, a.to], d: `M${x1} ${y1}L${x2} ${y2}${head([(x2 - x1) / dist, (y2 - y1) / dist])}` });
        return;
      }
      const end = t || [(x2 - x1) / dist, (y2 - y1) / dist];
      const k = Math.min(60, dist * 0.4);
      const c1 = [x1 + Math.sign(x2 - x1 || 1) * k, y1];
      const c2 = [x2 - end[0] * k, y2 - end[1] * k];
      const pts = Array.from({ length: 17 }, (_, i) => {
        const u = i / 16;
        const v = 1 - u;
        return [0, 1].map((n) => v * v * v * a.from[n] + 3 * v * v * u * c1[n] + 3 * v * u * u * c2[n] + u * u * u * a.to[n]);
      });
      dgGeom.set(a, { pts, d: `M${x1} ${y1}C${c1[0]} ${c1[1]} ${dgRound(c2[0])} ${dgRound(c2[1])} ${x2} ${y2}${head(end)}` });
    });
  }
  const dgNearArrow = (a, x, y) => {
    const { pts } = dgGeom.get(a);
    return pts.some((p, i) => i && distToSegment(x, y, pts[i - 1], p) < 9);
  };

  // ── Drawing ──
  function drawInk() {
    const live = dg.drag && dg.drag.kind === 'arrow' ? dg.drag.item : null;
    const arrows = dg.list.filter((a) => a.kind === 'arrow').concat(live || []);
    dgLayoutArrows(arrows);
    const handles = (a) => [a.from, a.to].map(([x, y]) => `<circle class="dg-handle" cx="${x}" cy="${y}" r="4"/>`).join('');
    const arrowHTML = (a) => `<path class="dg-arrow" d="${dgGeom.get(a).d}"/>${a.fromRef ? `<circle class="dg-dot" cx="${a.from[0]}" cy="${a.from[1]}" r="3"/>` : ''}${a.id === dg.selected ? handles(a) : ''}`;
    dg.canvas.querySelector('.dg-layer').innerHTML = dg.list.map((a) => {
      if (a.kind === 'pen') return `<path class="dg-pen" d="${strokePath(a.pts)}"/>`;
      if (a.kind === 'arrow') return arrowHTML(a);
      return '';
    }).join('') + (live ? arrowHTML(live) : '')
      + (dg.drag && dg.drag.kind === 'pen' ? `<path class="dg-pen" d="${strokePath(dg.drag.pts)}"/>` : '');
    dg.canvas.querySelectorAll('.dg-text, .dg-list').forEach((el) => el.classList.toggle('selected', el.dataset.did === dg.selected));
  }
  function sizeDgText(el) { el.style.width = `max(${el.dataset.min || 0}px, ${el.value.length + 2}ch)`; }
  function drawDiagram() {
    const texts = dg.canvas.querySelector('.dg-texts');
    const input = (cls, attrs, label, value, x, y) => `<input class="${cls}" ${attrs} value="${esc(value)}" aria-label="${label}" autocomplete="off" spellcheck="false" style="left:${x}px;top:${y}px">`;
    const blanks = dg.slots.map(([x, line, w], i) => {
      const a = dg.list.find((t) => t.slot === i);
      return input('dg-text dg-slot', `data-slot="${i}" data-min="${w}"${a ? ` data-did="${a.id}"` : ''}`, `Diagram blank ${i + 1}`, a ? a.text : '', x, line - DG_SLOT_RISE);
    });
    const free = dg.list.filter((a) => a.kind === 'text' && a.slot === undefined).map((a) => input('dg-text', `data-did="${a.id}"`, 'Diagram text', a.text, a.x, a.y));
    const lists = dg.list.filter((a) => a.kind === 'list').map((a) => `<div class="dg-list" data-did="${a.id}" style="left:${a.x}px;top:${a.y}px">
        <div class="dg-grip">list</div>
        <div class="dg-cells">${a.cells.map((v, i) => `<div class="dg-cell" data-i="${i}"><span class="dg-index">${i}</span><input class="dg-cell-input" data-min="26" data-i="${i}" value="${esc(v)}" aria-label="List index ${i}" autocomplete="off" spellcheck="false"></div>`).join('')}
          <span class="dg-list-btns"><button type="button" class="dg-list-btn" data-dgl="add" tabindex="-1" title="Add an element" aria-label="Add an element">+</button><button type="button" class="dg-list-btn" data-dgl="remove" tabindex="-1" title="Remove the last element" aria-label="Remove the last element" ${a.cells.length > 1 ? '' : 'disabled'}>−</button></span>
        </div>
      </div>`);
    texts.innerHTML = blanks.concat(free, lists).join('');
    texts.querySelectorAll('.dg-text, .dg-cell-input').forEach(sizeDgText);
    drawInk();
  }
  function updateDgToolbar() {
    if (!dg.pid) return;
    const bar = document.getElementById('dg-bar');
    const h = dgHist();
    bar.querySelectorAll('[data-dg]').forEach((b) => {
      const k = b.dataset.dg;
      if (DG_HINTS[k]) b.setAttribute('aria-pressed', String(dg.mode === k));
      if (k === 'undo') b.disabled = !h.undo.length;
      if (k === 'redo') b.disabled = !h.redo.length;
      if (k === 'del') b.disabled = !dg.selected;
      if (k === 'clear') b.disabled = !dg.list.length;
    });
    document.getElementById('dg-hint').textContent = DG_HINTS[dg.mode];
  }
  function setDgMode(mode) {
    dgCancelArrow();
    dg.mode = dg.mode === mode ? 'select' : mode;
    dg.selected = null;
    dg.canvas.dataset.mode = dg.mode;
    dgShowSnap(null);
    drawInk();
    updateDgToolbar();
  }
  function deleteDgSelected() {
    const before = dgSnapshot();
    dg.list.splice(dg.list.findIndex((a) => a.id === dg.selected), 1);
    dg.selected = null;
    drawDiagram();
    dgRecord(before);
    updateDgToolbar();
  }

  // ── Pointer ──
  function dgPoint(e) {
    const r = dg.canvas.getBoundingClientRect();
    const clamp = (v, max) => dgRound(Math.max(0, Math.min(max, v)));
    return [clamp(e.clientX - r.left, r.width), clamp(e.clientY - r.top, r.height)];
  }
  function dgHitArrow(x, y) {
    return dg.list.filter((a) => a.kind === 'arrow').reverse().find((a) => dgNearArrow(a, x, y)) || null;
  }
  function dgEraseAt(x, y) {
    const inBox = (el) => { const r = dgRect(el); return x >= r.l && x <= r.r && y >= r.t && y <= r.b; };
    const hits = dg.list.filter((a) => {
      if (a.kind === 'arrow') return dgNearArrow(a, x, y);
      if (a.kind === 'pen') return a.pts.length === 1 ? Math.hypot(x - a.pts[0][0], y - a.pts[0][1]) < 9
        : a.pts.some((p, i) => i && distToSegment(x, y, a.pts[i - 1], p) < 9);
      return inBox(a.kind === 'list' ? dgListEl(a.id) : dgTextEl(a.id));
    });
    if (!hits.length) return;
    hits.forEach((a) => dg.list.splice(dg.list.indexOf(a), 1));
    drawDiagram();
  }
  function addDgText([x, y]) {
    dg.editBefore = dgSnapshot();
    const a = { id: newId(), kind: 'text', x: Math.max(0, x - 3), y: Math.max(0, y - 11), text: '' }; // the caret lands on the click
    dg.list.push(a);
    drawDiagram();
    dgTextEl(a.id).focus();
  }
  function addDgList([x, y]) {
    const before = dgSnapshot();
    const a = { id: newId(), kind: 'list', x: Math.max(0, x - 14), y: Math.max(0, y - 26), cells: [''] };
    dg.list.push(a);
    setDgMode('list'); // back to typing, ready for the first element
    drawDiagram();
    dgRecord(before);
    dgListEl(a.id).querySelector('.dg-cell-input').focus();
  }
  function onDgListButton(e) {
    const b = e.target.closest('[data-dgl]');
    if (!b || b.disabled) return;
    dgBlur();
    const a = dgItem(b.closest('.dg-list').dataset.did);
    const before = dgSnapshot();
    if (b.dataset.dgl === 'add') a.cells.push('');
    else a.cells.pop();
    dg.selected = a.id;
    drawDiagram();
    drawInk(); // arrows to a removed element stay where they were, no longer attached
    dgRecord(before);
    if (b.dataset.dgl === 'add') dgListEl(a.id).querySelector('.dg-cell:last-of-type .dg-cell-input').focus();
    updateDgToolbar();
  }

  // An arrow started with a click (not a drag) follows the pointer until the next click, which places its end.
  function dgCancelArrow() {
    if (!dg.drag || !dg.drag.following) return false;
    dg.drag = null;
    dgShowSnap(null);
    drawInk();
    return true;
  }
  function onDgDown(e) {
    const active = document.activeElement;
    if (e.button !== 0) return;
    const d = dg.drag;
    if (d && d.following && !e.target.closest('[data-dgl]')) { // a list's + and − still work while the end follows
      e.preventDefault();
      const p = dgPoint(e);
      dg.drag = null;
      dgShowSnap(null);
      if (Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) >= 8) {
        dgSetArrowEnd(d.item, 'to', p);
        dgShowSnap(null);
        dg.list.push(d.item);
        dgRecord(d.before);
      }
      drawInk();
      return;
    }
    if (e.target === active) return; // inside the box being edited: normal text editing
    const wasEditing = dgIsEditing(active);
    if (wasEditing) active.blur();
    if (e.target.closest('[data-dgl]')) return; // list + and −: handled on click
    e.preventDefault();
    dg.canvas.setPointerCapture(e.pointerId);
    const p = dgPoint(e);
    const before = dgSnapshot();
    const textEl = e.target.closest('.dg-text');
    const listEl = e.target.closest('.dg-list');
    const sel = dgItem(dg.selected);
    const end = dg.mode === 'select' && sel && sel.kind === 'arrow' ? ['from', 'to'].find((k) => Math.hypot(p[0] - sel[k][0], p[1] - sel[k][1]) < 9) : null;
    if (dg.mode === 'pen') dg.drag = { kind: 'pen', before, pts: [p] };
    else if (dg.mode === 'arrow') {
      const item = { id: newId(), kind: 'arrow', from: p, to: p };
      const t = dgNearest(p);
      if (t) item.fromRef = t.ref;
      dg.drag = { kind: 'arrow', before, item, start: p, moved: false };
    } else if (dg.mode === 'list') dg.drag = { kind: 'new-list', before, p };
    else if (dg.mode === 'eraser') { dg.drag = { kind: 'erase', before }; dgEraseAt(...p); }
    else if (!end && (e.target.closest('.dg-cell-input') || (textEl && textEl.dataset.slot !== undefined))) { // the click just goes into it
      dg.canvas.releasePointerCapture(e.pointerId);
      e.target.focus();
    } else if (textEl && !end) {
      const a = dgItem(textEl.dataset.did);
      dg.selected = a.id;
      dg.drag = { kind: 'move-box', before, item: a, el: textEl, start: p, x: a.x, y: a.y, moved: false };
    } else if (listEl && !end) {
      const a = dgItem(listEl.dataset.did);
      dg.selected = a.id;
      dg.drag = { kind: 'move-box', before, item: a, el: listEl, start: p, x: a.x, y: a.y, moved: false };
    } else {
      const a = end ? sel : dgHitArrow(...p);
      if (a) dg.drag = { kind: 'move-arrow', before, item: a, end, start: p, from: a.from, to: a.to };
      else dg.drag = { kind: 'new-text', before, p, skip: wasEditing || !!dg.selected }; // a click that only ends an edit or a selection doesn't start a box
      dg.selected = a ? a.id : null;
    }
    drawInk();
    updateDgToolbar();
  }
  function onDgMove(e) {
    const d = dg.drag;
    const p = dgPoint(e);
    if (!d) {
      if (dg.mode === 'arrow') dgShowSnap(dgNearest(p));
      return;
    }
    const dx = d.start ? p[0] - d.start[0] : 0;
    const dy = d.start ? p[1] - d.start[1] : 0;
    if (d.kind === 'pen') {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
      d.pts.push(p);
      drawInk();
    } else if (d.kind === 'arrow') {
      d.moved = d.moved || Math.hypot(dx, dy) >= 8;
      dgSetArrowEnd(d.item, 'to', p);
      drawInk();
    } else if (d.kind === 'erase') {
      dgEraseAt(...p);
    } else if (d.kind === 'move-box') {
      if (!d.moved && Math.hypot(dx, dy) < 4) return; // a click, not a drag
      d.moved = true;
      d.item.x = Math.max(0, d.x + dx);
      d.item.y = Math.max(0, d.y + dy);
      d.el.style.left = `${d.item.x}px`;
      d.el.style.top = `${d.item.y}px`;
      drawInk(); // attached arrows follow
    } else if (d.kind === 'move-arrow') {
      if (d.end) dgSetArrowEnd(d.item, d.end, p);
      else if (Math.hypot(dx, dy) >= 4) { // dragging the line lifts the whole arrow off whatever it was attached to
        delete d.item.fromRef;
        delete d.item.toRef;
        d.item.from = [d.from[0] + dx, d.from[1] + dy];
        d.item.to = [d.to[0] + dx, d.to[1] + dy];
      }
      drawInk();
    }
  }
  function onDgUp() {
    const d = dg.drag;
    if (!d || d.following) return;
    if (d.kind === 'arrow' && !d.moved) { d.following = true; return; } // clicked, not dragged: the end follows the pointer
    dg.drag = null;
    dgShowSnap(null);
    if (d.kind === 'pen') dg.list.push({ id: newId(), kind: 'pen', pts: d.pts });
    if (d.kind === 'arrow' && d.moved) dg.list.push(d.item);
    if (d.kind === 'new-text') { if (!d.skip) addDgText(d.p); return; }
    if (d.kind === 'new-list') { addDgList(d.p); return; }
    if (d.kind === 'move-box' && !d.moved) { if (d.item.kind === 'text') d.el.focus(); return; }
    drawInk();
    dgRecord(d.before);
  }
  function onDgFocusIn(e) {
    if (!dgIsEditing(e.target)) return;
    if (dg.editBefore === null) dg.editBefore = dgSnapshot();
    const list = e.target.closest('.dg-list');
    dg.selected = (list ? list.dataset.did : e.target.dataset.did) || null;
    drawInk();
    updateDgToolbar();
  }
  function onDgFocusOut(e) {
    const el = e.target;
    if (!dgIsEditing(el)) return;
    const a = dgItem(el.dataset.did);
    if (a && !a.text.trim()) { // nothing typed: no box left behind
      dg.list.splice(dg.list.indexOf(a), 1);
      dg.selected = null;
      if (el.dataset.slot !== undefined) delete el.dataset.did;
      else setTimeout(() => { el.remove(); if (dg.canvas) drawInk(); });
    }
    const before = dg.editBefore;
    dg.editBefore = null;
    dgRecord(before);
    drawInk();
    updateDgToolbar();
  }
  function onDgInput(e) {
    const el = e.target;
    const list = el.closest('.dg-list');
    if (list) {
      dgItem(list.dataset.did).cells[el.dataset.i] = el.value;
      sizeDgText(el);
      drawInk(); // the cell may have widened
      saveSoon();
      return;
    }
    let a = dgItem(el.dataset.did);
    if (!a) { // first character in a blank
      const [x, line] = dg.slots[el.dataset.slot];
      a = { id: newId(), kind: 'text', slot: Number(el.dataset.slot), x, y: line - DG_SLOT_RISE, text: '' };
      dg.list.push(a);
      el.dataset.did = a.id;
      dg.selected = a.id;
      updateDgToolbar();
    }
    a.text = el.value;
    sizeDgText(el);
    drawInk();
    saveSoon();
  }

  function renderDiagram(fig) {
    const tool = (k, label) => `<button class="ann-btn" data-dg="${k}" title="${label}" aria-label="${label}">${icon(k)}</button>`;
    const w = Number(fig.width) + DG_ROOM.w;
    const h = Number(fig.height) + DG_ROOM.h;
    return `<details class="dg" open>
      <summary>Environment diagram <span class="dg-note">Scratch work, not graded. Saved in this browser.</span></summary>
      <div class="annot-bar dg-bar" id="dg-bar" role="toolbar" aria-label="Diagram tools">
        ${tool('select', 'Type and move')}${tool('pen', 'Red pen')}${tool('eraser', 'Eraser')}${tool('list', 'New list')}${tool('arrow', 'Arrow')}
        <span class="ann-sep" aria-hidden="true"></span>
        ${tool('undo', 'Undo')}${tool('redo', 'Redo')}${tool('del', 'Delete selected')}${tool('clear', 'Clear the diagram')}
        <span class="annot-hint" id="dg-hint" aria-live="polite"></span>
      </div>
      <div class="dg-scroll">
        <div class="dg-canvas" id="dg-canvas" style="width:${w}px;height:${h}px">
          <img src="${esc(fig.src)}" width="${esc(fig.width)}" height="${esc(fig.height)}" alt="${esc(fig.alt)}" draggable="false">
          <svg class="dg-layer" width="${w}" height="${h}" aria-hidden="true"></svg>
          <div class="dg-texts"></div>
        </div>
      </div>
    </details>`;
  }
  // Built only when the problem changes (see buildLeft); it sits outside what ordinary re-renders replace.
  function buildDiagram(g) {
    const slot = document.getElementById('diagram-slot');
    const fig = PMAP[g.pid].figure;
    dgBlur();
    Object.assign(dg, { pid: null, list: null, canvas: null, selected: null, drag: null, editBefore: null });
    slot.innerHTML = fig ? renderDiagram(fig) : '';
    if (!fig) return;
    const all = diagramsOf();
    dg.pid = g.pid;
    dg.slots = fig.slots || [];
    dg.list = all[g.pid] || (all[g.pid] = []);
    dg.canvas = document.getElementById('dg-canvas');
    dg.canvas.dataset.mode = dg.mode;
    dg.canvas.addEventListener('pointerdown', onDgDown);
    dg.canvas.addEventListener('pointermove', onDgMove);
    dg.canvas.addEventListener('pointerup', onDgUp);
    dg.canvas.addEventListener('pointercancel', onDgUp);
    dg.canvas.addEventListener('pointerleave', () => { if (!dg.drag) dgShowSnap(null); });
    dg.canvas.addEventListener('click', onDgListButton);
    dg.canvas.addEventListener('focusin', onDgFocusIn);
    dg.canvas.addEventListener('focusout', onDgFocusOut);
    dg.canvas.addEventListener('input', onDgInput);
    dg.canvas.addEventListener('keydown', (e) => {
      if (dgIsEditing(e.target) && (e.key === 'Enter' || e.key === 'Escape')) { e.target.blur(); e.stopPropagation(); }
    });
    document.getElementById('dg-bar').addEventListener('click', onDgTool);
    drawDiagram();
    updateDgToolbar();
  }
  function onDgTool(e) {
    const b = e.target.closest('[data-dg]');
    if (!b || b.disabled) return;
    const k = b.dataset.dg;
    dgCancelArrow();
    dgBlur();
    if (DG_HINTS[k]) setDgMode(k);
    else if (k === 'undo') dgRestore(dgHist().undo, dgHist().redo);
    else if (k === 'redo') dgRestore(dgHist().redo, dgHist().undo);
    else if (k === 'del') { if (dg.selected) deleteDgSelected(); }
    else if (k === 'clear') {
      if (!dg.list.length || !confirm('Clear everything you added to this diagram?')) return;
      const before = dgSnapshot();
      dg.list.length = 0;
      dg.selected = null;
      drawDiagram();
      dgRecord(before);
      announce('Diagram cleared. Use Undo to restore it.');
    }
  }

  // ───────────────────────────── Timer (timestamp-based) ─────────────────────────────
  function timeLeft(t) {
    if (!t) return null;
    return t.runningSince ? Math.max(0, t.remainingMs - (Date.now() - t.runningSince)) : t.remainingMs;
  }
  function fmt(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  function pauseTimer(t) {
    if (t && t.runningSince) { t.remainingMs = timeLeft(t); t.runningSince = null; }
  }
  // While a tour tip (tour.js) is up on a question screen, a running countdown waits, so the tips come before the clock.
  function holdTimer(on) {
    const s = ui.screen === 'practice' && cur();
    const t = s && !isReview(s) && s.timer;
    if (!t) return;
    if (on && t.runningSince) { pauseTimer(t); t.pausedByTour = true; save(); }
    if (!on && t.pausedByTour) {
      delete t.pausedByTour;
      if (!t.runningSince && t.remainingMs > 0) t.runningSince = Date.now();
      save();
      render();
    }
  }
  function tick() {
    // An exam whose time ran out is submitted, whichever screen is showing (also catches up after sleep/background).
    const ex = store.exam;
    if (ex && ex.timer && ex.timer.runningSince && timeLeft(ex.timer) <= 0) { submitExam(true); return; }
    const s = store.session;
    if (s && s.timer) {
      const t = s.timer;
      if (t.runningSince && timeLeft(t) <= 0) {
        t.remainingMs = 0;
        t.runningSince = null;
        t.expired = true;
        save();
        if (ui.screen === 'practice' && ui.view === 'practice') {
          announce('Time is up. Your answers have been kept. You can keep reviewing or finish the set.');
          render();
        }
        return;
      }
    }
    const shown = ui.screen === 'practice' && cur();
    const el = document.getElementById('clock');
    if (el && shown && shown.timer) {
      const left = timeLeft(shown.timer);
      el.textContent = fmt(left);
      el.classList.toggle('low', left <= 60000);
    }
  }
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);

  // Active time on an exam (excludes time away after Save & Leave). A refresh or crash doesn't stop it,
  // matching the countdown, which also keeps running unless the student explicitly saves and leaves.
  const activeMs = (s) => (s.activeMs || 0) + (s.activeSince ? Date.now() - s.activeSince : 0);
  function stopActive(s, at) {
    if (s.activeSince) { s.activeMs = (s.activeMs || 0) + Math.max(0, (at || Date.now()) - s.activeSince); s.activeSince = null; }
  }

  // ───────────────────────────── Bank filtering & sessions ─────────────────────────────
  // The Practice filters for the chosen language. Each language is a section with its own bank, topics (in this
  // semester's scope), sources and selections; "All" uses both sections. Topic and source ids never repeat across
  // languages (Gleam ones start with gl-), so the combined lists filter both banks at once, and no topic chosen in
  // either section means every topic of both.
  const LANG_SECTIONS = {
    python: (p) => ({ id: 'python', name: 'Python', questions: QUESTIONS, topicList: TOPICS.filter((t) => !OUT_TOPICS.has(t.id)), topics: p.topics, topicsPref: 'topics',
      sourceList: Object.values(EXAMS), sources: p.exams, sourcesPref: 'exams' }),
    gleam: (p) => ({ id: 'gleam', name: 'Gleam', questions: GL_QUESTIONS, topicList: GL.TOPICS, topics: p.glTopics, topicsPref: 'glTopics',
      sourceList: Object.values(GL.SOURCES), sources: p.glSources, sourcesPref: 'glSources' }),
  };
  function langView(prefs) {
    const all = prefs.lang === 'all';
    const sections = (all ? ['python', 'gleam'] : [prefs.lang === 'gleam' ? 'gleam' : 'python']).map((id) => LANG_SECTIONS[id](prefs));
    const cat = (k) => sections.flatMap((s) => s[k]);
    const one = sections[0].id;
    return { lang: all ? 'all' : one, sections, questions: cat('questions'), topicList: cat('topicList'), topics: cat('topics'),
      sourceList: cat('sourceList'), sources: cat('sources'),
      sourcesLabel: all ? 'Exams & sources' : one === 'gleam' ? 'Sources' : 'Exams',
      allSources: all ? 'All exams and sources' : one === 'gleam' ? 'All sources' : 'All midterms' };
  }
  function filtered(prefs, ignoreTopics) {
    const v = langView(prefs);
    return v.questions.filter((q) =>
      v.sources.includes(PMAP[q.problem].exam) &&
      prefs.difficulties.includes(q.difficulty) &&
      (ignoreTopics || v.topics.length === 0 || q.topics.some((t) => v.topics.includes(t))));
  }
  const problemsOf = (qs) => [...new Set(qs.map((q) => q.problem))];
  function topicNames(ids) {
    if (!ids.length) return 'All topics';
    return ids.map((id) => topicById(id).name).join(', ');
  }
  function newSession(ids, title) {
    const p = store.prefs;
    const timer = p.timerOn ? { durationMs: p.minutes * 60000, remainingMs: p.minutes * 60000, runningSince: Date.now(), expired: false } : null;
    store.session = { ids, groups: groupIds(ids), index: 0, title, answers: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, eliminated: {}, notes: {}, annotations: {}, timer, startedAt: Date.now(), finishedAt: null, finished: false };
    setView('practice');
    ui.screen = 'practice';
    ui.navOpen = false;
    ui.confirmReveal = null;
    save();
    render();
  }
  // Set size: how many question groups match the filters (the most a set can have), and the size actually used.
  const sizeMax = () => problemsOf(filtered(store.prefs)).length;
  const setSize = () => Math.min(store.prefs.size, sizeMax());
  // A typed set size: a whole number from 1 to the matching count, or null while it isn't one yet.
  function parseSize(text) {
    const v = Number(String(text).trim());
    return String(text).trim() !== '' && Number.isInteger(v) && v >= 1 && v <= sizeMax() ? v : null;
  }
  // On blur or before starting: round a decimal, clamp into range, or keep the last valid size if it isn't a number.
  function commitSize(text) {
    const v = Number(String(text).trim());
    const max = sizeMax();
    if (String(text).trim() !== '' && Number.isFinite(v) && max) store.prefs.size = Math.min(max, Math.max(1, Math.round(v)));
    ui.sizeDraft = null;
  }
  // A problem is picked if any of its parts matches the filters; then all of its parts come along, so multi-part
  // questions always stay together.
  function startFromPrefs() {
    const p = store.prefs;
    if (ui.sizeDraft != null) commitSize(ui.sizeDraft);
    const pids = problemsOf(filtered(p));
    const n = setSize();
    const chosen = new Set(pids.slice().sort(() => Math.random() - 0.5).slice(0, n));
    const v = langView(p);
    const ids = v.questions.filter((q) => chosen.has(q.problem) && v.sources.includes(PMAP[q.problem].exam))
      .sort((a, b) => ORDER[a.id] - ORDER[b.id]).map((q) => q.id);
    const prefix = { gleam: 'Gleam · ', all: 'All languages · ' }[v.lang] || '';
    newSession(ids, prefix + topicNames(v.topics));
  }
  function finishSession() {
    const s = store.session;
    pauseTimer(s.timer);
    if (!s.finished) { s.finished = true; s.finishedAt = Date.now(); }
    ui.screen = 'results';
    ui.navOpen = false;
    save();
    render();
    window.scrollTo(0, 0);
  }
  const curGroup = () => cur().groups[cur().index];

  // Switch which session the question screen shows.
  function setView(view, attemptId) {
    if (ui.view === view && ui.attemptId === (attemptId || null)) return;
    ui.view = view;
    ui.attemptId = attemptId || null;
    dropLeftCaches();
  }
  // Live editors and annotation undo history are cached per problem id, so they must be thrown away whenever
  // a different session is shown (a new practice set can contain the same problem as the last one).
  let cachedFor = null; // the session object the caches were built for
  function dropLeftCaches() {
    detachEditors();
    Object.keys(editors).forEach((k) => delete editors[k]);
    Object.keys(history).forEach((k) => delete history[k]);
    leftPid = null;
    cachedFor = null;
    ui.annMode = 'none';
    dg.mode = 'select';
    ui.navOpen = false;
    ui.confirmReveal = null;
    ui.activeBlank = null;
  }

  // ───────────────────────────── Exams ─────────────────────────────
  // A question group is one PROBLEMS entry; an exam always takes every part of each group it includes.
  const partsOf = (pid) => EXAM_QUESTIONS.filter((q) => q.problem === pid).sort((a, b) => ORDER[a.id] - ORDER[b.id]);
  const examGroups = (examId) => Object.keys(PROBLEMS).filter((pid) => PMAP[pid].exam === examId && partsOf(pid).length);
  const shortExam = (examId) => SRC[examId].short || SRC[examId].label.replace('Midterm ', 'MT');
  // How a problem is referred to: "Q4" on an exam or worksheet, "Slide 8" for a lecture example.
  const qRef = (pr) => (SRC[pr.exam].kind === 'lecture' ? `Slide ${pr.number}` : `Q${pr.number}`);
  const groupTopics = (pid) => [...new Set(partsOf(pid).flatMap((q) => q.topics))];
  // A problem's printed points, unless some of its parts were left out for being out of scope: then the total of the
  // parts shown (`ids`). Older sessions that still include those parts keep the printed total.
  function headerPoints(pid, ids) {
    const left = EVERY_QUESTION.some((q) => q.problem === pid && !inScope(q) && !ids.includes(q.id));
    const shown = ids.map((id) => QMAP[id]);
    return left && shown.every(hasPoints) ? shown.reduce((t, q) => t + q.points, 0) : PMAP[pid].points;
  }
  // Sum of the parts' points when all are published; otherwise the problem's printed total.
  function groupPoints(pid) {
    const parts = partsOf(pid);
    return parts.every(hasPoints) ? parts.reduce((t, q) => t + q.points, 0) : PMAP[pid].points;
  }
  const kindLabel = (a) => (a.kind === 'full' ? 'Full past exam' : 'Topic-based exam');

  function createExam(kind, examId, pids, minutes) {
    const ids = pids.flatMap((pid) => partsOf(pid).map((q) => q.id)); // group order as given; parts in exam order
    const now = Date.now();
    store.exam = {
      id: `x${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, mode: 'exam', kind, examId: examId || null,
      title: kind === 'full' ? EXAMS[examId].label : `Custom exam · ${pids.length} question${pids.length === 1 ? '' : 's'}`,
      ids, groups: groupIds(ids), index: 0, answers: {}, checked: {}, revealed: {}, selfGrade: {}, marked: {}, eliminated: {},
      notes: {}, annotations: {},
      timer: minutes ? { durationMs: minutes * 60000, remainingMs: minutes * 60000, runningSince: now, expired: false } : null,
      startedAt: now, finishedAt: null, finished: false, submitted: false, autoSubmitted: false,
      activeMs: 0, activeSince: now, leftAt: null,
    };
    setView('exam');
    ui.screen = 'practice';
    save();
    render();
    announce(`Exam started: ${store.exam.title}. ${store.exam.groups.length} question${store.exam.groups.length === 1 ? '' : 's'}.`);
  }
  function startExamFromPrefs() {
    const p = store.examPrefs;
    const pids = p.kind === 'full' ? examGroups(p.examId) : p.picked.slice();
    if (!pids.length) return;
    createExam(p.kind, p.kind === 'full' ? p.examId : null, pids, p.timerOn ? p.minutes : null);
  }
  function saveAndLeave() {
    const s = store.exam;
    pauseTimer(s.timer);
    stopActive(s);
    s.leftAt = Date.now();
    setView('practice');
    ui.screen = 'home';
    store.prefs.mode = 'exam';
    save();
    render();
    window.scrollTo(0, 0);
    announce('Exam saved. Resume it from this page when you are ready.');
  }
  function resumeExam() {
    const s = store.exam;
    s.leftAt = null;
    if (s.timer && s.timer.remainingMs > 0 && !s.timer.runningSince) s.timer.runningSince = Date.now();
    if (!s.activeSince) s.activeSince = Date.now();
    setView('exam');
    ui.screen = 'practice';
    save();
    render();
  }
  // Submit the exam in progress. auto = the timer ran out (possibly while the page was closed),
  // in which case the attempt is stamped at the moment time expired.
  function submitExam(auto) {
    const s = store.exam;
    if (!s || s.submitted) return;
    let end = Date.now();
    if (s.timer) {
      if (auto && s.timer.runningSince) end = Math.min(end, s.timer.runningSince + s.timer.remainingMs);
      pauseTimer(s.timer);
      if (auto) s.timer.remainingMs = 0;
    }
    stopActive(s, end);
    Object.assign(s, { submitted: true, finished: true, finishedAt: end, autoSubmitted: !!auto, leftAt: null });
    Object.assign(s, gradeAttempt(s)); // frozen grades + score for results and history
    store.attempts.push(s);
    store.exam = null;
    setView('review', s.id);
    ui.screen = 'exam-results';
    save();
    render();
    window.scrollTo(0, 0);
    announce(auto ? 'Time is up. Your exam was submitted automatically.' : 'Exam submitted.');
  }
  function confirmSubmit() {
    const s = store.exam;
    const st = s.groups.map((g) => groupStatus(s, g).status);
    const none = st.filter((x) => x === 'unanswered').length;
    const some = st.filter((x) => x === 'partial').length;
    const warn = [none ? `${none} unanswered question group${none === 1 ? '' : 's'}` : '', some ? `${some} partly answered question group${some === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
    return confirm(`Are you sure you want to submit your exam? You will not be able to change your answers afterward.${warn ? `\n\nYou have ${warn}.` : ''}`);
  }

  // ───────────────────────────── Screens ─────────────────────────────
  function renderLanding() {
    const s = store.session;
    const ex = store.exam;
    const resume = (ex ? `<button class="landing-resume" data-action="resume-exam">Resume your exam: ${esc(ex.title)} (Q ${ex.index + 1} of ${ex.groups.length}) →</button>` : '') +
      (s && !s.finished ? `<button class="landing-resume" data-action="resume">Resume your unfinished set (Q ${s.index + 1} of ${s.groups.length}) →</button>` : '');
    return `<main class="landing">
      <button class="landing-hit" data-action="enter" aria-label="CS61A Practice: Practice, Learn, Master. Start Practicing">
        <img src="assets/home_page.jpg" alt="" draggable="false">
      </button>
      <div class="landing-foot">${resume}<span class="landing-hint">Click anywhere to start</span><span class="landing-byline">Made by Jacob Kao and Osbert Huang</span></div>
    </main>`;
  }

  // A dropdown menu: a button showing the current value, opening a panel of options.
  function dropdown(key, label, value, body, wide) {
    const open = ui.menu === key;
    return `<div class="dd${open ? ' open' : ''}${wide ? ' wide' : ''}">
      <button class="dd-btn" data-action="menu" data-id="${key}" aria-expanded="${open}" aria-haspopup="true">
        <span class="dd-label">${esc(label)}</span><span class="dd-val">${esc(value)}</span><span class="dd-caret" aria-hidden="true">▾</span>
      </button>
      ${open ? `<div class="dd-panel" role="group" aria-label="${esc(label)}">${body}</div>` : ''}
    </div>`;
  }
  function optRow(type, pref, value, label, on, extra, disabled) {
    return `<label class="dd-opt${disabled ? ' disabled' : ''}"><input type="${type}" name="${pref}" data-pref="${pref}" value="${esc(value)}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
      <span class="dd-txt">${esc(label)}</span>${extra ? `<span class="dd-extra">${extra}</span>` : ''}</label>`;
  }
  function summarize(selected, all, nameOf, allLabel) {
    if (!selected.length) return 'None';
    if (selected.length === all.length) return allLabel;
    if (selected.length <= 2) return selected.map(nameOf).join(', ');
    return `${selected.length} selected`;
  }

  const practiceMinutesOk = () => { const p = store.prefs; return !p.timerOn || (Number.isInteger(p.minutes) && p.minutes >= 1 && p.minutes <= 60); };
  function practiceSummaryHTML() {
    const p = store.prefs;
    const max = sizeMax();
    const v = langView(p);
    return `<b>${max}</b> matching question${max === 1 ? '' : 's'} · this set has <b>${setSize()}</b>${v.topics.length > 2 ? ` · ${esc(topicNames(v.topics))}` : ''}`;
  }
  // Set size: a number box styled like the dropdowns, typed into directly or stepped with the arrows on its right.
  // What is typed stays as typed (ui.sizeDraft) until it is a valid size; it is normalized on blur and before starting.
  function setSizeBox() {
    const max = sizeMax();
    const size = setSize();
    const text = ui.sizeDraft != null ? ui.sizeDraft : String(max ? size : store.prefs.size);
    const unit = (v) => (Number(v) === 1 ? 'question' : 'questions');
    const width = `${Math.max(1, text.length) + 0.5}ch`; // as wide as the number, so the unit sits right after it
    return `<div class="dd dd-size">
      <div class="dd-btn dd-num">
        <label class="dd-label" for="set-size">Set size</label>
        <span class="dd-val"><input type="number" id="set-size" class="dd-num-input" style="width:${width}" min="1" max="${max}" step="1" inputmode="numeric" value="${esc(text)}" ${max ? '' : 'disabled'} aria-describedby="set-size-note"> <span class="dd-num-unit" id="set-size-unit">${unit(text)}</span></span>
        <span class="dd-step">
          <button type="button" class="dd-step-btn" data-action="size-step" data-d="1" aria-label="One more question" ${max && size < max ? '' : 'disabled'}>▲</button>
          <button type="button" class="dd-step-btn" data-action="size-step" data-d="-1" aria-label="One fewer question" ${max && size > 1 ? '' : 'disabled'}>▼</button>
        </span>
        <span class="sr-only" id="set-size-note">From 1 to ${max}, the number of matching questions.</span>
      </div>
    </div>`;
  }
  // While a size is typed: refresh the summary, the arrows and Start in place, so the input keeps focus and caret.
  function refreshSizeLive() {
    const max = sizeMax();
    const size = setSize();
    const summary = document.querySelector('.start-row .summary');
    if (summary) summary.innerHTML = practiceSummaryHTML();
    const start = document.querySelector('[data-action="start"]');
    if (start) start.disabled = !(size && practiceMinutesOk());
    const [up, down] = document.querySelectorAll('.dd-step-btn');
    if (up) up.disabled = !(max && size < max);
    if (down) down.disabled = !(max && size > 1);
    const unit = document.getElementById('set-size-unit');
    if (unit) unit.textContent = Number(ui.sizeDraft) === 1 ? 'question' : 'questions';
  }

  function renderHome() {
    const p = store.prefs;
    const s = store.session;
    const pool = filtered(p);
    const pids = problemsOf(pool);
    const base = filtered(p, true);
    if (pids.length && p.size > pids.length) p.size = pids.length; // fewer groups match now: the set shrinks to fit
    const n = setSize();
    const minutesOk = practiceMinutesOk();

    const resume = s && !s.finished ? `
      <div class="resume" role="region" aria-label="Unfinished practice">
        <div><strong>You have an unfinished set: ${esc(s.title)}</strong>
          <span class="hint">Question ${s.index + 1} of ${s.groups.length} · ${s.ids.filter((id) => hasAnswer(s, id)).length} of ${s.ids.length} parts answered${s.timer ? ` · ${fmt(timeLeft(s.timer))} left on the timer${s.timer.runningSince ? '' : ' (paused)'}` : ''}</span></div>
        <div class="actions"><button class="btn btn-primary" data-action="resume">Resume Practice</button><button class="btn" data-action="discard">Start Over</button></div>
      </div>` : (s && s.finished ? `
      <div class="resume"><div><strong>Last set: ${esc(s.title)}</strong><span class="hint">Finished, ${s.groups.length} questions</span></div>
        <div class="actions"><button class="btn" data-action="show-results">View results</button></div></div>` : '');

    const v = langView(p);
    const topicName = (id) => topicById(id).name;
    // With All, each menu lists both languages under their own heading (both have, e.g., a recursion topic).
    const heading = (sec) => (v.sections.length > 1 ? `<div class="dd-group">${esc(sec.name)}</div>` : '');
    const topicsBody = `<div class="dd-tools"><button class="link" data-action="topics-all">Select all</button><button class="link" data-action="topics-none">Clear</button></div>
      ${v.sections.map((sec) => `${heading(sec)}<div class="dd-list cols">${sec.topicList.map((t) => {
        const count = problemsOf(base.filter((q) => q.topics.includes(t.id))).length;
        return optRow('checkbox', sec.topicsPref, t.id, t.name, sec.topics.includes(t.id), count ? String(count) : 'soon', !count);
      }).join('')}</div>`).join('')}
      <p class="hint">Numbers are questions (each may have several parts). Leave everything unchecked to include all topics.</p>`;
    const examsBody = v.sections.map((sec) => `${heading(sec)}<div class="dd-list">${sec.sourceList.map((e) => optRow('checkbox', sec.sourcesPref, e.id, e.label, sec.sources.includes(e.id))).join('')}</div>`).join('');
    // Language: each one has its own question bank, topics and sources. SQL is listed but not available yet.
    const langRow = `<div class="lang-row" role="radiogroup" aria-label="Language">
        <span class="lang-label" aria-hidden="true">Language</span>
        ${LANGS.map((l) => (l.soon
          ? `<button class="lang-opt soon" role="radio" aria-checked="false" aria-disabled="true" disabled title="${esc(l.name)} questions are coming soon">${esc(l.name)}<small>Coming soon</small></button>`
          : `<button class="lang-opt" id="lang-${l.id}" role="radio" data-action="lang" data-v="${l.id}" aria-checked="${v.lang === l.id}">${esc(l.name)}</button>`)).join('')}
      </div>`;
    const diffBody = `<div class="dd-list">${DIFFS.map((d) => optRow('checkbox', 'difficulties', d, d[0].toUpperCase() + d.slice(1), p.difficulties.includes(d))).join('')}</div>`;
    const timerBody = `<div class="timer-config">
        <label><input type="checkbox" id="timer-on" ${p.timerOn ? 'checked' : ''}> Countdown timer</label>
        <label><input type="number" id="timer-min" min="1" max="60" step="1" value="${esc(p.minutes)}" ${p.timerOn ? '' : 'disabled'} aria-label="Minutes (1 to 60)"> min</label>
      </div>
      ${minutesOk ? '<p class="hint">Any whole number of minutes from 1 to 60, or turn it off.</p>' : '<p class="err" role="alert">Enter a whole number from 1 to 60.</p>'}`;

    const cap = (d) => d[0].toUpperCase() + d.slice(1);
    const mode = p.mode === 'exam' ? 'exam' : 'practice';
    const modeBtn = (m, title, sub) => `<button class="mode-opt" id="mode-${m}" data-action="mode" data-v="${m}" aria-pressed="${mode === m}"><b>${title}</b><span>${sub}</span></button>`;
    return `<main class="home">
      <div class="home-head"><div><button class="home-brand" data-action="landing" title="Back to the welcome page"><h1>CS 61A &amp; C88C Exam Practice</h1></button><p class="tagline">Past-exam questions, one at a time. Pick topics, set a timer, check your work.</p></div>${TOUR ? `<button class="btn btn-sm btn-home btn-feedback" data-action="replay-tour">${icon('tour')}Replay the tutorial</button>` : ''}</div>
      ${examResumeHTML()}
      ${resume}

      <div class="mode-switch" role="group" aria-label="Mode">
        ${modeBtn('practice', 'Practice Mode', 'Check answers and see solutions as you go')}
        ${modeBtn('exam', 'Exam Mode', 'Timed, no feedback until you submit')}
      </div>

      ${mode === 'exam' ? renderExamSetup() + renderHistory() : `<section class="setup-card" aria-label="Practice setup">
        ${langRow}
        <div class="dd-row">
          ${dropdown('topics', 'Topics', v.topics.length ? summarize(v.topics, v.topicList.map((t) => t.id), topicName, 'All topics') : 'All topics', topicsBody, true)}
          ${dropdown('exams', v.sourcesLabel, summarize(v.sources, v.sourceList.map((e) => e.id), (id) => SRC[id].label, v.allSources), examsBody)}
          ${dropdown('difficulties', 'Difficulty', summarize(p.difficulties, DIFFS, cap, 'Any'), diffBody)}
          ${setSizeBox()}
          ${dropdown('timer', 'Timer', p.timerOn ? (minutesOk ? `${p.minutes} min` : 'Invalid') : 'Off', timerBody)}
        </div>
        <div class="start-row">
          <div class="summary">${practiceSummaryHTML()}</div>
          <button class="btn btn-primary btn-lg" data-action="start" ${n && minutesOk ? '' : 'disabled'}>Start practice →</button>
        </div>
      </section>`}

      <div class="feedback-row"><a class="btn btn-sm btn-home btn-feedback" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer">${icon('msg')}Give Feedback</a><span class="feedback-note">Your feedback can make this platform better!</span></div>
      <div class="notice">No account needed. Your answers, code notes and annotations are saved in <b>this browser on this device</b> and are gone if you clear site data.</div>
      <p class="disclaimer">Privacy: this site uses Cloudflare Web Analytics, which collects aggregate traffic statistics (such as visits and page views) without cookies. Your answers, code, grades and exam history stay in your browser’s localStorage and are never sent anywhere, unless you choose Python Tutor on a question, which opens pythontutor.com with that question’s code.</p>
      <p class="disclaimer">Independent student project, not an official UC Berkeley / CS 61A service. Questions and answers are transcribed from CS 61A Midterm 2 (Fall 2025, Spring 2025, Fall 2024, Spring 2024, Fall 2023, Spring 2023, Fall 2022 and Fall 2021) and, for Gleam, from this semester’s exam-prep worksheets and lecture examples, and credited on each question. Explanations were written for this prototype and are not official.</p>
    </main>`;
  }

  // ───────────────────────────── Exam setup & history (home, Exam Mode) ─────────────────────────────
  const topicLabel = (id) => topicById(id).name;
  const when = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const examMinutesOk = (p) => !p.timerOn || (Number.isInteger(p.minutes) && p.minutes >= 1 && p.minutes <= EXAM_MAX_MINUTES);
  // "Exclusive — Fall 2025 MT2 — Q4 — Linked Lists, Lists & Mutation" (names repeat across exams, so the exam is always shown)
  function groupLine(pid) {
    const pr = PMAP[pid];
    return `${pr.title} — ${shortExam(pr.exam)} — Q${pr.number} — ${groupTopics(pid).map(topicLabel).join(', ')}`;
  }

  function examResumeHTML() {
    const ex = store.exam;
    if (!ex) return '';
    const done = ex.ids.filter((id) => hasAnswer(ex, id)).length;
    return `<div class="resume" role="region" aria-label="Unfinished exam">
      <div><strong>Unfinished exam: ${esc(ex.title)}</strong>
        <span class="hint">${kindLabel(ex)} · Question ${ex.index + 1} of ${ex.groups.length} · ${done} of ${ex.ids.length} parts answered · ${ex.timer ? `${fmt(timeLeft(ex.timer))} left${ex.timer.runningSince ? '' : ' (paused)'}` : 'Untimed'}</span></div>
      <div class="actions"><button class="btn btn-primary" data-action="resume-exam">Resume Exam</button><button class="btn" data-action="discard-exam">Discard</button></div>
    </div>`;
  }

  // Topic-based exams: filter + search narrow the list; the selection is kept in click order and never
  // changed by filtering. Nothing is ever selected automatically.
  function pickCandidates() {
    const p = store.examPrefs;
    const q = ui.examQuery.trim().toLowerCase();
    // The Gleam chip matches every Gleam question (the exam-prep worksheets); other chips match Python topics.
    return EXAM_PIDS.filter((pid) => partsOf(pid).length &&
      (!p.topics.length || groupTopics(pid).some((t) => p.topics.includes(t)) || (isGleam(pid) && p.topics.includes(GLEAM_CHIP))) &&
      (!q || groupLine(pid).toLowerCase().includes(q)));
  }
  function pickListHTML() {
    const p = store.examPrefs;
    const list = pickCandidates();
    if (!list.length) return '<p class="hint pick-empty">No questions match these filters.</p>';
    return list.map((pid) => {
      const parts = partsOf(pid);
      const pts = groupPoints(pid);
      const diffs = DIFFS.filter((d) => parts.some((q) => q.difficulty === d));
      const on = p.picked.includes(pid);
      return `<label class="pick-row${on ? ' on' : ''}"><input type="checkbox" data-pick="${pid}" ${on ? 'checked' : ''}>
        <span class="pick-txt"><span class="pick-name">${esc(groupLine(pid))}</span>
          <span class="pick-meta">${parts.length} part${parts.length === 1 ? '' : 's'}${typeof pts === 'number' ? ` · ${fmtPts(pts)} pts` : ''}${diffs.length ? ` · ${diffs.length > 1 ? `${diffs[0]}–${diffs[diffs.length - 1]}` : diffs[0]}` : ''}</span></span></label>`;
    }).join('');
  }
  function pickedHTML() {
    const p = store.examPrefs;
    const n = p.picked.length;
    const parts = p.picked.reduce((t, pid) => t + partsOf(pid).length, 0);
    const items = p.picked.map((pid) => {
      const pr = PMAP[pid];
      const where = `${shortExam(pr.exam)} Q${pr.number}`;
      return `<li><span>${esc(pr.title)} <small>${esc(where)}</small></span><button class="unpick" data-action="unpick" data-pid="${pid}" aria-label="Remove ${esc(pr.title)} (${esc(where)})">✕</button></li>`;
    }).join('');
    return `<div class="picked-head"><span><b>${n}</b> question group${n === 1 ? '' : 's'} · <b>${parts}</b> part${parts === 1 ? '' : 's'}</span>
        ${n ? '<button class="link" data-action="pick-clear">Clear selection</button>' : ''}</div>
      ${n ? `<ol class="picked-list">${items}</ol>` : '<p class="hint">Check questions to add them. The exam uses the order you pick them in.</p>'}`;
  }

  function renderExamSetup() {
    const p = store.examPrefs;
    const opt = (name, pref, value, on, title, sub, extra) => `<label class="kind-opt${on ? ' on' : ''}"><input type="radio" id="${name}-${value}" name="${name}" data-xpref="${pref}" value="${value}" ${on ? 'checked' : ''}>
      <span class="kind-txt"><b>${title}</b><small>${sub}</small></span>${extra || ''}</label>`;
    let config;
    if (p.kind === 'full') {
      config = `<div class="kind-list" role="radiogroup" aria-label="Past exam">${Object.values(EXAMS).map((e) => {
        const gs = examGroups(e.id);
        const parts = gs.reduce((t, pid) => t + partsOf(pid).length, 0);
        const pts = gs.reduce((t, pid) => t + (groupPoints(pid) || 0), 0);
        const badge = e.complete ? '<span class="tag tag-ok">Complete</span>' : '<span class="tag tag-warn">Incomplete transcription</span>';
        return opt('exam-id', 'examId', e.id, p.examId === e.id, esc(e.label), `${gs.length} questions · ${parts} parts · ${fmtPts(pts)} points · original order`, badge);
      }).join('')}</div>`;
    } else {
      const avail = TOPICS.filter((t) => Object.keys(PROBLEMS).some((pid) => groupTopics(pid).includes(t.id)));
      if (EXAM_PIDS.some(isGleam)) avail.push({ id: GLEAM_CHIP, name: 'Gleam' }); // after the Python topics
      config = `<div class="chips" role="group" aria-label="Filter by topic">${avail.map((t) =>
        `<button class="chip${t.id === GLEAM_CHIP ? ' chip-lang' : ''}" id="xt-${t.id}" data-action="xtopic" data-id="${t.id}" aria-pressed="${p.topics.includes(t.id)}">${esc(t.name)}</button>`).join('')}        ${p.topics.length ? '<button class="link" data-action="xtopics-clear">Clear filters</button>' : ''}</div>
        <input type="search" id="exam-search" class="pick-search" placeholder="Search by name, exam, or question number" value="${esc(ui.examQuery)}" aria-label="Search questions" autocomplete="off">
        <div class="pick-cols">
          <div class="pick-list" id="pick-list" role="group" aria-label="Questions">${pickListHTML()}</div>
          <div class="picked" id="picked" aria-live="polite">${pickedHTML()}</div>
        </div>
        <p class="hint">Topic filters show questions matching any selected topic. Filtering and searching never change your selection.</p>`;
    }
    const timer = `<div class="timer-config">
        <label><input type="radio" id="exam-timer-off" name="exam-timer" data-xpref="timerOn" value="off" ${p.timerOn ? '' : 'checked'}> Untimed</label>
        <label><input type="radio" id="exam-timer-on" name="exam-timer" data-xpref="timerOn" value="on" ${p.timerOn ? 'checked' : ''}> Countdown</label>
        <label><input type="number" id="exam-min" min="1" max="${EXAM_MAX_MINUTES}" step="1" value="${esc(p.minutes)}" ${p.timerOn ? '' : 'disabled'} aria-label="Minutes (1 to ${EXAM_MAX_MINUTES})"> min</label>
      </div>
      ${examMinutesOk(p) ? `<p class="hint">${EXAM_DEFAULT_MINUTES} minutes is this site's suggested default, <b>not</b> an official time limit (the exams' limits aren't recorded here). Use any whole number from 1 to ${EXAM_MAX_MINUTES}. The timer pauses only when you Save &amp; Leave, and the exam is submitted automatically at 0:00.</p>`
        : `<p class="err" role="alert">Enter a whole number from 1 to ${EXAM_MAX_MINUTES}.</p>`}`;
    return `<section class="setup-card exam-setup" aria-label="Exam setup">
      <div class="step"><h3><span class="step-n">1</span>Exam type</h3><div class="kind-row" role="radiogroup" aria-label="Exam type">
        ${opt('exam-kind', 'kind', 'full', p.kind === 'full', 'Full past exam', 'Every question of one midterm, in its original order')}
        ${opt('exam-kind', 'kind', 'custom', p.kind === 'custom', 'Topic-based exam', 'Pick specific questions, filtered by topic')}</div></div>
      <div class="step"><h3><span class="step-n">2</span>${p.kind === 'full' ? 'Choose an exam' : 'Choose questions'}</h3>${config}</div>
      <div class="step"><h3><span class="step-n">3</span>Timer</h3>${timer}</div>
      <div class="start-row" id="exam-start">${examStartHTML()}</div>
    </section>`;
  }
  function examStartHTML() {
    const p = store.examPrefs;
    const count = p.kind === 'full' ? examGroups(p.examId).length : p.picked.length;
    return `<div class="summary">${count ? `<b>${count}</b> question${count === 1 ? '' : 's'}` : 'No questions selected'} · answers and solutions stay hidden until you submit</div>
      <button class="btn btn-primary btn-lg" data-action="start-exam" ${count && examMinutesOk(p) ? '' : 'disabled'}>Start Exam →</button>`;
  }
  // Selection changed: patch the checkboxes, the selected panel and the Start button in place
  // (a full re-render would reset the list's scroll position).
  function refreshPicker() {
    const picked = store.examPrefs.picked;
    document.querySelectorAll('#pick-list [data-pick]').forEach((cb) => {
      cb.checked = picked.includes(cb.dataset.pick);
      cb.closest('.pick-row').classList.toggle('on', cb.checked);
    });
    const panel = document.getElementById('picked');
    if (panel) panel.innerHTML = pickedHTML();
    const start = document.getElementById('exam-start');
    if (start) start.innerHTML = examStartHTML();
  }

  function scoreText(sc) {
    return sc.auto ? `Auto-graded ${fmtPts(sc.earned)} / ${fmtPts(sc.possible)} pts` : 'No auto-graded points';
  }
  function renderHistory() {
    if (!store.attempts.length) return '';
    const rows = store.attempts.slice().reverse().map((a) => `<button class="result-row hist-row" data-action="open-attempt" data-id="${a.id}">
        <span class="t">${esc(a.title)}<small>${kindLabel(a)} · ${when(a.finishedAt)} · ${fmt(activeMs(a))} spent${a.autoSubmitted ? ' · time ran out' : ''}</small></span>
        <span class="badge ungraded">${scoreText(a.score)}</span></button>`).join('');
    return `<section class="history" aria-label="Exam history"><h2>Exam history</h2><div class="result-list">${rows}</div>
      <p class="hint">Every submitted attempt is kept, including retakes. Click one to see its results and review it.</p></section>`;
  }

  const ICONS = {
    hl:'<path d="M4 15l3 3M5 16l8.5-8.5 3 3L8 19H5z" /><path d="M13.5 7.5l2-2 3 3-2 2" /><path d="M3 21h8" stroke="#e9c400" stroke-width="3"/>',
    pen: '<path d="M4 20l1-4L16 5l3 3L8 19z" /><path d="M14 7l3 3" />',
    eraser: '<path d="M8 20h11" /><path d="M5 15l8-9 6 6-6 7H9z" /><path d="M9 11l6 6" />',
    note: '<path d="M4 4h16v10l-6 6H4z" /><path d="M14 20v-6h6" /><path d="M8 9h8M8 12.5h4" />',
    undo: '<path d="M9 7L5 11l4 4" /><path d="M5 11h9a5 5 0 010 10h-3" />',
    redo: '<path d="M15 7l4 4-4 4" /><path d="M19 11h-9a5 5 0 000 10h3" />',
    clear: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />',
    select: '<path d="M6 3l12 10-5.5 1L16 20l-2.5 1.2-3.3-6L6 19z" />',
    arrow: '<path d="M4 20L20 4" /><path d="M11 4h9v9" />',
    list: '<path d="M2 8h20v8H2zM9 8v8M15 8v8" />',
    del: '<path d="M6 6l12 12M18 6L6 18" />',
    tree: '<circle cx="12" cy="5" r="2.6" /><circle cx="6" cy="18.5" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M10.7 7.4l-3.4 8.7M13.3 7.4l3.4 8.7" />',
    home: '<path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h4.5v-5h3v5H18V9.5" />',
    play: '<rect class="yt-box" x="1.5" y="4.5" width="21" height="15" rx="4.5" /><path class="yt-tri" d="M10 8.6v6.8l5.8-3.4z" />', // YouTube-style play mark (monochrome)
    video: '<rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" />',
    chev: '<path d="M6 9l6 6 6-6" />',
    msg: '<path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" />',
    tour: '<circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" />',
    more: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="18.5" r="1.3" fill="currentColor" />',
  };
  const FEEDBACK_URL = 'https://forms.gle/VqhUJDZj1UNJq3gRA'; // Google Form, opened in a new tab; nothing is collected here
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  // These problems showed their figure here before it moved to the diagram workspace. Saved pen strokes are anchored
  // to a block's index, so an empty block keeps the strokes on the blocks below it in place.
  // A problem's `illustration` (an exam image that is not a diagram to fill in) is shown in that same spot.
  const FIGURE_SLOT = new Set(['fa24-2', 'sp24-2']);
  function renderLeft(g) {
    const pr = PMAP[g.pid];
    const ex = SRC[pr.exam];
    const pts = headerPoints(g.pid, g.ids); // lecture examples have no points
    const topicIds = [...new Set(g.ids.flatMap((id) => QMAP[id].topics))];
    const topics = topicIds.map((t) => `<span class="tag">${esc(topicById(t).name)}</span>`).join('');
    const tool = (k, label, extra) => `<button class="ann-btn" data-ann="${k}" title="${label}" aria-label="${label}" ${extra || ''}>${icon(k)}</button>`;
    const review = isReview(cur());
    const bar = `<div class="annot-bar" id="annot-bar" role="toolbar" aria-label="Annotation tools">
        ${tool('hl', 'Highlighter (select text)', 'aria-pressed="false"')}
        ${tool('pen', 'Red pen', 'aria-pressed="false"')}
        ${tool('eraser', 'Eraser', 'aria-pressed="false"')}
        ${tool('note', 'New sticky note')}
        <span class="ann-sep" aria-hidden="true"></span>
        ${tool('undo', 'Undo')}${tool('redo', 'Redo')}
        ${tool('clear', 'Clear all annotations')}
        ${examActive(cur()) ? examSettingsHTML() : ''}
        <span class="annot-hint" id="annot-hint" aria-live="polite"></span>
      </div>`;
    return `${bar}
      <article class="problem" id="problem-article" data-mode="${ui.annMode}" aria-label="Problem">
        <div class="src"><span>Source: <a href="${esc(ex.url)}" target="_blank" rel="noopener">${esc(ex.label)}</a>, ${esc(qRef(pr))}</span>${topics}${scopeNoteHTML(scopeNote('problems', g.pid))}</div>
        <h2>${ex.kind === 'lecture' ? '' : `${esc(pr.number)}. `}${typeof pts === 'number' ? `<span class="pts">(${pts.toFixed(1)} points)</span>` : ''}${esc(pr.title)}</h2>
        <div class="annot-text" data-annot="intro"></div>
        ${FIGURE_SLOT.has(g.pid) ? '<div hidden></div>' : pr.illustration ? `<figure class="exam-figure"><img src="${esc(pr.illustration.src)}" width="${esc(pr.illustration.width)}" height="${esc(pr.illustration.height)}" alt="${esc(pr.illustration.alt)}" draggable="false"><figcaption>Illustration from the exam PDF</figcaption></figure>` : ''}
        <div class="editor">
          <div class="editor-head">
            <span class="editor-file">${esc(fileName(g.pid))}</span>
            <span class="editor-status" id="editor-status">${editedNotes(g.pid) ? 'Saved in this browser' : review ? 'Submitted version · editable' : 'Editable: type notes or code'}</span>
            <span class="editor-tools"><button class="btn btn-sm ed-btn" id="editor-reset" data-action="reset-code" ${editedNotes(g.pid) ? '' : 'disabled'}
              title="${review ? 'Restore the scratch code exactly as it was when you submitted' : 'Restore the original exam code'}">${review ? 'Reset code to submitted version' : 'Reset code'}</button></span>
          </div>
          <div id="editor-host"></div>
          ${runSlotHTML(g.pid)}
        </div>
        <p class="editor-hint">${review ? 'Your review answers (below) appear in the blanks: <span class="key-fill key-mc">selected choice</span> <span class="key-fill key-typed">typed answer</span>. Edit the code freely; your submitted version is kept. <kbd>Tab</kbd> indents, <kbd>⌘/</kbd> toggles a comment.</p>' : `<span id="fill-hint">${fillHintHTML(autoFillOn(cur()))}</span> Click a blank to jump to its part. You can also type notes or <code>${isGleam(g.pid) ? '//' : '#'}</code> comments anywhere in the code; nothing is run. <kbd>Tab</kbd> indents, <kbd>⌘/</kbd> toggles a comment.</p>`}
        <div class="annot-text" data-annot="outro"></div>
        <svg class="annot-layer" aria-hidden="true"></svg>
      </article>
      ${review ? '<section class="review-work" id="review-work" aria-label="Review workspace"></section>' : ''}`;
  }
  // ── Run Code (Phase 6A): runs the problem's scratch code with Python in the browser (runner.js) ──
  // Phase 6B: when a verified suite exists for the problem (data/test_suites.js), the same click also runs it.
  // Learning feedback only: running never changes answers, grades, scores or attempts, and run output is kept
  // in memory (never saved). Available in Practice and in the editable Review; not during a live exam, which
  // shows no feedback until submission (and real exams have no interpreter).
  // Gleam questions run with gleam_runner.js instead (same API and result shape), with their own tests from
  // data/gleam_questions.js.
  const RUNNER = window.CS61A_RUNNER || null;
  const GLEAM_RUNNER = window.CS61A_GLEAM_RUNNER || null;
  const runnerFor = (pid) => (isGleam(pid) ? GLEAM_RUNNER : RUNNER);
  const langOf = (pid) => (isGleam(pid) ? 'Gleam' : 'Python');
  const runnerAllowed = (s, pid) => !!runnerFor(pid) && !!s && (!isExam(s) || isReview(s));
  const runLimitMs = (pid) => (isGleam(pid) && GL.RUN_LIMITS[pid]) || runnerFor(pid).config.RUN_TIMEOUT_MS;
  const runs = new Map();         // `${session key}:${pid}` -> { id, phase } while running, then the result
  const sessionKeys = new WeakMap(); // session object -> small id (practice sets have no id of their own)
  let runSeq = 0;
  let sessionSeq = 0;
  let runBusy = false;            // one run at a time across the whole app
  function runKey(s, pid) {
    if (!sessionKeys.has(s)) sessionKeys.set(s, `s${++sessionSeq}`);
    return `${sessionKeys.get(s)}:${pid}`;
  }
  // Exactly what the editor shows: its current text, with each blank replaced by the student's current answer
  // (indented like the on-screen widget), or left as ___(a)___ when unanswered, which then fails clearly.
  function runnableCode(pid) {
    const ed = editors[pid];
    if (!ed) return '';
    const text = ed.cm ? ed.cm.getValue() : ed.wrap.querySelector('textarea').value;
    return text.split('\n').map((line) => line.replace(TOKEN_RE, (m, name, col) => {
      const f = blankFill(pid, name);
      return f ? f.text.split('\n').map((l, i) => (i ? ' '.repeat(col) + l : l)).join('\n') : `___(${name})___`;
    })).join('\n');
  }
  // The verified suite for a problem, or null. Only an explicit, verified suite with a verification record and
  // well-formed doctest cases counts; anything else means Console Output only, never a made-up test summary.
  // Gleam problems: their test cases in data/gleam_questions.js, checked by tests/verify_gleam_bank.js; each input
  // is Gleam code (usually one assert).
  function suiteFor(pid) {
    if (isGleam(pid)) {
      const t = GL.TESTS[pid];
      return isObj(t) && Array.isArray(t.cases) && t.cases.length && t.cases.every((c) => isObj(c) && typeof c.input === 'string') ? t : null;
    }
    const reg = window.CS61A_TEST_SUITES;
    const list = isObj(reg) && Array.isArray(reg.suites) ? reg.suites : [];
    return list.find((t) => isObj(t) && t.problem === pid && t.verified === true && isObj(t.verification)
      && (t.setup == null || typeof t.setup === 'string')
      && Array.isArray(t.cases) && t.cases.length > 0
      && t.cases.every((c) => isObj(c) && typeof c.input === 'string' && c.input.includes('>>>'))) || null;
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  function runSlotHTML(pid) {
    if (!runnerAllowed(cur(), pid)) return `<div class="run-slot" id="run-slot-${pid}" data-run-slot="${pid}" hidden></div>`;
    const suite = suiteFor(pid);
    // Python Tutor steps through Python only, so Gleam questions don't offer it.
    const tutor = isGleam(pid) ? '' : `<button class="btn btn-sm" id="tutor-btn" data-action="open-tutor" title="Step through this code in Python Tutor. Opens pythontutor.com in a new tab with the code from the editor.">Python Tutor ↗</button>
        <span class="tutor-msg" id="tutor-msg" role="status" aria-live="polite" hidden></span>`;
    return `<div class="run-slot" id="run-slot-${pid}" data-run-slot="${pid}" data-lang="${langOf(pid).toLowerCase()}">
      <div class="run-bar">
        <button class="btn btn-sm btn-run" id="run-btn" data-action="run-code" title="${suite ? 'Run this code and its verified tests' : `Run this code with ${langOf(pid)} in your browser`}">▶ Run Code</button>
        ${tutor}
        ${suite ? `<span class="run-suite" id="run-suite">Includes ${plural(suite.cases.length, 'verified test')}</span>` : ''}
        <span class="run-status" id="run-status" role="status" aria-live="polite"></span>
      </div>
      <div class="run-console" id="run-console" hidden></div>
    </div>`;
  }
  // Composing Programs' Python Tutor reads its starting code from the URL hash. Frames of exited functions stay
  // visible (cumulative), like the diagrams on the exams.
  function openTutor(pid) {
    const empty = emptyBlanks(pid);
    if (empty.length) {
      const msg = document.getElementById('tutor-msg');
      msg.textContent = tutorNeeds(pid, empty);
      msg.hidden = false;
      return;
    }
    const code = window.CS61A_TUTOR.build(pid, runnableCode(pid), window.CS61A_BANK, window.CS61A_TEST_SUITES);
    window.open(`https://pythontutor.com/cp/composingprograms.html#code=${encodeURIComponent(code)}&cumulative=true&curInstr=0&mode=edit&py=3`, '_blank', 'noopener');
  }
  // Console Output for one run, then Test Results when the problem has a verified suite.
  // r.lang and r.limitMs are recorded by runCode (which language ran, and its time limit).
  function runOutputHTML(r) {
    return consoleHTML(r) + (r.tests ? testsHTML(r.tests, r) : '');
  }
  function consoleHTML(r) {
    const lang = r.lang || 'Python';
    if (r.status === 'timeout') {
      return `<p class="run-msg">Stopped after ${Math.round(r.limitMs / 1000)} seconds: the code may have an infinite loop or very slow recursion. ${lang} was restarted, so you can run again.</p>`;
    }
    if (r.status === 'load-error') {
      return lang === 'Gleam'
        ? '<p class="run-msg">Couldn’t load the Gleam compiler in your browser. Reload the page and press Run Code to try again.</p>'
        : '<p class="run-msg">Couldn’t load Python in your browser. Check your internet connection (the runtime is downloaded the first time) and press Run Code to try again.</p>';
    }
    if (r.status === 'crash') return `<p class="run-msg">${lang} stopped unexpectedly (for example, recursion too deep for the browser). It has been restarted; you can run again.</p>`;
    const out = r.stdout ? `<pre class="run-out" tabindex="0" aria-label="Program output">${esc(r.stdout)}</pre>` : '<p class="run-empty">No output</p>';
    const trunc = r.truncated ? `<p class="run-msg">Output was cut off after ${RUNNER.config.OUTPUT_LIMIT.toLocaleString()} characters.</p>` : '';
    const err = r.error ? `<pre class="run-err" tabindex="0" aria-label="Error">${esc(r.error)}</pre>` : '';
    return `<div class="run-label">Console Output</div>${out}${trunc}${err}`;
  }
  // PrairieLearn-style results: a summary with the actual counts, then one expandable panel per case.
  // Cases that did not run are shown as "Not run", never counted as passed. No points or percentages.
  const CASE_STATE = {
    passed: ['✓', 'Passed'], failed: ['✗', 'Failed'], error: ['✗', 'Error'],
    timeout: ['✗', 'Timed out'], 'not-run': ['–', 'Not run'],
  };
  const NOT_RUN_WHY = (lang, gleam) => ({
    error: gleam ? 'Tests did not run because your code doesn’t compile (see Console Output above). Fix it and run again.'
      : 'Tests did not run because your code raised an error (see Console Output above). Fix it and run again.',
    timeout: 'Tests did not run because your code timed out.',
    crash: `Tests did not run because ${lang} stopped unexpectedly.`,
    'load-error': `Tests did not run because ${lang} could not be loaded.`,
    stopped: `${lang} was restarted after a case timed out, so the remaining cases did not run.`,
  });
  // Where a case comes from: Python suites say exam / added; Gleam ones given (printed with the question) / added.
  const CASE_ORIGIN = { exam: 'From the exam', given: 'From the question', added: 'Added' };
  function testsHTML(t, r) {
    const lang = (r && r.lang) || 'Python';
    const limitMs = (r && r.limitMs) || RUNNER.config.RUN_TIMEOUT_MS;
    const ran = t.total - t.notRun;
    const all = t.passed === t.total;
    const summary = ran === 0 ? 'Tests not run'
      : `Passed ${t.passed}/${plural(t.total, 'test')}${all ? '!' : ''}${t.notRun ? ` · ${t.notRun} not run` : ''}`;
    const whyText = t.reason && NOT_RUN_WHY(lang, lang === 'Gleam')[t.reason];
    const why = whyText ? `<p class="run-msg">${whyText}</p>` : '';
    const block = (label, text, cls) => `<div class="case-k">${label}</div><pre class="case-v${cls ? ` ${cls}` : ''}">${esc(text)}</pre>`;
    const trim = (x) => String(x || '').replace(/\n$/, '');
    const cases = t.cases.map((c, i) => {
      const [mark, word] = CASE_STATE[c.status] || CASE_STATE['not-run'];
      let body;
      if (c.status === 'not-run') body = block('Input', c.input);
      else if (c.status === 'timeout') body = `${block('Input', c.input)}<p class="run-msg">Stopped after ${Math.round(limitMs / 1000)} seconds: this case may cause an infinite loop.</p>`;
      else if (!c.examples.length) body = `${block('Input', c.input)}${c.error ? block('Error', c.error, 'run-err') : ''}`;
      else {
        body = c.examples.map((x) => `<div class="case-ex${x.ok ? '' : ' case-ex-bad'}">
          ${block('Input', x.source.replace(/\n$/, '').split('\n').map((l, j) => (j ? '... ' : '>>> ') + l).join('\n'))}
          ${block('Expected', trim(x.want) || '(no output)')}
          ${block('Actual', trim(x.got) || (x.error ? '(raised an error)' : '(no output)'), x.ok ? '' : 'case-bad')}
          ${x.truncated ? '<p class="run-msg">Output was cut off.</p>' : ''}
          ${x.error ? block('Error', x.error, 'run-err') : ''}
        </div>`).join('');
      }
      return `<details class="case st-case-${c.status}" data-case="${i}">
        <summary><span class="case-mark" aria-hidden="true">${mark}</span> ${esc(c.name)}${c.origin && CASE_ORIGIN[c.origin] ? ` <span class="case-origin">${CASE_ORIGIN[c.origin]}</span>` : ''} <span class="case-state">${word}</span></summary>
        <div class="case-body">${body}</div>
      </details>`;
    }).join('');
    return `<div class="run-tests" id="run-tests">
      <div class="run-label">Test Results</div>
      <p class="tests-summary ${ran && all ? 'tests-all' : 'tests-some'}" id="tests-summary">${summary}</p>
      ${why}
      <div class="cases">${cases}</div>
      ${t.setupNote ? `<p class="tests-note">${esc(t.setupNote)}</p>` : ''}
      <p class="tests-note">Verified tests for this question. Practice feedback only: running them never changes your answers or scores.</p>
    </div>`;
  }
  const RUN_STATUS = {
    loading: 'Loading Python… (the first run downloads it; this can take a few seconds)',
    running: 'Running…',
    testing: 'Running tests…',
    ok: 'Completed',
    error: 'Error',
    timeout: 'Timed out',
    'load-error': 'Couldn’t load Python',
    crash: 'Python restarted',
  };
  const GLEAM_STATUS = Object.assign({}, RUN_STATUS, {
    loading: 'Loading the Gleam compiler… (the first run takes a few seconds)',
    running: 'Compiling and running…',
    'load-error': 'Couldn’t load Gleam',
    crash: 'Gleam restarted',
  });
  const runStatus = (pid) => (isGleam(pid) ? GLEAM_STATUS : RUN_STATUS);
  // Refresh the run bar + console for the problem on screen, from the result stored for *this* session and problem.
  function renderRunPanel() {
    const slot = leftPid && document.getElementById(`run-slot-${leftPid}`);
    if (!slot || slot.hidden) return;
    const r = runs.get(runKey(cur(), leftPid));
    const btn = slot.querySelector('#run-btn');
    const status = slot.querySelector('#run-status');
    const box = slot.querySelector('#run-console');
    const mine = r && r.phase; // this workspace's run is in progress
    btn.disabled = runBusy;
    btn.setAttribute('aria-busy', String(!!mine));
    btn.title = runBusy && !mine ? 'Another run is still in progress' : `Run this code with ${langOf(leftPid)} in your browser`;
    const progress = mine && r.phase === 'testing' && r.progress ? ` (${r.progress.done + 1}/${r.progress.total})` : '';
    const st = runStatus(leftPid);
    const text = !r ? '' : mine ? st[r.phase] + progress : `${st[r.status]}${r.status === 'ok' || r.status === 'error' ? ` · ${r.ms} ms` : ''}`;
    status.textContent = text;
    status.className = `run-status${r && !mine ? ` st-${r.status}` : ''}`;
    box.hidden = !r || !!mine;
    box.innerHTML = r && !mine ? runOutputHTML(r) : '';
  }
  async function runCode() {
    const s = cur();
    const pid = leftPid;
    if (!pid || !runnerAllowed(s, pid) || runBusy) return;
    const runner = runnerFor(pid);
    const key = runKey(s, pid);
    const code = runnableCode(pid); // read now: later edits belong to the next run
    const suite = suiteFor(pid);
    const tests = suite && {
      setup: suite.setup || '',
      cases: suite.cases.map((c) => ({ name: typeof c.name === 'string' ? c.name : '', origin: CASE_ORIGIN[c.origin] ? c.origin : null, input: c.input })),
    };
    const limitMs = runLimitMs(pid);
    const id = ++runSeq;
    runBusy = true;
    runs.set(key, { id, phase: runner.ready ? 'running' : 'loading' });
    renderRunPanel();
    const result = await runner.run(code, {
      tests,
      files: isGleam(pid) ? GL.FILES[pid] : undefined, // a Gleam problem's own JavaScript (@external) files
      timeoutMs: isGleam(pid) ? limitMs : undefined,
      onPhase: (phase, progress) => { const r = runs.get(key); if (r && r.id === id && r.phase) { r.phase = phase; r.progress = progress; renderRunPanel(); } },
    });
    runBusy = false;
    if (result.tests && suite && typeof suite.setupNote === 'string') result.tests.setupNote = suite.setupNote;
    if (runs.get(key) && runs.get(key).id === id) runs.set(key, Object.assign({ id, lang: langOf(pid), limitMs }, result));
    renderRunPanel(); // shows the result only if this question is still on screen; otherwise it waits for it
    const t = result.tests;
    const testsSaid = !t ? '' : t.total - t.notRun ? ` Passed ${t.passed} of ${plural(t.total, 'test')}.` : ' Tests not run.';
    if (runKey(cur(), leftPid) === key) announce(`Run finished: ${runStatus(pid)[result.status]}.${testsSaid}`);
  }
  // Build the left pane for a group. Runs only when the group changes, so annotations, the editor,
  // the text selection and the scroll position are never wiped by ordinary re-renders.
  function buildLeft(g) {
    const pane = document.getElementById('pane-left');
    flushNoteEdit(); // typing in a note of the question being left
    noteDrag = null;
    itemDrag = null;
    noteInk = null;
    detachEditors();
    if (leftObserver) leftObserver.disconnect();
    pane.innerHTML = renderLeft(g);
    pane.scrollTop = 0;
    leftPid = g.pid;
    mountEditor(g.pid);
    renderProse(g.pid, 'intro');
    renderProse(g.pid, 'outro');
    layoutStrokes();
    renderNotes();
    wireNotes();
    buildDiagram(g);
    const art = article();
    const svg = art.querySelector('.annot-layer');
    svg.addEventListener('pointerdown', onOverlayDown);
    svg.addEventListener('pointermove', onOverlayMove);
    svg.addEventListener('pointerup', onOverlayUp);
    svg.addEventListener('pointercancel', onOverlayUp);
    leftObserver = new ResizeObserver(() => layoutStrokes()); // keep strokes on their blocks when layout shifts
    leftObserver.observe(art);
    blocks(art).forEach((b) => leftObserver.observe(b));
    updateToolbar();
    renderRunPanel();
  }

  function renderChoices(q, s) {
    const a = s.answers[q.id];
    const key = ANSWER_KEY[q.id];
    const revealed = !isExam(s) && !!s.revealed[q.id]; // exams (and review workspaces) never show grading here
    const checked = !isExam(s) && s.checked[q.id];
    const multi = q.type === 'multi_select';
    const correctSet = new Set(multi ? key.correct : [key.correct]);
    const elim = eliminated(s, q.id);
    const items = q.choices.map((c, i) => {
      const selected = multi ? (a || []).includes(i) : a === i;
      const out = elim.includes(i);
      let cls = '';
      if (revealed) {
        if (correctSet.has(i)) cls = selected || !multi ? 'correct' : 'missed';
        else if (selected) cls = 'wrong';
      } else if (checked && selected && !multi) {
        cls = correctSet.has(i) ? 'correct' : 'wrong';
      }
      const id = `c-${q.id}-${i}`;
      // The eliminate button sits beside the label (not inside it), so clicking it never selects the choice.
      const elimBtn = `<button type="button" class="elim-btn${out ? ' undo' : ''}" id="x-${q.id}-${i}" data-action="eliminate" data-i="${i}"
          aria-label="${out ? 'Undo elimination of' : 'Eliminate'} option ${letter(i)}" title="${out ? 'Undo elimination' : `Eliminate option ${letter(i)}`}">${out ? 'Undo' : `<span class="elim-mark" aria-hidden="true">${letter(i)}</span>`}</button>`;
      return `<li><label class="choice ${cls}${out ? ' eliminated' : ''}" for="${id}">
        <input type="${multi ? 'checkbox' : 'radio'}" id="${id}" name="${q.id}" value="${i}" data-qid="${q.id}" ${selected ? 'checked' : ''} ${revealed ? 'disabled' : ''}>
        <span class="txt">${esc(c)}</span>${out ? '<span class="sr-only"> (eliminated)</span>' : ''}</label>${elimBtn}</li>`;
    }).join('');
    return `<ul class="choices ${q.mono ? 'mono' : ''}" role="${multi ? 'group' : 'radiogroup'}" aria-label="Answer choices for part ${esc(q.label)}">${items}</ul>`;
  }

  function officialAnswerHTML(q) {
    const key = ANSWER_KEY[q.id];
    if (!key) return '<p>Solution not yet available.</p>';
    let ans;
    if (isMC(q)) ans = (Array.isArray(key.correct) ? key.correct : [key.correct]).map((i) => q.choices[i]).join('\n');
    else if (key.accepted && key.accepted.length) ans = key.accepted[0];
    else return '<p>Solution not yet available.</p>';
    const alts = !isMC(q) && key.accepted.length > 1
      ? `<div class="alts">Also accepted: ${key.accepted.slice(1).map((x) => `<code>${esc(x)}</code>`).join(', ')}</div>` : '';
    const expl = key.explanation
      ? `<div class="expl-label">Explanation <span>written for this site, not official</span></div><div class="rich">${rich(key.explanation)}</div>`
      : '<div class="alts">Explanation not yet available.</div>';
    return `<div class="title">Official answer</div><pre>${esc(ans)}</pre>${alts}${expl}`;
  }

  function renderFeedback(q, s) {
    const id = q.id;
    const parts = [];
    const checked = s.checked[id];
    if (checked && !s.revealed[id]) {
      if (checked === 'correct') parts.push(`<div class="feedback good" role="status"><div class="title">Correct!</div>${isMC(q) ? 'Nice work.' : 'Your answer matches the official answer.'}</div>`);
      else if (checked === 'incorrect') parts.push('<div class="feedback bad" role="status"><div class="title">Not quite.</div>Change your answer and check again, or show the solution.</div>');
      else parts.push('<div class="feedback info" role="status"><div class="title">Not an exact match</div>Your answer doesn’t match the official answer word for word. Equivalent code can still be correct, so show the solution and grade it yourself.</div>');
    }
    if (s.revealed[id]) {
      const needsSelf = !isMC(q) && !(q.type === 'short_answer' && matchesOfficial(q, s.answers[id])) && hasAnswer(s, id);
      const sg = s.selfGrade[id];
      const self = needsSelf ? `<div class="selfgrade"><span>Compare with your answer. How did you do?</span>
          <button class="btn btn-sm ${sg === 'correct' ? 'chosen' : ''}" data-action="self" data-v="correct" aria-pressed="${sg === 'correct'}">I got it right</button>
          <button class="btn btn-sm ${sg === 'incorrect' ? 'chosen' : ''}" data-action="self" data-v="incorrect" aria-pressed="${sg === 'incorrect'}">I got it wrong</button></div>` : '';
      const verdict = hasAnswer(s, id) && (isMC(q) || (q.type === 'short_answer' && matchesOfficial(q, s.answers[id])))
        ? (statusOf(s, id) === 'correct' ? ' good' : ' bad') : ' info';
      parts.push(`<div class="feedback${verdict}">${officialAnswerHTML(q)}${self}</div>`);
    }
    return parts.join('');
  }

  // ── Review (right pane): submitted answer, current review answer, official answer ──
  const STATUS_LABEL = { correct: 'Correct', incorrect: 'Incorrect', skipped: 'Unanswered', staff: 'Graded by Course Staff' };
  const badgeCls = (st) => (st === 'skipped' ? 'skipped' : st === 'staff' ? 'ungraded' : st);
  function sameAnswer(x, y) {
    const blank = (v) => v === undefined || v === null || (Array.isArray(v) ? !v.length : String(v).trim() === '');
    if (blank(x) || blank(y)) return blank(x) && blank(y);
    return JSON.stringify(x) === JSON.stringify(y);
  }
  // A submitted choice answer, drawn without inputs (so it can't clash with the editable copy on the left).
  function submittedChoicesHTML(q, a) {
    const key = ANSWER_KEY[q.id];
    const multi = q.type === 'multi_select';
    const correctSet = new Set(multi ? key.correct : [key.correct]);
    const ans = a.answers[q.id];
    return `<ul class="choices static ${q.mono ? 'mono' : ''}" aria-label="Submitted answer for part ${esc(q.label)}">${q.choices.map((c, i) => {
      const sel = multi ? (ans || []).includes(i) : ans === i;
      const cls = correctSet.has(i) ? (sel || !multi ? 'correct' : 'missed') : sel ? 'wrong' : '';
      return `<li><span class="choice ${cls}"><span class="bubble ${multi ? 'box' : ''}${sel ? ' on' : ''}" aria-hidden="true"></span><span class="txt">${esc(c)}</span>${sel ? '<span class="sr-only"> (your choice)</span>' : ''}</span></li>`;
    }).join('')}</ul>`;
  }
  function answerText(q, v) {
    if (isMC(q)) {
      const picks = q.type === 'multi_select' ? (v || []) : Number.isInteger(v) ? [v] : [];
      return picks.length ? picks.map((i) => `${letter(i)}. ${q.choices[i]}`).join('\n') : '';
    }
    return v ? String(v) : '';
  }
  function renderReviewPanel(q, a, w) {
    const st = statusIn(a, q.id);
    const pts = hasPoints(q) ? `${fmtPts(q.points)} pt` : 'points not published';
    const sub = isMC(q) ? submittedChoicesHTML(q, a)
      : hasAnswer(a, q.id) ? `<pre class="rv-pre">${esc(a.answers[q.id])}</pre>` : '<p class="rv-none">No answer submitted.</p>';
    const changed = !sameAnswer(w.answers[q.id], a.answers[q.id]);
    const now = answerText(q, w.answers[q.id]);
    // Learning feedback on the review answer only; it never changes the stored grade.
    const match = changed && now && autoGradable(q) ? (examStatus(w, q.id) === 'correct' ? ' · matches the official answer' : ' · doesn’t match the official answer') : '';
    const current = changed
      ? `<div class="rv-block rv-current"><div class="rv-k">Current review answer <span>(not scored${match})</span></div>
          ${now ? `<pre class="rv-pre">${esc(now)}</pre>` : '<p class="rv-none">Cleared.</p>'}
          <button class="btn btn-sm" data-action="reset-answer" data-q="${q.id}">Reset to submitted answer</button></div>`
      : '<p class="rv-same">Your review answer is the same as what you submitted.</p>';
    const verdict = {
      correct: '<div class="verdict">✓ Correct</div>',
      incorrect: '<div class="verdict">✗ Incorrect</div>',
      skipped: '<div class="verdict">Unanswered</div>',
      staff: '<div class="verdict">Graded by Course Staff</div><p class="staff-note">This question requires manual grading and will not be graded on this platform.</p>',
    }[st];
    return `<div class="rv-part" id="rv-${q.id}">
      <p class="q-head"><span class="lbl">${esc(q.label)}</span>${inline(q.prompt)}
        <span class="part-meta">${pts} · <span class="badge ${badgeCls(st)}">${STATUS_LABEL[st]}</span></span></p>
      <div class="rv-block"><div class="rv-k">Your submitted answer</div>${sub}</div>
      ${current}
      <div class="feedback ${{ correct: 'good', incorrect: 'bad', skipped: 'info', staff: 'info' }[st]}">${verdict}${officialAnswerHTML(q)}</div>
    </div>`;
  }
  function renderReviewRight(g, w) {
    const a = attemptById(w.reviewOf);
    return `<section class="question review-right" aria-label="Question ${w.index + 1}: submitted and official answers">
      <div class="q-bar"><span class="q-num">${w.index + 1}</span><span class="rv-title">Submitted &amp; official answers</span>
        <span class="qtype">${g.ids.length > 1 ? `${g.ids.length} parts` : TYPE_LABEL[QMAP[g.ids[0]].type]}</span></div>
      ${g.ids.map((id) => renderReviewPanel(QMAP[id], a, w)).join('<hr class="part-sep">')}
    </section>`;
  }
  // The editable copy (left pane, under the problem): the normal part renderer, without feedback.
  function renderReviewWork(g, w) {
    return `<div class="rw-head"><h3>Your review workspace</h3>
        <p class="hint">Try the question again here. Changes are saved separately; your submitted answers and score don’t change.</p></div>
      ${g.ids.map((id) => renderPart(QMAP[id], w)).join('<hr class="part-sep">')}`;
  }

  function renderPart(q, s) {
    const id = q.id;
    const exam = isExam(s);
    const revealed = !exam && !!s.revealed[id];
    const pts = q.points === null || q.points === undefined ? '' : `<span class="pts">(${q.points.toFixed(1)} pt)</span>`;
    let response;
    if (isMC(q)) {
      response = renderChoices(q, s);
    } else {
      response = `<div class="answer-box ${q.type === 'code' ? 'code' : ''}"><textarea id="ta-${id}" data-qid="${id}" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Your answer for part ${esc(q.label)}" ${revealed ? 'readonly' : ''} placeholder="${q.type === 'code' ? 'Write your code here…' : 'Type your answer…'}">${esc(s.answers[id] || '')}</textarea></div>
        ${exam ? (q.type === 'code' && !isReview(s) ? '<p class="selfcheck-note">Code responses are saved with your exam. They are not graded on this platform.</p>' : '')
          : q.type === 'code' ? '<p class="selfcheck-note">Self-check: code responses are saved but not auto-graded. Show the solution to compare.</p>' : '<p class="selfcheck-note">Checked against the official answer, ignoring spaces and quote style.</p>'}`;
    }
    const confirming = ui.confirmReveal === id;
    const canCheck = q.type !== 'code' && !revealed;
    // Exams never offer Check Answer / Show Solution; feedback exists only in practice and in post-submit review.
    const actions = exam ? '' : `<div class="q-actions">
      ${canCheck ? `<button class="btn btn-primary" data-action="check" ${hasAnswer(s, id) ? '' : 'disabled'}>Check Answer</button>` : ''}
      ${revealed ? '' : confirming
        ? `<span style="align-self:center">Reveal the answer?</span><button class="btn" data-action="reveal-yes" id="reveal-yes-${id}">Yes, show it</button><button class="btn btn-ghost" data-action="reveal-no">Cancel</button>`
        : '<button class="btn" data-action="reveal">Show Solution</button>'}
    </div>`;
    return `<div class="part${ui.activeBlank && ui.activeBlank === q.blank ? ' active' : ''}" id="part-${id}" data-part="${id}" data-blank="${esc(q.blank || '')}">
      <p class="q-head"><span class="lbl">${esc(q.label)}</span>${pts}${inline(q.prompt)}
        <span class="part-meta">${exam && q.type === 'code' ? 'Code response' : TYPE_LABEL[q.type]} · <span class="diff-${q.difficulty}">${q.difficulty}</span></span></p>
      ${scopeNoteHTML(scopeNote('questions', id))}
      ${response}
      ${actions}
      ${exam ? '' : renderFeedback(q, s)}
    </div>`;
  }

  function renderRight(g, s) {
    const marked = !!s.marked[g.pid];
    const done = g.ids.filter((id) => hasAnswer(s, id)).length;
    return `<section class="question" aria-label="Question ${s.index + 1}">
      <div class="q-bar"><span class="q-num">${s.index + 1}</span>
        ${isReview(s) ? '' : `<button class="mark-btn" data-action="mark" aria-pressed="${marked}" title="Mark for review (M)">
          <svg viewBox="0 0 16 20" aria-hidden="true"><path d="M2 1.5h12v17l-6-4.5-6 4.5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          ${marked ? 'Marked for Review' : 'Mark for Review'}</button>`}
        <span class="qtype">${g.ids.length > 1 ? `${g.ids.length} parts · ${done} answered` : TYPE_LABEL[QMAP[g.ids[0]].type]}</span></div>
      ${g.ids.map((id) => renderPart(QMAP[id], s)).join('<hr class="part-sep">')}
    </section>`;
  }

  // Completion of a question group, derived from saved answers only (never from checking or grading).
  function groupStatus(s, g) {
    const n = g.ids.filter((id) => hasAnswer(s, id)).length;
    return { n, status: n === g.ids.length ? 'answered' : n ? 'partial' : 'unanswered' };
  }
  // One tile per problem group. Tiles navigate by problem id, not by visible number.
  // showChecks adds the ✓/✗ from Check Answer; a mode without checking (e.g. an exam) passes false.
  function renderNavigator(s, showChecks = true) {
    const cells = s.groups.map((g, i) => {
      const { n, status } = groupStatus(s, g);
      const cls = ['nav-cell', status];
      if (i === s.index) cls.push('current');
      if (s.marked[g.pid]) cls.push('marked');
      if (showChecks && g.ids.every((id) => s.checked[id] === 'correct')) cls.push('good');
      else if (showChecks && g.ids.some((id) => s.checked[id] === 'incorrect')) cls.push('bad');
      const state = [status === 'partial' ? `${n} of ${g.ids.length} parts answered` : status, s.marked[g.pid] ? 'marked for review' : '', i === s.index ? 'current question' : ''].filter(Boolean).join(', ');
      return `<button class="${cls.join(' ')}" id="nav-${g.pid}" data-action="goto" data-pid="${g.pid}" aria-label="Question ${i + 1}, ${state}" ${i === s.index ? 'aria-current="step"' : ''}>${i + 1}</button>`;
    }).join('');
    return `<div class="navigator" id="navigator" role="dialog" aria-labelledby="nav-title">
      <div class="nav-head"><h4 id="nav-title">Question Navigator</h4>
        <button class="nav-close" data-action="toggle-nav" aria-label="Close question navigator">✕</button></div>
      <p class="nav-sub">${esc(s.title)}</p>
      <div class="legend"><span><span class="sw cur"></span>Current</span><span><span class="sw"></span>Unanswered</span><span><span class="sw part"></span>Partly answered</span><span><span class="sw ans"></span>Answered</span><span><span class="sw mk"></span>For Review</span></div>
      <div class="nav-grid">${cells}</div>
      ${isReview(s) ? '' : `<div class="go-review">${isExam(s) ? '<button class="btn" data-action="submit-exam">Submit Exam</button>' : '<button class="btn" data-action="finish">Go to Review Page</button>'}</div>`}
    </div>`;
  }

  // Toolbar icons with their names and what they do, for the tour (tour.js).
  const ANN_TOOLS = [
    ['hl', 'Highlighter', 'Select text or code to highlight what matters.'],
    ['pen', 'Red pen', 'Draw or write on the problem.'],
    ['eraser', 'Eraser', 'Click or drag over a mark to remove it.'],
    ['note', 'Sticky note', 'A note appears in the middle of the page, ready to type; its own toolbar can highlight, draw and add a tree. Drag its top bar to move it, its corner to resize it, and – to tuck it into the bottom bar.'],
    ['undo', 'Undo', 'Take back your last change.'],
    ['redo', 'Redo', 'Bring back what you undid.'],
    ['clear', 'Clear', 'Remove every mark on this question.'],
  ];
  const DG_TOOLS = [
    ['select', 'Type & move', 'Click anywhere to add a value and type it. Drag things to move them.'],
    ['pen', 'Red pen', 'Draw on the diagram.'],
    ['eraser', 'Eraser', 'Click or drag over a mark to remove it.'],
    ['list', 'New list', 'Click where a list should go. + and − add or remove cells.'],
    ['arrow', 'Arrow', 'Click a value or cell, then click what it points to.'],
    ['undo', 'Undo / Redo', 'Take back a change, or bring it back.'],
    ['del', 'Delete selected', 'Remove the value, list or arrow you selected.'],
    ['clear', 'Clear', 'Remove everything you added to this diagram.'],
  ];
  const toolKey = (tools) => `<ul class="tool-key">${tools.map(([k, name, use]) => `<li><span class="tool-key-icon">${icon(k)}</span><span><b>${name}</b>: ${use}</span></li>`).join('')}</ul>`;
  function headerHTML(s) {
    const t = s.timer;
    const exam = isExam(s);
    let timer;
    if (isReview(s)) { const at = attemptById(s.reviewOf); timer = `<div class="timer"><span class="hint">Submitted ${esc(when(at.finishedAt))}</span></div>`; }
    else if (t) {
      const left = timeLeft(t);
      // Exams can't be paused or reset here; only Save & Leave pauses the clock.
      const ctl = exam ? '' : `${t.expired ? '' : `<button class="btn btn-sm" data-action="${t.runningSince ? 'pause' : 'resume-timer'}">${t.runningSince ? 'Pause' : 'Resume'}</button>`}
          <button class="btn btn-sm opt" data-action="reset-timer" title="Reset to ${t.durationMs / 60000}:00">Reset</button>`;
      timer = `<div class="timer" aria-label="Timer">
        <span id="clock" class="clock ${left <= 60000 ? 'low' : ''} ${ui.hideClock ? 'hidden-clock' : ''}" role="timer" aria-live="off">${fmt(left)}</span>
        <span class="tctl">${ctl}
          <button class="btn btn-sm btn-ghost${exam ? '' : ' opt'}" data-action="hide-clock">${ui.hideClock ? 'Show' : 'Hide'}</button>
        </span></div>`;
    } else timer = `<div class="timer"><span class="hint">${exam ? 'Untimed' : 'Timer off'}</span></div>`;
    const directions = isReview(s) ? `<p>This is your review workspace for a submitted exam. The left side has the question and an editable copy of your answers; the right side shows what you submitted, the official answer and an explanation.</p>
        <p>Edits are saved in this browser and kept separate from the submission. <b>Reset to submitted answer</b> (per part) and <b>Reset code to submitted version</b> undo them.</p>`
      : exam ? `<p>Answer every part; nothing is graded until you <b>Submit Exam</b>, and no answers or solutions are shown before then. You can eliminate choices, mark questions for review, and jump between questions with the navigator.</p>
        <p><b>Save &amp; Leave</b> pauses the timer and keeps everything (answers, scratch code, annotations, eliminations, marks) for later.${t ? ' When the timer reaches 0:00 the exam is submitted automatically.' : ''}</p>`
      : '<p>All parts of a question are shown together on the right. Your answers fill the matching blanks in the code on the left. Use <b>Check Answer</b> to grade a part, or <b>Show Solution</b> to see the official answer.</p>';
    // Directions sits next to the title, not at the end of the set name: a long name (many topics) is cut off with
    // an ellipsis and would hide the button.
    return `<div class="left"><div class="brand-row"><span class="brand">${exam ? 'CS 61A &amp; C88C Exam' : 'CS 61A &amp; C88C Practice'}</span><button class="directions-btn" data-action="directions" aria-expanded="${ui.dirOpen}">Directions ▾</button></div>
        <div class="set-name">${exam ? `<span class="mode-tag">${isReview(s) ? 'Review' : 'Exam'}</span> · ` : ''}${esc(s.title)}</div></div>
      <div class="center"><span class="progress">Q ${s.index + 1} / ${s.groups.length}</span></div>
      ${timer}
      ${ui.dirOpen ? `<div class="directions" role="dialog" aria-label="Directions"><p style="margin-top:0">${esc(BUBBLE_NOTE)}</p>${directions}<p>Annotate the problem with the toolbar on the left: highlighter, red pen, eraser, undo/redo.</p><p style="margin-bottom:0">Keyboard: <code>←</code>/<code>→</code> previous/next question, <code>M</code> mark for review, <code>Esc</code> closes the question navigator.</p></div>` : ''}`;
  }
  function bannerHTML(s) {
    if (isReview(s)) return `<div class="review-banner" role="note"><span>Review workspace: edit answers and code freely. Your submitted answers and score stay as they were.</span><span class="banner-actions"><button class="btn btn-sm" data-action="exam-results">Back to results</button><button class="btn btn-sm btn-home" data-action="go-home">${icon('home')}Go to Home</button></span></div>`;
    if (isExam(s)) return '';
    return s.timer && s.timer.expired
      ? `<div class="expired-banner" role="alert"><span>⏰ Time’s up. Your answers are saved, so you can keep reviewing or finish.</span><button class="btn btn-sm" data-action="finish">Finish set</button></div>` : '';
  }
  function footerHTML(s) {
    const isLast = s.index === s.groups.length - 1;
    const exam = isExam(s);
    const review = isReview(s);
    // Exams: Next stops at the last question; only Submit Exam ends the attempt.
    const right = exam
      ? `<button class="btn btn-primary" data-action="prev" ${s.index === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn btn-primary" data-action="next" ${isLast ? 'disabled' : ''}>Next</button>
        ${review ? '' : '<button class="btn btn-submit" data-action="submit-exam">Submit Exam</button>'}`
      : `<button class="btn btn-primary" data-action="prev" ${s.index === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn btn-primary" data-action="${isLast ? 'finish' : 'next'}">${isLast ? 'Finish' : 'Next'}</button>`;
    const left = review ? '<button class="btn btn-ghost" data-action="exam-results">← Results</button>'
      : exam ? '<button class="btn" data-action="save-leave">Save &amp; Leave</button>'
      : '<button class="btn btn-ghost" data-action="home">← Exit</button>';
    return `<div class="left">${left}<div class="note-dock" id="note-dock" role="toolbar" aria-label="Minimized notes">${dockButtons()}</div></div>
      <div class="center"><button class="nav-toggle" id="nav-toggle" data-action="toggle-nav" aria-expanded="${ui.navOpen}" aria-haspopup="dialog"${ui.navOpen ? ' aria-controls="navigator"' : ''}>Question ${s.index + 1} of ${s.groups.length} <span aria-hidden="true">${ui.navOpen ? '▾' : '▴'}</span></button></div>
      <div class="right">${right}</div>
      ${ui.navOpen ? renderNavigator(s, !exam) : ''}`;
  }
  function renderPracticeShell(s) {
    return `<div class="practice" data-view="${ui.view}">
      <header class="p-header" id="p-header">${headerHTML(s)}</header>
      <div class="rule" aria-hidden="true"></div>
      <div id="p-banner">${bannerHTML(s)}</div>
      <div class="p-main">
        <div class="pane pane-left" id="pane-left"></div>
        <div class="pane pane-right" id="pane-right"><div id="diagram-slot"></div><div id="right-body"></div></div>
        <div class="note-layer" id="note-layer"></div>
      </div>
      <footer class="p-footer${isExam(s) ? ' exam' : ''}" id="p-footer">${footerHTML(s)}</footer>
    </div>`;
  }

  // ── Walkthrough videos (data/walkthroughs.js): one YouTube playlist per past exam, found from a question's own
  // exam (PMAP[pid].exam), never from its position. Only on Practice Summary and Exam Results, never mid-exam.
  function playlistFor(examId) {
    const w = window.CS61A_WALKTHROUGHS;
    return w && typeof w.getWalkthroughPlaylist === 'function' ? w.getWalkthroughPlaylist(examId) : null;
  }
  function walkLinkHTML(examId) {
    const url = playlistFor(examId);
    if (!url || !EXAMS[examId]) return '';
    return `<a class="btn btn-sm btn-walk" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-exam="${esc(examId)}"
      aria-label="Walkthrough: ${esc(EXAMS[examId].label)} video playlist on YouTube (opens in a new tab)">${icon('play')}Walkthrough</a>`;
  }
  // Practice Summary: one compact row per source exam that has a playlist, in question-bank exam order, with the
  // number of distinct question groups (problems, not parts) from that exam in this set.
  function walkSectionHTML(s) {
    const groupsBy = {};
    s.groups.forEach((g) => { const e = PMAP[g.pid].exam; (groupsBy[e] = groupsBy[e] || new Set()).add(g.pid); });
    const rows = Object.keys(EXAMS).filter((e) => groupsBy[e] && playlistFor(e)).map((e) => {
      const n = groupsBy[e].size;
      return `<li class="walk-row" data-exam="${esc(e)}"><span class="walk-ex">${esc(EXAMS[e].label)}<small>${n} question group${n === 1 ? '' : 's'} in this practice set</small></span>${walkLinkHTML(e)}</li>`;
    }).join('');
    if (!rows) return '';
    const open = !ui.walkCollapsed;
    return `<section class="walk-sec${open ? '' : ' collapsed'}" id="walk-sec" aria-labelledby="walk-toggle">
        <h2 class="walk-h"><button class="walk-toggle" id="walk-toggle" data-action="toggle-walk" aria-expanded="${open}" aria-controls="walk-body">
          <span class="walk-ic">${icon('video')}</span><span class="walk-title">Walkthrough Videos</span><span class="walk-chev">${icon('chev')}</span></button></h2>
        <div class="walk-body" id="walk-body"${open ? '' : ' hidden'}>
          <p class="walk-desc">Watch walkthrough playlists for the past exams included in your practice set.</p>
          <ul class="walk-list">${rows}</ul>
        </div>
      </section>`;
  }
  function renderResults() {
    const s = store.session;
    const counts = { correct: 0, incorrect: 0, ungraded: 0, skipped: 0 };
    const rows = s.groups.map((g, gi) => g.ids.map((id) => {
      const q = QMAP[id];
      const pr = PMAP[q.problem];
      const st = statusOf(s, id);
      counts[st]++;
      const label = { correct: 'Correct', incorrect: 'Incorrect', ungraded: 'Not graded', skipped: 'Unanswered' }[st];
      return `<button class="result-row" data-action="review" data-i="${gi}" data-q="${id}">
        <span class="n">${gi + 1}${g.ids.length > 1 ? `<small>${esc(q.label)}</small>` : ''}</span>
        <span class="t">${esc(SRC[pr.exam].label)} ${esc(qRef(pr))} ${esc(q.label)}: ${esc(pr.title)}<small>${TYPE_LABEL[q.type]}${s.marked[g.pid] ? ' · marked for review' : ''}${s.revealed[id] ? ' · solution viewed' : ''}</small></span>
        <span class="badge ${st}">${label}</span></button>`;
    }).join('')).join('');
    const answered = s.ids.length - counts.skipped;
    const spent = (s.finishedAt || Date.now()) - s.startedAt;
    const timerUsed = s.timer ? s.timer.durationMs - timeLeft(s.timer) : null;
    const missed = s.ids.filter((id) => ['incorrect', 'skipped'].includes(statusOf(s, id)));
    return `<main class="results">
      <h1>Practice summary</h1>
      <p class="hint">${esc(s.title)} · ${s.groups.length} questions, ${s.ids.length} parts</p>
      <div class="stats">
        <div class="stat"><div class="v">${answered}/${s.ids.length}</div><div class="k">Parts completed</div></div>
        <div class="stat good"><div class="v">${counts.correct}</div><div class="k">Correct</div></div>
        <div class="stat bad"><div class="v">${counts.incorrect}</div><div class="k">Incorrect</div></div>
        <div class="stat"><div class="v">${counts.ungraded}</div><div class="k">Not graded (self-check)</div></div>
        <div class="stat"><div class="v">${counts.skipped}</div><div class="k">Unanswered</div></div>
        <div class="stat"><div class="v">${fmt(spent)}</div><div class="k">Time spent${timerUsed !== null ? ` (${fmt(timerUsed)} of timer)` : ''}</div></div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" data-action="retry-missed" ${missed.length ? '' : 'disabled'}>Retry incorrect &amp; unanswered (${missed.length})</button>
        <button class="btn" data-action="review" data-i="0">Review answers</button>
        <button class="btn" data-action="new-set">New set</button>
        <button class="btn btn-home" data-action="go-home">${icon('home')}Go to Home</button>
      </div>
      ${walkSectionHTML(s)}
      <div class="result-list">${rows}</div>
      <p class="hint">Click a part to go back to it. Multiple-choice answers are graded automatically. For written answers, show the solution and grade yourself.</p>
      <p class="hint">All grades on this platform are for practice purposes only and do not predict your actual exam scores.</p>
    </main>`;
  }

  // ── Learning insights (per attempt; static data only, no generated content) ──
  // Topics come only from INCORRECT, auto-graded parts. Unanswered and staff-graded parts are never treated as
  // evidence of a misunderstanding. A part's own tags are used; if a part had none, its group's tags are used
  // and the topic is marked as a broader association.
  function insightsFor(a) {
    const missed = a.ids.filter((id) => statusIn(a, id) === 'incorrect' && autoGradable(QMAP[id]));
    const tally = {};
    missed.forEach((id) => {
      const q = QMAP[id];
      const own = q.topics && q.topics.length;
      (own ? q.topics : groupTopics(q.problem)).forEach((t) => {
        tally[t] = tally[t] || { id: t, parts: [], broad: false };
        tally[t].parts.push(id);
        if (!own) tally[t].broad = true;
      });
    });
    const order = Object.fromEntries(ALL_TOPICS.map((t, i) => [t.id, i]));
    const topics = Object.values(tally).sort((x, y) => y.parts.length - x.parts.length || order[x.id] - order[y.id]);
    const unanswered = a.ids.filter((id) => statusIn(a, id) === 'skipped').length;
    return { missed, topics, unanswered, staff: a.ids.filter((id) => statusIn(a, id) === 'staff').length };
  }
  // Up to `n` existing question groups tagged with the topic. Groups outside this attempt come first; ranking is
  // deterministic: more parts tagged with the topic first, then question-bank order. A group is never repeated.
  function recommend(topic, a, used, n) {
    const inAttempt = new Set(a.groups.map((g) => g.pid));
    const rank = EXAM_PIDS
      .map((pid, i) => ({ pid, i, hits: partsOf(pid).filter((q) => q.topics.includes(topic)).length }))
      .filter((r) => r.hits && !used.has(r.pid))
      .sort((x, y) => x.hits === y.hits ? x.i - y.i : y.hits - x.hits);
    const outside = rank.filter((r) => !inAttempt.has(r.pid));
    // Questions from this exam only fill in when the bank has no other question on the topic.
    const pick = (outside.length ? outside : rank).slice(0, n);
    pick.forEach((r) => used.add(r.pid));
    return pick.map((r) => ({ pid: r.pid, fromAttempt: inAttempt.has(r.pid) }));
  }
  function guideHTML(topic) {
    const concepts = GUIDES[topic];
    if (!concepts || !concepts.length) return '<p class="hint">No study guide for this topic yet. Review the official answers and explanations for the parts you missed.</p>';
    return concepts.map((c) => `<div class="concept">
        <h5>${esc(c.title)}</h5>
        ${rich(c.body)}
        ${c.code ? `<pre class="concept-code"><code>${esc(c.code)}</code></pre>` : ''}
        ${c.pitfall ? `<p class="pitfall"><b>Common mistake / exam tip:</b> ${inline(c.pitfall)}</p>` : ''}
      </div>`).join('');
  }
  function renderInsights(a) {
    const ins = insightsFor(a);
    const ignored = [ins.unanswered ? `${ins.unanswered} unanswered part${ins.unanswered === 1 ? '' : 's'}` : '', ins.staff ? `${ins.staff} part${ins.staff === 1 ? '' : 's'} graded by course staff` : ''].filter(Boolean).join(' and ');
    const ignoredNote = ignored ? `<p class="hint">${ignored} ${ins.unanswered + ins.staff === 1 ? 'isn’t' : 'aren’t'} used for these suggestions.</p>` : '';
    if (!ins.topics.length) {
      return `<section class="insights" id="insights" aria-labelledby="insights-h" tabindex="-1">
        <h2 id="insights-h">Learning insights</h2>
        <p class="insight-empty">${a.ids.some((id) => autoGradable(QMAP[id]) && hasAnswer(a, id))
          ? 'No automatically graded part was answered incorrectly, so there are no topics to flag from this attempt.'
          : 'There are no incorrectly answered, automatically graded parts in this attempt, so there are no topics to flag.'}</p>
        ${ignoredNote}
      </section>`;
    }
    const used = new Set();
    const topicName = (t) => esc(topicLabel(t.id));
    const chips = ins.topics.map((t) => `<li><b>${topicName(t)}</b> <span class="hint">${t.parts.length} missed part${t.parts.length === 1 ? '' : 's'}${t.broad ? ' · broader association (question-level tag)' : ''}</span></li>`).join('');
    const guides = ins.topics.map((t) => {
      const n = (GUIDES[t.id] || []).length;
      return `<details class="guide"><summary><span class="g-name">${topicName(t)}</span><span class="g-meta">${n ? `${n} concepts` : 'no guide yet'}</span></summary>
        <div class="guide-body">${guideHTML(t.id)}</div></details>`;
    }).join('');
    const recs = ins.topics.map((t) => {
      const list = recommend(t.id, a, used, 3);
      const rows = list.map((r) => {
        const pr = PMAP[r.pid];
        return `<li class="rec-row"><span class="rec-txt"><b>${esc(pr.title)}</b> <span class="hint">${esc(SRC[pr.exam].label)} · Q${esc(pr.number)} · ${partsOf(r.pid).length} part${partsOf(r.pid).length === 1 ? '' : 's'}${r.fromAttempt ? ' · also in this exam' : ''}</span></span>
          <button class="btn btn-sm" data-action="practice-group" data-pid="${r.pid}" aria-label="Practice ${esc(pr.title)} (${esc(shortExam(pr.exam))} Q${esc(pr.number)}) in Practice Mode">Practice</button></li>`;
      }).join('');
      return `<div class="rec-topic"><h5>${topicName(t)}</h5>${rows ? `<ul class="rec-list">${rows}</ul>` : '<p class="hint">No other questions in the bank cover this topic yet.</p>'}</div>`;
    }).join('');
    return `<section class="insights" id="insights" aria-labelledby="insights-h" tabindex="-1">
      <h2 id="insights-h">Learning insights</h2>
      <p class="hint">Based on the ${ins.missed.length} automatically graded part${ins.missed.length === 1 ? '' : 's'} you answered incorrectly. A missed part points to concepts worth reviewing; it doesn’t prove you don’t know them.</p>
      ${ignoredNote}
      <h3>1. Topics to review</h3>
      <ul class="topic-list">${chips}</ul>
      <h3>2. Concepts worth reviewing</h3>
      <p class="hint">Short study guides written for this site (not official course material). Open a topic to read it.</p>
      ${guides}
      <h3>3. Recommended practice questions</h3>
      <p class="hint">Real questions from the bank that share a topic with what you missed, preferring ones that weren’t in this exam. <b>Practice</b> opens the question in a new Practice Mode set; this attempt isn’t changed.</p>
      ${recs}
    </section>`;
  }

  // Results for a submitted attempt, read from the grades and score frozen at submission.
  function renderExamResults(a) {
    const sc = a.score;
    const rowsFor = (g, gi) => g.ids.map((id) => {
      const q = QMAP[id];
      const st = statusIn(a, id);
      const pts = !autoGradable(q) ? '—' : hasPoints(q) ? `${fmtPts(st === 'correct' ? q.points : 0)} / ${fmtPts(q.points)} pts` : 'points n/a';
      return `<li class="part-row">
        <span class="pr-lbl">${esc(q.label)}</span>
        <span class="pr-topics">${q.topics.map((t) => esc(topicLabel(t))).join(', ')}</span>
        <span class="pr-pts">${pts}</span>
        <span class="badge ${badgeCls(st)}">${STATUS_LABEL[st]}</span>
        <button class="btn btn-sm" data-action="exam-review" data-i="${gi}" data-q="${id}" aria-label="Review question ${gi + 1} part ${esc(q.label)}">Review</button>
      </li>`;
    }).join('');
    const full = a.kind === 'full'; // a full past exam gets one Walkthrough link, beside the Questions heading
    const groups = a.groups.map((g, gi) => {
      const pr = PMAP[g.pid];
      const c = { correct: 0, incorrect: 0, skipped: 0, staff: 0 };
      g.ids.forEach((id) => { c[statusIn(a, id)]++; });
      const summary = ['correct', 'incorrect', 'skipped', 'staff'].filter((k) => c[k]).map((k) => `${c[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(' · ');
      const walk = full ? '' : walkLinkHTML(pr.exam); // topic-based: each group links its own exam's playlist
      return `<details class="rq-group${walk ? ' has-walk' : ''}"${c.incorrect ? ' open' : ''}>
        <summary><span class="rq-n">${gi + 1}</span><span class="rq-title">${esc(pr.title)}<small>${esc(SRC[pr.exam].label)} · Q${esc(pr.number)} · ${g.ids.length} part${g.ids.length === 1 ? '' : 's'}</small></span><span class="rq-sum">${summary}</span>${walk ? `<span class="rq-walk">${walk}</span>` : ''}</summary>
        <ul class="part-rows">${rowsFor(g, gi)}</ul></details>`;
    }).join('');
    const excluded = [sc.staff ? `${sc.staff} part${sc.staff === 1 ? '' : 's'} graded by course staff` : '', sc.unknown ? `${sc.unknown} part${sc.unknown === 1 ? '' : 's'} without a published point value` : ''].filter(Boolean);
    const scoreMain = sc.auto
      ? `<div class="k">Automatically graded${sc.partial ? ' · partial score' : ''}</div>
         <div class="v">${fmtPts(sc.earned)}<span> / ${fmtPts(sc.possible)} pts</span></div>
         <p class="hint">${excluded.length ? `Not included: ${excluded.join(' and ')}.` : 'Every part of this exam was graded automatically.'}</p>`
      : `<div class="k">Automatically graded</div><div class="v none">No automatically graded questions</div>
         <p class="hint">${excluded.length ? `This attempt has ${excluded.join(' and ')}, so there is no automatic score.` : 'Nothing in this attempt can be graded automatically.'}</p>`;
    return `<main class="results exam-results">
      <p class="eyebrow">Exam results</p>
      <h1>${esc(a.title)}</h1>
      <p class="hint">${kindLabel(a)} · Submitted ${esc(when(a.finishedAt))} · ${fmt(activeMs(a))} spent${a.timer ? ` of ${fmt(a.timer.durationMs)}` : ' (untimed)'}${a.autoSubmitted ? ' · <b>Time ran out, so the exam was submitted automatically</b>' : ''}</p>
      <section class="score-card" aria-label="Score">
        <div class="score-main">${scoreMain}</div>
        <div class="stats">
          <div class="stat good"><div class="v">${sc.counts.correct}</div><div class="k">Correct parts</div></div>
          <div class="stat bad"><div class="v">${sc.counts.incorrect}</div><div class="k">Incorrect parts</div></div>
          <div class="stat"><div class="v">${sc.counts.skipped}</div><div class="k">Unanswered parts</div></div>
          <div class="stat"><div class="v">${sc.counts.staff}</div><div class="k">Graded by Course Staff</div></div>
        </div>
      </section>
      <p class="disclaimer-strong">All grades on this platform are for practice purposes only and do not predict your actual exam scores.</p>
      <div class="actions">
        <button class="btn btn-primary" data-action="exam-review" data-i="0">Review Questions</button>
        <button class="btn" data-action="goto-insights">Learning Insights</button>
        <button class="btn" data-action="retake">Retake this exam</button>
        <button class="btn btn-home" data-action="go-home">${icon('home')}Go to Home</button>
      </div>
      <div class="rq-head"><h2 class="rq-h">Questions</h2>${full ? walkLinkHTML(a.examId) : ''}</div>
      <p class="hint">Counts are by part. Open a question to see its parts, then <b>Review</b> to work through it again next to the official answer.</p>
      <div class="rq-list">${groups}</div>
      ${renderInsights(a)}
      <p class="hint">Choices and short answers are graded automatically against the official answer and its accepted equivalents (ignoring spaces and quote style). Code-writing parts are not graded on this platform, and nothing is sent anywhere.</p>
    </main>`;
  }

  // ───────────────────────────── Render loop ─────────────────────────────
  let rendering = false;
  function render() {
    // Removing a focused input fires blur/change handlers that may call render() again; defer those.
    if (rendering) { queueMicrotask(render); return; }
    rendering = true;
    try { renderNow(); } finally { rendering = false; }
  }
  function renderNow() {
    const active = document.activeElement;
    const activeId = active && active.id;
    const sel = active && active.tagName === 'TEXTAREA' ? [active.selectionStart, active.selectionEnd] : null;

    if (ui.screen === 'practice' && !cur()) { setView('practice'); ui.screen = 'home'; }
    if (ui.screen === 'results' && !store.session) ui.screen = 'home';
    if (ui.screen === 'exam-results' && !attemptById(ui.attemptId)) ui.screen = 'home';

    if (ui.screen === 'practice') {
      const s = cur();
      if (cachedFor !== s) { dropLeftCaches(); cachedFor = s; } // new/restarted set: nothing carried over
      const g = curGroup();
      const shell = `${ui.view}:${ui.attemptId || ''}`; // practice, exam and review each get a fresh shell
      if (!document.getElementById('pane-left') || app.dataset.shell !== shell) {
        detachEditors();
        leftPid = null;
        app.innerHTML = renderPracticeShell(s);
        app.dataset.shell = shell;
      } else { // patch everything except the left pane
        document.getElementById('p-header').innerHTML = headerHTML(s);
        document.getElementById('p-banner').innerHTML = bannerHTML(s);
        document.getElementById('p-footer').innerHTML = footerHTML(s);
      }
      const right = document.getElementById('pane-right');
      const sameGroup = right.dataset.group === g.pid;
      document.getElementById('right-body').innerHTML = isReview(s) ? renderReviewRight(g, s) : renderRight(g, s); // the diagram beside it is left alone
      right.dataset.group = g.pid;
      if (!sameGroup) right.scrollTop = 0;
      if (leftPid !== g.pid) buildLeft(g);
      const work = document.getElementById('review-work'); // review: the editable answers live under the problem
      if (work) work.innerHTML = renderReviewWork(g, s);
      fillBlanks(editors[g.pid]);
      document.title = `Q${s.index + 1} · ${isExam(s) ? (isReview(s) ? 'Exam review' : 'Exam') : 'CS 61A & C88C Exam Practice'}`;
    } else {
      detachEditors();
      if (leftObserver) leftObserver.disconnect();
      leftPid = null;
      app.dataset.shell = '';
      app.innerHTML = ui.screen === 'results' ? renderResults() : ui.screen === 'exam-results' ? renderExamResults(attemptById(ui.attemptId))
        : ui.screen === 'landing' ? renderLanding() : renderHome();
      document.title = ui.screen === 'exam-results' ? 'Exam results · CS 61A & C88C Exam Practice' : 'CS 61A & C88C Exam Practice';
    }

    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel && el.setSelectionRange) el.setSelectionRange(sel[0], sel[1]);
      }
    }
    if (TOUR) TOUR.update();
  }

  function go(i) {
    const s = cur();
    s.index = Math.max(0, Math.min(s.groups.length - 1, i));
    ui.confirmReveal = null;
    ui.activeBlank = null;
    ui.navOpen = false;
    save();
    render();
    const g = curGroup();
    announce(`Question ${s.index + 1} of ${s.groups.length}. ${g.ids.length} part${g.ids.length === 1 ? '' : 's'}.`);
  }
  // Scroll the right pane to the part linked to a code blank and focus its first input.
  // (In a review workspace the editable parts are in the left pane, so parts are looked up anywhere on the page.)
  function focusPart(blank, qid) {
    const el = qid ? document.getElementById(`part-${qid}`)
      : Array.from(app.querySelectorAll('.part')).find((p) => p.dataset.blank === blank);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const input = el.querySelector('input:not(:disabled), textarea');
    if (input) input.focus({ preventScroll: true });
    setActivePart(el);
  }
  function setActivePart(el) {
    const blank = el ? el.dataset.blank : '';
    ui.activeBlank = blank || null;
    app.querySelectorAll('.part').forEach((p) => p.classList.toggle('active', p === el));
    setCurrentBlank(blank);
  }

  // ───────────────────────────── Events ─────────────────────────────
  function focusEl(id) {
    const el = document.getElementById(id);
    if (el) el.focus({ preventScroll: true });
  }
  // Arrow keys move between navigator tiles (row by row for ↑/↓); Home/End jump to the ends.
  function moveInGrid(cell, key) {
    const cells = Array.from(cell.parentNode.children);
    const i = cells.indexOf(cell);
    const cols = cells.filter((c) => c.offsetTop === cells[0].offsetTop).length || 1;
    const to = { ArrowLeft: i - 1, ArrowRight: i + 1, ArrowUp: i - cols, ArrowDown: i + cols, Home: 0, End: cells.length - 1 }[key];
    if (cells[to]) cells[to].focus();
  }
  function toggleIn(list, v) {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1); else list.push(v);
  }

  app.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const a = btn.dataset.action;
    const p = store.prefs;
    const xp = store.examPrefs;
    const s = cur(); // the session on the question screen (practice, live exam, or submitted attempt)
    const partEl = btn.closest('[data-part]');
    const q = partEl && QMAP[partEl.dataset.part];
    switch (a) {
      // landing & home
      case 'enter': ui.screen = 'home'; window.scrollTo(0, 0); break;
      case 'replay-tour': if (TOUR) TOUR.replay(); return;
      case 'landing': ui.screen = 'landing'; ui.menu = null; break;
      case 'menu': ui.menu = ui.menu === btn.dataset.id ? null : btn.dataset.id; break;
      case 'topics-all': langView(p).sections.forEach((sec) => { p[sec.topicsPref] = sec.topicList.filter((t) => sec.questions.some((x) => x.topics.includes(t.id))).map((t) => t.id); }); break;
      case 'topics-none': langView(p).sections.forEach((sec) => { p[sec.topicsPref] = []; }); break;
      case 'lang': p.lang = btn.dataset.v; ui.sizeDraft = null; break;
      case 'size-step': {
        const typed = ui.sizeDraft != null ? parseSize(ui.sizeDraft) : null;
        const max = sizeMax();
        if (max) p.size = Math.min(max, Math.max(1, (typed || setSize()) + Number(btn.dataset.d)));
        ui.sizeDraft = null;
        break;
      }
      case 'start':
        ui.menu = null;
        if (store.session && !store.session.finished && !confirm('Starting a new set replaces your unfinished one. Continue?')) return;
        startFromPrefs(); return;
      case 'resume': {
        setView('practice'); ui.screen = 'practice'; ui.menu = null;
        const t = store.session && store.session.timer; // restart a timer that Exit paused
        if (t && t.pausedByExit) { delete t.pausedByExit; if (t.remainingMs > 0) t.runningSince = Date.now(); }
        break;
      }
      // Results pages / review: back to the home page. Never starts, ends or changes a session or attempt.
      case 'go-home':
        if (ui.screen === 'exam-results' || isReview(s)) p.mode = 'exam'; // so Exam History is right there
        setView('practice'); ui.screen = 'home'; ui.navOpen = false; ui.dirOpen = false; window.scrollTo(0, 0); break;
      case 'toggle-walk': { // Practice Summary → Walkthrough Videos (expanded by default)
        ui.walkCollapsed = !ui.walkCollapsed;
        const sec = document.getElementById('walk-sec');
        if (sec) {
          sec.classList.toggle('collapsed', ui.walkCollapsed);
          document.getElementById('walk-body').hidden = ui.walkCollapsed;
          btn.setAttribute('aria-expanded', String(!ui.walkCollapsed));
        }
        return;
      }
      case 'new-set': // Practice Summary: home, with the practice setup showing
        p.mode = 'practice'; setView('practice'); ui.screen = 'home'; window.scrollTo(0, 0); break;
      case 'discard': if (!confirm('Discard your unfinished set? Your answers in it will be lost.')) return; store.session = null; break;
      case 'show-results': setView('practice'); ui.screen = 'results'; break;
      case 'mode': p.mode = btn.dataset.v; ui.menu = null; break;
      // exam setup (home, Exam Mode)
      case 'xtopic': toggleIn(xp.topics, btn.dataset.id); break;
      case 'xtopics-clear': xp.topics = []; break;
      case 'unpick': xp.picked = xp.picked.filter((pid) => pid !== btn.dataset.pid); save(); refreshPicker(); return;
      case 'pick-clear': xp.picked = []; save(); refreshPicker(); announce('Selection cleared.'); return;
      case 'start-exam':
        if (store.exam && !confirm(`You have an unfinished exam (${store.exam.title}). Starting a new exam discards it. Continue?`)) return;
        startExamFromPrefs(); return;
      case 'resume-exam': resumeExam(); return;
      case 'discard-exam':
        if (!confirm('Discard your unfinished exam? Its answers will be lost. Submitted attempts in your history are kept.')) return;
        store.exam = null; break;
      case 'open-attempt': setView('review', btn.dataset.id); ui.screen = 'exam-results'; window.scrollTo(0, 0); break;
      // exam taking & results
      case 'save-leave': saveAndLeave(); return;
      case 'submit-exam': if (!store.exam || !confirmSubmit()) return; submitExam(false); return;
      case 'exam-results': ui.screen = 'exam-results'; ui.navOpen = false; ui.dirOpen = false; window.scrollTo(0, 0); break;
      case 'exam-review': { // opens the attempt's review workspace (never the attempt itself)
        const w = workspaceFor(ui.attemptId);
        ui.screen = 'practice';
        w.index = Number(btn.dataset.i);
        save(); render();
        if (btn.dataset.q) {
          focusPart(null, btn.dataset.q);
          const panel = document.getElementById(`rv-${btn.dataset.q}`);
          if (panel) panel.scrollIntoView({ block: 'start' });
        }
        return;
      }
      case 'run-code': runCode(); return;
      case 'open-tutor': openTutor(curGroup().pid); return;
      case 'goto-insights': {
        const el = document.getElementById('insights');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true }); }
        return;
      }
      case 'reset-answer': { // review workspace: one part back to exactly what was submitted
        const at = attemptById(s.reviewOf);
        const id = btn.dataset.q;
        if (!at || !isReview(s)) return;
        const copy = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
        if (at.answers[id] === undefined) delete s.answers[id]; else s.answers[id] = copy(at.answers[id]);
        if (at.eliminated[id] === undefined) delete s.eliminated[id]; else s.eliminated[id] = copy(at.eliminated[id]);
        announce(`Part ${QMAP[id].label} reset to your submitted answer.`);
        break;
      }
      case 'practice-group': { // recommendation: a new practice set with just this question group (all its parts)
        const pid = btn.dataset.pid;
        if (!PMAP[pid]) return;
        if (store.session && !store.session.finished && !confirm('Practicing this question replaces your unfinished practice set. Continue?')) return;
        const pr = PMAP[pid];
        p.mode = 'practice';
        newSession(partsOf(pid).map((q) => q.id), `Practice: ${pr.title} (${shortExam(pr.exam)} Q${pr.number})`);
        return;
      }
      case 'retake': {
        const at = attemptById(ui.attemptId);
        if (store.exam && !confirm(`You have an unfinished exam (${store.exam.title}). Retaking discards it. Continue?`)) return;
        createExam(at.kind, at.examId, at.groups.map((g) => g.pid), at.timer ? at.timer.durationMs / 60000 : null);
        return;
      }
      // practice
      case 'home':
        // Leaving a practice set (its "save and leave"): pause a running timer; Resume restarts it.
        if (ui.screen === 'practice' && ui.view === 'practice' && s && s.timer && s.timer.runningSince) { pauseTimer(s.timer); s.timer.pausedByExit = true; }
        if (ui.screen === 'exam-results') p.mode = 'exam';
        setView('practice'); ui.screen = 'home'; ui.navOpen = false; ui.dirOpen = false; window.scrollTo(0, 0); break;
      case 'prev': go(s.index - 1); return;
      case 'next': go(s.index + 1); return;
      case 'goto': {
        const i = s.groups.findIndex((g) => g.pid === btn.dataset.pid);
        if (i >= 0) go(i);
        focusEl('nav-toggle');
        return;
      }
      case 'toggle-nav':
        ui.navOpen = !ui.navOpen; ui.dirOpen = false;
        render();
        focusEl(ui.navOpen ? `nav-${curGroup().pid}` : 'nav-toggle');
        return;
      case 'directions': ui.dirOpen = !ui.dirOpen; ui.navOpen = false; break;
      case 'mark': { if (isReview(s)) return; const pid = curGroup().pid; if (s.marked[pid]) delete s.marked[pid]; else s.marked[pid] = true; break; }
      case 'check': {
        if (isExam(s)) return; // no grading before an exam is submitted
        const ans = s.answers[q.id];
        if (isMC(q)) s.checked[q.id] = gradeMC(q, ans) ? 'correct' : 'incorrect';
        else s.checked[q.id] = matchesOfficial(q, ans) ? 'correct' : 'unmatched';
        announce(`Part ${q.label}: ${{ correct: 'Correct.', incorrect: 'Incorrect.', unmatched: 'Not an exact match. Show the solution to grade yourself.' }[s.checked[q.id]]}`);
        break;
      }
      case 'reveal': if (isExam(s)) return; ui.confirmReveal = q.id; render(); { const y = document.getElementById(`reveal-yes-${q.id}`); if (y) y.focus(); } return;
      case 'reveal-no': ui.confirmReveal = null; break;
      case 'reveal-yes': if (isExam(s)) return; s.revealed[q.id] = true; ui.confirmReveal = null; announce('Solution shown.'); break;
      case 'self': if (isExam(s)) return; s.selfGrade[q.id] = btn.dataset.v; break;
      case 'eliminate': {
        if (locked(s)) return;
        const i = Number(btn.dataset.i);
        const on = !eliminated(s, q.id).includes(i);
        setEliminated(s, q.id, i, on);
        announce(`Option ${letter(i)} ${on ? 'eliminated' : 'restored'}.`);
        break;
      }
      case 'pause': if (isExam(s)) return; pauseTimer(s.timer); break;
      case 'resume-timer': if (isExam(s)) return; if (s.timer.remainingMs > 0) s.timer.runningSince = Date.now(); break;
      case 'reset-timer':
        if (isExam(s)) return;
        if (!confirm('Reset the timer to the full time?')) return;
        s.timer.remainingMs = s.timer.durationMs; s.timer.runningSince = Date.now(); s.timer.expired = false; break;
      case 'hide-clock': ui.hideClock = !ui.hideClock; break;
      case 'reset-code':
        if (locked(s)) return;
        if (!confirm(isReview(s)
          ? 'Reset the code to the version you submitted? Your edits to the code since then (and code highlights) will be erased. Your answers stay.'
          : 'Reset the code to the original? Your typed notes in the code (and code highlights) will be erased. Your answers stay.')) return;
        resetEditor(curGroup().pid); announce(isReview(s) ? 'Code reset to the submitted version.' : 'Code reset to the original.'); return;
      case 'finish': {
        if (isExam(s)) return;
        const un = s.ids.filter((id) => !hasAnswer(s, id)).length;
        if (!s.finished && un && !confirm(`${un} part${un === 1 ? ' is' : 's are'} unanswered. Finish anyway?`)) return;
        finishSession(); return;
      }
      // results
      case 'review': {
        setView('practice');
        ui.screen = 'practice';
        s.index = Number(btn.dataset.i);
        save(); render();
        if (btn.dataset.q) focusPart(null, btn.dataset.q);
        return;
      }
      case 'retry-missed': {
        const ids = s.ids.filter((id) => ['incorrect', 'skipped'].includes(statusOf(s, id)));
        newSession(ids, `Retry: ${s.title}`); return;
      }
      default: return;
    }
    save();
    render();
  });

  // Annotation toolbar. mousedown is cancelled so clicking a tool keeps the current text selection.
  app.addEventListener('mousedown', (e) => { if (e.target.closest('#annot-bar, .dd-step-btn')) e.preventDefault(); });
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ann]');
    if (!b || b.disabled || !leftPid) return;
    const k = b.dataset.ann;
    if (k === 'hl') {
      if (highlightSelection()) { if (ui.annMode !== 'hl') setAnnMode('hl'); } else setAnnMode('hl');
    } else if (k === 'pen' || k === 'eraser') setAnnMode(k);
    else if (k === 'note') createNote();
    else if (k === 'settings') setSettingsOpen(document.getElementById('exam-settings').hidden);
    else if (k === 'autofill') toggleAutoFill();
    else if (k === 'undo') { flushNoteEdit(); undo(leftPid); }
    else if (k === 'redo') { flushNoteEdit(); redo(leftPid); }
    else if (k === 'clear') {
      flushNoteEdit();
      const list = anns(leftPid);
      if (!list.length || !confirm('Clear all highlights, drawings and sticky notes for this question?')) return;
      commit(leftPid, list.slice().map((a) => ({ op: 'remove', ann: a })));
      announce('Annotations cleared. Use Undo to restore them.');
    }
  });
  // In highlighter mode, finishing a selection in the left pane highlights it.
  document.addEventListener('mouseup', (e) => {
    if (ui.annMode !== 'hl' || !leftPid || !e.target.closest || !e.target.closest('#problem-article') || e.target.closest('.note-layer')) return;
    setTimeout(highlightSelection, 0); // let the selection (DOM or CodeMirror) settle first
  });

  // Track which part is active so its code blank is highlighted.
  app.addEventListener('focusin', (e) => {
    const part = e.target.closest && e.target.closest('.part');
    if (part && !part.classList.contains('active')) setActivePart(part);
  });

  app.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'timer-on') { store.prefs.timerOn = el.checked; save(); render(); return; }
    if (el.id === 'set-size') { commitSize(el.value); save(); render(); return; }
    if (el.id === 'timer-min') {
      const v = Number(el.value);
      store.prefs.minutes = Number.isInteger(v) ? v : NaN;
      save(); render(); return;
    }
    const xpref = el.dataset && el.dataset.xpref;
    if (xpref) { // exam setup radios
      const xp = store.examPrefs;
      if (xpref === 'timerOn') xp.timerOn = el.value === 'on'; else xp[xpref] = el.value;
      save(); render(); return;
    }
    if (el.dataset && el.dataset.pick) { // topic-based exam: add/remove a question group (keeps pick order)
      const xp = store.examPrefs;
      const pid = el.dataset.pick;
      xp.picked = xp.picked.filter((x) => x !== pid);
      if (el.checked) xp.picked.push(pid);
      save(); refreshPicker(); return;
    }
    const pref = el.dataset && el.dataset.pref;
    if (pref) { // home-page dropdown options
      const p = store.prefs;
      toggleIn(p[pref], el.value);
      save(); render(); return;
    }
    const qid = el.dataset && el.dataset.qid;
    if (!qid || el.tagName === 'TEXTAREA') return;
    const s = cur();
    if (!s || locked(s)) return;
    const q = QMAP[qid];
    const i = Number(el.value);
    if (q.type === 'single_choice') s.answers[qid] = i;
    else {
      const cur = new Set(s.answers[qid] || []);
      if (el.checked) cur.add(i); else cur.delete(i);
      s.answers[qid] = Array.from(cur).sort((x, y) => x - y);
    }
    if (el.checked) setEliminated(s, qid, i, false); // choosing an eliminated option un-eliminates it
    delete s.checked[qid];
    save();
    render(); // also refreshes the linked code blank
  });

  app.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'set-size') { // keep what is typed; use it as soon as it is a valid size
      ui.sizeDraft = el.value;
      el.style.width = `${Math.max(1, el.value.length) + 0.5}ch`;
      const v = parseSize(el.value);
      if (v) { store.prefs.size = v; save(); }
      refreshSizeLive(); return;
    }
    if (el.id === 'timer-min') { // live validation without stealing focus
      const v = Number(el.value);
      store.prefs.minutes = el.value !== '' && Number.isInteger(v) ? v : NaN;
      save(); render(); return;
    }
    if (el.id === 'exam-min') {
      const v = Number(el.value);
      store.examPrefs.minutes = el.value !== '' && Number.isInteger(v) ? v : NaN;
      save(); render(); return;
    }
    if (el.id === 'exam-search') { // update only the list, so typing keeps focus and the selection panel stays put
      ui.examQuery = el.value;
      const list = document.getElementById('pick-list');
      if (list) list.innerHTML = pickListHTML();
      return;
    }
    if (el.tagName !== 'TEXTAREA' || !el.dataset.qid) return;
    const s = cur();
    if (!s || locked(s)) return;
    const qid = el.dataset.qid;
    const hadState = !!s.checked[qid] || !hasAnswer(s, qid) !== !el.value.trim();
    s.answers[qid] = el.value;
    delete s.checked[qid];
    delete s.selfGrade[qid];
    saveSoon();
    if (leftPid) fillBlanks(editors[leftPid]); // typed answers show in the code as you type
    if (isReview(s)) { // keep the "current review answer" panel in step without touching the box being typed in
      const right = document.getElementById('right-body');
      if (right) right.innerHTML = renderReviewRight(curGroup(), s);
      return;
    }
    if (hadState) render(); // refresh Check button / stale feedback
  });

  // Exam Settings closes on Escape or a click anywhere outside it.
  const settingsOpen = () => { const p = document.getElementById('exam-settings'); return !!p && !p.hidden; };
  document.addEventListener('click', (e) => {
    if (settingsOpen() && !e.target.closest('.exam-settings-wrap')) setSettingsOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsOpen()) { setSettingsOpen(false, true); return; }
    if (e.key === 'Escape') {
      if (ui.navOpen || ui.dirOpen || ui.confirmReveal || ui.menu) {
        const wasNav = ui.navOpen;
        ui.navOpen = ui.dirOpen = false; ui.confirmReveal = null; ui.menu = null; render();
        if (wasNav) focusEl('nav-toggle');
        return;
      }
      if (ui.annMode !== 'none') { setAnnMode(ui.annMode); return; }
      if (dg.pid && dgCancelArrow()) return;
      if (dg.pid && dg.mode !== 'select') { setDgMode('select'); return; }
    }
    if (ui.screen !== 'practice' || e.metaKey || e.ctrlKey || e.altKey) return;
    // Never steal keys from editing: answer boxes, CodeMirror's hidden textarea, choices, contenteditable.
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || e.target.isContentEditable || e.target.closest('.CodeMirror')) return;
    if (dg.pid && dg.selected && (e.key === 'Delete' || e.key === 'Backspace')) { deleteDgSelected(); e.preventDefault(); return; }
    const cell = e.target.closest('.nav-cell');
    const s = cur();
    if (cell && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      moveInGrid(cell, e.key); e.preventDefault(); return;
    }
    if (e.key === 'ArrowRight') { if (s.index < s.groups.length - 1) go(s.index + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { if (s.index > 0) go(s.index - 1); e.preventDefault(); }
    else if ((e.key === 'm' || e.key === 'M') && !isReview(s)) {
      const pid = curGroup().pid;
      if (s.marked[pid]) delete s.marked[pid]; else s.marked[pid] = true;
      save(); render();
    }
  });

  // Close popovers when clicking elsewhere.
  document.addEventListener('mousedown', (e) => {
    if ((ui.navOpen && !e.target.closest('.navigator, [data-action="toggle-nav"]')) ||
        (ui.dirOpen && !e.target.closest('.directions, [data-action="directions"]')) ||
        (ui.menu && !e.target.closest('.dd'))) {
      ui.navOpen = false; ui.dirOpen = false; ui.menu = null; render();
    }
  });
  window.addEventListener('beforeunload', save);
  // Another tab saved: this tab's copy is stale. Saving is already blocked (save()); cover the page so no
  // work is done here that can't be kept, and offer a reload, which picks up the other tab's state.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY || staleTab) return;
    staleTab = true;
    clearTimeout(saveTimer);
    const box = document.createElement('div');
    box.className = 'stale-overlay';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'stale-title');
    box.innerHTML = `<div class="stale-card"><h2 id="stale-title">This page is out of date</h2>
      <p>CS 61A Practice was changed in another tab or window. To keep that work safe, this page has stopped saving.</p>
      <button class="btn btn-primary" id="stale-reload">Reload to continue</button></div>`;
    document.body.appendChild(box);
    app.inert = true; // nothing behind the notice can be clicked or tabbed to
    box.querySelector('#stale-reload').addEventListener('click', () => location.reload());
    box.querySelector('#stale-reload').focus();
  });

  // Attempts submitted before grades were frozen get their snapshot now, once; after that it never changes.
  store.attempts.forEach((a) => { if (!a.graded || !a.score || a.score.v !== 2) Object.assign(a, gradeAttempt(a)); });

  // An exam that was never explicitly left (refresh, crash, closed tab) reopens straight into the exam,
  // with its clock having kept running; one whose time ran out meanwhile is submitted as of expiry.
  if (store.exam) {
    const t = store.exam.timer;
    if (t && t.runningSince && timeLeft(t) <= 0) submitExam(true);
    else if (!store.exam.leftAt) { setView('exam'); ui.screen = 'practice'; }
  }
  if (TOUR) {
    TOUR.init({
      hold: holdTimer,
      directions(open) { if (ui.dirOpen !== open) { ui.dirOpen = open; ui.navOpen = false; render(); } },
      annTools: () => toolKey(ANN_TOOLS),
      dgTools: () => toolKey(DG_TOOLS),
      icon,
    });
  }
  render();
})();
