# CS 61A Practice: prototype

A no-login, browser-based practice tool for CS 61A, laid out like the Digital SAT (problem on the left, answer on the right, timer at the top right). It is seeded with questions from CS 61A **Midterm 2** of **Fall 2025**, **Spring 2025**, **Fall 2024**, **Spring 2024**, **Fall 2023**, **Spring 2023**, **Fall 2022** and **Fall 2021** (`mt2/`), and the **Final** of **Fall 2025**, **Spring 2025**, **Fall 2024**, **Spring 2024**, **Fall 2023**, **Spring 2023**, **Fall 2022**, **Fall 2021** and **Fall 2020** (`final/`).

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
- **Language (Practice Mode):** All, Python, Gleam or SQL. Each language has its own question bank, topics and sources, and keeps its own topic and source choices when you switch. For Gleam, the second menu is **Sources** instead of Exams. **All** lists every language under its own heading in the Topics and Exams & sources menus and builds sets from all of them; choosing no topic means every topic of all of them. Python sets never include SQL questions, even from the same final.
- **Exams menu (Practice Mode):** Python's exams are grouped under **Midterm 2** and **Final**, each with its own Select all / Clear. Every dropdown menu has a maximum height and scrolls inside itself (the list grows as past exams are added), and keeps its place while options are checked.
- **Full past exams (Exam Mode):** first choose **Midterm 2** or **Final**, then one of that kind's past exams. A notice says these exams have no Gleam questions (they are from semesters before Gleam) and points to Practice Mode or a Topic-based exam for Gleam. A full final keeps its SQL question in place. The timer starts from 120 minutes for a midterm and 180 for a final (this site's defaults, not official limits); a time the student typed is kept when switching.
- **Gleam in Exam Mode:** Full past exams stay Python (and SQL) exams. Topic-based exams get a **Gleam** chip after the Python topic chips; it lists the exam-prep worksheet questions only (no lecture examples). An exam can mix Gleam and Python questions. Gleam parts are graded like Python ones; Gleam results have no walkthrough link, and Learning Insights show "No study guide for this topic yet" for Gleam topics. Run Code is off during the exam and uses Gleam in the review.
- **SQL questions** (finals, `lang: 'sql'` in `app/data/final_questions.js`): one or two per final (13 problems, 34 parts; Spring 2024’s is Q3(d), Fall 2020’s is Q4(c)). They are the SQL bank in Practice Mode (topics Joins and Aggregation; sources are the finals) and behind the **SQL** chip of topic-based exams, after the Gleam chip. The left pane prints the exam's tables as text. The editor uses CodeMirror's SQLite mode, the file is `query.sql`, and comments are `--`. Typed SQL answers ignore case outside quotes, as SQLite does, but not inside them ('yes' and 'Yes' differ). No Python Tutor.
- **Run Code for SQL:** SQLite compiled to WebAssembly ([sql.js](https://github.com/sql-js/sql.js) 1.14.2, MIT), vendored in `app/vendor/sqljs/sql_bundle.js` (0.9 MB) and added to the page the first time SQL is run, so it works offline and from `file://`. Each run is a fresh database in a Web Worker: the question's tables (the rows printed in the exam), then your SQL one statement at a time. Each `SELECT` prints a table to Console Output; an SQLite error stops the run. Runs stop after 5 seconds. `tools/vendor_sqljs.mjs` rebuilds the bundle from the npm tarball, which must match a pinned SHA-512 and the registry's integrity value.
- **SQL tests** (`app/data/sql_tests.js`): each case loads its own data (or the exam's rows), runs your SQL, then checks the rows of your query, or of a check query such as `SELECT ta, id FROM big;`. Exams show only some rows, so added data sets are built to separate right answers from plausible wrong ones (a discussion with exactly 20 students, a TA with two discussions, sizes exactly half). When several options of a select-all blank are checked, Run Code runs and tests each option on its own and shows one result per option (this works the same for Python questions); the blank in the editor shows the first checked option and a "+N more" tag. `tests/verify_sql_bank.js` checks every suite with the shipped bundle: the official and accepted answers pass, and every wrong choice and listed wrong answer fails.
- **Gleam questions** (`app/data/gleam_questions.js`): 20 problems (69 parts) from the Fall 2026 TA exam-prep worksheets (weeks 11 and 12, which have official solutions) and the Example / Exercise problems of lectures 28 and 29 (answers from the slide after each one). Their Python questions (an efficiency question and a linked-list question) are left out. Lab, homework and discussion questions aren't included yet, because they have no solutions. Topics: Lists & Pattern Matching, Recursion & Tail Recursion, Higher-Order Functions, Custom Types, Dictionaries, Result, Immutable Data, Interpreters (no questions yet). A worksheet part that asks for two or three blanks together is split into one part per blank, each graded on its own. **Points:** every worksheet part is worth 1 point, and a question is worth as many points as it has parts (so totals differ from the worksheets+ printed points). Lecture examples have no points and cite their slide. Topics, difficulty levels (see `docs/difficulty-guide.md`) and explanations were written for this site.
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
- **Verified test bank:** 40 coding problems from the midterms and 63 from the finals have suites: the exam's own doctests plus added boundary cases, each labelled "From the exam" or "Added". What Would Python Display, environment-diagram and order-of-growth questions have none, and neither do sp25 Q3(b) and sp24 Q4(b), where a wrong choice runs exactly like the official answer, so tests can't tell them apart, or fa23 Q4(a), whose select-all blank has three correct options. fa23 Q5(e) and sp23 Q2(b) have none because their code can't run without part (a)'s definitions, and Run Code runs the student's code on its own before any tests. Suites that need the course's `Link`/`Tree` classes, or functions from earlier parts, provide them in a setup that is named under the results. Every suite is validated by `tests/verify_test_bank.js`: it must pass with the official solution and every accepted answer, and fail for every wrong multiple-choice option and a list of plausible wrong answers (1595 versions). The suites were generated and validated by Claude Code and have not been reviewed by course staff.
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
- **Saving:** everything is stored in `localStorage` in this browser only (nothing is sent anywhere). It stays until the site data is cleared, the private window is closed, or, in Safari, after 7 days without a visit. Browsers allow about 5 MB per site (Chrome: 5.2 million characters); a typical 5-question set with some notes and drawings is about 12 KB (light use 1 KB, heavy drawing 37 KB), so a few hundred sets fit. The home page and My Progress warn from 90% full, and when a save fails because storage is full; old sets can be deleted in My History.
- **My Progress:** a card on the home page, right above Practice Mode / Exam Mode and as wide as both, shows two rings (questions done out of all questions, and accuracy); the whole card opens My Progress, a page of its own (the home page no longer lists past sets).
  - **Summary** (from all practice sets and submitted exams; each question counted once): **Full Exams Completed** as "N/17" (different full past exams with a Completed attempt, so a retake of the same exam does not add one), **Questions Practiced** as "N/188" (questions with a part answered in Practice Mode, fill-in-the-blank included, or in a submitted exam, out of every question in scope) and **Automatic Accuracy** (each multiple-choice and short-answer part by its **first try ever**: its first Check in a practice set or its automatic grade in an exam, whichever came first; only correct / incorrect count, not "not an exact match", self-grades, code graded by staff or skipped parts). The first-try rule matches the tracking report's (`first_check`), so retrying until right does not raise it. The totals are shown at about half size.
  - **My History:** every practice set and exam, newest first, with its type (Practice, Full Exam, Topic-based Exam, Topic Review Exam), date and status. Clicking a card opens the set: it continues an unfinished set or exam, or opens a finished one's summary or results. A small Delete button (asks first) sits right of the status label. **Completed** = finished or submitted with every part answered (0-point parts, i.e. A+ questions and Fall 2022's optional drawing, need no answer); **Incomplete** = finished or submitted with parts unanswered; **In Progress** = can still be continued. A **Filter** menu narrows the list by type, status and exam year (the years of the past exams a set has questions from). Starting a new practice set or **Start Over** keeps the open set in My History (its timer is paused while it waits). While reviewing a finished set, **← Summary** (bottom left), **Back to summary** (top banner) and **Summary** (on the last question) return to its summary.
  - **Topics to Review:** practice Checks and every submitted exam (Incomplete ones too). A picker chooses **All · Python · Gleam · SQL**. Left: a bar chart of first-try % correct (All: one bar per language, click a bar to open it; Python, Gleam and SQL: one bar per topic, topics not tried yet greyed out) and two **rings**: **Correctness** (first-try % correct; green 70%+, yellow 50–69%, red under 50%) and **Incorrect**, shown as "16/20" (parts whose latest result is wrong, out of the parts tried; fills by that share: green up to 30%, yellow up to 50%, red above). Right: the topics of the chosen language with "N incorrect · X% correct", a green **+N%** improvement (4+ parts tried: the later half against the earlier half, in the order first tried; parts tried at the same moment, i.e. one exam, stay in the same half) and **Start topic exam**: an untimed topic-based exam of 5 random questions on that topic from every past exam in scope (done before or not), named per topic ("Recursion Review #1", "#2", ...; numbers are never reused), marked **Auto-generated** in My History and keeping its name on Retake. The charts draw in (bars grow from the left, rings fill clockwise from the bottom, numbers count up) when scrolled into view and when the language changes; with reduce motion they appear at once.
  - **Usage tracking:** an unfinished practice set waiting in My History stays in progress; it is recorded as discarded only when deleted.
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
  data/final_questions.js  the past finals (Python and SQL), added to the same bank; load it right after questions.js
  data/gleam_questions.js  the Gleam bank (Practice Mode only): topics, sources, problems, parts, answers, tests
  data/in_scope.js    this semester's scope: questions hidden from Practice/Exam mode, scope notes, out-of-scope topics
  data/study_guides.js  Learning Insights study guides (examples checked with doctest)
  data/test_suites.js   Verified Run Code test suites (schema and validation documented in the file)
  data/sql_tests.js     Verified Run Code tests for SQL questions
  sql_runner.js       Run Code for SQL: SQLite (sql.js) in a Web Worker (same API as runner.js)
  vendor/sqljs/       sql.js (SQLite/WebAssembly), built by tools/vendor_sqljs.mjs, and its licence
tests/                browser regression tests (see tests/README.md); not deployed
tools/                vendor_gleam.mjs (rebuilds app/vendor/gleam), vendor_sqljs.mjs (rebuilds app/vendor/sqljs); not deployed
mt2/, final/          the exam and solution PDFs the questions were transcribed from; not deployed
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

### Adding a past final

Copy the exam and its solutions into `final/exams/` and `final/solutions/`, then transcribe it into `app/data/final_questions.js` like the existing finals:

- An `EXAMS` entry with `kind: 'final'` (the id ends in `f`, e.g. `fa24f`, so it never collides with that semester's midterm). Exam Mode lists it under **Final** and Practice Mode's Exams menu under **Final** automatically.
- Problem ids are `<exam>-<question><sub-question>` and part ids `<exam>-<question><blank>` (blank letters restart at each numbered question, as in the PDFs).
- Transcribe every question, including Scheme and other out-of-scope ones, and hide them in `in_scope.js` (Scheme, async and order-of-growth questions get the topics `scheme`, `async` and `efficiency`).
- SQL questions get `lang: 'sql'`, an SQL topic (`sql-joins`, `sql-agg`), `sqlSetup` (SQL that creates the printed rows) and the tables as text in `intro`. Add their tests to `app/data/sql_tests.js` (plausible wrong answers for written blanks go in `WRONG` in `tests/verify_sql_bank.js`).
- Python coding questions get suites in `app/data/test_suites.js` and wrong answers in `tests/test_bank/variants.js`, as for the midterms. A select-all blank of a final with several correct options is checked one option at a time.

Then run `node tests/verify_in_scope.js`, `node tests/verify_sql_bank.js` and `node tests/verify_test_bank.js`.

### Updating the scope each semester

`app/data/in_scope.js` decides what is in scope; `questions.js` is never edited for this, so out-of-scope questions stay in the bank for later semesters. Staff usually post the list on Ed (for Fall 2026: Ed #1237, past Midterm 2 exams as practice for 61A Midterm 3 / C88C Midterm 2).

- `problems` / `questions`: mark a whole problem or one part `status: 'out'` (hidden, with a `reason`) or `status: 'note'` (still asked, with a `note`). Where the note shows follows where the out-of-scope idea is: a note under `problems` sits in the left pane (the idea is in the question text or code); a note under `questions` sits beside that part's answer box (the answer itself needs it). Use `source: 'ed'` when the Ed post lists it and `'inferred'` when you applied the post's rules to an exam it doesn't cover.
- `outOfScopeTopics`: the topic is hidden from the Practice topic menu and the Exam topic filter; it comes back when removed from this list. Fall 2026: `efficiency`, `async` and `scheme`.
- Finals: there is no Ed post for the Fall 2026 final yet, so the finals' entries apply the midterm rules (`source: 'inferred'`). The final is expected to be about 2/3 Python and 1/3 Gleam + SQL.
- Exam totals, the full-exam list and the points in each question header only count what is shown. Saved sessions and past attempts that include hidden parts still open.
- Run `node tests/verify_in_scope.js` after editing: it catches ids that don't exist (a typo would leave a question visible) and lists what each exam loses.

## Notes and decisions

- I used plain HTML/JS instead of React/Vite so the prototype opens with a double-click. The data model follows the spec, so moving to React later only means porting the UI.
- Answer keys come from the official solution PDFs. I filled every blank with its official answer and ran the docstring tests to check the transcription.
- The PDFs had a few typos, which I corrected: `num-slices` → `num_slices`, `count-pizzas` → `count_pizzas`, `"-" + x` → `'_' + x`.
- Explanations were written for this prototype and are **not official**. Questions without one say "Explanation not yet available."
- Points for the individual blanks of Fall 2025 Q4(b) aren't listed in the exam, so they are not shown.
- The finals total 75 points each (A+ questions are 0 points), except Spring 2024 (70, as printed) and Fall 2020 (73: the PDF prints Q4 as 22 points, but its parts total 20). With this semester's scope, Exam Mode shows 54–60 points of each.
- Finals corrections and gaps: Fall 2024 Q4(b) prints "4/6 of the misses" but its marked answer has spaces, so the docstring says "4 / 6"; Fall 2023 Q4(a)'s code says `results.` for `result.`; Fall 2022 Q7(a)'s last doctest expects a bare `StopIteration` (since Python 3.7 the generator raises `RuntimeError`), and Q9's example result misspells two names (the table's spelling is used); Fall 2022 A+ 12(a)'s official SQL fails in SQLite as printed, so it has no Run Code tests. Spring 2024 Q3 keeps its `Domino.__repr__` parts in scope with notes (hiding them would leave the class unrunnable).
- Finals without Run Code suites although they have code: Fall 2024 Q4(b) (`MissDict`'s class body needs part (a)), Fall 2022 Q4(a) and Fall 2020 Q4(b) (a wrong choice behaves exactly like the answer), Fall 2023 A+ 9(b) (its other blanks have no official answers). Spring 2025 Final Q2's environment diagram is the image from the exam PDF; its blanks are slots in the diagram workspace. SQL tables are printed as text.
- Fall 2024, Fall 2023 and Spring 2023 Midterm 2 total 45 points; Fall 2025, Spring 2025, Spring 2024 and Fall 2021 total 50. These are the PDFs' own point values. Fall 2022 prints 45, but its Q6(b) prints 6 points over parts worth 1 + 1 + 2 + 1, so its part values sum to 44; the parts are kept as printed.
- Environment-diagram questions use the diagram image from the exam PDF (extracted losslessly) in the diagram workspace; `figure.slots` marks its empty blanks. The Spring 2024 solution's completed diagram is only an external link in the PDF, so it isn't included, and no official completed diagram is shown in review (the workspace is ungraded scratch work).
- Fall 2023 Q5's drawing of the doctest trees is not a diagram to fill in, so it is an `illustration`: shown under the question text, with no workspace.
- Spring 2024 Q4(d) prints blank (b) as `if _______` without a colon; the colon is added so the filled-in code runs. Other wording (including the PDF's "postive" in Fall 2024 Q5(b)) is kept as printed.
- A saved practice filter that had every exam of its time selected (the default) picks up exams added later on the next load; a filter narrowed on purpose is kept.
- Spring 2023 Q5(b) i asks for blanks (c) and (d) together, as one 3-point part, so the code has one two-line blank labelled (c, d). Spring 2023 Q3(a) iii asks about a second `prefix` implementation, so it is its own problem (like Spring 2025 Q2(c)).
- Fall 2023 Q6(c): the official solution also accepted Constant; this site only marks Linear (the marked answer) correct, and the explanation says so.
- **Rights:** this is an independent student project, not an official CS 61A service. Get permission from course staff before publishing exam text publicly.
