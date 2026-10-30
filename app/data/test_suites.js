// Verified test suites for Run Code (Phase 6B engine; the suites themselves are added in Phase 6C).
//
// A problem gets test results only when a suite here names it explicitly AND is marked verified with a
// verification record. Everything else still runs with Run Code, showing Console Output only: no pass/fail
// summary is ever shown without a verified suite. Test eligibility is never inferred from topic or answer type.
// Environment Diagram and What Would Python Display questions get no suites.
//
// Shape (one entry per suite):
//   {
//     id: 'fa25-4-tests',             // stable suite id
//     problem: 'fa25-4',              // the PROBLEMS id whose code it tests (one suite per problem)
//     verified: true,                 // only after the validation step below; otherwise the suite is ignored
//     verification: {                 // required for a verified suite
//       method: '…',                  // e.g. passes against the official solution; fails known-wrong variants
//       reviewedBy: '…', date: 'YYYY-MM-DD',
//     },
//     provenance: '…',                // where the cases come from (exam-provided doctests vs. written for this app)
//     setup: '',                      // optional Python run before the student's code in every case (e.g. the
//                                     // Link class exactly as the exam provides it); empty if not needed
//     cases: [                        // each case runs in a fresh namespace, checked like Python's doctest
//       { name: 'Case 1', input: '>>> f(3)\n6' },
//     ],
//   }
//
// The student's code is their editor text with each blank replaced by their current answer. Results are
// practice feedback only: they never change answers, grades, scores or Exam History.

window.CS61A_TEST_SUITES = {
  version: 1,
  suites: [],
};
