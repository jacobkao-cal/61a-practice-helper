// Verified test suites for Run Code (engine: Phase 6B; suites: Phase 6C).
//
// A problem gets test results only when a suite here names it explicitly AND is marked verified with a
// verification record. Everything else still runs with Run Code, showing Console Output only: no pass/fail
// summary is ever shown without a verified suite. Test eligibility is never inferred from topic or answer type.
// Environment Diagram and What Would Python Display questions get no suites, and neither do problems where a wrong
// multiple-choice option behaves exactly like the official answer (sp25 Q3(b), sp24 Q4(b)): tests could not tell them apart.
//
// Shape (one entry per suite):
//   {
//     id: 'fa25-4-tests',             // stable suite id
//     problem: 'fa25-4',              // the PROBLEMS id whose code it tests (one suite per problem)
//     verified: true,                 // only after the validation step below; otherwise the suite is ignored
//     verification: { method, checks, date, reviewedBy },  // required for a verified suite
//     provenance: '…',                // where the cases come from
//     setup: '',                      // optional Python run before the student's code in every case
//     setupNote: '',                  // shown with the results whenever setup provides definitions
//     setupFrom: [],                  // problems whose official solution the setup copies (checked by the verifier)
//     cases: [                        // each case runs in a fresh namespace, checked like Python's doctest
//       { input: '>>> f(3)\n6', origin: 'exam' | 'added' },
//     ],
//   }
//
// Validation (tests/verify_test_bank.js, run by `npm test`): every suite must pass with the official solution
// and with every accepted alternative answer, and must fail for every wrong multiple-choice option and for a
// list of plausible wrong answers (tests/test_bank/variants.js). `checks` records the counts; the verifier
// fails if they drift. Expected values in added cases were computed independently (brute force) and agree
// with the official solutions.
//
// The student's code is their editor text with each blank replaced by their current answer. Results are
// practice feedback only: they never change answers, grades, scores or Exam History.

window.CS61A_TEST_SUITES = (function () {
  // The course's Link and Tree classes (the same definitions the study-guide examples are checked against).
  // The exams use these classes but do not print them, so suites that need them say so in `setupNote`.
  const LINK = `class Link:
    empty = ()
    def __init__(self, first, rest=empty):
        assert rest is Link.empty or isinstance(rest, Link)
        self.first = first
        self.rest = rest
    def __repr__(self):
        if self.rest is not Link.empty:
            rest_repr = ', ' + repr(self.rest)
        else:
            rest_repr = ''
        return 'Link(' + repr(self.first) + rest_repr + ')'
`;
  const TREE = `class Tree:
    def __init__(self, label, branches=[]):
        for b in branches:
            assert isinstance(b, Tree)
        self.label = label
        self.branches = list(branches)
    def is_leaf(self):
        return not self.branches
    def __repr__(self):
        if self.branches:
            branch_str = ', ' + repr(self.branches)
        else:
            branch_str = ''
        return 'Tree({0}{1})'.format(repr(self.label), branch_str)
`;
  // Official solutions of earlier parts that a later part may call (copied from the exam solutions).
  const SYMMETRICAL = `def symmetrical(d):
    return all([d.get(d[k]) == k for k in d.keys()])
`;
  const ACCEPTABLE = `def acceptable(pizza, disallow={'M': 'P', 'P': 'M'}):
    assert symmetrical(disallow)
    previous = ''
    for slice in pizza:
        if previous and disallow.get(previous) == slice:
            return False
        previous = slice
    return disallow.get(slice) != pizza[0]
`;
  const COUNT_PIZZAS = `def count_pizzas(num_slices):
    def f(n, first, previous):
        if n == num_slices:
            if first == previous or '_' in [first, previous]:
                return 1
            return 0
        allowed_next = list(slice_types)
        if previous == 'P':
            allowed_next.remove('M')
        if previous == 'M':
            allowed_next.remove('P')
        return sum([f(n+1, first, x) for x in allowed_next])
    slice_types = ['_', 'M', 'P']
    return sum([f(1, x, x) for x in slice_types])
`;
  const CLOSE = `def close(s, x):
    if not s:
        return 0
    choices = [product(s[:i]) + close(s[i:], x - product(s[:i])) for i in range(1, len(s) + 1)]
    return min(choices, key=lambda y: abs(x - y))

def product(s):
    if len(s) == 1:
        return s[0]
    return s[0] * product(s[1:])
`;
  const SEMIPERFECT = `def semiperfect(n):
    def f(s, d):
        if s == 0:
            return True
        if d >= n:
            return False
        if n % d == 0 and f(s - d, d + 1):
            return True
        return f(s, d + 1)
    return f(n, 1)
`;
  const SUBSUMS = `def subsums(s, n):
    if s:
        if n == s[0]:
            yield [n]
        for t in subsums(s[1:], n-s[0]):
            yield s[:1] + t
        yield from subsums(s[1:], n)
`;
  const LONGER = `def longer(s, t):
    a, b = s, t
    while b is not Link.empty:
        if a is Link.empty:
            return t
        a, b = a.rest, b.rest
    return s
`;
  const HAS_STRIP = `def has_strip(t):
    if t.is_leaf():
        return True
    for b in t.branches:
        if b.label == t.label + 1 and has_strip(b):
            return True
    return False
`;
  const LINK_NOTE = 'These tests provide the course’s Link class (the exam uses it but does not print it).';
  const TREE_NOTE = 'These tests provide the course’s Tree class (the exam uses it but does not print it).';
  const verification = (checks) => ({
    method: 'Automated validation (tests/verify_test_bank.js): passes with the official exam solution and every accepted alternative; fails for every wrong multiple-choice option and for each listed plausible wrong answer. Added cases’ expected values cross-checked against independent brute-force implementations where applicable.',
    checks,
    date: '2026-10-30',
    reviewedBy: 'Generated and validated by Claude Code; not yet reviewed by course staff',
  });
  const EXAM = 'Exam doctests from the problem’s docstring, plus added boundary cases written for this app (marked “Added”).';
  const exam = (input) => ({ input, origin: 'exam' });
  const added = (input) => ({ input, origin: 'added' });

  const suites = [
    {
      id: 'fa25-3-tests', problem: 'fa25-3', verified: true,
      verification: verification({ passing: 3, failing: 10 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> p1 = Tree(2, [Tree(20), Tree(22)])
>>> right = Tree(2, [Tree(19), Tree(20), Tree(21), Tree(22), Tree(23)])
>>> wrong = Tree(2, [Tree(19), Tree(22), Tree(20), Tree(23)])
>>> [includes(p1, right), includes(p1, wrong), includes(Tree(1, [right]), p1)]
[True, False, False]`),
        exam(`>>> p1 = Tree(2, [Tree(20), Tree(22)])
>>> right = Tree(2, [Tree(19), Tree(20), Tree(21), Tree(22), Tree(23)])
>>> wrong = Tree(2, [Tree(19), Tree(22), Tree(20), Tree(23)])
>>> p2 = Tree(1, [Tree(6), p1])
>>> includes(p2, Tree(1, [Tree(5), Tree(6, [Tree(7)]), wrong, right]))
True
>>> includes(p2, Tree(1, [Tree(5), Tree(6, [Tree(7)]), wrong, Tree(8, [right])]))
False`),
        added(`>>> includes(Tree(1), Tree(1))
True
>>> includes(Tree(1), Tree(2))
False
>>> includes(Tree(1), Tree(1, [Tree(2)]))
True
>>> includes(Tree(1, [Tree(2)]), Tree(1))
False`),
        added(`>>> includes(Tree(1, [Tree(2), Tree(2)]), Tree(1, [Tree(2)]))
False
>>> includes(Tree(1, [Tree(2, [Tree(3)])]), Tree(1, [Tree(2), Tree(2, [Tree(4), Tree(3)])]))
True
>>> includes(Tree(1, [Tree(3), Tree(2)]), Tree(1, [Tree(2), Tree(3)]))
False`),
      ],
    },
    {
      id: 'fa25-4-tests', problem: 'fa25-4', verified: true,
      verification: verification({ passing: 12, failing: 13 }),
      provenance: EXAM, setup: LINK, setupNote: LINK_NOTE, setupFrom: [],
      cases: [
        exam(`>>> a = [3, 4, 5, 3.0, 6, 5, 3]
>>> exclude(a, 3)
[4, 5, 6, 5]
>>> a  # no change to a
[3, 4, 5, 3.0, 6, 5, 3]`),
        added(`>>> exclude([], 1)
[]
>>> exclude([1, 1, 1], 1)
[]
>>> exclude([2, 3], 4)
[2, 3]`),
        exam(`>>> a = Link(3, Link(4, Link(5, Link(3.0, Link(6, Link(5, Link(3)))))))
>>> exclude_link(a, 3)
Link(4, Link(5, Link(6, Link(5))))
>>> a  # no change to a
Link(3, Link(4, Link(5, Link(3.0, Link(6, Link(5, Link(3)))))))`),
        added(`>>> exclude_link(Link.empty, 1) is Link.empty
True
>>> exclude_link(Link(1, Link(1)), 1) is Link.empty
True
>>> exclude_link(Link(2, Link(3)), 4)
Link(2, Link(3))`),
        added(`>>> a = Link(1, Link(2, Link(1)))
>>> exclude_link(a, 1)
Link(2)
>>> a
Link(1, Link(2, Link(1)))`),
      ],
    },
    {
      id: 'fa25-5-tests', problem: 'fa25-5', verified: true,
      verification: verification({ passing: 3, failing: 20 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> c = Parlor('Sliver', 3, 10, Parlor('Cheeseboard', 4, 10, MegaParlor(5)))
>>> c.order(6)
Sliver now has $18 profit
>>> c.order(6)
Sliver forwarded an order of 2 to Cheeseboard
Cheeseboard now has $8 profit
Sliver now has $28 profit
>>> c.order(10)
Sliver forwarded an order of 10 to Cheeseboard
Cheeseboard forwarded an order of 2 to MEGA
MEGA now has $10 profit
Cheeseboard now has $38 profit
Sliver now has $18 profit`),
        added(`>>> p = Parlor('A', 2, 3, MegaParlor(1))
>>> p.order(3)
A now has $6 profit
>>> p.pizzas
0
>>> p.order(1)
A forwarded an order of 1 to MEGA
MEGA now has $1 profit
A now has $7 profit`),
        added(`>>> p = Parlor('B', 1, 5, MegaParlor(2))
>>> p.order(2)
B now has $2 profit
>>> p.pizzas
3`),
        added(`>>> Parlor('A', 1, 5, None).cook(3)  # cook returns the quantity that must be ordered from alt
0
>>> Parlor('A', 1, 5, None).cook(8)
3
>>> MegaParlor(5).cook(1000)
0`),
        added(`>>> m = MegaParlor(7)
>>> m.order(100)
MEGA now has $700 profit
>>> m.order(1, Parlor('X', 1, 0, m))
X forwarded an order of 1 to MEGA
MEGA now has $707 profit`),
      ],
    },
    {
      id: 'fa25-6a-tests', problem: 'fa25-6a', verified: true,
      verification: verification({ passing: 1, failing: 14 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> symmetrical({'M': 'P', 'P': 'M', 'G': 'G'})
True`),
        exam(`>>> symmetrical({'M': 'P', 'P': 'M', 'G': 'M'})  # No M->G
False
>>> symmetrical({'M': 'P', 'P': 'M', 'G': 'T'})  # No T->G
False`),
        added(`>>> symmetrical({})
True
>>> symmetrical({'A': 'A'})
True
>>> symmetrical({'A': 'B'})
False
>>> symmetrical({'A': 'B', 'B': 'C', 'C': 'A'})
False`),
      ],
    },
    {
      id: 'fa25-6b-tests', problem: 'fa25-6b', verified: true,
      verification: verification({ passing: 4, failing: 14 }),
      provenance: EXAM, setup: SYMMETRICAL,
      setupNote: 'These tests provide symmetrical from part (a) (the official solution).', setupFrom: ['fa25-6a'],
      cases: [
        exam(`>>> acceptable("MM_PPP__M")
True
>>> acceptable("MM__PPP")
False`),
        exam(`>>> acceptable("MM__PPP_")
True
>>> acceptable("MM__MPPP_")
False`),
        added(`>>> acceptable("M")
True
>>> acceptable("MP")
False
>>> acceptable("M_P")
False
>>> acceptable("M_P_")
True`),
        added(`>>> acceptable("AB", {'A': 'B', 'B': 'A'})
False
>>> acceptable("A_B_", {'A': 'B', 'B': 'A'})
True
>>> acceptable("MP", {'A': 'B', 'B': 'A'})
True`),
      ],
    },
    {
      id: 'fa25-6c-tests', problem: 'fa25-6c', verified: true,
      verification: verification({ passing: 3, failing: 12 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> count_pizzas(1)
3`),
        exam(`>>> count_pizzas(2)
7`),
        added(`>>> count_pizzas(3)
15
>>> count_pizzas(4)
35`),
        added(`>>> [count_pizzas(n) for n in range(1, 7)]
[3, 7, 15, 35, 83, 199]`),
      ],
    },
    {
      id: 'fa25-6d-tests', problem: 'fa25-6d', verified: true,
      verification: verification({ passing: 5, failing: 15 }),
      provenance: 'Exam doctests from the problem’s docstring (the pizzas(3) result is written on one line here; the exam wraps it), plus added boundary cases written for this app (marked “Added”).',
      setup: '', setupFrom: [],
      cases: [
        exam(`>>> pizzas(1)
['_', 'M', 'P']
>>> pizzas(2)
['__', '_M', '_P', 'M_', 'MM', 'P_', 'PP']`),
        exam(`>>> pizzas(3)
['___', '__M', '__P', '_M_', '_MM', '_P_', '_PP', 'M__', 'M_M', 'MM_', 'MMM', 'P__', 'P_P', 'PP_', 'PPP']`),
        exam(`>>> '_M_P' in pizzas(4)
True`),
        added(`>>> len(pizzas(4)), len(set(pizzas(5)))
(35, 83)
>>> 'M_P' in pizzas(3)
False
>>> 'M_P' in pizzas(3, False)
True`),
      ],
    },
    {
      id: 'fa25-6aplus-tests', problem: 'fa25-6aplus', verified: true,
      verification: verification({ passing: 2, failing: 4 }),
      provenance: 'Written for this app (the A+ question has no doctests): expected values are the pizzas() results from the exam’s part (d) doctests, plus a count cross-checked by brute force.',
      setup: SYMMETRICAL + '\n' + ACCEPTABLE + '\n' + COUNT_PIZZAS,
      setupNote: 'These tests provide symmetrical, acceptable and count_pizzas from parts (a)–(c) (the official solutions).',
      setupFrom: ['fa25-6a', 'fa25-6b', 'fa25-6c'],
      cases: [
        added(`>>> pizzas(1)
['_', 'M', 'P']`),
        added(`>>> pizzas(2)
['__', '_M', '_P', 'M_', 'MM', 'P_', 'PP']`),
        added(`>>> pizzas(3)
['___', '__M', '__P', '_M_', '_MM', '_P_', '_PP', 'M__', 'M_M', 'MM_', 'MMM', 'P__', 'P_P', 'PP_', 'PPP']`),
        added(`>>> len(pizzas(4))
35`),
      ],
    },
    {
      id: 'sp25-3a-tests', problem: 'sp25-3a', verified: true,
      verification: verification({ passing: 2, failing: 11 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> calapalooza = Event(980, 1180)
>>> list(calapalooza.split(4))
[Event(980, 1030), Event(1030, 1080), Event(1080, 1130), Event(1130, 1180)]`),
        added(`>>> e = Event(0, 60)
>>> list(e.split(1))
[Event(0, 60)]
>>> list(e.split(3))
[Event(0, 20), Event(20, 40), Event(40, 60)]
>>> e  # split does not change the event
Event(0, 60)`),
        added(`>>> g = Event(10, 30).split(2)
>>> next(g)
Event(10, 20)
>>> next(g)
Event(20, 30)`),
      ],
    },
    {
      id: 'sp25-4a-tests', problem: 'sp25-4a', verified: true,
      verification: verification({ passing: 4, failing: 12 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> example = Tree(30, [Tree(20), Tree(20, [Tree(30, [Tree(20)])])])
>>> deepest(example, 30)
2
>>> deepest(example, 20)
3`),
        exam(`>>> example = Tree(30, [Tree(20), Tree(20, [Tree(30, [Tree(20)])])])
>>> print(deepest(example, 10))
None`),
        added(`>>> deepest(Tree(5), 5)
0
>>> print(deepest(Tree(5), 6))
None
>>> deepest(Tree(7, [Tree(1, [Tree(2)])]), 7)
0`),
        added(`>>> deepest(Tree(1, [Tree(2, [Tree(1, [Tree(1)])])]), 1)
3
>>> deepest(Tree(1, [Tree(1, [Tree(3)]), Tree(4, [Tree(5, [Tree(1)])])]), 1)
3`),
      ],
    },
    {
      id: 'sp25-4b-tests', problem: 'sp25-4b', verified: true,
      verification: verification({ passing: 2, failing: 12 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> deep(Tree(30, [Tree(20), Tree(20, [Tree(30, [Tree(20)])])]))
{30: 2, 20: 3}`),
        added(`>>> deep(Tree(1))
{1: 0}
>>> sorted(deep(Tree(1, [Tree(2), Tree(3, [Tree(2)])])).items())
[(1, 0), (2, 2), (3, 1)]`),
        added(`>>> sorted(deep(Tree(1, [Tree(2, [Tree(5)]), Tree(5)])).items())  # a deeper 5 comes first
[(1, 0), (2, 1), (5, 2)]
>>> deep(Tree(4, [Tree(4, [Tree(4)])]))
{4: 2}`),
      ],
    },
    {
      id: 'sp25-5a-tests', problem: 'sp25-5a', verified: true,
      verification: verification({ passing: 3, failing: 9 }),
      provenance: EXAM, setup: LINK, setupNote: LINK_NOTE, setupFrom: [],
      cases: [
        exam(`>>> example = Link(9, Link(4, Link(7, Link(2, Link(0)))))
>>> muladd(example)
50
>>> muladd(Link(2, example))
46`),
        exam(`>>> muladd(Link(2))
2`),
        added(`>>> muladd(Link(3, Link(4)))
12
>>> muladd(Link(1, Link(2, Link(3))))
5
>>> muladd(Link(2, Link(3, Link(4, Link(5)))))
26`),
      ],
    },
    {
      id: 'sp25-5b-tests', problem: 'sp25-5b', verified: true,
      verification: verification({ passing: 1, failing: 9 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> ways(1, 4)
5
>>> ways(2, 4)
7`),
        exam(`>>> ways(2, 5)
13`),
        added(`>>> [ways(1, 1), ways(3, 1), ways(1, 2), ways(1, 3)]
[1, 1, 2, 3]`),
        added(`>>> ways(5, 4)  # every expression: no run of *'s is too long
8
>>> [ways(1, 6), ways(2, 6), ways(3, 7)]
[13, 24, 56]`),
      ],
    },
    {
      id: 'sp25-5c-tests', problem: 'sp25-5c', verified: true,
      verification: verification({ passing: 1, failing: 67 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> print(close([1, 2, 3, 4], 10))
10
>>> print(close([1, 2, 3, 4], 20))
24`),
        exam(`>>> print(close([1, 2, 3, 4], 30))
25
>>> print(close([3, 7, 5, 4, 2, 6], 66))
67`),
        added(`>>> close([5], 100)
5
>>> close([2, 3], 5)
5
>>> close([2, 3], 7)
6`),
        added(`>>> close([1, 1, 1], 0)
1
>>> close([4, 1, 3], 13)
12`),
      ],
    },
    {
      id: 'sp25-5d-tests', problem: 'sp25-5d', verified: true,
      verification: verification({ passing: 1, failing: 4 }),
      provenance: EXAM,
      setup: CLOSE, setupNote: 'These tests provide close and product from part (c) (the official solution).', setupFrom: ['sp25-5c'],
      cases: [
        exam(`>>> print(close_exp([1, 2, 3, 4], 10))
1+2+3+4
>>> print(close_exp([1, 2, 3, 4], 20))
1*2*3*4`),
        exam(`>>> print(close_exp([1, 2, 3, 4], 30))
1+2*3*4
>>> print(close_exp([3, 7, 5, 4, 2, 6], 66))
3*7+5*4*2+6`),
        added(`>>> print(close_exp([7], 3))
7
>>> print(close_exp([2, 3], 6))
2*3
>>> print(close_exp([2, 3], 5))
2+3
>>> print(close_exp([4, 1, 3], 13))
4*1*3`),
      ],
    },

    // ───────────────────────────── Fall 2024 Midterm 2 ─────────────────────────────
    {
      id: 'fa24-3-tests', problem: 'fa24-3', verified: true,
      verification: verification({ passing: 5, failing: 12 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> north, south = Store(['Cats', 'Ants']), Store(['Cats', 'Cats', 'Hog'])
>>> east, west = Store(['Cats', 'Hog', 'Hog'], [north, south]), Store(['Cats', 'Cats', 'Ants'])
>>> main = Store(['Ants', 'Ants', 'Hog'], [east, west])
>>> east.copies('Cats')
4
>>> main.copies('Ants')
4
>>> main.add_to(1)('Ants')
>>> [main.copies('Ants'), west.copies('Ants')]
[5, 2]`),
        added(`>>> leaf = Store(['Hog'])
>>> [leaf.copies('Hog'), leaf.copies('Cats')]
[1, 0]
>>> root = Store([], [Store(['Hog', 'Hog'], [Store(['Hog'])]), leaf])
>>> root.copies('Hog')
4`),
        added(`>>> leaf = Store(['Hog'])
>>> root = Store(['Cats'], [Store([]), leaf])
>>> add = root.add_to(1)
>>> add('Cats')
>>> add('Cats')
>>> [root.copies('Cats'), leaf.inventory, root.inventory]
[3, ['Hog', 'Cats', 'Cats'], ['Cats']]`),
      ],
    },
    {
      id: 'fa24-4a-tests', problem: 'fa24-4a', verified: true,
      verification: verification({ passing: 1, failing: 14 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> [k for k in range(1, 40) if semiperfect(k)]
[6, 12, 18, 20, 24, 28, 30, 36]`),
        added(`>>> semiperfect(1)
False
>>> [k for k in range(40, 80) if semiperfect(k)]  # 70 is abundant but not semiperfect
[40, 42, 48, 54, 56, 60, 66, 72, 78]`),
      ],
    },
    {
      id: 'fa24-4b-tests', problem: 'fa24-4b', verified: true,
      verification: verification({ passing: 1, failing: 14 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> list(subsums([1, 2, 3, 6, 9], 18))
[[1, 2, 6, 9], [3, 6, 9]]
>>> list(subsums([1, 2, 3, 4, 6], 16))
[[1, 2, 3, 4, 6]]`),
        exam(`>>> list(subsums([1, 2, 3, 4, 6, 8, 12], 12))
[[1, 2, 3, 6], [1, 3, 8], [2, 4, 6], [4, 8], [12]]`),
        added(`>>> list(subsums([], 3))
[]
>>> list(subsums([1, 2], 4))
[]
>>> list(subsums([1, 2, 3], 2))
[[2]]`),
        added(`>>> sorted(subsums([5, 1, 4], 5))  # any order is allowed, so the results are sorted
[[1, 4], [5]]
>>> sorted(subsums([3, 1, 2, 4], 6))
[[2, 4], [3, 1, 2]]`),
      ],
    },
    {
      id: 'fa24-4c-tests', problem: 'fa24-4c', verified: true,
      verification: verification({ passing: 5, failing: 15 }),
      provenance: EXAM,
      setup: SEMIPERFECT + '\n' + SUBSUMS, setupNote: 'These tests provide semiperfect and subsums from parts (a) and (b) (the official solutions).', setupFrom: ['fa24-4a', 'fa24-4b'],
      cases: [
        exam(`>>> semisums(22)
[]
>>> semisums(30)
[[1, 3, 5, 6, 15], [2, 3, 10, 15], [5, 10, 15]]`),
        added(`>>> semisums(6)
[[1, 2, 3]]
>>> sorted(semisums(12))
[[1, 2, 3, 6], [2, 4, 6]]
>>> semisums(1)
[]`),
        exam(`>>> [k for k in range(1, 300) if primitive_semiperfect(k)]
[6, 20, 28, 88, 104, 272]`),
        added(`>>> [primitive_semiperfect(k) for k in [6, 7, 12, 20]]
[True, False, False, True]`),
      ],
    },
    {
      id: 'fa24-5a-tests', problem: 'fa24-5a', verified: true,
      verification: verification({ passing: 3, failing: 20 }),
      provenance: EXAM, setup: LINK, setupNote: LINK_NOTE, setupFrom: [],
      cases: [
        exam(`>>> longer(Link(2, Link(3)), Link.empty)
Link(2, Link(3))
>>> longer(Link(2, Link(3)), Link(4, Link(5)))
Link(2, Link(3))`),
        exam(`>>> longer(Link(2, Link(3)), Link(4, Link(5, Link(6, Link(7)))))
Link(4, Link(5, Link(6, Link(7))))
>>> longer(Link.empty, Link.empty) is Link.empty
True`),
        added(`>>> longer(Link.empty, Link(1))
Link(1)
>>> s, t = Link(1, Link(2)), Link(3, Link(4))
>>> longer(s, t) is s
True
>>> longer(Link(1), Link(2, Link(3)))
Link(2, Link(3))`),
      ],
    },
    {
      id: 'fa24-5b-tests', problem: 'fa24-5b', verified: true,
      verification: verification({ passing: 3, failing: 11 }),
      provenance: EXAM,
      setup: LINK + '\n' + LONGER, setupNote: 'These tests provide the course’s Link class (the exam uses it but does not print it) and longer from part (a) (the official solution).', setupFrom: ['fa24-5a'],
      cases: [
        exam(`>>> longest(Link(5, Link(1, Link(3, Link(4, Link(2, Link(7)))))), 7)
Link(1, Link(3, Link(2)))
>>> longest(Link(5, Link(1, Link(3, Link(4, Link(2, Link(7)))))), 70)
Link(5, Link(1, Link(3, Link(4, Link(2, Link(7))))))`),
        exam(`>>> longest(Link(3, Link(4, Link(5))), 2) is Link.empty
True`),
        added(`>>> s = Link(4, Link(1, Link(1, Link(3))))
>>> longest(s, 5)
Link(1, Link(1, Link(3)))
>>> s  # not mutated
Link(4, Link(1, Link(1, Link(3))))`),
        added(`>>> longest(Link(5), 5)
Link(5)
>>> longest(Link(2, Link(1)), 1)
Link(1)
>>> longest(Link(6), 5) is Link.empty
True`),
      ],
    },
    {
      id: 'fa24-6-tests', problem: 'fa24-6', verified: true,
      verification: verification({ passing: 2, failing: 4 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> scare = Tree(0, [Tree(4), Tree(5, [Tree(10)]), Tree(2)])
>>> crow = Tree(4, [Tree(5), Tree(9, [scare, Tree(7, [Tree(6)])]), Tree(8)])
>>> max_path(crow, lambda p: -p[-1])
[4, 9, 0, 2]
>>> max_path(crow, len)
[4, 9, 0, 5, 10]
>>> max_path(crow, lambda p: -abs(p[0]-p[-1]))
[4, 9, 0, 4]`),
        added(`>>> max_path(Tree(3), len)
[3]
>>> t = Tree(1, [Tree(2, [Tree(9)]), Tree(5)])
>>> max_path(t, sum)
[1, 2, 9]
>>> max_path(t, lambda p: -sum(p))
[1, 5]`),
      ],
    },

    // ───────────────────────────── Spring 2024 Midterm 2 ─────────────────────────────
    {
      id: 'sp24-3-tests', problem: 'sp24-3', verified: true,
      verification: verification({ passing: 4, failing: 24 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> m = Mic()
>>> m.sing('Is this thing on?')
Front - Is this thing on?
>>> Speaker(str.lower).connect(m, 'Left Side')
>>> Speaker(str.upper).connect(m, 'Right Side')
>>> m.sing("You belong with me.")
Front - You belong with me.
Left Side - you belong with me.
Right Side - YOU BELONG WITH ME.`),
        added(`>>> m1, m2 = Mic(), Mic()
>>> Speaker(str.upper).connect(m1, 'Back')
>>> m2.sing('hi')
Front - hi
>>> m1.sing('hi')
Front - hi
Back - HI`),
        added(`>>> Speaker(lambda s: s + '!').repeat('wow')
'wow!'
>>> m = Mic()
>>> Speaker(str.upper).connect(m, 'Front')  # replaces the speaker in that location
>>> m.sing('hey')
Front - HEY`),
      ],
    },
    {
      id: 'sp24-4a-tests', problem: 'sp24-4a', verified: true,
      verification: verification({ passing: 2, failing: 13 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> is_strip([3, 4, 5, 6])
True
>>> is_strip([3, 3, 3])
False
>>> is_strip([3, 4, 5, 4, 6])
False`),
        exam(`>>> is_strip([3, 4, 5, 5, 6])
False
>>> is_strip([3, 4, 5, 6, 8])
False
>>> is_strip([5])
True
>>> is_strip([])
True`),
        added(`>>> [is_strip([0, 1]), is_strip([2, 1]), is_strip([-2, -1, 0]), is_strip([1, 3])]
[True, False, True, False]`),
      ],
    },
    {
      id: 'sp24-4c-tests', problem: 'sp24-4c', verified: true,
      verification: verification({ passing: 3, failing: 14 }),
      provenance: EXAM, setup: '', setupFrom: [],
      cases: [
        exam(`>>> longest([4, 2, 3, 5, 6, 4, 6, 5])
[2, 3, 4, 5]
>>> longest([4, 2, 3, 5, 6, 4])
[4, 5, 6]
>>> longest([2, 4, 6])
[2]`),
        added(`>>> longest([])
[]
>>> longest([7])
[7]
>>> longest([9, 8, 1, 2])
[1, 2]`),
        added(`>>> longest([1, 1, 2])
[1, 2]
>>> longest([3, 1, 2, 4])  # ties go to the strip that starts earlier
[3, 4]
>>> longest([2, 3, 3])
[2, 3]`),
      ],
    },
    {
      id: 'sp24-4d-tests', problem: 'sp24-4d', verified: true,
      verification: verification({ passing: 3, failing: 15 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2), Tree(3)])]))
True
>>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2, [Tree(3)])])]))
False`),
        exam(`>>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2)])]))
False
>>> has_strip(Tree(1, [Tree(2, [Tree(4)]), Tree(3, [Tree(3)])]))
False`),
        added(`>>> has_strip(Tree(5))
True
>>> has_strip(Tree(1, [Tree(2), Tree(5)]))
True
>>> has_strip(Tree(1, [Tree(3), Tree(2, [Tree(4)])]))
False`),
      ],
    },
    {
      id: 'sp24-4e-tests', problem: 'sp24-4e', verified: true,
      verification: verification({ passing: 1, failing: 19 }),
      provenance: EXAM, setup: TREE, setupNote: TREE_NOTE, setupFrom: [],
      cases: [
        exam(`>>> list(strips(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2), Tree(3)])])))
[[1, 2, 3]]
>>> list(strips(Tree(1, [Tree(2), Tree(2, [Tree(2), Tree(3, [Tree(4)]), Tree(3)])])))
[[1, 2], [1, 2, 3, 4], [1, 2, 3]]`),
        added(`>>> list(strips(Tree(4)))
[[4]]
>>> list(strips(Tree(1, [Tree(3)])))
[]
>>> list(strips(Tree(1, [Tree(2, [Tree(3), Tree(3)])])))
[[1, 2, 3], [1, 2, 3]]`),
      ],
    },
    {
      id: 'sp24-4aplus-tests', problem: 'sp24-4aplus', verified: true,
      verification: verification({ passing: 2, failing: 4 }),
      provenance: EXAM,
      setup: TREE + '\n' + HAS_STRIP, setupNote: 'These tests provide the course’s Tree class (the exam uses it but does not print it) and has_strip from part (d) (the official solution).', setupFrom: ['sp24-4d'],
      cases: [
        exam(`>>> test_only_strips(Tree(1, [Tree(2), Tree(2, [Tree(2), Tree(3, [Tree(4)]), Tree(3)])]))
Tree(1, [Tree(2), Tree(2, [Tree(3, [Tree(4)]), Tree(3)])])
>>> test_only_strips(Tree(5, [Tree(6), Tree(6, [Tree(7, [Tree(9)])]), Tree(7)]))
Tree(5, [Tree(6)])`),
        added(`>>> test_only_strips(Tree(7))
Tree(7)
>>> test_only_strips(Tree(1, [Tree(2, [Tree(3)]), Tree(2, [Tree(4)])]))
Tree(1, [Tree(2, [Tree(3)])])`),
      ],
    },
  ];
  return { version: 1, suites };
})();
