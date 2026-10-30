// CS 61A Practice — prototype app (no build step; CodeMirror 5 is vendored).
// Screens: landing → home → practice → results. All state lives in `store` and is mirrored to localStorage.
//
// Practice model: a session holds question parts (`ids`) grouped by problem (`groups`). Navigation moves
// between groups; every part of the current group is shown together in the right pane, while the left pane
// (problem text, scratch editor, annotations) is built once per group and left untouched by re-renders.
(function () {
  'use strict';

  const { TOPICS, EXAMS, PROBLEMS, QUESTIONS, ANSWER_KEY, BUBBLE_NOTE } = window.CS61A_BANK;
  const GUIDES = window.CS61A_GUIDES || {}; // topic id -> study-guide concepts (data/study_guides.js)
  const QMAP = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const ORDER = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, i]));
  const STORE_KEY = 'cs61a-practice:v1';
  const SIZES = [5, 10, 20, 'all'];
  const DIFFS = ['easy', 'medium', 'hard'];
  const TYPES = [
    { id: 'single_choice', name: 'Multiple choice' },
    { id: 'multi_select', name: 'Select all' },
    { id: 'short_answer', name: 'Short answer' },
    { id: 'code', name: 'Code' },
  ];
  const TYPE_LABEL = { single_choice: 'Multiple choice', multi_select: 'Select all that apply', short_answer: 'Short answer', code: 'Code response · self-check' };

  const app = document.getElementById('app');
  const live = document.getElementById('sr-live');

  // ───────────────────────────── State & persistence ─────────────────────────────
  const DEFAULT_PREFS = { mode: 'practice', topics: [], exams: Object.keys(EXAMS), difficulties: DIFFS.slice(), types: TYPES.map((t) => t.id), size: 10, timerOn: true, minutes: 25 };
  // Neither exam PDF states a time limit, so exams start from this editable default (labeled as such in the UI).
  const EXAM_DEFAULT_MINUTES = 120;
  const EXAM_MAX_MINUTES = 300;
  const DEFAULT_EXAM_PREFS = { kind: 'full', examId: Object.keys(EXAMS)[0], topics: [], picked: [], timerOn: true, minutes: EXAM_DEFAULT_MINUTES };
  const STORE_VERSION = 4; // v1: prefs/session/notes/annotations; v2: + exam, attempts, examPrefs; v3: + reviews, frozen grades;
                           // v4: practice notes/annotations move onto the practice session (no longer shared across sessions)

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
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
  // Sessions saved before grouping existed navigated per part; convert them in place.
  function migrateSession(s) {
    if (!s || !s.ids || !s.ids.length || !s.ids.every((id) => QMAP[id])) return null;
    if (!s.groups) {
      const cur = s.ids[s.index] || s.ids[0];
      s.groups = groupIds(s.ids);
      s.index = Math.max(0, s.groups.findIndex((g) => g.ids.includes(cur)));
      const marked = {};
      Object.keys(s.marked || {}).forEach((id) => { if (QMAP[id]) marked[QMAP[id].problem] = true; });
      s.marked = marked;
    }
    return s;
  }
  // Older notes used ___(a)___ placeholders; the editor now keeps the template token ⟦a⟧.
  function migrateNotes(notes) {
    Object.keys(notes).forEach((pid) => {
      if (!PROBLEMS[pid]) delete notes[pid];
      else notes[pid] = notes[pid].replace(/___\(([^)]+)\)___/g, '⟦$1⟧');
    });
    return notes;
  }

  // Exam attempts have the same shape as a practice session plus mode: 'exam'. They carry their own
  // scratch notes and annotations, so practice work never shows up inside an exam (or the reverse).
  function migrateAttempt(a) {
    if (!a || a.mode !== 'exam' || !migrateSession(a)) return null;
    a.notes = migrateNotes(a.notes || {});
    a.annotations = a.annotations || {};
    a.eliminated = a.eliminated || {};
    return a;
  }

  const saved = load();
  const store = {
    version: STORE_VERSION, // same storage key as v1, so practice sessions saved before exams existed still load
    prefs: Object.assign({}, DEFAULT_PREFS, saved && saved.prefs),
    session: migrateSession(saved && saved.session), // the practice set; carries its own notes/annotations (see below)
    examPrefs: Object.assign({}, DEFAULT_EXAM_PREFS, saved && saved.examPrefs),
    exam: migrateAttempt(saved && saved.exam),         // the exam in progress (never submitted), or null
    attempts: ((saved && saved.attempts) || []).map(migrateAttempt).filter(Boolean), // submitted exams, oldest first
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
  if (!EXAMS[store.examPrefs.examId]) store.examPrefs.examId = DEFAULT_EXAM_PREFS.examId;
  store.examPrefs.picked = [...new Set(store.examPrefs.picked)].filter((pid) => PROBLEMS[pid]);
  // view: which session the question screen shows. 'practice' | 'exam' (in progress) | 'review' (a submitted attempt)
  const ui = { screen: 'landing', view: 'practice', attemptId: null, menu: null, navOpen: false, dirOpen: false, hideClock: false, confirmReveal: null, annMode: 'none', examQuery: '' };

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
        answers: copy(a.answers), eliminated: copy(a.eliminated), notes: copy(a.notes), annotations: copy(a.annotations),
        marked: {}, checked: {}, revealed: {}, selfGrade: {}, timer: null, startedAt: Date.now(),
      };
    }
    return store.reviews[id];
  }
  // Every session (practice set, exam, review workspace) keeps its own scratch code and annotations.
  const notesOf = () => cur().notes || (cur().notes = {});
  const annotationsOf = () => cur().annotations || (cur().annotations = {});

  function announce(msg) {
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 30);
  }

  // ───────────────────────────── Text rendering (escaped) ─────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function inline(s) {
    return String(s).split(/(`[^`]*`)/).map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return `<code>${esc(part.slice(1, -1))}</code>`;
      return esc(part)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');
    }).join('');
  }
  function rich(s) {
    if (!s) return '';
    return s.split(/\n\n/).map((p) => `<p>${inline(p)}</p>`).join('');
  }

  // ───────────────────────────── Grading ─────────────────────────────
  const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/"/g, "'").replace(/[;,]+$/, '');
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
    const m = PROBLEMS[pid].code.match(/^(?:def|class)\s+(\w+)/m);
    return m ? `${m[1]}.py` : `problem_${PROBLEMS[pid].number.replace(/\W+/g, '')}.py`;
  }
  // The code a problem's editor starts from (and resets to): the exam template, or in a review workspace
  // the scratch code as it was when the attempt was submitted.
  function notesBase(pid) {
    const s = cur();
    const a = isReview(s) && attemptById(s.reviewOf);
    return a && a.notes[pid] !== undefined ? a.notes[pid] : PROBLEMS[pid].code;
  }
  function editedNotes(pid) {
    const notes = notesOf();
    return notes[pid] !== undefined && notes[pid] !== notesBase(pid);
  }
  function partForBlank(pid, name) {
    const s = cur();
    const ids = s ? s.ids : [];
    return QUESTIONS.find((q) => q.problem === pid && q.blank === name && ids.includes(q.id)) || null;
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
  function fillBlanks(ed) {
    if (!ed || !ed.cm) return;
    ed.blanks.forEach((b) => {
      const pos = b.mark.find();
      if (!pos) return;
      const f = blankFill(ed.pid, b.name);
      // Continuation lines of a multi-line answer are indented to the blank's column.
      const col = pos.from.ch;
      const text = f ? f.text.split('\n').map((l, i) => (i ? ' '.repeat(col) + l : l)).join('\n') : `___(${b.name})___`;
      const cls = `cm-slot ${f ? `filled filled-${f.kind}` : 'empty'}${ed.current === b.name ? ' current' : ''}`;
      if (b.el.textContent !== text) { b.el.textContent = text; b.mark.changed(); }
      if (b.el.className !== cls) b.el.className = cls;
      b.el.title = f ? `Blank (${b.name}): your answer. Click to go to this part.` : `Blank (${b.name}). Click to go to this part.`;
    });
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
    const cm = window.CodeMirror(wrap, {
      value, mode: 'python', theme: 'monokai', lineNumbers: true, indentUnit: 4, tabSize: 4,
      indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      screenReaderLabel: 'Scratch code editor',
      extraKeys: {
        Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ')),
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
    root.innerHTML = rich(PROBLEMS[pid][where]);
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
  }

  // Apply one annotation change to state and to whatever is on screen.
  function addAnn(pid, a) {
    anns(pid).push(a);
    if (a.kind === 'code') markCode(editors[pid], a);
    if (pid !== leftPid) return;
    if (a.kind === 'hl') renderProse(pid, a.where);
    if (a.kind === 'pen') layoutStrokes();
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
  function filtered(prefs, ignoreTopics) {
    return QUESTIONS.filter((q) =>
      prefs.exams.includes(PROBLEMS[q.problem].exam) &&
      prefs.difficulties.includes(q.difficulty) &&
      prefs.types.includes(q.type) &&
      (ignoreTopics || prefs.topics.length === 0 || q.topics.some((t) => prefs.topics.includes(t))));
  }
  const problemsOf = (qs) => [...new Set(qs.map((q) => q.problem))];
  function topicNames(ids) {
    if (!ids.length) return 'All topics';
    return ids.map((id) => TOPICS.find((t) => t.id === id).name).join(', ');
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
  // A problem is picked if any of its parts matches the filters; then all of its parts of the
  // chosen question types come along, so multi-part questions always stay together.
  function startFromPrefs() {
    const p = store.prefs;
    const pids = problemsOf(filtered(p));
    const n = p.size === 'all' ? pids.length : Math.min(p.size, pids.length);
    const chosen = new Set(pids.slice().sort(() => Math.random() - 0.5).slice(0, n));
    const ids = QUESTIONS.filter((q) => chosen.has(q.problem) && p.types.includes(q.type) && p.exams.includes(PROBLEMS[q.problem].exam))
      .sort((a, b) => ORDER[a.id] - ORDER[b.id]).map((q) => q.id);
    newSession(ids, topicNames(p.topics));
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
    ui.navOpen = false;
    ui.confirmReveal = null;
    ui.activeBlank = null;
  }

  // ───────────────────────────── Exams ─────────────────────────────
  // A question group is one PROBLEMS entry; an exam always takes every part of each group it includes.
  const partsOf = (pid) => QUESTIONS.filter((q) => q.problem === pid).sort((a, b) => ORDER[a.id] - ORDER[b.id]);
  const examGroups = (examId) => Object.keys(PROBLEMS).filter((pid) => PROBLEMS[pid].exam === examId && partsOf(pid).length);
  const shortExam = (examId) => EXAMS[examId].label.replace('Midterm ', 'MT');
  const groupTopics = (pid) => [...new Set(partsOf(pid).flatMap((q) => q.topics))];
  // Sum of the parts' points when all are published; otherwise the problem's printed total.
  function groupPoints(pid) {
    const parts = partsOf(pid);
    return parts.every(hasPoints) ? parts.reduce((t, q) => t + q.points, 0) : PROBLEMS[pid].points;
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
      <div class="landing-foot">${resume}<span class="landing-hint">Click anywhere to start</span><span class="landing-byline">by Jacob Kao</span></div>
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

  function renderHome() {
    const p = store.prefs;
    const s = store.session;
    const pool = filtered(p);
    const pids = problemsOf(pool);
    const base = filtered(p, true);
    const n = p.size === 'all' ? pids.length : Math.min(p.size, pids.length);
    const minutesOk = !p.timerOn || (Number.isInteger(p.minutes) && p.minutes >= 1 && p.minutes <= 60);

    const resume = s && !s.finished ? `
      <div class="resume" role="region" aria-label="Unfinished practice">
        <div><strong>You have an unfinished set: ${esc(s.title)}</strong>
          <span class="hint">Question ${s.index + 1} of ${s.groups.length} · ${s.ids.filter((id) => hasAnswer(s, id)).length} of ${s.ids.length} parts answered${s.timer ? ` · ${fmt(timeLeft(s.timer))} left on the timer` : ''}</span></div>
        <div class="actions"><button class="btn btn-primary" data-action="resume">Resume Practice</button><button class="btn" data-action="discard">Start Over</button></div>
      </div>` : (s && s.finished ? `
      <div class="resume"><div><strong>Last set: ${esc(s.title)}</strong><span class="hint">Finished, ${s.groups.length} questions</span></div>
        <div class="actions"><button class="btn" data-action="show-results">View results</button></div></div>` : '');

    const topicName = (id) => TOPICS.find((t) => t.id === id).name;
    const topicsBody = `<div class="dd-tools"><button class="link" data-action="topics-all">Select all</button><button class="link" data-action="topics-none">Clear</button></div>
      <div class="dd-list cols">${TOPICS.map((t) => {
        const count = problemsOf(base.filter((q) => q.topics.includes(t.id))).length;
        return optRow('checkbox', 'topics', t.id, t.name, p.topics.includes(t.id), count ? String(count) : 'soon', !count);
      }).join('')}</div>
      <p class="hint">Numbers are questions (each may have several parts). Leave everything unchecked to include all topics.</p>`;
    const examsBody = `<div class="dd-list">${Object.values(EXAMS).map((e) => optRow('checkbox', 'exams', e.id, e.label, p.exams.includes(e.id))).join('')}</div>`;
    const diffBody = `<div class="dd-list">${DIFFS.map((d) => optRow('checkbox', 'difficulties', d, d[0].toUpperCase() + d.slice(1), p.difficulties.includes(d))).join('')}</div>`;
    const typesBody = `<div class="dd-list">${TYPES.map((t) => optRow('checkbox', 'types', t.id, t.name, p.types.includes(t.id))).join('')}</div>`;
    const sizeBody = `<div class="dd-list">${SIZES.map((z) => optRow('radio', 'size', z, z === 'all' ? `All (${pids.length})` : `${z} questions`, p.size === z)).join('')}</div>`;
    const timerBody = `<div class="timer-config">
        <label><input type="checkbox" id="timer-on" ${p.timerOn ? 'checked' : ''}> Countdown timer</label>
        <label><input type="number" id="timer-min" min="1" max="60" step="1" value="${esc(p.minutes)}" ${p.timerOn ? '' : 'disabled'} aria-label="Minutes (1 to 60)"> min</label>
      </div>
      ${minutesOk ? '<p class="hint">Any whole number of minutes from 1 to 60, or turn it off.</p>' : '<p class="err" role="alert">Enter a whole number from 1 to 60.</p>'}`;

    const typeName = (id) => TYPES.find((t) => t.id === id).name;
    const cap = (d) => d[0].toUpperCase() + d.slice(1);
    const mode = p.mode === 'exam' ? 'exam' : 'practice';
    const modeBtn = (m, title, sub) => `<button class="mode-opt" id="mode-${m}" data-action="mode" data-v="${m}" aria-pressed="${mode === m}"><b>${title}</b><span>${sub}</span></button>`;
    return `<main class="home">
      <div class="home-head"><div><button class="home-brand" data-action="landing" title="Back to the welcome page"><h1>CS 61A Practice</h1></button><p class="tagline">Past-exam questions, one at a time. Pick topics, set a timer, check your work.</p></div></div>
      ${examResumeHTML()}
      ${resume}

      <div class="mode-switch" role="group" aria-label="Mode">
        ${modeBtn('practice', 'Practice Mode', 'Check answers and see solutions as you go')}
        ${modeBtn('exam', 'Exam Mode', 'Timed, no feedback until you submit')}
      </div>

      ${mode === 'exam' ? renderExamSetup() + renderHistory() : `<section class="setup-card" aria-label="Practice setup">
        <div class="dd-row">
          ${dropdown('topics', 'Topics', p.topics.length ? summarize(p.topics, TOPICS.map((t) => t.id), topicName, 'All topics') : 'All topics', topicsBody, true)}
          ${dropdown('exams', 'Exams', summarize(p.exams, Object.keys(EXAMS), (id) => EXAMS[id].label, 'Both midterms'), examsBody)}
          ${dropdown('difficulties', 'Difficulty', summarize(p.difficulties, DIFFS, cap, 'Any'), diffBody)}
          ${dropdown('types', 'Question types', summarize(p.types, TYPES, typeName, 'All types'), typesBody)}
          ${dropdown('size', 'Set size', p.size === 'all' ? 'All' : `${p.size} questions`, sizeBody)}
          ${dropdown('timer', 'Timer', p.timerOn ? (minutesOk ? `${p.minutes} min` : 'Invalid') : 'Off', timerBody)}
        </div>
        <div class="start-row">
          <div class="summary"><b>${pids.length}</b> matching question${pids.length === 1 ? '' : 's'} · this set has <b>${n}</b>${p.topics.length > 2 ? ` · ${esc(topicNames(p.topics))}` : ''}</div>
          <button class="btn btn-primary btn-lg" data-action="start" ${n && minutesOk ? '' : 'disabled'}>Start practice →</button>
        </div>
      </section>`}

      <div class="notice">No account needed. Your answers, code notes and annotations are saved in <b>this browser on this device</b> and are gone if you clear site data.</div>
      <p class="disclaimer">Independent student project, not an official UC Berkeley / CS 61A service. Questions and answers are transcribed from CS 61A Fall 2025 and Spring 2025 Midterm 2 and credited on each question. Explanations were written for this prototype and are not official.</p>
    </main>`;
  }

  // ───────────────────────────── Exam setup & history (home, Exam Mode) ─────────────────────────────
  const topicLabel = (id) => TOPICS.find((t) => t.id === id).name;
  const when = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const examMinutesOk = (p) => !p.timerOn || (Number.isInteger(p.minutes) && p.minutes >= 1 && p.minutes <= EXAM_MAX_MINUTES);
  // "Exclusive — Fall 2025 MT2 — Q4 — Linked Lists, Lists & Mutation" (names repeat across exams, so the exam is always shown)
  function groupLine(pid) {
    const pr = PROBLEMS[pid];
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
    return Object.keys(PROBLEMS).filter((pid) => partsOf(pid).length &&
      (!p.topics.length || groupTopics(pid).some((t) => p.topics.includes(t))) &&
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
      const pr = PROBLEMS[pid];
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
      config = `<div class="chips" role="group" aria-label="Filter by topic">${avail.map((t) =>
        `<button class="chip" id="xt-${t.id}" data-action="xtopic" data-id="${t.id}" aria-pressed="${p.topics.includes(t.id)}">${esc(t.name)}</button>`).join('')}
        ${p.topics.length ? '<button class="link" data-action="xtopics-clear">Clear filters</button>' : ''}</div>
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
    undo: '<path d="M9 7L5 11l4 4" /><path d="M5 11h9a5 5 0 010 10h-3" />',
    redo: '<path d="M15 7l4 4-4 4" /><path d="M19 11h-9a5 5 0 000 10h3" />',
    clear: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  function renderLeft(g) {
    const pr = PROBLEMS[g.pid];
    const ex = EXAMS[pr.exam];
    const topicIds = [...new Set(g.ids.flatMap((id) => QMAP[id].topics))];
    const topics = topicIds.map((t) => `<span class="tag">${esc(TOPICS.find((x) => x.id === t).name)}</span>`).join('');
    const tool = (k, label, extra) => `<button class="ann-btn" data-ann="${k}" title="${label}" aria-label="${label}" ${extra || ''}>${icon(k)}</button>`;
    const review = isReview(cur());
    const bar = `<div class="annot-bar" id="annot-bar" role="toolbar" aria-label="Annotation tools">
        ${tool('hl', 'Highlighter (select text)', 'aria-pressed="false"')}
        ${tool('pen', 'Red pen', 'aria-pressed="false"')}
        ${tool('eraser', 'Eraser', 'aria-pressed="false"')}
        <span class="ann-sep" aria-hidden="true"></span>
        ${tool('undo', 'Undo')}${tool('redo', 'Redo')}
        ${tool('clear', 'Clear all annotations')}
        <span class="annot-hint" id="annot-hint" aria-live="polite"></span>
      </div>`;
    return `${bar}
      <article class="problem" id="problem-article" data-mode="${ui.annMode}" aria-label="Problem">
        <div class="src"><span>Source: <a href="${esc(ex.url)}" target="_blank" rel="noopener">${esc(ex.label)}</a>, Q${esc(pr.number)}</span>${topics}</div>
        <h2>${esc(pr.number)}. <span class="pts">(${pr.points.toFixed(1)} points)</span>${esc(pr.title)}</h2>
        <div class="annot-text" data-annot="intro"></div>
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
        <p class="editor-hint">${review ? 'Your review answers (below) appear in the blanks: <span class="key-fill key-mc">selected choice</span> <span class="key-fill key-typed">typed answer</span>. Edit the code freely; your submitted version is kept. <kbd>Tab</kbd> indents, <kbd>⌘/</kbd> toggles a comment.</p>' : `Your answers on the right appear in the blanks automatically: <span class="key-fill key-mc">selected choice</span> <span class="key-fill key-typed">typed answer</span>. Click a blank to jump to its part. You can also type notes or <code>#</code> comments anywhere in the code; nothing is run. <kbd>Tab</kbd> indents, <kbd>⌘/</kbd> toggles a comment.</p>`}
        <div class="annot-text" data-annot="outro"></div>
        <svg class="annot-layer" aria-hidden="true"></svg>
      </article>
      ${review ? '<section class="review-work" id="review-work" aria-label="Review workspace"></section>' : ''}`;
  }
  // Phase 6 extension point: the single "Run Code" action and its output / doctest panel for a problem's
  // Python workspace mount here (Pyodide in a Web Worker). Results will be learning feedback only: no points,
  // no change to submitted answers or scores. Nothing runs in this phase, so the slot stays empty and hidden.
  function runSlotHTML(pid) {
    return `<div class="run-slot" id="run-slot-${pid}" data-run-slot="${pid}" hidden></div>`;
  }
  // Build the left pane for a group. Runs only when the group changes, so annotations, the editor,
  // the text selection and the scroll position are never wiped by ordinary re-renders.
  function buildLeft(g) {
    const pane = document.getElementById('pane-left');
    detachEditors();
    if (leftObserver) leftObserver.disconnect();
    pane.innerHTML = renderLeft(g);
    pane.scrollTop = 0;
    leftPid = g.pid;
    mountEditor(g.pid);
    renderProse(g.pid, 'intro');
    renderProse(g.pid, 'outro');
    layoutStrokes();
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
    return `<div class="left"><div class="brand">${exam ? 'CS 61A Exam' : 'CS 61A Practice'}</div>
        <div class="set-name">${esc(s.title)} · ${exam ? `<span class="mode-tag">${isReview(s) ? 'Review' : 'Exam'}</span> · ` : ''}<button class="directions-btn" data-action="directions" aria-expanded="${ui.dirOpen}">Directions ▾</button></div></div>
      <div class="center"><span class="progress">Q ${s.index + 1} / ${s.groups.length}</span></div>
      ${timer}
      ${ui.dirOpen ? `<div class="directions" role="dialog" aria-label="Directions"><p style="margin-top:0">${esc(BUBBLE_NOTE)}</p>${directions}<p>Annotate the problem with the toolbar on the left: highlighter, red pen, eraser, undo/redo.</p><p style="margin-bottom:0">Keyboard: <code>←</code>/<code>→</code> previous/next question, <code>M</code> mark for review, <code>Esc</code> closes the question navigator.</p></div>` : ''}`;
  }
  function bannerHTML(s) {
    if (isReview(s)) return `<div class="review-banner" role="note"><span>Review workspace: edit answers and code freely. Your submitted answers and score stay as they were.</span><button class="btn btn-sm" data-action="exam-results">Back to results</button></div>`;
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
    return `<div class="left">${left}</div>
      <div class="center"><button class="nav-toggle" id="nav-toggle" data-action="toggle-nav" aria-expanded="${ui.navOpen}" aria-haspopup="dialog"${ui.navOpen ? ' aria-controls="navigator"' : ''}>Question ${s.index + 1} of ${s.groups.length} <span aria-hidden="true">${ui.navOpen ? '▾' : '▴'}</span></button></div>
      <div class="right">${right}</div>
      ${ui.navOpen ? renderNavigator(s, !exam) : ''}`;
  }
  function renderPracticeShell(s) {
    return `<div class="practice">
      <header class="p-header" id="p-header">${headerHTML(s)}</header>
      <div class="rule" aria-hidden="true"></div>
      <div id="p-banner">${bannerHTML(s)}</div>
      <div class="p-main">
        <div class="pane pane-left" id="pane-left"></div>
        <div class="pane pane-right" id="pane-right"></div>
      </div>
      <footer class="p-footer${isExam(s) ? ' exam' : ''}" id="p-footer">${footerHTML(s)}</footer>
    </div>`;
  }

  function renderResults() {
    const s = store.session;
    const counts = { correct: 0, incorrect: 0, ungraded: 0, skipped: 0 };
    const rows = s.groups.map((g, gi) => g.ids.map((id) => {
      const q = QMAP[id];
      const pr = PROBLEMS[q.problem];
      const st = statusOf(s, id);
      counts[st]++;
      const label = { correct: 'Correct', incorrect: 'Incorrect', ungraded: 'Not graded', skipped: 'Unanswered' }[st];
      return `<button class="result-row" data-action="review" data-i="${gi}" data-q="${id}">
        <span class="n">${gi + 1}${g.ids.length > 1 ? `<small>${esc(q.label)}</small>` : ''}</span>
        <span class="t">${esc(EXAMS[pr.exam].label)} Q${esc(pr.number)} ${esc(q.label)}: ${esc(pr.title)}<small>${TYPE_LABEL[q.type]}${s.marked[g.pid] ? ' · marked for review' : ''}${s.revealed[id] ? ' · solution viewed' : ''}</small></span>
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
        <button class="btn" data-action="home">New set</button>
      </div>
      <div class="result-list">${rows}</div>
      <p class="hint">Click a part to go back to it. Multiple-choice answers are graded automatically. For written answers, show the solution and grade yourself.</p>
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
    const order = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));
    const topics = Object.values(tally).sort((x, y) => y.parts.length - x.parts.length || order[x.id] - order[y.id]);
    const unanswered = a.ids.filter((id) => statusIn(a, id) === 'skipped').length;
    return { missed, topics, unanswered, staff: a.ids.filter((id) => statusIn(a, id) === 'staff').length };
  }
  // Up to `n` existing question groups tagged with the topic. Groups outside this attempt come first; ranking is
  // deterministic: more parts tagged with the topic first, then question-bank order. A group is never repeated.
  function recommend(topic, a, used, n) {
    const inAttempt = new Set(a.groups.map((g) => g.pid));
    const rank = Object.keys(PROBLEMS)
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
        const pr = PROBLEMS[r.pid];
        return `<li class="rec-row"><span class="rec-txt"><b>${esc(pr.title)}</b> <span class="hint">${esc(EXAMS[pr.exam].label)} · Q${esc(pr.number)} · ${partsOf(r.pid).length} part${partsOf(r.pid).length === 1 ? '' : 's'}${r.fromAttempt ? ' · also in this exam' : ''}</span></span>
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
    const groups = a.groups.map((g, gi) => {
      const pr = PROBLEMS[g.pid];
      const c = { correct: 0, incorrect: 0, skipped: 0, staff: 0 };
      g.ids.forEach((id) => { c[statusIn(a, id)]++; });
      const summary = ['correct', 'incorrect', 'skipped', 'staff'].filter((k) => c[k]).map((k) => `${c[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(' · ');
      return `<details class="rq-group"${c.incorrect ? ' open' : ''}>
        <summary><span class="rq-n">${gi + 1}</span><span class="rq-title">${esc(pr.title)}<small>${esc(EXAMS[pr.exam].label)} · Q${esc(pr.number)} · ${g.ids.length} part${g.ids.length === 1 ? '' : 's'}</small></span><span class="rq-sum">${summary}</span></summary>
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
        <button class="btn" data-action="home">Back to home</button>
      </div>
      <h2 class="rq-h">Questions</h2>
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
      right.innerHTML = isReview(s) ? renderReviewRight(g, s) : renderRight(g, s);
      right.dataset.group = g.pid;
      if (!sameGroup) right.scrollTop = 0;
      if (leftPid !== g.pid) buildLeft(g);
      const work = document.getElementById('review-work'); // review: the editable answers live under the problem
      if (work) work.innerHTML = renderReviewWork(g, s);
      fillBlanks(editors[g.pid]);
      document.title = `Q${s.index + 1} · ${isExam(s) ? (isReview(s) ? 'Exam review' : 'Exam') : 'CS 61A Practice'}`;
    } else {
      detachEditors();
      if (leftObserver) leftObserver.disconnect();
      leftPid = null;
      app.dataset.shell = '';
      app.innerHTML = ui.screen === 'results' ? renderResults() : ui.screen === 'exam-results' ? renderExamResults(attemptById(ui.attemptId))
        : ui.screen === 'landing' ? renderLanding() : renderHome();
      document.title = ui.screen === 'exam-results' ? 'Exam results · CS 61A Practice' : 'CS 61A Practice';
    }

    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel && el.setSelectionRange) el.setSelectionRange(sel[0], sel[1]);
      }
    }
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
      case 'landing': ui.screen = 'landing'; ui.menu = null; break;
      case 'menu': ui.menu = ui.menu === btn.dataset.id ? null : btn.dataset.id; break;
      case 'topics-all': p.topics = TOPICS.filter((t) => QUESTIONS.some((x) => x.topics.includes(t.id))).map((t) => t.id); break;
      case 'topics-none': p.topics = []; break;
      case 'start':
        ui.menu = null;
        if (store.session && !store.session.finished && !confirm('Starting a new set replaces your unfinished one. Continue?')) return;
        startFromPrefs(); return;
      case 'resume': setView('practice'); ui.screen = 'practice'; ui.menu = null; break;
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
        if (!PROBLEMS[pid]) return;
        if (store.session && !store.session.finished && !confirm('Practicing this question replaces your unfinished practice set. Continue?')) return;
        const pr = PROBLEMS[pid];
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
  app.addEventListener('mousedown', (e) => { if (e.target.closest('#annot-bar')) e.preventDefault(); });
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ann]');
    if (!b || b.disabled || !leftPid) return;
    const k = b.dataset.ann;
    if (k === 'hl') {
      if (highlightSelection()) { if (ui.annMode !== 'hl') setAnnMode('hl'); } else setAnnMode('hl');
    } else if (k === 'pen' || k === 'eraser') setAnnMode(k);
    else if (k === 'undo') undo(leftPid);
    else if (k === 'redo') redo(leftPid);
    else if (k === 'clear') {
      const list = anns(leftPid);
      if (!list.length || !confirm('Clear all highlights and drawings for this question?')) return;
      commit(leftPid, list.slice().map((a) => ({ op: 'remove', ann: a })));
      announce('Annotations cleared. Use Undo to restore them.');
    }
  });
  // In highlighter mode, finishing a selection in the left pane highlights it.
  document.addEventListener('mouseup', (e) => {
    if (ui.annMode !== 'hl' || !leftPid || !e.target.closest || !e.target.closest('#problem-article')) return;
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
      if (pref === 'size') p.size = el.value === 'all' ? 'all' : Number(el.value);
      else toggleIn(p[pref], el.value);
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
      const right = document.getElementById('pane-right');
      if (right) right.innerHTML = renderReviewRight(curGroup(), s);
      return;
    }
    if (hadState) render(); // refresh Check button / stale feedback
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (ui.navOpen || ui.dirOpen || ui.confirmReveal || ui.menu) {
        const wasNav = ui.navOpen;
        ui.navOpen = ui.dirOpen = false; ui.confirmReveal = null; ui.menu = null; render();
        if (wasNav) focusEl('nav-toggle');
        return;
      }
      if (ui.annMode !== 'none') { setAnnMode(ui.annMode); return; }
    }
    if (ui.screen !== 'practice' || e.metaKey || e.ctrlKey || e.altKey) return;
    // Never steal keys from editing: answer boxes, CodeMirror's hidden textarea, choices, contenteditable.
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || e.target.isContentEditable || e.target.closest('.CodeMirror')) return;
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

  // Attempts submitted before grades were frozen get their snapshot now, once; after that it never changes.
  store.attempts.forEach((a) => { if (!a.graded || !a.score || a.score.v !== 2) Object.assign(a, gradeAttempt(a)); });

  // An exam that was never explicitly left (refresh, crash, closed tab) reopens straight into the exam,
  // with its clock having kept running; one whose time ran out meanwhile is submitted as of expiry.
  if (store.exam) {
    const t = store.exam.timer;
    if (t && t.runningSince && timeLeft(t) <= 0) submitExam(true);
    else if (!store.exam.leftAt) { setView('exam'); ui.screen = 'practice'; }
  }
  render();
})();
