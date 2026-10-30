# Tests

Browser regression tests for the app in `../app`. They drive a real Chrome through
[puppeteer-core](https://pptr.dev) against `app/index.html` (no server needed) and check the
saved `localStorage` state as well as the page.

```sh
cd tests
npm install          # puppeteer-core only; uses your installed Chrome
npm test             # every suite + the study-guide doctests
node e2e/phase5a_qa.test.js   # one suite
```

Set `CHROME=/path/to/chrome` if Chrome isn't in the default location, or `APP_URL=http://localhost:8000/`
to test a served copy. `npm run test:guides` needs `python3`.

| Suite | Covers |
|---|---|
| `phase1_elimination` | answer elimination, persistence, keyboard |
| `phase2_navigator` | question navigator, statuses, keyboard, mobile |
| `phase3_exam_mode` | exam setup, timer, Save & Leave, submission, results |
| `phase4_results_review` | auto-graded score, learning insights, editable review isolation |
| `session_isolation` | annotations / code / answers scoped to each practice set |
| `phase5a_qa` | damaged saved data, grading audit, Go to Home, two open tabs, Phase 6 readiness |
| `phase6a_runner` | Run Code: output, errors, timeout + recovery, isolation, stale results, review safety (needs internet for Pyodide) |
| `phase6c_test_bank` | The 15 shipped suites in Pyodide (official passes, a wrong answer is caught); real Practice/Exam/Review flow |
| `phase6b_tests` | Verified tests (fixture suites, test-only): Passed X/Y, per-case details, not-run cases, case timeout, isolation, unverified suites ignored, exam/review safety |
| `study_guides_doctest` | every study-guide example runs and prints what it shows |
| `verify_test_bank` | every verified suite passes with the official solution and all accepted answers, and fails for every wrong choice and listed wrong answer (local Python, same harness as the browser) |

Each suite prints one `PASS`/`FAIL` line per check and exits non-zero on failure.
