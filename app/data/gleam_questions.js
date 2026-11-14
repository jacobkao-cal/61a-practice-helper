// Gleam question bank (Practice Mode only).
//
// Kept apart from data/questions.js on purpose: Exam Mode reads only window.CS61A_BANK, so nothing here can appear
// in an exam. app.js merges these entries into its id lookups (problems, parts, answers, topics, sources) for
// Practice Mode, where the Language picker chooses between the two banks.
//
// Sources: the TA exam-prep worksheets (with official solutions) and the lecture slides' Example / Exercise
// problems, whose answers are on the slide that follows each one. Lab, homework and discussion questions are not
// included yet (no solutions). Two parts asked together on a worksheet ("Fill in blanks (a) and (b)") are separate
// parts here, each graded on its own.
// Points (decided with Jacob): every part of a worksheet question is worth 1 point, and a question is worth as many
// points as it has parts, so the totals differ from the worksheets' printed points.
// Topics, difficulty levels and explanations were written for this site (see docs/difficulty-guide.md) and have not
// been reviewed by course staff.
//
// Shapes are the same as in data/questions.js, plus:
//   SOURCES   like EXAMS: { label, short, url, kind: 'exam-prep' | 'lecture' }. A lecture problem's `number` is its
//             slide, and lecture problems have no points.
//   TESTS     Run Code test cases per problem: { cases: [{ name, origin: 'given' | 'added', input }] }, where input
//             is Gleam code (usually one assert). 'given' asserts are printed with the question. Checked by
//             tests/verify_gleam_bank.js (official answers pass, wrong choices and listed wrong answers fail).
//   FILES     a problem's own JavaScript files for @external functions, e.g. { 'fib_ffi.mjs': '...' }.
window.CS61A_GLEAM_BANK = (function () {
  const code = (s) => s.replace(/^\n/, '').replace(/\s+$/, '');

  const TOPICS = [
    { id: 'gl-lists', name: 'Lists & Pattern Matching', blurb: 'case, [first, ..rest], tuples, guards' },
    { id: 'gl-recursion', name: 'Recursion & Tail Recursion', blurb: 'Base cases, helpers, accumulators' },
    { id: 'gl-hof', name: 'Higher-Order Functions', blurb: 'fn(x) { ... }, list.map, list.filter' },
    { id: 'gl-types', name: 'Custom Types', blurb: 'Variants, records, record update' },
    { id: 'gl-dicts', name: 'Dictionaries', blurb: 'dict.insert, dict.get' },
    { id: 'gl-result', name: 'Result', blurb: 'Ok, Error, handling failure' },
    { id: 'gl-immutable', name: 'Immutable Data', blurb: 'New values instead of changes; external mutation' },
    { id: 'gl-interpreters', name: 'Interpreters', blurb: 'Parsing and evaluating expressions' },
  ];

  const SOURCES = {
    'gl-ep11': { id: 'gl-ep11', label: 'Exam Prep Week 11: Gleam and Linked Lists', short: 'Exam Prep 11', url: 'https://cs61a.org/', kind: 'exam-prep' },
    'gl-ep12': { id: 'gl-ep12', label: 'Exam Prep Week 12: Gleam', short: 'Exam Prep 12', url: 'https://cs61a.org/', kind: 'exam-prep' },
    'gl-lec28': { id: 'gl-lec28', label: 'Lecture 28: Algebraic Data Types', short: 'Lecture 28', url: 'https://cs61a.org/', kind: 'lecture' },
    'gl-lec29': { id: 'gl-lec29', label: 'Lecture 29: Immutable Data', short: 'Lecture 29', url: 'https://cs61a.org/', kind: 'lecture' },
  };

  const PROBLEMS = {
    // ───────────────────────────── Exam Prep Week 11 ─────────────────────────────
    'gl-ep11-2': {
      exam: 'gl-ep11', number: '2', title: 'Beadazzled, the Gleam-quel', points: 5,
      intro: '*Adapted from Spring 2022 Final, Question 11 · Level: Challenge*\n\nImplement `make_necklace`, which returns a Gleam list whose values repeat the items in `beads` in order until the result has `length` elements. Assume `beads` is non-empty and `length` is non-negative.\n\n`list.append(xs, ys)` returns a new list containing the elements of `xs` followed by the elements of `ys`.',
      code: code(`
import gleam/list

pub fn make_necklace(beads: List(a), length: Int) -> List(a) {
  case length, beads {
    ⟦a⟧ -> ⟦b⟧
    _, [first, ..rest] -> [
      ⟦c⟧,
      ..make_necklace(⟦d⟧, ⟦e⟧)
    ]
    _, [] -> []
  }
}

assert make_necklace(["~", "*"], 3) == ["~", "*", "~"]
assert make_necklace(["~", "^"], 4) == ["~", "^", "~", "^"]
assert make_necklace([">", "0", "<"], 9)
  == [">", "0", "<", ">", "0", "<", ">", "0", "<"]
`),
    },
    'gl-ep11-3a': {
      exam: 'gl-ep11', number: '3', title: 'Listquality, Part A: all', points: 3,
      intro: '*Adapted from past exam practice (Treequality) · Level: Regular*\n\nImplement `all`, which returns `True` when every Boolean in `s` is `True`, including when `s` is empty, and returns `False` otherwise.',
      code: code(`
pub fn all(s: List(Bool)) -> Bool {
  case s {
    [] -> ⟦a⟧
    [first, ..rest] -> ⟦b⟧ && all(⟦c⟧)
  }
}

assert all([True, True, True]) == True
assert all([True, False, True]) == False
assert all([]) == True
`),
    },
    'gl-ep11-3b': {
      exam: 'gl-ep11', number: '3', title: 'Listquality, Part B: zip', points: 3,
      intro: '*Adapted from past exam practice (Treequality) · Level: Regular*\n\nImplement `zip`, which combines two lists into a list of two-element tuples. If the inputs have different lengths, stop when the shorter list runs out. The type variables may differ, so the two input lists do not need to contain the same type.',
      code: code(`
pub fn zip(s0: List(a), s1: List(b)) -> List(#(a, b)) {
  case s0, s1 {
    [], _ -> []
    _, [] -> []
    [first0, ..rest0], [first1, ..rest1] -> [
      ⟦d⟧,
      ..zip(⟦e⟧, ⟦f⟧)
    ]
  }
}

assert zip([1, 2, 3], [-1, -2, -3])
  == [#(1, -1), #(2, -2), #(3, -3)]
assert zip(["a", "b"], [1, 2, 3]) == [#("a", 1), #("b", 2)]
`),
    },
    'gl-ep11-4': {
      exam: 'gl-ep11', number: '4', title: 'Split Decision', points: 4,
      intro: '*Adapted from Summer 2026, 6B (split) · Level: Regular*\n\nImplement `split` tail recursively. It takes a list `s` and a predicate `pred`, then returns a tuple containing two lists: items that satisfy `pred` and items that do not. Each result list is in reverse order because items are added to the front of an accumulator.',
      code: code(`
pub fn split(
  s: List(a),
  pred: fn(a) -> Bool,
) -> #(List(a), List(a)) {
  split_tail(⟦a⟧)
}

fn split_tail(
  s: List(a),
  pred: fn(a) -> Bool,
  satisfy: List(a),
  not_satisfy: List(a),
) -> #(List(a), List(a)) {
  case s {
    [] -> ⟦b⟧
    [first, ..rest] ->
      case pred(first) {
        True -> split_tail(⟦c⟧)
        False -> split_tail(⟦d⟧)
      }
  }
}

assert split([], fn(x) { x % 2 == 0 }) == #([], [])
assert split([1, 2, 3, 4, 5], fn(x) { x % 2 == 0 })
  == #([4, 2], [5, 3, 1])
`),
    },
    'gl-ep11-5': {
      exam: 'gl-ep11', number: '5', title: 'Rotation Situation', points: 5,
      intro: '*Adapted from Summer 2026, 6B, Question 7 · Level: Regular*\n\nImplement `rotate`, which shifts all elements of a list `lst` left by `k` positions. Assume `k` is non-negative. The function should still work when `k` is greater than the length of the list.\n\n`list.append(xs, ys)` returns the elements of `xs` followed by the elements of `ys`.',
      code: code(`
import gleam/list

pub fn rotate(lst: List(a), k: Int) -> List(a) {
  case k, lst {
    0, _ -> ⟦a⟧
    _, [] -> []
    _, [first, ..rest] ->
      rotate(
        ⟦b⟧(⟦c⟧, ⟦d⟧),
        ⟦e⟧,
      )
  }
}

assert rotate([1, 2, 3, 4, 5], 0) == [1, 2, 3, 4, 5]
assert rotate([1, 2, 3, 4, 5], 1) == [2, 3, 4, 5, 1]
assert rotate([1, 2, 3, 4, 5], 2) == [3, 4, 5, 1, 2]
assert rotate([1, 2, 3, 4, 5], 7) == [3, 4, 5, 1, 2]
`),
    },
    'gl-ep11-6': {
      exam: 'gl-ep11', number: '6', title: 'Don\'t Skip This', points: 3,
      intro: '*Adapted from Fall 2023 Final, Question 7 (part) · Level: Challenge*\n\n**Definition.** A *skip-partition* of a positive integer `n` is a list of positive integers in increasing order that sums to `n` and does not contain any duplicates or consecutive numbers.\n\nImplement `part`, which takes positive integers `n` and `m`. It returns a list of all skip-partitions of `n` whose elements are all greater than or equal to `m`. The provided `start_with` function may be used in the implementation.',
      code: code(`
import gleam/list

fn start_with(first: Int) -> fn(List(Int)) -> List(Int) {
  fn(rest) { [first, ..rest] }
}

pub fn part(n: Int, m: Int) -> List(List(Int)) {
  case m {
    _ if m == n -> ⟦a⟧
    _ if m > n -> []
    _ ->
      list.append(
        list.map(⟦b⟧, ⟦c⟧),
        part(n, m + 1),
      )
  }
}

assert part(12, 2)
  == [[2, 4, 6], [2, 10], [3, 9], [4, 8], [5, 7], [12]]
assert part(10, 1)
  == [[1, 3, 6], [1, 9], [2, 8], [3, 7], [4, 6], [10]]
`),
    },
    'gl-ep11-7': {
      exam: 'gl-ep11', number: '7', title: 'After Party', points: 2,
      intro: '*Adapted from Fall 2023 Midterm 2, Question 6 (after) · Level: Challenge*\n\nImplement `after`, which takes a list `s` and values `a` and `b`. It returns whether an element of `s` equal to `b` appears after an element of `s` equal to `a`.',
      code: code(`
pub fn after(s: List(t), a: t, b: t) -> Bool {
  find(s, a, fn(rest) { ⟦a⟧ })
}

fn find(s: List(t), n: t, f: fn(List(t)) -> Bool) -> Bool {
  case s {
    [] -> ⟦b⟧
    [first, ..rest] if first == n -> f(rest)
    [_, ..rest] -> find(rest, n, f)
  }
}

assert after([3, 6, 5, 4], 6, 4) == True
assert after([3, 6, 5, 4], 4, 6) == False
assert after([3, 6, 5, 4], 6, 6) == False
`),
    },

    // ───────────────────────────── Exam Prep Week 12 ─────────────────────────────
    'gl-ep12-2': {
      exam: 'gl-ep12', number: '2', title: 'No More Folders!!', points: 4,
      intro: '*Level: Regular*\n\nAn `Entry` value is either a `File` containing its name or a `Folder` containing a list of entries. Implement `list_files`, which takes in a list of `Entry` records `entries` and returns a list of strings which are the file names of every file in `entries`.',
      code: code(`
import gleam/list

pub type Entry {
  File(name: String)
  Folder(contents: List(Entry))
}

pub fn list_files(entries: List(Entry)) -> List(String) {
  case entries {
    [] -> []
    [Folder(contents), ..rest] ->
      list.append(⟦a⟧, ⟦b⟧)
    [File(name), ..rest] ->
      [⟦c⟧, ..⟦d⟧]
  }
}

let entry_list0 = [
  Folder([File("Hello.txt")]),
  File("World.txt")
]

assert list_files(entry_list0) == ["Hello.txt", "World.txt"]

let entry_list1 = [
  Folder([Folder([File("a.txt")]), File("b.txt"), File("c.txt")]),
  File("d.txt"),
  Folder([File("e.txt"), Folder([File("f.txt")])])
]

assert list_files(entry_list1) == ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt", "f.txt"]

let entry_list2 = [
  Folder([File("a.txt"), Folder([File("b.txt"), File("c.txt")])]),
  Folder([]),
  File("d.txt")
]

assert list_files(entry_list2) == ["a.txt", "b.txt", "c.txt", "d.txt"]
`),
    },
    'gl-ep12-3': {
      exam: 'gl-ep12', number: '3', title: 'Online Learning Site', points: 11,
      intro: '*Adapted from Spring 2021 Midterm 2, Question 5 · Level: Regular-Hard*\n\nAn online learning site is described by the `LearningSite` record, which keeps track of the following information:\n\n- `catalog`: a dictionary of the published content, keyed by title\n- `watched`: a list of `Content` records that students have opened, in the order they opened them. The first element is the first content viewed.\n- `missing`: a list of titles that students asked for but could not be found. The most recently searched title should be at the front of the list.\n\nBoth exercises and videos have a title and an author, so they share a `Details` record. Additionally, the `watched` and `missing` lists may contain duplicates if content is viewed or searched more than once.\n\nImplement the following functions for the online learning site:\n\n- `publish(s, content)`: adds `content` to the `LearningSite` catalog\n- `view(s, title)`: a student views the content with `title`. If the catalog has this content, add the content object to the end of the `watched` list. If not, add the title to the front of the `missing` list.\n- `watch_list(s)`: return the description of each watched content, in the order watched.\n- `count_videos(s)`: return how many of the watched contents are videos. A video that was watched twice counts twice.',
      code: code(`
import gleam/dict.{type Dict}
import gleam/int
import gleam/list

pub type Details {
  Details(title: String, author: String)
}

pub type Content {
  Exercise(details: Details, num_questions: Int)
  Video(details: Details, num_seconds: Int)
}

pub type LearningSite {
  LearningSite(
    catalog: Dict(String, Content),
    watched: List(Content),
    missing: List(String),
  )
}

pub fn description(content: Content) -> String {
  case content {
    Exercise(details, _) -> details.title <> " by " <> details.author
    Video(details, seconds) ->
      details.title <> " by " <> details.author
      <> " (" <> int.to_string(seconds) <> " seconds)"
  }
}

pub fn publish(s: LearningSite, content: Content) -> LearningSite {
  LearningSite(..s, catalog: ⟦a⟧)
}

pub fn view(s: LearningSite, title: String) -> LearningSite {
  case ⟦b⟧ {
    Ok(content) -> ⟦c⟧
    Error(Nil) -> ⟦d⟧
  }
}

pub fn watch_list(s: LearningSite) -> List(String) {
  ⟦e⟧
}

pub fn count_videos(s: LearningSite) -> Int {
  list.length(
    list.⟦f⟧(⟦g⟧, ⟦h⟧ {
      case ⟦i⟧ {
        ⟦j⟧
        ⟦k⟧
      }
    }),
  )
}

let cs61a = LearningSite(dict.new(), [], [])
let recursion = Exercise(Details("Recursion", "Chris D"), 5)
let efficiency = Video(Details("Efficiency", "Kay O"), 881)

let cs61a = publish(cs61a, recursion)
let cs61a = publish(cs61a, efficiency)
assert dict.get(cs61a.catalog, "Recursion") == Ok(recursion)

let cs61a = view(cs61a, "Efficiency")
let cs61a = view(cs61a, "LinkedLists")
let cs61a = view(cs61a, "Efficiency")
let cs61a = view(cs61a, "Recursion")
let cs61a = view(cs61a, "Mutability")
let cs61a = view(cs61a, "Efficiency")
assert cs61a.watched == [efficiency, efficiency, recursion, efficiency]
assert cs61a.missing == ["Mutability", "LinkedLists"]

assert watch_list(cs61a)
  == [
    "Efficiency by Kay O (881 seconds)",
    "Efficiency by Kay O (881 seconds)",
    "Recursion by Chris D",
    "Efficiency by Kay O (881 seconds)",
  ]

assert count_videos(cs61a) == 3
`),
    },
    'gl-ep12-4': {
      exam: 'gl-ep12', number: '4', title: 'Making Pen Friends!', points: 6,
      intro: '*Adapted from Spring 2026 Midterm 2, Question 5 · Level: Challenge*\n\nA `Pen` has a name and a dict that maps each animal\'s name to its `Animal` record. An `Animal` has a unique name and a list of the names of its friends. Two animals may only become friends if they are in the same pen. When they do, each one\'s name is added to the front of the other\'s list of friends.\n\nImplement `add_animal`, which returns a new pen that also holds an animal named `name` with no friends. Then implement `befriend`, which returns `Ok` of a new pen in which the animals named `a` and `b` are friends, or an `Error` if either animal is not in `pen`.',
      code: code(`
import gleam/dict.{type Dict}

pub type Animal {
  Animal(name: String, friends: List(String))
}

pub type Pen {
  Pen(name: String, animals: Dict(String, Animal))
}

pub fn add_animal(pen: Pen, name: String) -> Pen {
  Pen(..pen, animals: ⟦a⟧)
}

pub fn befriend(pen: Pen, a: String, b: String) -> Result(Pen, String) {
  case ⟦b⟧, ⟦c⟧ {
    Ok(x), Ok(y) -> {
      let new_x = Animal(..x, friends: ⟦d⟧)
      let new_y = Animal(..y, friends: [a, ..y.friends])
      Ok(Pen(..pen, animals: ⟦e⟧))
    }
    _, _ -> Error("Cannot befriend an animal that doesn't share a pen!")
  }
}

let my_pen = add_animal(add_animal(Pen("coop", dict.new()), "Alice"), "Clarice")
let other_pen = add_animal(Pen("barn", dict.new()), "Bob")

assert dict.get(other_pen.animals, "Bob") == Ok(Animal("Bob", []))

assert befriend(my_pen, "Clarice", "Bob")
  == Error("Cannot befriend an animal that doesn't share a pen!")

assert befriend(my_pen, "Clarice", "Alice")
  == Ok(Pen("coop", dict.from_list([
    #("Alice", Animal("Alice", ["Clarice"])),
    #("Clarice", Animal("Clarice", ["Alice"])),
  ])))
`),
    },
    'gl-ep12-5': {
      exam: 'gl-ep12', number: '5', title: 'What Would Gleam Do?', points: 1,
      intro: '*Level: Challenge*\n\nAssume the following code has been evaluated:',
      code: code(`
pub fn shrink(k: Int, t: List(Int)) -> fn(List(Int)) -> List(Int) {
  fn(s) {
    case s {
      [] -> t
      [first, ..rest] if first == k -> {
        let next = shrink(k + 1, t)
        next(rest)
      }
      [first, ..rest] -> {
        let next = shrink(k, [first, ..t])
        next(rest)
      }
    }
  }
}
`),
    },

    // ───────────────────────────── Lecture 28: Algebraic Data Types ─────────────────────────────
    'gl-lec28-8': {
      exam: 'gl-lec28', number: '8', title: 'Example: Alternating Lists',
      intro: 'Return whether a list `s` contains a pair of alternating items `[x, y, x, y, x, ...]`.\n\n*Gleam feature:* two values of the same type can always be compared using `==` and `!=`. (There is no equivalent of Python\'s `is` in Gleam because all values are immutable.)\n\n*Gleam syntax:* the equivalent of Python\'s `and` is `&&`, `or` is `||`, `not` is `!`.',
      code: code(`
fn alternating(s: List(a)) -> Bool {
  case s {
    ⟦a⟧ -> True
    ⟦b⟧ if ⟦c⟧ -> False
    ⟦d⟧ -> alternating(rest)
  }
}

assert alternating([])
assert alternating([1, 2, 1, 2, 1])
assert alternating(["a", "b", "a", "b"])
assert !alternating([1, 2, 1, 3])
assert !alternating([1, 2, 2, 1])
`),
    },
    'gl-lec28-10': {
      exam: 'gl-lec28', number: '10', title: 'Example: Repeating Lists',
      intro: 'Return whether a list `s` is `n` values repeated; for `n == 3`: `[x, y, z, x, y, z, x, y, z, x, ...]`.\n\n`repeating` is written for you. Finish `nth_equals`, which it calls.',
      code: code(`
pub fn repeating(s: List(a), n: Int) -> Bool {
  case s {
    [] -> True
    [first, ..rest] -> nth_equals(first, s, n) && repeating(rest, n)
  }
}

/// Return True if s is shorter than n or s[n] == expected
pub fn nth_equals(expected: a, s: List(a), n: Int) -> Bool {
  case s {
    [] -> True
    ⟦a⟧
  }
}
`),
    },
    'gl-lec28-12': {
      exam: 'gl-lec28', number: '12', title: 'Example: Matching Lists',
      intro: 'Lists `s` and `t` match if they are equal or one is a prefix of the other.\n\n*Gleam syntax:* a `case` expression can have multiple subjects. The pattern `_, _` matches any value of `s` and any value of `t`.\n\n*This example is also in Lecture 29.*',
      code: code(`
fn matches(s: List(a), t: List(a)) -> Bool {
  case s, t {
    ⟦a⟧
    _, _ -> True
  }
}

assert matches([1, 2, 3], [1, 2, 3])
assert matches([1, 2, 1, 2], [1, 2])
assert matches([1, 2], [1, 2, 3, 4])
assert matches([], [1, 2])
assert !matches([1, 2, 3], [1, 3])
`),
    },
    'gl-lec28-14': {
      exam: 'gl-lec28', number: '14', title: 'Example: Repeating Lists Using Matching',
      intro: 'Return whether a list `s` is `n` values repeated; for `n == 3`: `[x, y, z, x, y, z, x, y, z, x, ...]`.\n\nThis time, use `matches` from the Matching Lists example (included below): a list is `n` values repeated exactly when it matches itself with its first `n` items removed. Name and write the helper function, including its `///` comment.\n\n*This example is also in Lecture 29.*',
      code: code(`
pub fn repeating(s: List(a), n: Int) -> Bool {
  matches(s, ⟦a⟧(s, n))
}

/// ⟦b⟧
fn ⟦c⟧(s: List(a), n: Int) -> List(a) {
  ⟦d⟧
}

/// Lists s and t match if they are equal or one is a prefix of the other
fn matches(s: List(a), t: List(a)) -> Bool {
  case s, t {
    [x, ..s_rest], [y, ..t_rest] -> x == y && matches(s_rest, t_rest)
    _, _ -> True
  }
}
`),
    },
    'gl-lec28-20a': {
      exam: 'gl-lec28', number: '20', title: 'Nested Lists (recursion)',
      intro: 'A nested list of integers is a list containing integers and nested lists of integers. Sum a nested list of integers.\n\n*From the slide\'s "Type Examples" section; the same slide also asks for a `list.map` version (the next question).*',
      code: code(`
pub type NestedList(a) =
  List(Nested(a))

pub type Nested(a) {
  Sublist(NestedList(a))
  Item(a)
}

// Sum a nested list of integers
pub fn sum_nested(s: NestedList(Int)) -> Int {
  case s {
    [] -> 0
    [first, ..rest] ->
      ⟦a⟧
      + sum_nested(rest)
  }
}
`),
    },
    'gl-lec28-20b': {
      exam: 'gl-lec28', number: '20', title: 'Nested Lists (list.map)',
      intro: 'A nested list of integers is a list containing integers and nested lists of integers. Sum a nested list of integers, this time with `list.map`.\n\n`int.sum(s)` returns the sum of a list of integers.\n\n*From the slide\'s "Type Examples" section; the same slide also asks for a recursive version (the previous question).*',
      code: code(`
import gleam/int
import gleam/list

pub type NestedList(a) =
  List(Nested(a))

pub type Nested(a) {
  Sublist(NestedList(a))
  Item(a)
}

// Sum a nested list of integers with list.map
pub fn sum_nested(s: NestedList(Int)) -> Int {
  int.sum(
    ⟦a⟧
  )
}
`),
    },

    // ───────────────────────────── Lecture 29: Immutable Data ─────────────────────────────
    'gl-lec29-14': {
      exam: 'gl-lec29', number: '14', title: 'Example: an Item of a List',
      intro: 'Implement `nth`, which takes a list `s` and an integer `n`. It returns the `n`th item of `s` (counting from 0), as `Ok(item)`, or `Error(Nil)` if there is no such item.',
      code: code(`
fn nth(s: List(a), n: Int) -> Result(a, Nil) {
  case s, n {
    [], _ -> Error(Nil)
    _, _ if n < 0 -> Error(Nil)
    ⟦a⟧
    ⟦b⟧
  }
}
`),
      outro: '*From the slide:* why didn\'t the recursive case need to write `Ok(...)` or `Error(...)`?',
    },
    'gl-lec29-18': {
      exam: 'gl-lec29', number: '18', title: 'Exercise: Count the Number of Function Calls in fib(42)',
      intro: 'Gleam compiles to JavaScript, which allows mutation, and JavaScript functions can be called from Gleam with `@external`. That makes it possible to create a mutable Gleam object. `fib_ffi.mjs` defines a counter, an object with an attribute named `calls` that starts at 0:\n\n```\n// fib_ffi.mjs\nexport function new_counter() {\n  return { calls: 0 };\n}\n\nexport function increment(counter) {\n  counter.calls += 1;\n}\n\nexport function count(counter) {\n  return counter.calls;\n}\n```\n\nComplete `fib` so that it returns the `n`th Fibonacci number and counts every call to `fib` in `counter`, and complete `main` so that it echoes the number of calls made while computing `fib(42)`.\n\n*Also in Lecture 30. `fib(42)` makes almost 900 million calls, so Run Code can take several seconds here (it allows up to 20); try a smaller number such as `fib(20, counter)` first.*',
      code: code(`
pub type Counter

@external(javascript, "./fib_ffi.mjs", "new_counter")
pub fn new_counter() -> Counter

@external(javascript, "./fib_ffi.mjs", "increment")
fn increment(counter: Counter) -> Nil

@external(javascript, "./fib_ffi.mjs", "count")
pub fn count(counter: Counter) -> Int

/// The nth Fibonacci number.
pub fn fib(n: Int, counter: Counter) -> ⟦a⟧ {
  ⟦b⟧
  case n {
    0 | 1 -> ⟦c⟧
    _ -> ⟦d⟧
  }
}

pub fn main() {
  let counter = new_counter()
  ⟦e⟧
  echo ⟦f⟧ // echo number of calls in fib(42)
}
`),
    },
    'gl-lec29-20': {
      exam: 'gl-lec29', number: '20', title: 'Exercise: Trees with Shared Subtrees',
      intro: 'Implement `remove_leaf`, which removes the leftmost leaf of a tree unless the tree is a leaf.\n\nThe new tree shares every subtree it doesn\'t change with the original tree: those subtrees are never copied, and the original tree is unchanged.',
      code: code(`
pub type Tree(a) {
  Tree(label: a, branches: List(Tree(a)))
}

pub fn leaf(label: a) -> Tree(a) {
  Tree(label, [])
}

/// A new tree without its leftmost leaf; a tree that is a leaf is unchanged
pub fn remove_leaf(tree: Tree(a)) -> Tree(a) {
  case tree {
    Tree(label, ⟦a⟧) -> Tree(label, rest)
    Tree(label, [first, ..rest]) -> ⟦b⟧
    Tree(_, []) -> tree
  }
}
`),
    },
  };

  const Q = (id, problem, label, points, topics, difficulty, blank, type, prompt, extra) =>
    Object.assign({ id, problem, label, points, topics, difficulty, blank, type, prompt }, extra || {});
  const sa = 'short_answer';
  const QUESTIONS = [
    // Exam Prep Week 11
    Q('gl-ep11-2a', 'gl-ep11-2', '(a)', 1, ['gl-lists'], 'medium', 'a', sa, 'Fill in blank (a). *(On the worksheet, blanks (a) and (b) are asked together.)*'),
    Q('gl-ep11-2b', 'gl-ep11-2', '(b)', 1, ['gl-lists'], 'easy', 'b', sa, 'Fill in blank (b).'),
    Q('gl-ep11-2c', 'gl-ep11-2', '(c)', 1, ['gl-lists'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-ep11-2d', 'gl-ep11-2', '(d)', 1, ['gl-lists', 'gl-recursion'], 'hard', 'd', sa, 'Fill in blank (d).'),
    Q('gl-ep11-2e', 'gl-ep11-2', '(e)', 1, ['gl-recursion'], 'easy', 'e', sa, 'Fill in blank (e).'),

    Q('gl-ep11-3a', 'gl-ep11-3a', '(a)', 1, ['gl-recursion'], 'easy', 'a', 'single_choice', 'Fill in blank (a).', { mono: true, choices: ['True', '[]', 'False', 'Nil'] }),
    Q('gl-ep11-3b', 'gl-ep11-3a', '(b)', 1, ['gl-lists'], 'easy', 'b', sa, 'Fill in blank (b). *(On the worksheet, blanks (b) and (c) are asked together.)*'),
    Q('gl-ep11-3c', 'gl-ep11-3a', '(c)', 1, ['gl-lists', 'gl-recursion'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-ep11-3d', 'gl-ep11-3b', '(d)', 1, ['gl-lists'], 'easy', 'd', sa, 'Fill in blank (d).'),
    Q('gl-ep11-3e', 'gl-ep11-3b', '(e)', 1, ['gl-recursion'], 'easy', 'e', sa, 'Fill in blank (e). *(On the worksheet, blanks (e) and (f) are asked together.)*'),
    Q('gl-ep11-3f', 'gl-ep11-3b', '(f)', 1, ['gl-recursion'], 'easy', 'f', sa, 'Fill in blank (f).'),

    Q('gl-ep11-4a', 'gl-ep11-4', '(a)', 1, ['gl-recursion'], 'medium', 'a', sa, 'Fill in blank (a).'),
    Q('gl-ep11-4b', 'gl-ep11-4', '(b)', 1, ['gl-recursion', 'gl-lists'], 'easy', 'b', sa, 'Fill in blank (b).'),
    Q('gl-ep11-4c', 'gl-ep11-4', '(c)', 1, ['gl-recursion', 'gl-hof'], 'medium', 'c', sa, 'Fill in blank (c).'),
    Q('gl-ep11-4d', 'gl-ep11-4', '(d)', 1, ['gl-recursion', 'gl-hof'], 'medium', 'd', sa, 'Fill in blank (d).'),

    Q('gl-ep11-5a', 'gl-ep11-5', '(a)', 1, ['gl-recursion'], 'easy', 'a', sa, 'Fill in blank (a).'),
    Q('gl-ep11-5b', 'gl-ep11-5', '(b)', 1, ['gl-lists'], 'easy', 'b', 'single_choice', 'Fill in blank (b).', { mono: true, choices: ['list.append', 'list.length', 'list.filter'] }),
    Q('gl-ep11-5c', 'gl-ep11-5', '(c)', 1, ['gl-lists'], 'easy', 'c', sa, 'Fill in blank (c). *(On the worksheet, blanks (c) and (d) are asked together.)*'),
    Q('gl-ep11-5d', 'gl-ep11-5', '(d)', 1, ['gl-lists'], 'medium', 'd', sa, 'Fill in blank (d).'),
    Q('gl-ep11-5e', 'gl-ep11-5', '(e)', 1, ['gl-recursion'], 'easy', 'e', sa, 'Fill in blank (e).'),

    Q('gl-ep11-6a', 'gl-ep11-6', '(a)', 1, ['gl-lists', 'gl-recursion'], 'medium', 'a', sa, 'Fill in blank (a).'),
    Q('gl-ep11-6b', 'gl-ep11-6', '(b)', 1, ['gl-recursion'], 'hard', 'b', sa, 'Fill in blank (b).'),
    Q('gl-ep11-6c', 'gl-ep11-6', '(c)', 1, ['gl-hof'], 'hard', 'c', sa, 'Fill in blank (c).'),

    Q('gl-ep11-7a', 'gl-ep11-7', '(a)', 1, ['gl-hof', 'gl-recursion'], 'hard', 'a', sa, 'Fill in blank (a). You may not use `case`, `&&`, `||`, `[`, or `]`.'),
    Q('gl-ep11-7b', 'gl-ep11-7', '(b)', 1, ['gl-recursion'], 'easy', 'b', sa, 'Fill in blank (b).'),

    // Exam Prep Week 12
    Q('gl-ep12-2a', 'gl-ep12-2', '(a)', 1, ['gl-types', 'gl-recursion'], 'medium', 'a', sa, 'Fill in blank (a). *(On the worksheet, blanks (a) and (b) are asked together.)*'),
    Q('gl-ep12-2b', 'gl-ep12-2', '(b)', 1, ['gl-recursion'], 'easy', 'b', sa, 'Fill in blank (b).'),
    Q('gl-ep12-2c', 'gl-ep12-2', '(c)', 1, ['gl-types', 'gl-lists'], 'easy', 'c', sa, 'Fill in blank (c). *(On the worksheet, blanks (c) and (d) are asked together.)*'),
    Q('gl-ep12-2d', 'gl-ep12-2', '(d)', 1, ['gl-recursion'], 'easy', 'd', sa, 'Fill in blank (d).'),

    Q('gl-ep12-3a', 'gl-ep12-3', '(a)', 1, ['gl-dicts', 'gl-types'], 'medium', 'a', sa, 'Fill in blank (a).'),
    Q('gl-ep12-3b', 'gl-ep12-3', '(b)', 1, ['gl-dicts', 'gl-result'], 'easy', 'b', sa, 'Fill in blank (b).'),
    Q('gl-ep12-3c', 'gl-ep12-3', '(c)', 1, ['gl-types', 'gl-immutable'], 'medium', 'c', sa, 'Fill in blank (c).'),
    Q('gl-ep12-3d', 'gl-ep12-3', '(d)', 1, ['gl-types', 'gl-immutable'], 'medium', 'd', sa, 'Fill in blank (d).'),
    Q('gl-ep12-3e', 'gl-ep12-3', '(e)', 1, ['gl-hof'], 'medium', 'e', sa, 'Fill in blank (e).'),
    Q('gl-ep12-3f', 'gl-ep12-3', '(f)', 1, ['gl-hof'], 'easy', 'f', sa, 'Fill in blank (f). *(On the worksheet, blanks (f), (g) and (h) are asked together.)*'),
    Q('gl-ep12-3g', 'gl-ep12-3', '(g)', 1, ['gl-hof'], 'easy', 'g', sa, 'Fill in blank (g).'),
    Q('gl-ep12-3h', 'gl-ep12-3', '(h)', 1, ['gl-hof'], 'medium', 'h', sa, 'Fill in blank (h).'),
    Q('gl-ep12-3i', 'gl-ep12-3', '(i)', 1, ['gl-types'], 'easy', 'i', sa, 'Fill in blank (i).'),
    Q('gl-ep12-3j', 'gl-ep12-3', '(j)', 1, ['gl-types'], 'medium', 'j', sa, 'Fill in blank (j). *(On the worksheet, blanks (j) and (k) are asked together.)*'),
    Q('gl-ep12-3k', 'gl-ep12-3', '(k)', 1, ['gl-types'], 'easy', 'k', sa, 'Fill in blank (k).'),

    Q('gl-ep12-4a', 'gl-ep12-4', '(a)', 1, ['gl-dicts', 'gl-types'], 'medium', 'a', sa, 'Fill in blank (a).'),
    Q('gl-ep12-4b', 'gl-ep12-4', '(b)', 1, ['gl-dicts', 'gl-result'], 'medium', 'b', sa, 'Fill in blank (b). *(On the worksheet, blanks (b) and (c) are asked together.)*'),
    Q('gl-ep12-4c', 'gl-ep12-4', '(c)', 1, ['gl-dicts', 'gl-result'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-ep12-4d', 'gl-ep12-4', '(d)', 1, ['gl-lists', 'gl-types'], 'easy', 'd', sa, 'Fill in blank (d).'),
    Q('gl-ep12-4e', 'gl-ep12-4', '(e)', 1, ['gl-dicts', 'gl-immutable'], 'hard', 'e', sa, 'Fill in blank (e).'),
    Q('gl-ep12-4f', 'gl-ep12-4', 'Q4.5', 1, ['gl-immutable', 'gl-dicts'], 'medium', null, sa, 'After `befriend(my_pen, "Clarice", "Alice")` in the asserts above, what does `dict.get(my_pen.animals, "Alice")` evaluate to?'),

    Q('gl-ep12-5a', 'gl-ep12-5', '(a)', 1, ['gl-hof', 'gl-recursion'], 'hard', null, sa, 'What does the final expression evaluate to?\n\n```\nlet run = shrink(3, [])\nrun([3, 1, 4, 1, 5, 9, 2, 6])\n```'),

    // Lecture 28
    Q('gl-lec28-8a', 'gl-lec28-8', '(a)', null, ['gl-lists'], 'medium', 'a', sa, 'Fill in blank (a): the pattern for lists that are alternating because they are too short to break the pattern.'),
    Q('gl-lec28-8b', 'gl-lec28-8', '(b)', null, ['gl-lists'], 'medium', 'b', sa, 'Fill in blank (b).'),
    Q('gl-lec28-8c', 'gl-lec28-8', '(c)', null, ['gl-lists'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-lec28-8d', 'gl-lec28-8', '(d)', null, ['gl-lists', 'gl-recursion'], 'easy', 'd', sa, 'Fill in blank (d).'),

    Q('gl-lec28-10a', 'gl-lec28-10', '(a)', null, ['gl-lists', 'gl-recursion'], 'medium', 'a', 'code', 'Fill in the rest of `nth_equals`: the case for a non-empty list. You can write it on several lines.'),

    Q('gl-lec28-12a', 'gl-lec28-12', '(a)', null, ['gl-lists', 'gl-recursion'], 'medium', 'a', sa, 'Fill in blank (a): one pattern line, with the expression it evaluates to.'),

    Q('gl-lec28-14a', 'gl-lec28-14', '(a)', null, ['gl-recursion'], 'medium', 'a', sa, 'Fill in blank (a): the name of the helper function.'),
    Q('gl-lec28-14b', 'gl-lec28-14', '(b)', null, ['gl-recursion'], 'medium', 'b', sa, 'Fill in blank (b): the helper\'s `///` comment, describing what it returns.'),
    Q('gl-lec28-14c', 'gl-lec28-14', '(c)', null, ['gl-recursion'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-lec28-14d', 'gl-lec28-14', '(d)', null, ['gl-recursion', 'gl-lists'], 'medium', 'd', 'code', 'Fill in blank (d): the body of the helper. You can write it on several lines.'),

    Q('gl-lec28-20a', 'gl-lec28-20a', '(a)', null, ['gl-types', 'gl-recursion'], 'medium', 'a', 'code', 'Fill in blank (a): the value contributed by `first`. You can write it on several lines.'),
    Q('gl-lec28-20b', 'gl-lec28-20b', '(a)', null, ['gl-types', 'gl-hof'], 'medium', 'a', 'code', 'Fill in blank (a): the list that `int.sum` adds up. You can write it on several lines.'),

    // Lecture 29
    Q('gl-lec29-14a', 'gl-lec29-14', '(a)', null, ['gl-result', 'gl-lists'], 'medium', 'a', sa, 'Fill in blank (a): one pattern line, with the expression it evaluates to.'),
    Q('gl-lec29-14b', 'gl-lec29-14', '(b)', null, ['gl-result', 'gl-recursion'], 'medium', 'b', sa, 'Fill in blank (b): one pattern line, with the expression it evaluates to.'),

    Q('gl-lec29-18a', 'gl-lec29-18', '(a)', null, ['gl-immutable'], 'easy', 'a', sa, 'Fill in blank (a): the return type of `fib`.'),
    Q('gl-lec29-18b', 'gl-lec29-18', '(b)', null, ['gl-immutable'], 'medium', 'b', sa, 'Fill in blank (b).'),
    Q('gl-lec29-18c', 'gl-lec29-18', '(c)', null, ['gl-recursion'], 'easy', 'c', sa, 'Fill in blank (c).'),
    Q('gl-lec29-18d', 'gl-lec29-18', '(d)', null, ['gl-recursion', 'gl-immutable'], 'medium', 'd', sa, 'Fill in blank (d).'),
    Q('gl-lec29-18e', 'gl-lec29-18', '(e)', null, ['gl-immutable'], 'easy', 'e', sa, 'Fill in blank (e).'),
    Q('gl-lec29-18f', 'gl-lec29-18', '(f)', null, ['gl-immutable'], 'easy', 'f', sa, 'Fill in blank (f).'),

    Q('gl-lec29-20a', 'gl-lec29-20', '(a)', null, ['gl-types', 'gl-lists'], 'hard', 'a', sa, 'Fill in blank (a).'),
    Q('gl-lec29-20b', 'gl-lec29-20', '(b)', null, ['gl-types', 'gl-recursion', 'gl-immutable'], 'medium', 'b', sa, 'Fill in blank (b).'),
  ];

  const ANSWER_KEY = {
    'gl-ep11-2a': { accepted: ['0, _'], explanation: 'With two subjects, the pattern lists one pattern per subject: `0` for `length` and `_` for `beads`. When no beads are left to place, the necklace is finished, whatever `beads` is. This arm must come first: otherwise the next arm would keep adding beads forever.' },
    'gl-ep11-2b': { accepted: ['[]'], explanation: 'A necklace of length 0 is the empty list.' },
    'gl-ep11-2c': { accepted: ['first'], explanation: 'The first bead of the necklace is the first item of `beads`.' },
    'gl-ep11-2d': { accepted: ['list.append(rest, [first])'], explanation: 'The rest of the necklace starts with the next bead, so the beads are rotated: `first` moves to the back. `list.append` joins two lists, so `first` has to be wrapped in a list.' },
    'gl-ep11-2e': { accepted: ['length - 1'], explanation: 'One bead has been placed, so one fewer is needed.' },
    'gl-ep11-3a': { correct: 0, explanation: 'Every Boolean in an empty list is `True` (there are none that aren\'t), so `all([])` is `True`. This also makes `&&` work in the recursive case: `x && True` is `x`.' },
    'gl-ep11-3b': { accepted: ['first'], explanation: 'The list is all `True` when its first item is `True` and the rest is all `True`.' },
    'gl-ep11-3c': { accepted: ['rest'], explanation: 'Recurse on the rest of the list.' },
    'gl-ep11-3d': { accepted: ['#(first0, first1)'], explanation: '`#(x, y)` builds a two-element tuple. Its type is `#(a, b)`, so the two items may have different types.' },
    'gl-ep11-3e': { accepted: ['rest0'], explanation: 'Zip the rest of each list.' },
    'gl-ep11-3f': { accepted: ['rest1'], explanation: 'Zip the rest of each list.' },
    'gl-ep11-4a': { accepted: ['s, pred, [], []'], explanation: 'The two accumulators start empty. `split_tail` takes four arguments, in the order of its parameters.' },
    'gl-ep11-4b': { accepted: ['#(satisfy, not_satisfy)'], explanation: 'When the list runs out, the accumulators hold the answer. They are returned directly, so the lists are in reverse order, as the doctest expects.' },
    'gl-ep11-4c': { accepted: ['rest, pred, [first, ..satisfy], not_satisfy'], explanation: '`first` satisfies `pred`, so it goes on the front of `satisfy`. The call\'s result is returned directly, so the recursion is tail recursive.' },
    'gl-ep11-4d': { accepted: ['rest, pred, satisfy, [first, ..not_satisfy]'], explanation: 'The same as (c), but `first` goes on the front of `not_satisfy`.' },
    'gl-ep11-5a': { accepted: ['lst'], explanation: 'Rotating by 0 positions leaves the list unchanged.' },
    'gl-ep11-5b': { correct: 0, explanation: 'Rotating by one moves `first` to the back: `list.append(rest, [first])`. Then rotate that by `k - 1` more.' },
    'gl-ep11-5c': { accepted: ['rest'], explanation: 'The rotated list starts with `rest`...' },
    'gl-ep11-5d': { accepted: ['[first]'], explanation: '...followed by `first`. `list.append` takes two lists, so `first` is wrapped in a one-item list.' },
    'gl-ep11-5e': { accepted: ['k - 1'], explanation: 'One rotation is done. The `_, []` arm stops rotation of an empty list, and rotating more times than the length just keeps going around.' },
    'gl-ep11-6a': { accepted: ['[[m]]', '[[n]]'], explanation: 'When `m == n`, the only skip-partition of `n` using numbers at least `m` is `[m]` itself. The function returns a list of partitions, so it is `[[m]]`.' },
    'gl-ep11-6b': { accepted: ['part(n - m, m + 2)'], explanation: 'Partitions that use `m`: the rest sums to `n - m`, and to avoid duplicates and consecutive numbers its numbers must be at least `m + 2`.' },
    'gl-ep11-6c': { accepted: ['start_with(m)', 'fn(rest) { [m, ..rest] }'], explanation: '`start_with(m)` returns a function that puts `m` on the front of a list; `list.map` applies it to each partition of the rest.' },
    'gl-ep11-7a': { accepted: ['find(rest, b, fn(_) { True })', 'find(rest, b, fn(_x) { True })', 'find(rest, b, fn(_rest) { True })'], explanation: '`find(s, a, f)` calls `f` on what follows the first `a`. In there, look for a `b`; if one is found, the answer is `True` whatever follows it. If no `b` (or no `a`) is found, `find` returns `False` (blank (b)).' },
    'gl-ep11-7b': { accepted: ['False'], explanation: 'Reaching the end of the list means `n` was never found.' },

    'gl-ep12-2a': { accepted: ['list_files(contents)'], explanation: 'A folder contributes the files inside it, found by the same function.' },
    'gl-ep12-2b': { accepted: ['list_files(rest)'], explanation: 'Then the files in the rest of the entries.' },
    'gl-ep12-2c': { accepted: ['name'], explanation: 'A file contributes its name...' },
    'gl-ep12-2d': { accepted: ['list_files(rest)'], explanation: '...followed by the files in the rest of the entries.' },
    'gl-ep12-3a': { accepted: ['dict.insert(s.catalog, content.details.title, content)'], explanation: '`dict.insert` returns a new dict with the key added, keyed by title. Every `Content` variant has `details` in the same position, so `content.details` works without a `case`.' },
    'gl-ep12-3b': { accepted: ['dict.get(s.catalog, title)'], explanation: '`dict.get` returns `Ok(content)` when the title is in the catalog and `Error(Nil)` when it is not; the two arms handle each.' },
    'gl-ep12-3c': { accepted: ['LearningSite(..s, watched: list.append(s.watched, [content]))'], explanation: 'A record update makes a new site with only `watched` changed. The content goes at the end of the list, so `list.append` with a one-item list.' },
    'gl-ep12-3d': { accepted: ['LearningSite(..s, missing: [title, ..s.missing])'], explanation: 'The most recent title goes on the front of `missing`.' },
    'gl-ep12-3e': { accepted: ['list.map(s.watched, description)', 'list.map(s.watched, fn(content) { description(content) })', 'list.map(s.watched, fn(c) { description(c) })'], explanation: '`description` is a function value, so it can be passed to `list.map` directly.' },
    'gl-ep12-3f': { accepted: ['filter'], explanation: 'Keep only the videos, then count them with `list.length`.' },
    'gl-ep12-3g': { accepted: ['s.watched'], explanation: 'Filter the watched list (watching a video twice counts twice).' },
    'gl-ep12-3h': { accepted: ['fn(content)'], explanation: 'An anonymous function starts with `fn` and its parameter; its body is the `{ ... }` that follows on the template.' },
    'gl-ep12-3i': { accepted: ['content'], explanation: 'Match on the content passed to the function.' },
    'gl-ep12-3j': { accepted: ['Video(_, _) -> True', 'Video(..) -> True'], explanation: 'Keep videos. `_` ignores a field; `Video(..)` ignores all of them.' },
    'gl-ep12-3k': { accepted: ['Exercise(_, _) -> False', 'Exercise(..) -> False', '_ -> False'], explanation: 'Drop exercises. A `case` must cover every variant, so this arm is required.' },
    'gl-ep12-4a': { accepted: ['dict.insert(pen.animals, name, Animal(name, []))'], explanation: 'A new animal has no friends, and is keyed by its name.' },
    'gl-ep12-4b': { accepted: ['dict.get(pen.animals, a)'], explanation: 'Both animals must be in this pen: look each one up. Only `Ok(x), Ok(y)` continues.' },
    'gl-ep12-4c': { accepted: ['dict.get(pen.animals, b)'], explanation: 'Look up the second animal.' },
    'gl-ep12-4d': { accepted: ['[b, ..x.friends]'], explanation: '`b` goes on the front of `a`\'s friends, just as the next line puts `a` on the front of `b`\'s.' },
    'gl-ep12-4e': { accepted: ['dict.insert(dict.insert(pen.animals, a, new_x), b, new_y)'], explanation: 'Each `dict.insert` returns a new dict, so the second insert must use the result of the first. Inserting with an existing key replaces its value.' },
    'gl-ep12-4f': { accepted: ['Ok(Animal("Alice", []))', 'Ok(Animal(name: "Alice", friends: []))'], explanation: 'Gleam records are immutable, so `my_pen` is unchanged by the `befriend` call, which returned a new pen. Alice still has no friends in `my_pen`.' },
    'gl-ep12-5a': { accepted: ['[2, 9, 1, 1]'], explanation: '`shrink(k, t)` returns a function that looks for `k`, then `k + 1`, and so on. A match moves on to the next number; any other item is put on the front of `t`. In `[3, 1, 4, 1, 5, 9, 2, 6]`, 3, 4, 5 and 6 match in order, and 1, 1, 9, 2 are added to the front of `t`, giving `[2, 9, 1, 1]`.' },

    'gl-lec28-8a': { accepted: ['[] | [_] | [_, _]', '[_, _] | [_] | []', '[] | [_]', '[]'], explanation: 'A list with fewer than three items can\'t contain a broken pair. `|` lets one arm match several patterns. (Just `[]` also works: a one- or two-item list reaches `[]` through the last arm.)' },
    'gl-lec28-8b': { accepted: ['[x, _, z, ..]', '[x, _, z, .._]', '[x, _, z, ..rest]'], explanation: 'Name the first and third items; `..` matches the rest of the list, whatever its length.' },
    'gl-lec28-8c': { accepted: ['x != z'], explanation: 'The guard: items two apart must be equal, so a difference means the list isn\'t alternating.' },
    'gl-lec28-8d': { accepted: ['[_, ..rest]'], explanation: 'Otherwise, check from the second item on. The body uses `rest`, so the pattern must name it.' },
    'gl-lec28-10a': { accepted: ['[first, ..rest] ->\n  case n {\n    0 -> first == expected\n    _ -> nth_equals(expected, rest, n - 1)\n  }'], explanation: 'When `n` is 0, compare the first item with `expected`. Otherwise move one item along with `n - 1`. Running out of items (`[] -> True`) means `s` is shorter than `n`.' },
    'gl-lec28-12a': { accepted: ['[x, ..s_rest], [y, ..t_rest] -> x == y && matches(s_rest, t_rest)'], explanation: 'When both lists are non-empty, their first items must be equal and the rests must match. Once either list is empty, one is a prefix of the other, so `_, _ -> True`.' },
    'gl-lec28-14a': { accepted: ['drop'], explanation: 'The helper drops the first `n` items. A list is `n` values repeated when it matches itself shifted by `n`.' },
    'gl-lec28-14b': { accepted: ['Remove up to the first n items of s'], explanation: 'The slide\'s comment. Any description of what it returns is fine: mark it yourself.' },
    'gl-lec28-14c': { accepted: ['drop'], explanation: 'The same name as in blank (a).' },
    'gl-lec28-14d': { accepted: ['case n {\n  0 -> s\n  _ ->\n    case s {\n      [] -> []\n      [_, ..rest] -> drop(rest, n - 1)\n    }\n}'], explanation: 'Dropping 0 items leaves `s`. Otherwise drop the first item and `n - 1` more; an empty list has nothing left to drop.' },
    'gl-lec28-20a': { accepted: ['case first {\n  Sublist(t) -> sum_nested(t)\n  Item(a) -> a\n}'], explanation: 'A `case` on the variant: a sublist contributes its own sum (recursively), an item contributes its value. The `case` is an expression, so `+ sum_nested(rest)` adds the rest.' },
    'gl-lec28-20b': { accepted: ['list.map(s, fn(x) {\n  case x {\n    Sublist(t) -> sum_nested(t)\n    Item(a) -> a\n  }\n})'], explanation: 'Map each element to its sum (the same `case` as the recursive version), then `int.sum` adds them up.' },

    'gl-lec29-14a': { accepted: ['[x, ..], 0 -> Ok(x)', '[x, .._], 0 -> Ok(x)', '[x, ..rest], 0 -> Ok(x)'], explanation: 'With `n` at 0, the first item is the answer, wrapped in `Ok`.' },
    'gl-lec29-14b': { accepted: ['[_, ..rest], _ -> nth(rest, n - 1)'], explanation: 'Otherwise look one item further. The recursive call already returns a `Result(a, Nil)`, so it isn\'t wrapped in `Ok` or `Error`: that is the answer to the slide\'s question.' },
    'gl-lec29-18a': { accepted: ['Int'], explanation: 'A Fibonacci number is an `Int`.' },
    'gl-lec29-18b': { accepted: ['increment(counter)'], explanation: 'Every call counts once, so increment first, before the `case`. `increment` returns `Nil`, and the value of a function body is its last expression, the `case`.' },
    'gl-lec29-18c': { accepted: ['n'], explanation: '`fib(0)` is 0 and `fib(1)` is 1.' },
    'gl-lec29-18d': { accepted: ['fib(n - 2, counter) + fib(n - 1, counter)', 'fib(n - 1, counter) + fib(n - 2, counter)'], explanation: 'Both recursive calls get the same counter object, so every call increments the same count. That is mutation, made possible by the JavaScript functions.' },
    'gl-lec29-18e': { accepted: ['fib(42, counter)'], explanation: 'The result isn\'t needed, only the calls it makes.' },
    'gl-lec29-18f': { accepted: ['count(counter)'], explanation: 'Read the count after `fib(42, counter)` has run: 866,988,873 calls.' },
    'gl-lec29-20a': { accepted: ['[Tree(_, []), ..rest]'], explanation: 'The first branch is a leaf (no branches of its own): remove it, keeping the rest of the branches.' },
    'gl-lec29-20b': { accepted: ['Tree(label, [remove_leaf(first), ..rest])'], explanation: 'Otherwise the leftmost leaf is inside the first branch: replace that branch, and share `rest` with the original tree.' },
  };

  const given = (input, name) => ({ name: name || input.replace(/\s+/g, ' ').slice(0, 70), origin: 'given', input });
  const added = (input, name) => ({ name: name || input.replace(/\s+/g, ' ').slice(0, 70), origin: 'added', input });
  const TESTS = {
    'gl-ep11-2': { cases: [
      given('assert make_necklace(["~", "*"], 3) == ["~", "*", "~"]'),
      given('assert make_necklace(["~", "^"], 4) == ["~", "^", "~", "^"]'),
      given('assert make_necklace([">", "0", "<"], 9)\n  == [">", "0", "<", ">", "0", "<", ">", "0", "<"]'),
      added('assert make_necklace(["x"], 0) == []'),
      added('assert make_necklace(["a", "b", "c"], 2) == ["a", "b"]'),
      added('assert make_necklace([1, 2], 5) == [1, 2, 1, 2, 1]'),
    ] },
    'gl-ep11-3a': { cases: [
      given('assert all([True, True, True]) == True'),
      given('assert all([True, False, True]) == False'),
      given('assert all([]) == True'),
      added('assert all([False]) == False'),
      added('assert all([True, True, False]) == False'),
    ] },
    'gl-ep11-3b': { cases: [
      given('assert zip([1, 2, 3], [-1, -2, -3])\n  == [#(1, -1), #(2, -2), #(3, -3)]'),
      given('assert zip(["a", "b"], [1, 2, 3]) == [#("a", 1), #("b", 2)]'),
      added('assert zip([1, 2, 3], ["x"]) == [#(1, "x")]'),
      added('assert zip([], [1, 2]) == []'),
    ] },
    'gl-ep11-4': { cases: [
      given('assert split([], fn(x) { x % 2 == 0 }) == #([], [])'),
      given('assert split([1, 2, 3, 4, 5], fn(x) { x % 2 == 0 })\n  == #([4, 2], [5, 3, 1])'),
      added('assert split([1, 2, 3], fn(x) { x > 5 }) == #([], [3, 2, 1])'),
      added('assert split(["a", "bb", "cc"], fn(w) { w != "a" }) == #(["cc", "bb"], ["a"])'),
    ] },
    'gl-ep11-5': { cases: [
      given('assert rotate([1, 2, 3, 4, 5], 0) == [1, 2, 3, 4, 5]'),
      given('assert rotate([1, 2, 3, 4, 5], 1) == [2, 3, 4, 5, 1]'),
      given('assert rotate([1, 2, 3, 4, 5], 2) == [3, 4, 5, 1, 2]'),
      given('assert rotate([1, 2, 3, 4, 5], 7) == [3, 4, 5, 1, 2]'),
      added('assert rotate([], 3) == []'),
      added('assert rotate([1, 2, 3], 3) == [1, 2, 3]'),
    ] },
    'gl-ep11-6': { cases: [
      given('assert part(12, 2)\n  == [[2, 4, 6], [2, 10], [3, 9], [4, 8], [5, 7], [12]]'),
      given('assert part(10, 1)\n  == [[1, 3, 6], [1, 9], [2, 8], [3, 7], [4, 6], [10]]'),
      added('assert part(5, 5) == [[5]]'),
      added('assert part(3, 4) == []'),
      added('assert part(4, 1) == [[1, 3], [4]]'),
    ] },
    'gl-ep11-7': { cases: [
      given('assert after([3, 6, 5, 4], 6, 4) == True'),
      given('assert after([3, 6, 5, 4], 4, 6) == False'),
      given('assert after([3, 6, 5, 4], 6, 6) == False'),
      added('assert after([], 1, 2) == False'),
      added('assert after([1, 2, 1, 2], 2, 2) == True'),
      added('assert after([1, 2, 3], 1, 3) == True'),
    ] },
    'gl-ep12-2': { cases: [
      given('assert list_files([Folder([File("Hello.txt")]), File("World.txt")])\n  == ["Hello.txt", "World.txt"]'),
      given('assert list_files([\n  Folder([Folder([File("a.txt")]), File("b.txt"), File("c.txt")]),\n  File("d.txt"),\n  Folder([File("e.txt"), Folder([File("f.txt")])]),\n]) == ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt", "f.txt"]'),
      given('assert list_files([\n  Folder([File("a.txt"), Folder([File("b.txt"), File("c.txt")])]),\n  Folder([]),\n  File("d.txt"),\n]) == ["a.txt", "b.txt", "c.txt", "d.txt"]'),
      added('assert list_files([]) == []'),
      added('assert list_files([Folder([]), Folder([Folder([])])]) == []'),
    ] },
    'gl-ep12-3': { cases: [
      given('let site = publish(publish(LearningSite(dict.new(), [], []), Exercise(Details("Recursion", "Chris D"), 5)), Video(Details("Efficiency", "Kay O"), 881))\nassert dict.get(site.catalog, "Recursion") == Ok(Exercise(Details("Recursion", "Chris D"), 5))', 'publish adds content to the catalog, keyed by title'),
      given('let recursion = Exercise(Details("Recursion", "Chris D"), 5)\nlet efficiency = Video(Details("Efficiency", "Kay O"), 881)\nlet site = publish(publish(LearningSite(dict.new(), [], []), recursion), efficiency)\nlet site = view(view(view(view(view(view(site, "Efficiency"), "LinkedLists"), "Efficiency"), "Recursion"), "Mutability"), "Efficiency")\nassert site.watched == [efficiency, efficiency, recursion, efficiency]\nassert site.missing == ["Mutability", "LinkedLists"]', 'view updates watched (at the end) and missing (at the front)'),
      given('let recursion = Exercise(Details("Recursion", "Chris D"), 5)\nlet efficiency = Video(Details("Efficiency", "Kay O"), 881)\nlet site = LearningSite(dict.new(), [efficiency, efficiency, recursion, efficiency], [])\nassert watch_list(site) == ["Efficiency by Kay O (881 seconds)", "Efficiency by Kay O (881 seconds)", "Recursion by Chris D", "Efficiency by Kay O (881 seconds)"]', 'watch_list describes each watched content in order'),
      given('let recursion = Exercise(Details("Recursion", "Chris D"), 5)\nlet efficiency = Video(Details("Efficiency", "Kay O"), 881)\nassert count_videos(LearningSite(dict.new(), [efficiency, efficiency, recursion, efficiency], [])) == 3', 'count_videos counts repeated videos'),
      added('let site = view(LearningSite(dict.new(), [], []), "Nothing")\nassert site.watched == []\nassert site.missing == ["Nothing"]', 'view of a missing title leaves watched unchanged'),
      added('assert count_videos(LearningSite(dict.new(), [], [])) == 0\nassert watch_list(LearningSite(dict.new(), [], [])) == []', 'nothing watched'),
    ] },
    'gl-ep12-4': { cases: [
      given('let other_pen = add_animal(Pen("barn", dict.new()), "Bob")\nassert dict.get(other_pen.animals, "Bob") == Ok(Animal("Bob", []))', 'add_animal adds an animal with no friends'),
      given('let my_pen = add_animal(add_animal(Pen("coop", dict.new()), "Alice"), "Clarice")\nassert befriend(my_pen, "Clarice", "Bob")\n  == Error("Cannot befriend an animal that doesn\'t share a pen!")', 'befriend fails when an animal is not in the pen'),
      given('let my_pen = add_animal(add_animal(Pen("coop", dict.new()), "Alice"), "Clarice")\nassert befriend(my_pen, "Clarice", "Alice")\n  == Ok(Pen("coop", dict.from_list([\n    #("Alice", Animal("Alice", ["Clarice"])),\n    #("Clarice", Animal("Clarice", ["Alice"])),\n  ])))', 'befriend adds each name to the other\'s friends'),
      added('let pen = add_animal(add_animal(add_animal(Pen("p", dict.new()), "A"), "B"), "C")\nlet assert Ok(pen) = befriend(pen, "A", "B")\nlet assert Ok(pen) = befriend(pen, "A", "C")\nassert dict.get(pen.animals, "A") == Ok(Animal("A", ["C", "B"]))\nassert dict.get(pen.animals, "B") == Ok(Animal("B", ["A"]))', 'newest friend goes on the front'),
      added('let pen = add_animal(Pen("p", dict.new()), "A")\nassert befriend(pen, "Z", "A") == Error("Cannot befriend an animal that doesn\'t share a pen!")', 'first animal missing'),
    ] },
    'gl-lec28-8': { cases: [
      given('assert alternating([])'),
      given('assert alternating([1, 2, 1, 2, 1])'),
      given('assert alternating(["a", "b", "a", "b"])'),
      given('assert !alternating([1, 2, 1, 3])'),
      given('assert !alternating([1, 2, 2, 1])'),
      added('assert alternating([7])'),
      added('assert alternating([1, 2])'),
      added('assert !alternating([1, 2, 1, 2, 1, 2, 2])'),
      added('assert !alternating([1, 2, 3, 2, 3])'),
    ] },
    'gl-lec28-10': { cases: [
      added('assert repeating([1, 2, 3, 1, 2, 3, 1], 3)'),
      added('assert !repeating([1, 2, 3, 1, 3], 3)'),
      added('assert repeating([], 2)'),
      added('assert repeating([5, 5, 5], 1)'),
      added('assert nth_equals(4, [1, 2, 4], 2)'),
      added('assert !nth_equals(3, [1, 2, 4], 2)'),
      added('assert nth_equals(9, [1, 2], 5)'),
    ] },
    'gl-lec28-12': { cases: [
      given('assert matches([1, 2, 3], [1, 2, 3])'),
      given('assert matches([1, 2, 1, 2], [1, 2])'),
      given('assert matches([1, 2], [1, 2, 3, 4])'),
      given('assert matches([], [1, 2])'),
      given('assert !matches([1, 2, 3], [1, 3])'),
      added('assert !matches([2, 1], [1, 2])'),
    ] },
    'gl-lec28-14': { cases: [
      added('assert repeating([1, 2, 3, 1, 2, 3, 1], 3)'),
      added('assert !repeating([1, 2, 3, 1, 3], 3)'),
      added('assert repeating([], 2)'),
      added('assert repeating([7], 4)'),
      added('assert !repeating([1, 1, 2], 1)'),
    ] },
    'gl-lec28-20a': { cases: [
      added('assert sum_nested([Item(1), Sublist([Item(2), Sublist([Item(3)])]), Item(4)]) == 10'),
      added('assert sum_nested([]) == 0'),
      added('assert sum_nested([Sublist([]), Sublist([Sublist([])])]) == 0'),
      added('assert sum_nested([Item(-5), Item(5), Sublist([Item(7)])]) == 7'),
    ] },
    'gl-lec28-20b': { cases: [
      added('assert sum_nested([Item(1), Sublist([Item(2), Sublist([Item(3)])]), Item(4)]) == 10'),
      added('assert sum_nested([]) == 0'),
      added('assert sum_nested([Sublist([]), Sublist([Sublist([])])]) == 0'),
      added('assert sum_nested([Item(-5), Item(5), Sublist([Item(7)])]) == 7'),
    ] },
    'gl-lec29-14': { cases: [
      added('assert nth([5, 6, 7], 0) == Ok(5)'),
      added('assert nth([5, 6, 7], 2) == Ok(7)'),
      added('assert nth([5, 6, 7], 3) == Error(Nil)'),
      added('assert nth([5, 6, 7], -1) == Error(Nil)'),
      added('assert nth([], 0) == Error(Nil)'),
    ] },
    'gl-lec29-18': { cases: [
      added('let counter = new_counter()\nassert fib(10, counter) == 55\nassert count(counter) == 177', 'fib(10) is 55 and makes 177 calls'),
      added('let counter = new_counter()\nassert fib(1, counter) == 1\nassert count(counter) == 1', 'fib(1) makes 1 call'),
      added('let counter = new_counter()\nassert fib(20, counter) == 6765\nassert count(counter) == 21891', 'fib(20) makes 21,891 calls'),
    ] },
    'gl-lec29-20': { cases: [
      added('let t = Tree(1, [Tree(3, [leaf(2), Tree(2, [leaf(5)])]), leaf(4)])\nassert remove_leaf(t) == Tree(1, [Tree(3, [Tree(2, [leaf(5)])]), leaf(4)])', 'removes the leftmost leaf'),
      added('let t = Tree(1, [Tree(3, [leaf(2), Tree(2, [leaf(5)])]), leaf(4)])\nassert remove_leaf(remove_leaf(t)) == Tree(1, [Tree(3, [Tree(2, [])]), leaf(4)])', 'twice'),
      added('assert remove_leaf(leaf(7)) == leaf(7)', 'a leaf is unchanged'),
      added('assert remove_leaf(Tree(1, [leaf(2), leaf(3)])) == Tree(1, [leaf(3)])', 'first branch is a leaf'),
    ] },
  };

  const FILES = {
    'gl-lec29-18': {
      'fib_ffi.mjs': 'export function new_counter() {\n  return { calls: 0 };\n}\n\nexport function increment(counter) {\n  counter.calls += 1;\n}\n\nexport function count(counter) {\n  return counter.calls;\n}\n',
    },
  };

  // Run Code time limit for a problem whose intended program is slow, in ms (others use the runner's 5 s).
  // fib(42) makes about 867 million calls: a few seconds in a fast browser, more on a slow one.
  const RUN_LIMITS = {
    'gl-lec29-18': 20000,
  };

  return { LANG: 'gleam', TOPICS, SOURCES, PROBLEMS, QUESTIONS, ANSWER_KEY, TESTS, FILES, RUN_LIMITS };
})();
