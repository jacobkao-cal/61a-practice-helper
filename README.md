# CS 61A Practice: prototype

A no-login, browser-based practice tool for CS 61A, laid out like the Digital SAT (problem on the left, answer on the right, timer at the top right). It is seeded with questions from CS 61A **Midterm 2** of **Fall 2025**, **Spring 2025**, **Fall 2024** and **Spring 2024** (`mt2/`).

## Run it

There is no build step and nothing to install. Open `app/index.html` in a browser.

To serve it instead:

```sh
cd app && python3 -m http.server 8000   # then visit http://localhost:8000
```

To deploy, upload the `app/` folder to any static host (Netlify drop, Vercel, GitHub Pages).

## What's in the prototype

- **Landing page:** the `assets/home_page.jpg` banner. Clicking anywhere goes to setup.
- **Setup:** dropdown menus for Topics (with question counts), Exams, Difficulty, Question types, Set size, and Timer (off, or 1–60 minutes).
- **Practice:** a split pane. Each question is a **group**: all of its parts (i, ii, iii…) are shown together on the right.
  - The left side shows the shared problem text and an **editable Python editor** (CodeMirror, dark theme, line numbers), where you can type notes, comments, or your own solution. Nothing is run.
  - **Answers fill the code:** picking a choice, or typing an answer, shows it in that part's blank right away. Selected choices are blue, typed answers green, and the active part's blank is outlined. Click a blank to jump to its part.
  - **Annotation toolbar** (top of the left pane): highlighter (select text or code), red pen (freehand), eraser (click or drag), undo/redo, and clear all (asks first). Each question keeps its own annotations.
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
- **Verified test bank:** 28 coding problems from the four midterms have suites: the exam's own doctests plus added boundary cases, each labelled "From the exam" or "Added". What Would Python Display, environment-diagram and order-of-growth questions have none, and neither do sp25 Q3(b) and sp24 Q4(b), where a wrong choice runs exactly like the official answer, so tests can't tell them apart. Suites that need the course's `Link`/`Tree` classes, or functions from earlier parts, provide them in a setup that is named under the results. Every suite is validated by `tests/verify_test_bank.js`: it must pass with the official solution and every accepted answer, and fail for every wrong multiple-choice option and a list of plausible wrong answers (487 versions). The suites were generated and validated by Claude Code and have not been reviewed by course staff.
  - Needs an internet connection the first time: Python (about 10 MB) is downloaded from the jsDelivr CDN, then cached by the browser. It works both when the site is served and when `index.html` is opened directly.
  - Code that uses the course's `Link` or `Tree` classes needs those definitions in the editor; the runner doesn't add them.
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
  assets/             landing image; environment-diagram images from the 2024 exam PDFs
  vendor/codemirror/  CodeMirror 5.65 (bundled locally, so it works offline)
  data/questions.js   TOPICS, PROBLEMS (left-pane context), QUESTIONS, ANSWER_KEY (kept separate)
  data/study_guides.js  Learning Insights study guides (examples checked with doctest)
  data/test_suites.js   Verified Run Code test suites (schema and validation documented in the file)
tests/                browser regression tests (see tests/README.md); not deployed
```

### Adding questions

Add a `PROBLEMS` entry (intro text, plus code with blanks written as `⟦a⟧`). A problem is one question group. Then add one `QUESTIONS` item per part (`problem` names the group, and `blank: 'a'` links the part to the `⟦a⟧` blank), and its answer in `ANSWER_KEY`:

- Multiple choice: `correct` is the index of the right choice. For select-all, it is an array of indices.
- Short answer and code: `accepted` lists the answers, with the official one first.

Topics are configured in `TOPICS`. A topic with no questions (such as Scheme) shows as "No questions yet".

## Notes and decisions

- I used plain HTML/JS instead of React/Vite so the prototype opens with a double-click. The data model follows the spec, so moving to React later only means porting the UI.
- Answer keys come from the official solution PDFs. I filled every blank with its official answer and ran the docstring tests to check the transcription.
- The PDFs had a few typos, which I corrected: `num-slices` → `num_slices`, `count-pizzas` → `count_pizzas`, `"-" + x` → `'_' + x`.
- Explanations were written for this prototype and are **not official**. Questions without one say "Explanation not yet available."
- Points for the individual blanks of Fall 2025 Q4(b) aren't listed in the exam, so they are not shown.
- Fall 2024 Midterm 2 totals 45 points (the others total 50); these are the PDFs' own point values.
- The 2024 environment-diagram questions show the diagram image from the exam PDF (extracted losslessly) under the question text. The Spring 2024 solution's completed diagram is only an external link in the PDF, so it isn't included.
- Spring 2024 Q4(d) prints blank (b) as `if _______` without a colon; the colon is added so the filled-in code runs. Other wording (including the PDF's "postive" in Fall 2024 Q5(b)) is kept as printed.
- A saved practice filter that had both 2025 exams selected (the old default) picks up the 2024 exams on the next load; a filter narrowed to one exam is kept.
- **Rights:** this is an independent student project, not an official CS 61A service. Get permission from course staff before publishing exam text publicly.
