# Difficulty levels: how parts are rated

Every part (one blank or one question) has a level: easy, medium or hard. Practice Mode filters on it, and the
question screen shows it next to the part type. The levels were written for this site, not by course staff.

This guide writes down the pattern in the Python ratings (Midterm 2 questions, Fall 2021 to Fall 2025), so new
questions, starting with Gleam, can be rated the same way. **Jacob: please check that this matches how you rated
them.**

## The rule

Rate the part, not the question or where it came from. A hard question can have an easy blank.

| Level | What the part asks for | Typical points |
|---|---|---|
| **Easy** | One step you can read off the code: a base case value, one name or attribute, a keyword, a direct recursive call on the rest, the next line of an obvious pattern, a short trace. | 1 |
| **Medium** | One idea applied once: a recursive call whose arguments change, one combining expression, an accumulator's start value, a value built in a new shape (a tuple, a list of lists), a function passed as a value. | 1–2 |
| **Hard** | Several ideas at once, or a design choice the code doesn't hint at: recursion plus combining results, two recursive branches, a function that returns a function, a helper's whole call, tracing through nested structures, or a blank with extra limits ("you may not use ..."). | 2–4 |

What the Python bank looks like (250 parts): 90 easy, 106 medium, 54 hard. Most multiple-choice parts are easy (58 of
100). Parts worth 3 or 4 points are almost always hard (26 of 29). Python examples:

- **Easy:** `s.first == x`, `self.books[title]`, `Link.empty`, `yield from s`, `[4, 5, 2]` (a short trace).
- **Medium:** `Link(s.first, exclude_link(s.rest, x))`, `f(suffix.rest, total + suffix.first)`, `b.label == x`.
- **Hard:** `s.first * s.rest.first + muladd(s.rest.rest)`, `f(total - k * k, n - 1, k) or f(total, n, k + 1)`,
  `[8, 8, [6, 7], 5]` (a nested trace).

## Gleam

The Gleam bank comes from the TA exam-prep worksheets and the lecture slides. The worksheets label each question
"Regular", "Regular-Hard" or "Challenge". That label is a starting point, not the answer: a Challenge question
usually has some easy blanks (for example `first` in Beadazzled, the Gleam-quel). As a rough check, Regular questions
are mostly easy and medium parts, and Challenge questions have at least one hard part.

Gleam examples, as rated:

- **Easy:** `[]` (a base case), `first`, `length - 1`, `dict.get(s.catalog, title)`, `x != z` (a guard).
- **Medium:** `0, _` (a pattern with two subjects), `s, pred, [], []` (accumulators' start), `[[m]]`,
  `list.map(s.watched, description)`, `LearningSite(..s, missing: [title, ..s.missing])` (a record update).
- **Hard:** `list.append(rest, [first])` (rotating the beads), `part(n - m, m + 2)`, `start_with(m)` (a function
  that returns a function), `find(rest, b, fn(_) { True })` (with limits on what you may use),
  `dict.insert(dict.insert(pen.animals, a, new_x), b, new_y)`, `[Tree(_, []), ..rest]`.

Lecture examples have no points, so rate them by the table alone. Lab, homework and discussion questions (not added
yet) are usually easy and medium; discussion questions are often medium and hard.
