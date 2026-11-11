// First-visit tour: a welcome prompt on the home page, then one-time tips that point at each feature the first
// time it is on screen (in Practice, an exam or a review alike). A tip dims the page except what it points at.
// app.js calls update() after every render. Progress lives under its own localStorage key, apart from the app's
// store, so it never touches saved work.
window.CS61A_TOUR = (function () {
  'use strict';

  const KEY = 'cs61a-practice:tour';
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v === 'object') return { asked: !!v.asked, on: !!v.on, seen: v.seen && typeof v.seen === 'object' ? v.seen : {} };
    } catch (e) { /* unreadable: start fresh */ }
    return { asked: false, on: false, seen: {} };
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: the tour lasts this visit */ }
  }

  const visible = (el) => !!el && el.isConnected && el.getClientRects().length > 0;
  const one = (sel) => () => { const el = document.querySelector(sel); return visible(el) ? [el] : null; };
  // A blank in the code and the answer on the right that fills it.
  function blankPair() {
    const slots = Array.from(document.querySelectorAll('#pane-left .cm-slot'));
    for (const part of document.querySelectorAll('#right-body .part[data-blank]')) {
      const slot = part.dataset.blank && slots.find((s) => s.dataset.blank === part.dataset.blank);
      const answer = part.querySelector('.answer-box, .choices') || part;
      if (visible(slot) && visible(answer)) return [slot, answer];
    }
    return null;
  }

  // Directions in Practice or a live exam: the tip opens the panel (see update) and points at it and its button.
  const dirButton = (view) => document.querySelector(`.practice[data-view="${view}"] .directions-btn`);
  const directions = (view) => ({
    id: `directions-${view}`,
    ready: () => visible(dirButton(view)),
    find: () => { const b = dirButton(view), panel = document.querySelector('.directions'); return visible(b) && visible(panel) ? [b, panel] : null; },
    after: () => hooks.directions(false),
    title: 'Start with the directions',
    html: `<p>${view === 'exam' ? 'How exams work here: the rules, the timer and Save &amp; Leave.' : 'How Practice Mode works: answering, checking and solutions.'}</p><p>You can open these again any time from <b>Directions</b> at the top.</p>`,
  });
  const dgStep = (id, title, html, demo) => ({ id, find: one('.dg[open]'), title, html, demo });

  // In order: when several are on screen at once, they are shown one after another.
  const STEPS = [
    { id: 'modes', find: one('.home .mode-switch'), title: 'Choose a mode',
      html: '<p><b>Practice Mode</b> lets you check answers and see solutions as you go. <b>Exam Mode</b> is a timed exam with no feedback until you submit: a full past midterm, or questions you pick by topic (including <b>Gleam</b>).</p><p>In Practice Mode, choose a <b>Language</b> first (Python, Gleam, or All). Then set it up below, and start.</p>' },
    directions('practice'),
    directions('exam'),
    // The first scope note on screen (data/in_scope.js), in the left pane or beside a part.
    { id: 'scope', find: one('.scope-note'), title: 'Scope notes',
      html: '<p>Some past-exam questions use ideas that aren’t taught this semester. Parts that depend on them have been removed, so you won’t see them.</p><p>When a question is still in scope but touches one of those ideas, a yellow note like this one explains what you can ignore.</p>' },
    { id: 'annotate', find: one('#annot-bar'), title: 'Mark up the problem',
      html: () => `<p>Use these tools on the problem. Your marks are saved with this question.</p>${hooks.annTools()}` },
    { id: 'notes', find: one('#annot-bar [data-ann="note"]'), title: 'Sticky notes', demo: 'note',
      html: '<p>Click the note tool and a note appears in the middle of the page, ready to type. Its own toolbar can highlight, draw, erase and add a <b>tree</b> (<b>+</b> adds a branch, <b>×</b> removes one).</p><p>Drag the top bar to move a note (even to the right side), the corner to resize it, and <b>–</b> to tuck it into the bar at the bottom. Click its numbered icon there to bring it back.</p>' },
    { id: 'blanks', find: blankPair, title: 'Your answers fill the code',
      html: '<p>What you choose or type for a part on the right appears in its blank in the code on the left, so you can read your whole solution in place.</p><p>Click a blank in the code to jump to its part.</p>' },
    // Worded for the language of the question on screen (app.js marks the Run Code slot with data-lang).
    { id: 'run', find: one('#run-btn'), title: 'Run Code',
      html: () => {
        const slot = document.querySelector('.run-slot[data-lang]');
        const gleam = slot && slot.dataset.lang === 'gleam';
        return (gleam
          ? '<p><b>Run Code</b> compiles and runs the code in the editor with Gleam, right in your browser, and shows any compile error. It also runs the question’s tests (its own <code>assert</code>s plus a few added cases) and shows how many pass, so you can see if your code is right.</p>'
          : '<p><b>Run Code</b> runs the code in the editor with Python, right in your browser. When the question has verified tests, it also runs its doctests and shows how many pass, so you can see if your code is right.</p>')
          + '<p>It isn’t available during an exam, only in Practice Mode and when you review an exam.</p>';
      } },
    // Shows only once the Python Tutor button is on the page (it ships separately from the tour).
    { id: 'tutor', find: one('#tutor-btn'), title: 'Python Tutor',
      html: '<p><b>Python Tutor</b> opens this code in a new tab and steps through it line by line, drawing the environment diagram as it runs.</p><p>If the code has blanks, it unlocks once every blank is filled. Your answers don’t have to be right.</p>' },
    { id: 'mark', find: one('.mark-btn'), title: 'Mark for Review',
      html: '<p>Not sure about a question? <b>Mark it for review</b> to flag it in the question navigator, so you can find it and come back later.</p><p>Shortcut: <kbd>M</kbd>.</p>' },
    dgStep('dg-icons', 'Environment diagram', () => `<p>Draw the diagram right on the picture. Scratch work: it isn’t graded, and it’s saved in this browser.</p>${hooks.dgTools()}`),
    dgStep('dg-value', 'Add a value', '<p>Click a blank, or anywhere on the diagram, and type.</p>', 'value'),
    dgStep('dg-list', 'Make a list', '<p>Pick <b>New list</b> and click where the list goes. <b>+</b> adds a cell, <b>−</b> removes the last one. Click a cell to type in it.</p>', 'list'),
    dgStep('dg-arrow', 'Connect with an arrow', '<p>Pick <b>Arrow</b>, click the value it starts from, then click what it points to. The end follows your cursor until you click, and snaps into place.</p>', 'arrow'),
    { id: 'insights', find: one('#insights'), title: 'Learning insights',
      html: '<p>After an exam, this shows the topics behind the parts you missed, with study-guide notes for each and similar questions to practice.</p>' },
  ];

  // From app.js: hold(true) pauses a running countdown while a tip is up; directions(open) shows or hides the
  // Directions panel; annTools() and dgTools() list each toolbar's icons with their names and uses; icon(k) is one icon.
  let hooks = { hold() {}, directions() {}, annTools: () => '', dgTools: () => '', icon: () => '' };
  let open = null;           // { step, targets, root, card, ring[], dim, back } while something is on screen
  let follow = null;
  const trail = [];   // tips left with Next, most recent last, for Back
  let prefer = null;  // a tip Back asked for, tried before the usual order

  function close() {
    if (!open) return;
    clearInterval(follow);
    open.root.remove();
    const app = document.getElementById('app');
    if (app && !document.querySelector('.stale-overlay')) app.inert = false;
    const back = open.back;
    open = null;
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }

  function build(card, cls) {
    const root = document.createElement('div');
    root.className = `tour ${cls}`;
    root.innerHTML = `<svg class="tour-dim" aria-hidden="true"><path fill-rule="evenodd"></path></svg>
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">${card}</div>`;
    document.body.appendChild(root);
    document.getElementById('app').inert = true; // only the card can be clicked or tabbed to
    return root;
  }

  function showWelcome() {
    const back = document.activeElement;
    const root = build(`<h2 id="tour-title">Welcome! Take a quick tour?</h2>
      <p>A few short tips point out each feature the first time you reach it. Each tip shows only once.</p>
      <p class="hint">You can replay it any time with <b>Replay the tutorial</b> on the home page.</p>
      <div class="tour-actions"><button class="btn btn-ghost" data-tour="no">No thanks</button><button class="btn btn-primary" data-tour="start">Start tour</button></div>`, 'tour-welcome');
    open = { step: null, targets: [], root, card: root.querySelector('.tour-card'), rings: [], back };
    place();
    root.querySelector('[data-tour="start"]').focus();
  }

  function showStep(step, targets) {
    const back = document.activeElement;
    const more = STEPS.some((s) => s !== step && !state.seen[s.id] && s.find());
    const last = STEPS.find((s) => s.id === trail[trail.length - 1]);
    const canBack = !!last && !!(last.find() || (last.ready && last.ready())); // only if that tip's feature is on this screen
    prefer = null;
    const html = typeof step.html === 'function' ? step.html() : step.html;
    const root = build(`<p class="tour-kicker">Tip</p><h2 id="tour-title">${step.title}</h2>${html}
      ${step.demo ? `<div class="tour-demo" data-demo="${step.demo}" aria-hidden="true"></div>` : ''}
      <div class="tour-actions"><button class="btn btn-ghost btn-sm tour-end" data-tour="end">End tutorial</button>${canBack ? '<button class="btn btn-sm" data-tour="back">Back</button>' : ''}<button class="btn btn-primary btn-sm" data-tour="next">${more ? 'Next' : 'Got it'}</button></div>`, 'tour-tip');
    root.dataset.step = step.id;
    const rings = targets.map(() => root.appendChild(Object.assign(document.createElement('div'), { className: 'tour-ring' })));
    open = { step, targets, root, card: root.querySelector('.tour-card'), rings, back };
    hooks.hold(true);
    place();
    setTimeout(() => { if (open && open.step === step) reveal(targets); }); // after the app's own scrolling (e.g. back to the top)
    follow = setInterval(place, 150); // layout keeps settling (editor, images), so the highlight follows it
    root.querySelector('[data-tour="next"]').focus();
    if (step.demo) play(step.demo, root.querySelector('.tour-demo'));
  }

  // ── Demos (diagram tools, sticky notes): a small looping animation inside the card, with a cursor that pulses on every click ──
  const PACE = 0.5; // demo speed: every duration below is scaled by this (0.5 = twice as fast)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * PACE));
  const el = (parent, cls, x, y, html) => {
    const e = document.createElement('div');
    e.className = cls;
    Object.assign(e.style, { left: `${x}px`, top: `${y}px` });
    if (html !== undefined) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  };
  async function play(kind, stage) {
    const alive = () => stage.isConnected;
    while (alive()) {
      stage.innerHTML = '';
      const ink = stage.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
      ink.setAttribute('class', 'td-ink');
      ink.innerHTML = '<defs><marker id="td-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';
      const cursor = el(stage, 'td-cursor', 0, 0, '<svg viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.2 3 6.7 2.8-1.3-3-6.5H14z"/></svg>');
      let at = [250, 130];
      const put = (p) => { at = p; cursor.style.transform = `translate(${p[0]}px, ${p[1]}px)`; };
      put(at);
      const move = async (to, ms = 650, onStep) => {
        const from = at, t0 = performance.now();
        ms *= PACE;
        for (;;) {
          const k = Math.min(1, (performance.now() - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          put([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
          if (onStep) onStep(at);
          if (k === 1 || !alive()) return;
          await new Promise((r) => requestAnimationFrame(r));
        }
      };
      const click = async () => { cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click'); await sleep(400); }; // the bounce itself stays visible (CSS .2s)
      const type = async (box, text) => { box.classList.add('typing'); for (const ch of text) { await sleep(170); box.textContent += ch; } await sleep(200); box.classList.remove('typing'); };
      const tools = (keys) => { const bar = el(stage, 'td-bar', 8, 8); return Object.fromEntries(keys.map((k) => [k, el(bar, 'td-tool', 0, 0, hooks.icon(k))])); };
      const frame = () => el(stage, 'td-frame', 14, 52, '<span class="td-label">Global</span><span class="td-var">s</span>');
      const slotAt = [94, 87];

      if (kind === 'value') {
        el(stage, 'td-frame', 14, 30, '<span class="td-label">Global</span><span class="td-var">s</span>');
        const slot = el(stage, 'td-slot', 74, 56);
        await sleep(400);
        await move([90, 64]); await click();
        slot.classList.add('active'); await type(slot, '5');
        await move([200, 60]); await click();
        const box = el(stage, 'td-box', 190, 50); await type(box, "'hi'");
      } else if (kind === 'list') {
        const t = tools(['select', 'list', 'arrow']);
        await sleep(400);
        await move([44, 18]); await click(); t.list.classList.add('on');
        await move([120, 80]); await click();
        const list = el(stage, 'td-list', 110, 70);
        const cells = el(list, 'td-cells', 0, 0);
        const btns = el(list, 'td-btns', 0, 0, '<span>+</span><span>−</span>');
        const cell = () => el(cells, 'td-cell', 0, 0);
        cell();
        await sleep(300);
        for (let i = 0; i < 2; i++) {
          const plus = btns.firstChild.getBoundingClientRect(), s = stage.getBoundingClientRect();
          await move([plus.left - s.left + 4, plus.top - s.top + 5], 500); await click(); cell();
        }
        const all = Array.from(cells.children), s = stage.getBoundingClientRect();
        for (let i = 0; i < all.length; i++) {
          const r = all[i].getBoundingClientRect();
          await move([r.left - s.left + 8, r.top - s.top + 8], 380); await click();
          all[i].classList.add('active'); await type(all[i], String(i + 1)); all[i].classList.remove('active');
        }
      } else if (kind === 'arrow') {
        const t = tools(['select', 'list', 'arrow']);
        frame();
        const slot = el(stage, 'td-slot', 74, 78);
        const list = el(stage, 'td-list', 200, 100);
        const cells = el(list, 'td-cells', 0, 0, '<div class="td-cell">1</div><div class="td-cell">2</div>');
        await sleep(400);
        await move([72, 18]); await click(); t.arrow.classList.add('on');
        await move(slotAt); await click();
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', slotAt[0]); line.setAttribute('y1', slotAt[1]);
        ink.appendChild(line);
        const follow = (p) => { line.setAttribute('x2', p[0]); line.setAttribute('y2', p[1]); };
        follow(slotAt);
        await sleep(250);
        await move([170, 40], 700, follow); // the end follows the cursor around
        const r = cells.getBoundingClientRect(), s = stage.getBoundingClientRect();
        const target = [r.left - s.left, r.top - s.top + r.height / 2];
        await move([target[0] + 10, target[1]], 700, follow); await click();
        follow(target); line.classList.add('done'); // snapped onto the list
      } else if (kind === 'note') {
        // One click on the note button makes a note in the middle; type in it, add a tree with the note's own tree tool
        // (6 → 4, 2), then minimize the note into its numbered icon in the bottom bar and click the icon to bring it back.
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const t = tools(['hl', 'pen', 'eraser', 'note']);
        el(stage, 'td-foot', 0, H - 28, '<span class="td-exit">← Exit</span><span class="td-qbtn">Question 1 ▴</span>');
        const center = (node) => { const r = node.getBoundingClientRect(), b = stage.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; };
        await sleep(400);
        await move(center(t.note)); await click();
        const nx = 16;
        const ny = 46;
        const nw = W - 32;
        const nh = H - ny - 38;
        const note = el(stage, 'td-note', nx, ny, `<div class="td-note-bar">Note 1</div><span class="td-nmin">–</span><div class="td-ntools">${['select', 'hl', 'pen', 'eraser', 'tree'].map((k) => `<span data-k="${k}">${hooks.icon(k)}</span>`).join('')}</div><span class="td-ntext"></span><svg class="td-note-ink"><defs><marker id="td-head-n" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs><g></g></svg><div class="td-grip"></div>`);
        Object.assign(note.style, { width: `${nw}px`, height: `${nh}px` });
        if (note.animate) note.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' }); // it pops up in the middle
        const ntool = (k) => note.querySelector(`.td-ntools [data-k="${k}"]`);
        ntool('select').classList.add('on');
        const nodes = [];
        const R = 11;
        const rx = Math.round(nw * 0.68);
        const ry = 56;
        const ky = ry + 46;
        const layout = () => {
          const kids = nodes.slice(1);
          const xs = kids.length === 1 ? [rx] : [rx - 26, rx + 26];
          const spot = (n, cx, cy) => Object.assign(n.style, { left: `${cx - R}px`, top: `${cy - R}px` });
          if (nodes[0]) spot(nodes[0], rx, ry);
          kids.forEach((k, i) => spot(k, xs[i], ky));
          note.querySelector('.td-note-ink g').innerHTML = kids.map((k, i) => {
            const dx = xs[i] - rx, dy = ky - ry, len = Math.hypot(dx, dy);
            return `<line x1="${rx + dx / len * R}" y1="${ry + dy / len * R}" x2="${xs[i] - dx / len * (R + 1)}" y2="${ky - dy / len * (R + 1)}"/>`;
          }).join('');
        };
        await sleep(250);
        await type(note.querySelector('.td-ntext'), 'base case: a leaf');
        // the note's tree tool, then a click in the note places a tree
        await move(center(ntool('tree')), 450); await click();
        ntool('select').classList.remove('on'); ntool('tree').classList.add('on');
        await move([nx + rx, ny + ry], 500); await click();
        ntool('tree').classList.remove('on'); ntool('select').classList.add('on');
        const node = () => { const n = el(note, 'td-node', 0, 0, '<span class="td-lbl"></span>'); nodes.push(n); layout(); return n.firstChild; };
        const root = node();
        const plus = el(nodes[0], 'td-plus', 0, 0, '+');
        await type(root, '6');
        nodes[0].classList.add('show');
        for (const label of ['4', '2']) { // + on the root adds a branch
          await move(center(plus), 420); await click();
          await type(node(), label);
        }
        nodes[0].classList.remove('show');
        await sleep(500);
        // minimize: the note is pulled into its numbered icon in the bottom bar
        await move(center(note.querySelector('.td-nmin')), 500); await click();
        const dock = el(stage, 'td-dock', Math.round(W * 0.27), H - 25, '1'); // between Exit and the question button
        const d = center(dock);
        note.style.transformOrigin = `${d[0] - nx}px ${d[1] - ny}px`;
        const frames = [{ transform: 'none', opacity: 1 }, { transform: 'scale(.9, .78)', opacity: 1, offset: 0.45 }, { transform: 'scale(.05)', opacity: 0.3 }];
        if (note.animate) await note.animate(frames, { duration: 440, easing: 'cubic-bezier(.55, 0, .8, .3)', fill: 'forwards' }).finished.catch(() => {});
        note.style.visibility = 'hidden';
        dock.classList.add('show');
        await sleep(700);
        // the icon brings it back
        await move([d[0] + 3, d[1] + 3], 550); await click();
        dock.classList.remove('show');
        note.style.visibility = '';
        if (note.animate) await note.animate(frames.slice().reverse().map((k, i) => Object.assign({}, k, { offset: [0, 0.55, 1][i] })), { duration: 440, easing: 'cubic-bezier(.2, .7, .45, 1)' }).finished.catch(() => {});
        note.getAnimations().forEach((a) => a.cancel());
        note.style.transform = 'none';
        note.dataset.reopened = '1';
        await move([nx + nw - 40, ny + nh - 30], 500);
      }
      await sleep(2400); // hold the finished result a moment before looping
    }
  }

  // Cut a hole in the dimmed layer around each target and put the card beside them.
  function place() {
    if (!open) return;
    const vw = window.innerWidth, vh = window.innerHeight, pad = 6;
    const rects = open.targets.map((t) => {
      const r = t.getBoundingClientRect();
      return { x: r.left - pad, y: r.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad };
    });
    const dim = open.root.querySelector('.tour-dim');
    dim.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    dim.querySelector('path').setAttribute('d', `M0 0H${vw}V${vh}H0Z` + rects.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`).join(''));
    rects.forEach((r, i) => Object.assign(open.rings[i].style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }));
    if (!rects.length) return; // the welcome card is centered by CSS
    // First spot (below, above, right of, left of each target) that fits on screen without covering a target.
    const card = open.card;
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 12, edge = 16;
    const fit = (x, y) => ({ x: Math.max(edge, Math.min(x, vw - cw - edge)), y: Math.max(edge, Math.min(y, vh - ch - edge)) });
    const covers = (p) => rects.some((r) => p.x < r.x + r.w && p.x + cw > r.x && p.y < r.y + r.h && p.y + ch > r.y);
    const spots = rects.flatMap((r) => [fit(r.x, r.y + r.h + gap), fit(r.x, r.y - gap - ch), fit(r.x + r.w + gap, r.y), fit(r.x - gap - cw, r.y)]);
    const p = spots.find((s) => !covers(s)) || fit(vw, vh); // nowhere free: bottom right corner
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
  }
  // Bring the targets into view: small ones centered, tall ones from their top.
  function reveal(targets) {
    targets.forEach((t) => t.scrollIntoView({ block: t.getBoundingClientRect().height > window.innerHeight * 0.4 ? 'start' : 'center', inline: 'nearest' }));
    place();
  }

  function update() {
    if (open) {
      if (!open.step) return; // the welcome prompt waits for an answer
      if (open.targets.every(visible)) { place(); return; }
      close(); // a re-render replaced what the tip points at: find it again below
    }
    if (!state.asked) { if (visible(document.querySelector('.home .mode-switch'))) showWelcome(); return; }
    if (state.on) {
      const wanted = STEPS.find((s) => s.id === prefer);
      for (const step of wanted ? [wanted, ...STEPS] : STEPS) {
        if (state.seen[step.id]) continue;
        const targets = step.find();
        if (targets) { showStep(step, targets); return; }
        if (step.ready && step.ready()) { hooks.directions(true); return; } // opens the panel; its render calls update again
      }
    }
    hooks.hold(false);
  }

  function answer(kind) {
    if (kind === 'start') Object.assign(state, { asked: true, on: true });
    else if (kind === 'no') Object.assign(state, { asked: true, on: false });
    const step = open.step;
    if (kind === 'next') { state.seen[step.id] = true; trail.push(step.id); }
    else if (kind === 'back') { prefer = trail.pop(); delete state.seen[prefer]; }
    else if (kind === 'end') state.on = false;
    save();
    close();
    if (step && step.after) step.after();
    update();
  }
  document.addEventListener('click', (e) => {
    const b = open && e.target.closest('[data-tour]');
    if (b) answer(b.dataset.tour);
  });
  // While something is up, keys stay with the card: the app's shortcuts (←/→, M, Esc) don't fire behind it.
  window.addEventListener('keydown', (e) => {
    if (!open) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); answer(open.step ? 'next' : 'no'); }
  }, true);
  // Presses don't reach the page either: its "click outside closes Directions" would take the tip's target away mid-click.
  ['pointerdown', 'mousedown', 'mouseup', 'pointerup'].forEach((t) => window.addEventListener(t, (e) => { if (open) e.stopPropagation(); }, true));
  window.addEventListener('resize', () => place());
  window.addEventListener('scroll', () => place(), true);

  return {
    init(h) { hooks = Object.assign(hooks, h); },
    update,
    replay() { state = { asked: true, on: true, seen: {} }; trail.length = 0; save(); close(); update(); },
  };
})();
