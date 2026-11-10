# CS 61A Practice: prototype

A no-login, browser-based practice tool for CS 61A, laid out like the Digital SAT (problem on the left, answer on the right, timer at the top right). It is seeded with questions from CS 61A **Midterm 2** of **Fall 2025**, **Spring 2025**, **Fall 2024**, **Spring 2024**, **Fall 2023**, **Spring 2023**, **Fall 2022** and **Fall 2021** (`mt2/`).

## Run it

There is no build step and nothing to install. Open `app/index.html` in a browser.

To serve it instead:

```sh
cd app && python3 -m http.server 8000   # then visit http://localhost:8000
```

To deploy, upload the `app/` folder to any static host (Netlify drop, Vercel, GitHub Pages).

## What's in the prototype

- **Landing page:** the `assets/home_page.jpg` banner. Clicking anywhere goes to setup.
- **Setup:** dropdown menus for Topics (with question counts), Exams, Difficulty and Timer (off, or 1–60 minutes), and a Set size number box: 1 up to the number of matching question groups, default 5, typed or stepped with its arrows. A set always includes every part of each question it picks.
- **Language (Practice Mode):** Python, Gleam, or SQL (greyed out, "Coming soon"). Each language has its own question bank, topics and sources, and keeps its own topic and source choices when you switch. For Gleam, the second menu is **Sources** instead of Exams. Exam Mode is unchanged and Python only: Gleam questions never appear in it.
- **Gleam questions** (`app/data/gleam_questions.js`): 20 problems (69 parts) from the Fall 2026 TA exam-prep worksheets (weeks 11 and 12, which have official solutions) and the Example / Exercise problems of lectures 28 and 29 (answers from the slide after each one). Their Python questions (an efficiency question and a linked-list question) are left out. Lab, homework and discussion questions aren't included yet, because they have no solutions. Topics: Lists & Pattern Matching, Recursion & Tail Recursion, Higher-Order Functions, Custom Types, Dictionaries, Result, Immutable Data, Interpreters (no questions yet). A worksheet part that asks for two or three blanks together is split into one part per blank, each graded on its own; such parts show no points of their own. Lecture examples have no points and cite their slide. Topics, difficulty levels (see `docs/difficulty-guide.md`) and explanations were written for this site.
- **Gleam questions on screen:** the same layout as Python, with a Gleam editor (syntax colours, 2-space indents, `//` comments) and Run Code that compiles and runs Gleam. There is no Python Tutor and no environment diagram, and the Practice Summary has no walkthrough videos.
- **Practice:** a split pane. Each question is a **group**: all of its parts (i, ii, iii…) are shown together on the right.
  - The left side shows the shared problem text and an **editable Python editor** (CodeMirror, dark theme, line numbers), where you can type notes, comments, or your own solution. Nothing is run.
  - **Answers fill the code:** picking a choice, or typing an answer, shows it in that part's blank right away. Selected choices are blue, typed answers green, and the active part's blank is outlined. Click a blank to jump to its part.
  - **Annotation toolbar** (top of the left pane): highlighter (select text or code), red pen (freehand), eraser (click or drag), sticky notes, undo/redo, and clear all (asks first). Each question keeps its own annotations.
  - **Sticky notes:** click the note button and a numbered note (Note 1, Note 2, …) appears in the middle of the page, ready to type (a second one steps down and to the right so it doesn't cover the first). Each note has its own toolbar: **Type and move** (click empty space to start a text box, which is as wide as its text and wraps at the note's edge or at a tree beside it; drag a text box or tree by the dotted strip on top of it, or a tree by its background), **highlighter** (select text, or click a tree node; light blue), **red pen**, **eraser**, **tree** (click to place a tree: **+** on a node adds a branch, **×** removes that node with everything below it; arrows and layout are drawn automatically), then undo / redo for that note, delete selected, and clear this note. Text boxes and trees never overlap: one dropped on another slides to the nearest free spot, and one that grows pushes what it reaches downward. A drawing made on a text box or tree moves with it. Drag the top bar to move a note, the corner to resize it: resizing only adds or removes space (never smaller than what is in it), and the note grows on its own when its contents need room. A note can go anywhere, left or right side: it scrolls with the side it is on, and dragging it across the divider moves it there. **–** minimizes a note into a numbered icon in the bottom bar, between Exit and the question button (on a phone, just above the bar; hover: "1st note", "2nd note", in the order the notes were made); clicking the icon brings it back where it was. Both play a short animation. Notes are included in the main undo/redo and clear all (minimizing isn't an undo step); the tutorial has a short animation showing them.
  - Code edits and annotations are saved with the practice set (or exam attempt) they were made in, so resuming brings them back and a new set starts clean. **Reset code** restores the original code and keeps your answers.
  - The right side shows each part in the exam's own format: **round bubbles** for "select exactly one", **square checkboxes** for "select all that apply", and a bordered answer box for written answers.
- **Grading:**
  - **Check Answer** grades the response. **Show Solution** asks for confirmation, then shows the official answer and an explanation.
  - Short answers are compared to the official answer and accepted equivalents, ignoring spaces and quote style.
  - When an answer doesn't match exactly, you can mark it right or wrong yourself.
  - Code questions (the A+ problems) are self-check only.
- **Timer:** works from timestamps, so it stays accurate across tab switches and reloads. It has pause, resume, reset, and hide. At 00:00 it shows a banner, and your answers are kept.
- **Navigator:** a "Question N of M" popover showing which questions are answered, unanswered, or marked for review. Keyboard: `←`/`→` move between questions, `M` marks for review.
- **Run Code:** in Practice Mode and in the editable exam review, **Run Code** under the scratch editor runs the code with Python in your browser ([Pyodide](https://pyodide.org) 0.26.4 in a Web Worker) and shows the console output and any error. It runs exactly what the editor shows, with your current answers in the blanks; an unanswered blank fails as a syntax error. Each run starts with fresh globals, and a run is stopped after 5 seconds (the worker is restarted). Running is feedback only: it never changes answers, grades or scores, and it is turned off during a live exam.
- **Verified tests:** when a question has a *verified* test suite in `app/data/test_suites.js`, the same Run Code click also runs its doctest cases and shows PrairieLearn-style results ("Passed 3/5 tests", with expandable Input / Expected / Actual per case). Each case runs in a fresh namespace; a case that runs over 5 seconds is marked "Timed out" and the remaining cases "Not run" (never counted as passed). Questions without a verified suite show Console Output only.
- **Verified test bank:** 40 coding problems from the six midterms have suites: the exam's own doctests plus added boundary cases, each labelled "From the exam" or "Added". What Would Python Display, environment-diagram and order-of-growth questions have none, and neither do sp25 Q3(b) and sp24 Q4(b), where a wrong choice runs exactly like the official answer, so tests can't tell them apart, or fa23 Q4(a), whose select-all blank has three correct options. fa23 Q5(e) and sp23 Q2(b) have none because their code can't run without part (a)'s definitions, and Run Code runs the student's code on its own before any tests. Suites that need the course's `Link`/`Tree` classes, or functions from earlier parts, provide them in a setup that is named under the results. Every suite is validated by `tests/verify_test_bank.js`: it must pass with the official solution and every accepted answer, and fail for every wrong multiple-choice option and a list of plausible wrong answers (645 versions). The suites were generated and validated by Claude Code and have not been reviewed by course staff.
  - Needs an internet connection the first time: Python (about 10 MB) is downloaded from the jsDelivr CDN, then cached by the browser. It works both when the site is served and when `index.html` is opened directly.
  - Code that uses the course's `Link` or `Tree` classes needs those definitions in the editor; the runner doesn't add them.
- **Run Code for Gleam:** Gleam's own browser compiler (Gleam 1.19.2, WebAssembly) with `gleam_stdlib` 1.0.5, vendored in `app/vendor/gleam/gleam_bundle.js` (6.9 MB). It is added to the page the first time a Gleam question is run, works offline and from `file://`, and runs in a Web Worker like Python. Each run compiles the code to JavaScript and runs it:
  - The course writes `assert` and `echo` lines at the top level, which Gleam itself doesn't allow; the runner wraps each run of such lines (with any `let` lines among them) in a function, keeping line numbers, and runs them in order, then `main()` if there is one. `io.println` and `echo` print to Console Output.
  - Compile errors are Gleam's own messages. A failed `assert a == b` shows both sides' values.
  - Every Gleam question has tests (its own asserts, "From the question", plus "Added" boundary cases), shown like the Python ones. They run whenever the code compiles, even when a top-level assert fails.
  - Runs stop after 5 seconds, except the fib(42) call-counting exercise, which gets 20 (it makes about 867 million calls). Its `@external` JavaScript file comes with the question.
  - `tools/vendor_gleam.mjs` rebuilds the bundle. It needs the Gleam CLI at the same version, `npx`, `tar` and an internet connection. It downloads the release, checks its SHA-256, and combines the compiled standard library into one module with esbuild (the standard library's modules import each other in cycles, which a worker can't link from Blob URLs).
  - The worker keeps student code off the page and away from saved data, but it is not a security sandbox (code can still make network requests).
- **Analytics:** `index.html` loads Cloudflare Web Analytics (aggregate visits and page views, no cookies), only when served from `jacobkao-cal.github.io`, so local copies and the tests send nothing. The app sends it nothing: answers, code, grades and exam history never leave the browser. A privacy note on the home page says so.
- **Saving:** everything is stored in `localStorage`. The home page offers **Resume Practice** and **Start Over**.
- **Results:** counts of completed, correct, incorrect, not graded, and unanswered questions, plus time spent. You can retry the missed questions or jump back to any one.

## Files

```
app/
  index.html          page shell
  styles.css          all styling (light, exam-style)
  app.js              screens, state, timer, grading, scratch editor, persistence
  runner.js           Run Code: Pyodide in a Web Worker (lazy load, timeout, fresh globals per run)
  gleam_runner.js     Run Code for Gleam: the browser compiler in a Web Worker (same API as runner.js)
  gleam_mode.js       CodeMirror mode for Gleam
  assets/             landing image; environment-diagram and illustration images from the exam PDFs
  vendor/codemirror/  CodeMirror 5.65 (bundled locally, so it works offline)
  vendor/gleam/       Gleam compiler, standard library and runtime (built by tools/vendor_gleam.mjs) and their licences
  data/questions.js   TOPICS, PROBLEMS (left-pane context), QUESTIONS, ANSWER_KEY (kept separate)
  data/gleam_questions.js  the Gleam bank (Practice Mode only): topics, sources, problems, parts, answers, tests
  data/in_scope.js    this semester's scope: questions hidden from Practice/Exam mode, scope notes, out-of-scope topics
  data/study_guides.js  Learning Insights study guides (examples checked with doctest)
  data/test_suites.js   Verified Run Code test suites (schema and validation documented in the file)
tests/                browser regression tests (see tests/README.md); not deployed
tools/                vendor_gleam.mjs (rebuilds app/vendor/gleam); not deployed
docs/                 difficulty-guide.md (how parts are rated easy / medium / hard) and audits
```

### Adding Gleam questions

Gleam questions go in `app/data/gleam_questions.js`, never in `questions.js` (Exam Mode reads only `questions.js`). The shapes are the same, plus:

- A **source** in `SOURCES` (`kind: 'exam-prep'` or `'lecture'`) instead of an exam. A lecture problem's `number` is its slide.
- **Tests** in `TESTS`: Gleam code, usually one `assert` each, with `origin: 'given'` (printed with the question) or `'added'`. A test can't see the question's own top-level `let` lines, so it sets up what it needs.
- Plausible wrong answers for the new parts in `WRONG` in `tests/verify_gleam_bank.js`.

Then run `node tests/verify_gleam_bank.js`. It fills every blank with the official answer and checks that the code compiles and that the question's asserts and every test pass, using the browser's own compiler. It also checks that every accepted answer passes, and that every wrong choice and listed wrong answer is caught.

### Adding questions

Add a `PROBLEMS` entry (intro text, plus code with blanks written as `⟦a⟧`). A problem is one question group. Then add one `QUESTIONS` item per part (`problem` names the group, and `blank: 'a'` links the part to the `⟦a⟧` blank), and its answer in `ANSWER_KEY`:

- Multiple choice: `correct` is the index of the right choice. For select-all, it is an array of indices.
- Short answer and code: `accepted` lists the answers, with the official one first.

Topics are configured in `TOPICS`. A topic with no questions yet (such as Gleam's Interpreters) is listed as "soon" and can't be chosen. The former Scheme placeholder is gone: Scheme was replaced by Gleam in the course.

### Updating the scope each semester

`app/data/in_scope.js` decides what is in scope; `questions.js` is never edited for this, so out-of-scope questions stay in the bank for later semesters. Staff usually post the list on Ed (for Fall 2026: Ed #1237, past Midterm 2 exams as practice for 61A Midterm 3 / C88C Midterm 2).

- `problems` / `questions`: mark a whole problem or one part `status: 'out'` (hidden, with a `reason`) or `status: 'note'` (still asked, with a `note`). Where the note shows follows where the out-of-scope idea is: a note under `problems` sits in the left pane (the idea is in the question text or code); a note under `questions` sits beside that part's answer box (the answer itself needs it). Use `source: 'ed'` when the Ed post lists it and `'inferred'` when you applied the post's rules to an exam it doesn't cover.
- `outOfScopeTopics`: the topic is hidden from the Practice topic menu and the Exam topic filter; it comes back when removed from this list.
- Exam totals, the full-exam list and the points in each question header only count what is shown. Saved sessions and past attempts that include hidden parts still open.
- Run `node tests/verify_in_scope.js` after editing: it catches ids that don't exist (a typo would leave a question visible) and lists what each exam loses.

## Notes and decisions

- I used plain HTML/JS instead of React/Vite so the prototype opens with a double-click. The data model follows the spec, so moving to React later only means porting the UI.
- Answer keys come from the official solution PDFs. I filled every blank with its official answer and ran the docstring tests to check the transcription.
- The PDFs had a few typos, which I corrected: `num-slices` → `num_slices`, `count-pizzas` → `count_pizzas`, `"-" + x` → `'_' + x`.
- Explanations were written for this prototype and are **not official**. Questions without one say "Explanation not yet available."
- Points for the individual blanks of Fall 2025 Q4(b) aren't listed in the exam, so they are not shown.
- Fall 2024, Fall 2023 and Spring 2023 Midterm 2 total 45 points; Fall 2025, Spring 2025, Spring 2024 and Fall 2021 total 50. These are the PDFs' own point values. Fall 2022 prints 45, but its Q6(b) prints 6 points over parts worth 1 + 1 + 2 + 1, so its part values sum to 44; the parts are kept as printed.
- Environment-diagram questions use the diagram image from the exam PDF (extracted losslessly) in the diagram workspace; `figure.slots` marks its empty blanks. The Spring 2024 solution's completed diagram is only an external link in the PDF, so it isn't included, and no official completed diagram is shown in review (the workspace is ungraded scratch work).
- Fall 2023 Q5's drawing of the doctest trees is not a diagram to fill in, so it is an `illustration`: shown under the question text, with no workspace.
- Spring 2024 Q4(d) prints blank (b) as `if _______` without a colon; the colon is added so the filled-in code runs. Other wording (including the PDF's "postive" in Fall 2024 Q5(b)) is kept as printed.
- A saved practice filter that had every exam of its time selected (the default) picks up exams added later on the next load; a filter narrowed on purpose is kept.
- Spring 2023 Q5(b) i asks for blanks (c) and (d) together, as one 3-point part, so the code has one two-line blank labelled (c, d). Spring 2023 Q3(a) iii asks about a second `prefix` implementation, so it is its own problem (like Spring 2025 Q2(c)).
- Fall 2023 Q6(c): the official solution also accepted Constant; this site only marks Linear (the marked answer) correct, and the explanation says so.
- **Rights:** this is an independent student project, not an official CS 61A service. Get permission from course staff before publishing exam text publicly.
