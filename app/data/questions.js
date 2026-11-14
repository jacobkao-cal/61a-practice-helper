// Question bank for the CS 61A practice prototype.
//
// Content source: CS 61A Midterm 2 of Fall 2025, Spring 2025, Fall 2024, Spring 2024, Fall 2023, Spring 2023,
// Fall 2022 and Fall 2021
// (exam + official solutions), transcribed for a personal/prototype build. Verify course-material permissions before publishing.
//
// Shape:
//   TOPICS    – configurable category list (order = display order on the home page)
//   PROBLEMS  – shared context shown in the LEFT pane (intro text, code with blanks ⟦x⟧, notes)
//   QUESTIONS – one navigable item each, shown in the RIGHT pane
//   ANSWER_KEY – kept separate from QUESTIONS so display code never touches answers by accident
//
// Inline text markup (rendered safely by app.js): `code`, **bold**, *italic*. In intro/outro text, a ``` fenced block
// is shown as code, exactly as printed.
// Code blanks: ⟦a⟧ renders as an exam-style blank labeled (a).
// figure (optional): the exam's environment diagram image, { src, alt, width, height, slots }, shown in the
//   diagram workspace on the right; slots are its empty blanks as [x, line y, width] in image pixels.
// illustration (optional): an image from the exam PDF shown under the intro, { src, alt, width, height }.

window.CS61A_BANK = (function () {
  const code = (s) => s.replace(/^\n/, '').replace(/\s+$/, '');

  const TOPICS = [
    { id: 'fundamentals', name: 'Python Fundamentals', blurb: 'Expressions, control, dictionaries' },
    { id: 'hof', name: 'Higher-Order Functions', blurb: 'Lambdas, functions as values, key=' },
    { id: 'env', name: 'Environment Diagrams', blurb: 'Frames, bindings, what gets printed' },
    { id: 'recursion', name: 'Recursion', blurb: 'Base cases, tree recursion, counting' },
    { id: 'lists', name: 'Lists & Mutation', blurb: 'Comprehensions, aliasing, append/extend' },
    { id: 'links', name: 'Linked Lists', blurb: 'The Link class' },
    { id: 'trees', name: 'Trees', blurb: 'The Tree class, depth, labels' },
    { id: 'iterators', name: 'Iterators', blurb: 'iter, next, map, filter' },
    { id: 'generators', name: 'Generators', blurb: 'yield, yield from' },
    { id: 'oop', name: 'OOP', blurb: 'Classes, inheritance, attributes' },
    { id: 'efficiency', name: 'Efficiency', blurb: 'Order of growth' },
  ];

  // complete: every question of the original PDF is transcribed (checked against the PDFs' point values:
  // Fall 2025, Spring 2025, Spring 2024 and Fall 2021 total 50 points; Fall 2024, Fall 2023 and Spring 2023 total 45;
  // Fall 2022 prints 45 but its part values sum to 44, because Q6(b) prints 6 points over parts worth 1 + 1 + 2 + 1).
  // Set it to false for a partial transcription; Exam Mode then labels the full exam as incomplete.
  const EXAMS = {
    fa25: { id: 'fa25', label: 'Fall 2025 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    sp25: { id: 'sp25', label: 'Spring 2025 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    fa24: { id: 'fa24', label: 'Fall 2024 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    sp24: { id: 'sp24', label: 'Spring 2024 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    fa23: { id: 'fa23', label: 'Fall 2023 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    sp23: { id: 'sp23', label: 'Spring 2023 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    fa22: { id: 'fa22', label: 'Fall 2022 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    fa21: { id: 'fa21', label: 'Fall 2021 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
  };

  const BUBBLE_NOTE = 'For questions with circular bubbles, select exactly one choice. For questions with square checkboxes, you may select multiple choices.';

  const PROBLEMS = {
    // ───────────────────────────── Fall 2025 Midterm 2 ─────────────────────────────
    'fa25-1': {
      exam: 'fa25', number: '1', title: 'What Would Python Display?', points: 5,
      intro: 'Assume the following code has been executed.',
      code: code(`
def weird(s):
    if s:
        if len(s) > 1:
            yield s[1]
        for x in weird(s[1:]):
            yield x
        yield s[0]

t = weird([5, [6, 7], 8])

def even(s):
    def weirder(t, i):
        if i < len(s):
            t.append(s[i-1])
            t.append(s[i])
            weirder(t, i * 2)
        return t
    return weirder([], 1)
`),
      outro: 'Write the output displayed by each expression below or *Error* if an error occurs. If some output is displayed before the error, include it. Assume that each expression is evaluated in order and sequentially, so evaluating the first could affect the value of the second. Write *Generator* for a generator object and *Function* for a function.',
    },
    'fa25-2': {
      exam: 'fa25', number: '2', title: 'That’s a Wrap', points: 4,
      intro: 'Answer the question below about this code. Draw an environment diagram, but the diagram itself will not be scored.',
      figure: { src: 'assets/fa25-mt2-q2.png', width: 628, height: 418, alt: 'From the exam: the code, and a blank environment diagram. The Global frame binds wrap to func wrap(s) [parent=Global] and peel to func peel(f, s) [parent=Global]. Frames f1 and f2 have blank names, [parent=Global], three blank bindings and a blank Return value. Frames f3 and f4 have blank names, [parent=Global], one blank binding and a blank Return value.', slots: [[217, 71, 57], [246, 91, 86], [343, 91, 43], [246, 114, 86], [343, 114, 43], [246, 135, 86], [343, 135, 43], [343, 161, 43], [217, 184, 57], [246, 204, 86], [343, 204, 43], [246, 227, 86], [343, 227, 43], [246, 248, 86], [343, 248, 43], [343, 274, 43], [217, 297, 57], [246, 317, 85], [343, 317, 43], [343, 341, 43], [217, 366, 57], [246, 386, 86], [343, 386, 43], [343, 409, 43]] },
      code: code(`
def wrap(s):
    return [s[0], s]

def peel(f, s):
    f(f(s)).append(2)
    t = s[1]
    t[0] = 3
    t = [4]
    return s

s = [5, [6, [7]]]
print(peel(lambda s: s[1],
           wrap(s)))
`),
      lineNumbers: true,
    },
    'fa25-3': {
      exam: 'fa25', number: '3', title: 'Inclusive', points: 5,
      intro: '**Definition:** A tree `whole` *includes* a tree `part` if it is possible to create a tree with the same repr string as `part` by removing some of the nodes of `whole` (but making no other changes). When a node is removed, all of its children are removed as well. The order of the nodes that remain must match, so that the repr string is the same.\n\nImplement `includes`, which takes a `Tree` instance `part` and a `Tree` instance `whole` and returns whether `whole` includes `part`.',
      code: code(`
def includes(part, whole):
    """Return whether the Tree part is included in the Tree whole.

    >>> p1 = Tree(2, [Tree(20), Tree(22)])
    >>> right = Tree(2, [Tree(19), Tree(20), Tree(21), Tree(22), Tree(23)])
    >>> wrong = Tree(2, [Tree(19), Tree(22), Tree(20), Tree(23)])
    >>> [includes(p1, right), includes(p1, wrong), includes(Tree(1, [right]), p1)]
    [True, False, False]
    >>> p2 = Tree(1, [Tree(6), p1])
    >>> includes(p2, Tree(1, [Tree(5), Tree(6, [Tree(7)]), wrong, right]))
    True
    >>> includes(p2, Tree(1, [Tree(5), Tree(6, [Tree(7)]), wrong, Tree(8, [right])]))
    False
    """
    if whole.label != part.label:
        return False
    p, w = 0, 0
    while ⟦a⟧:
        if ⟦b⟧:
            p += 1
        w += 1
    return ⟦c⟧
`),
    },
    'fa25-4': {
      exam: 'fa25', number: '4', title: 'Exclusive', points: 6,
      intro: 'Implement `exclude`, which takes a list of numbers `s` and a number `x`. It returns a list with all the elements of `s` that are not equal to `x`. The input list should not be modified.\n\nImplement `exclude_link`, which takes a linked list of numbers `s` and a number `x`. It returns a linked list with all the elements of `s` that are not equal to `x`. The input linked list should not be modified. It is possible that `s` could be empty.',
      code: code(`
def exclude(s, x):
    """Return a list with all of the elements of s except those equal to x.

    >>> a = [3, 4, 5, 3.0, 6, 5, 3]
    >>> exclude(a, 3)
    [4, 5, 6, 5]
    >>> a  # no change to a
    [3, 4, 5, 3.0, 6, 5, 3]
    """
    return ⟦a⟧

def exclude_link(s, x):
    """Return a linked list with all of the elements of linked list s except those equal to x.

    >>> a = Link(3, Link(4, Link(5, Link(3.0, Link(6, Link(5, Link(3)))))))
    >>> exclude_link(a, 3)
    Link(4, Link(5, Link(6, Link(5))))
    >>> a  # no change to a
    Link(3, Link(4, Link(5, Link(3.0, Link(6, Link(5, Link(3)))))))
    """
    if ⟦b⟧:
        return ⟦c⟧
    elif ⟦d⟧:
        return ⟦e⟧
    else:
        return ⟦f⟧
`),
    },
    'fa25-5': {
      exam: 'fa25', number: '5', title: 'Pizza Parlor', points: 10,
      intro: 'A Pizza `Parlor` has attributes for its `name` (str), the `price` (int) of each pizza it sells, the number of `pizzas` (int) it has available to cook, an `alt` (an alternative `Parlor`) to help with large orders, and its total `profit` (int). Its `order` method takes a positive integer `quantity` and optionally a `Parlor` instance `source` and processes an order as follows. A `Parlor` will cook at most its number of `pizzas`. If an order is larger than its number of `pizzas`, it will order the rest from its `alt`. Its `profit` increases by its `price` times the `quantity` of pizzas ordered, but decreases by its `alt`’s `price` times the quantity it orders from `alt`. A message is printed each time an order is completed or made with another `Parlor` as the `source`. A `MegaParlor` can cook any quantity of pizzas and has no `alt`.',
      code: code(`
class Parlor:
    """A Pizza Parlor has an alt(ernative) Parlor that helps it handle big orders.

    >>> c = Parlor('Sliver', 3, 10, Parlor('Cheeseboard', 4, 10, MegaParlor(5)))
    >>> c.order(6)  # All $3*6 goes to Sliver; it has 4 pizzas left
    Sliver now has $18 profit
    >>> c.order(6)  # Another $3*6 goes to Sliver, which pays $4*2 to Cheeseboard
    Sliver forwarded an order of 2 to Cheeseboard
    Cheeseboard now has $8 profit
    Sliver now has $28 profit
    >>> c.order(10) # Sliver gets $3*10 but pays Cheeseboard $4*10, which pays $5*2 to MEGA
    Sliver forwarded an order of 10 to Cheeseboard
    Cheeseboard forwarded an order of 2 to MEGA
    MEGA now has $10 profit
    Cheeseboard now has $38 profit
    Sliver now has $18 profit
    """
    def __init__(self, name, price, pizzas, alt):
        self.name, self.price, self.pizzas, self.alt = name, price, pizzas, alt
        self.profit = 0

    def cook(self, q):
        overload = ⟦a⟧   # The quantity that must be ordered from alt
        self.pizzas -= (q - overload)   # The quantity cooked by this Parlor
        return overload

    def order(self, quantity, source=None):
        if isinstance(source, Parlor):
            print(source.name, 'forwarded an order of', quantity, 'to', self.name)
        self.profit += ⟦b⟧
        rest = ⟦c⟧
        if rest:
            self.profit -= ⟦d⟧
            ⟦e⟧
        print(f'{self.name} now has \${self.profit} profit')

class MegaParlor(Parlor):
    def __init__(self, price):
        self.name, self.price, self.profit = "MEGA", price, 0

    def cook(self, q):
        return ⟦f⟧
`),
    },
    'fa25-6a': {
      exam: 'fa25', number: '6(a)', title: 'Two Topping Pizzas — symmetrical', points: 2,
      intro: 'Kay and John want to share a pizza. Kay likes mushroom and John likes pineapple, but they won’t eat a pizza that has a mushroom slice next to a pineapple slice. A pizza with *n* slices is a length-*n* string containing `M` for mushroom, `P` for pineapple, and `_` for no topping. Slices are next to each other if they are adjacent in the string **or** are the first and last element of the string.\n\nImplement `symmetrical`, which takes a dictionary `d` and returns `True` if for every pair `(k, v)` for which `d[k] == v`, it’s also true that `d[v] == k`, and returns `False` otherwise. Assume `None` is not a key or value in `d`. The `get` method of a dict returns the value for a key if the key is in the dictionary and otherwise returns `None`.',
      code: code(`
def symmetrical(d):
    """Return whether every key-value pair in d is also a value-key pair.

    >>> symmetrical({'M': 'P', 'P': 'M', 'G': 'G'})
    True
    >>> symmetrical({'M': 'P', 'P': 'M', 'G': 'M'})  # No M->G
    False
    >>> symmetrical({'M': 'P', 'P': 'M', 'G': 'T'})  # No T->G
    False
    """
    return all([⟦a⟧ for k in d.keys()])
`),
    },
    'fa25-6b': {
      exam: 'fa25', number: '6(b)', title: 'Two Topping Pizzas — acceptable', points: 4,
      intro: 'Implement `acceptable`, which takes a non-empty string `pizza` and a symmetrical dictionary of strings `disallow`. It returns whether `pizza` represents a pizza in which no slice that is next to another slice appears as a key-value pair in `disallow`. Assume that every key in `disallow` is not equal to its value. (Remember: the first and last slices are also next to each other.)',
      code: code(`
def acceptable(pizza, disallow={'M': 'P', 'P': 'M'}):
    """Return whether there are no slices next to each other with a disallowed topping pair.

    >>> acceptable("MM_PPP__M")
    True
    >>> acceptable("MM__PPP")  # The first slice M and last slice P are next to each other.
    False
    >>> acceptable("MM__PPP_")
    True
    >>> acceptable("MM__MPPP_")
    False
    """
    assert symmetrical(disallow)
    previous = ''
    for slice in pizza:
        if previous ⟦b⟧:
            return False
        ⟦c⟧
    return ⟦d⟧
`),
    },
    'fa25-6c': {
      exam: 'fa25', number: '6(c)', title: 'Two Topping Pizzas — count_pizzas', points: 6,
      intro: 'Implement `count_pizzas`, which takes a positive integer `num_slices` and returns the number of different pizzas that have mushroom (`M`), pineapple (`P`) or no topping (`_`) slices without `M` next to `P`. You may not call `acceptable`.',
      code: code(`
def count_pizzas(num_slices):
    """Return the number of ways to top a pizza with num_slices.

    >>> count_pizzas(1)  # One slice can have mushroom, or pineapple, or no topping.
    3
    >>> count_pizzas(2)  # MM M_ _M __ PP P_ _P
    7
    """
    def f(n, first, previous):
        if ⟦e⟧:
            if first == previous or ⟦f⟧:
                return 1
            return 0
        allowed_next = ⟦g⟧
        if previous == 'P':
            allowed_next.remove('M')
        if previous == 'M':
            allowed_next.remove('P')
        return sum([⟦h⟧ for x in allowed_next])
    slice_types = ['_', 'M', 'P']
    return sum([f(1, x, x) for x in slice_types])
`),
    },
    'fa25-6d': {
      exam: 'fa25', number: '6(d)', title: 'Two Topping Pizzas — pizzas', points: 8,
      intro: 'Implement `pizzas`, which takes a positive integer `n` and returns a list of all different pizzas that have `M`, `P` or `_` slices and do not have `M` next to `P`. The `check_ends` argument indicates whether to check that the first and last slice are allowed to be next to each other. You may not call `acceptable`.',
      code: code(`
def pizzas(n, check_ends=True):
    """Ways to distribute M and P toppings on a pizza with n slices.

    >>> pizzas(1)
    ['_', 'M', 'P']
    >>> pizzas(2)
    ['__', '_M', '_P', 'M_', 'MM', 'P_', 'PP']
    >>> pizzas(3)
    ['___', '__M', '__P', '_M_', '_MM', '_P_', '_PP',
     'M__', 'M_M', 'MM_', 'MMM', 'P__', 'P_P', 'PP_', 'PPP']
    >>> '_M_P' in pizzas(4)
    True
    """
    if n == 0:
        return ⟦i⟧
    recurse = pizzas(n-1, False)
    ways = ⟦j⟧
    for y, z in [['M', 'P'], ['P', 'M']]:
        ⟦k⟧([y + x for x in recurse if not x or ⟦l⟧])
    ok = lambda x: True
    if check_ends:
        ok = lambda x: x[0] + x[-1] not in ['MP', 'PM']
    return ⟦m⟧   # Must be a call expression
`),
    },
    'fa25-6aplus': {
      exam: 'fa25', number: '6(d) vi', title: 'Two Topping Pizzas — A+ question', points: 0,
      intro: 'This A+ question is not worth any points. Here are two examples of calling `sum` on a list of lists with an optional `start` argument:\n\n`sum([[1, 2], [3]], start=[])` → `[1, 2, 3]`  and  `sum([], start=[])` → `[]`\n\nFill in the blank of this alternate implementation of `pizzas`. You may call `acceptable` and `count_pizzas`.',
      code: code(`
def pizzas(n):
    """Ways to distribute M and P toppings on a pizza with n slices."""
    def g(pizzas):
        yield from pizzas
        yield from g(sum([[p + s for s in slices] for p in pizzas], start=[]))
    slices = ['_', 'M', 'P']
    t, u = ⟦A+⟧
    return [next(t) for _ in u]
`),
    },

    // ───────────────────────────── Spring 2025 Midterm 2 ─────────────────────────────
    'sp25-1': {
      exam: 'sp25', number: '1', title: 'What Would Python Display?', points: 6,
      intro: 'Assume the following code has been executed. The `pop` method of a list removes and returns its last element.',
      code: code(`
s = [2, [5, 8], 11]
t = [1, 3, 5, 7, 9]

def add_t(x):
    if isinstance(x, list):
        return [add_t(y) for y in x]
    else:
        return x + t.pop()

m = map(add_t, s)
`),
      outro: 'Write the value of each expression below or *Error* if an error occurs. Assume that each expression is evaluated in order and sequentially, so evaluating the first could affect the value of the second. Write *Map* for a map object and *Function* for a function.',
    },
    'sp25-2': {
      // The PDF's Q2 is 7 points: (a) 3 + (b) 3 + (c) 1. Part (c) is its own problem (sp25-2c, below), so this header
      // shows the 6 points of the parts listed with it.
      exam: 'sp25', number: '2', title: 'This or That', points: 6,
      intro: 'Answer the questions about the code below. Draw an environment diagram, but the diagram itself will not be scored.',
      figure: { src: 'assets/sp25-mt2-q2.png', width: 646, height: 259, alt: 'From the exam: the code with line numbers 1 to 14, and a blank environment diagram. The Global frame binds f to func f(this) [parent=Global] and has one more blank binding. Frame f1: f [parent=Global] has three blank bindings and a blank Return value. Frame f2: g [parent=f1] has two blank bindings and a blank Return value.', slots: [[283, 45, 86], [380, 45, 44], [284, 91, 85], [380, 91, 44], [284, 114, 85], [380, 114, 44], [284, 135, 85], [380, 135, 43], [380, 161, 44], [284, 204, 85], [380, 204, 44], [284, 227, 85], [380, 227, 44], [381, 251, 43]] },
      code: code(`
def f(this):
    that = this[1]
    def g(copy):
        that[0] = 4
        copy[0] = 5
        copy[1].append(6)
        print(copy)
    g(list(this))
    this.append(that)
    that.append(7)

t = [1, [2], 3]
f(t)
print(t)
`),
      lineNumbers: true,
    },
    'sp25-2c': {
      exam: 'sp25', number: '2(c)', title: 'This or That — order of growth', points: 1,
      intro: 'What is the order of growth of the time it takes to execute `result = nest(n)` in terms of positive integer `n`? Assume that `append` always takes one step (constant time).',
      code: code(`
def nest(n):
    """Create a nested list.

    >>> nest(3)
    [[[[], []], [[], []]], [[[], []], [[], []]]]
    """
    s = []
    first = s
    for x in range(n):
        next_s = []
        s.append(next_s)
        s.append(next_s)
        s = next_s
    return first
`),
    },
    'sp25-3a': {
      exam: 'sp25', number: '3(a)', title: 'Berkeley Time — Event', points: 5,
      intro: 'An `Event` instance has `start` and `end` attributes that are positive integers representing the number of minutes after midnight that the `Event` begins and concludes.\n\nImplement the `Event` class. The `split` method takes an integer `k` that evenly divides the difference between the end and start times. It is a generator function that yields `k` sequential events of equal length that together span the same time interval as the original event. Calling `split` does not change the event.',
      code: code(`
class Event:
    """An Event has a start and end time and can be split into equal-length shorter events.

    >>> calapalooza = Event(980, 1180)
    >>> list(calapalooza.split(4))  # Split it into 4 smaller events that go from 980 to 1180.
    [Event(980, 1030), Event(1030, 1080), Event(1080, 1130), Event(1130, 1180)]
    """
    def __init__(self, start, end):
        self.start, self.end = start, end

    def __repr__(self):
        return f'Event({self.start}, {self.end})'

    def split(self, k):
        assert (self.end - self.start) % k == 0  # k evenly divides the duration of the event.
        length = (self.end - self.start) // k
        start = ⟦a⟧
        for i in range(k):
            yield ⟦b⟧
            ⟦c⟧
`),
    },
    'sp25-3b': {
      exam: 'sp25', number: '3(b)', title: 'Berkeley Time — BerkeleyEvent', points: 5,
      intro: 'A `BerkeleyEvent` is an `Event` (from part (a)) with a modified `split` method. The first `Event` yielded by `split` starts at the same time as the original event, but all events after the first one are 10 minutes shorter and start 10 minutes after the previous event ends. Again, assume `k` evenly divides the difference between the `end` and `start` attributes.',
      code: code(`
class BerkeleyEvent(Event):
    """When a BerkeleyEvent is split, there is time between events.

    >>> list(BerkeleyEvent(840, 930).split(3))
    [Event(840, 870), Event(880, 900), Event(910, 930)]
    """
    time = 10  # How much time between events

    def split(self, k):
        first = True
        for e in ⟦d⟧:
            if first:
                first = False
            else:
                ⟦e⟧.start = ⟦f⟧ + ⟦g⟧
            yield e
`),
    },
    'sp25-4a': {
      exam: 'sp25', number: '4(a)', title: 'DeepSeek — deepest', points: 5,
      intro: '**Definition.** The *depth* of the root node of a tree is 0. The depth of each other node is one plus the depth of its parent.\n\nImplement `deepest`, which takes a `Tree` instance `t` and a value `x`. It returns the largest depth of a node labeled `x` in `t`. If there are no nodes labeled `x` in `t`, then `deepest(t, x)` returns `None`.',
      code: code(`
def deepest(t, x):
    """Return the maximum depth of a node labeled x in Tree t.
    Return None if x is not a label in t.

    >>> example = Tree(30, [Tree(20), Tree(20, [Tree(30, [Tree(20)])])])
    >>> deepest(example, 30)
    2
    >>> deepest(example, 20)
    3
    >>> print(deepest(example, 10))
    None
    """
    below = [deepest(b, x) for b in t.branches]
    depths = [⟦a⟧]
    if ⟦b⟧:
        depths.⟦c⟧
    if depths:
        return max(depths)
    else:
        return None
`),
    },
    'sp25-4b': {
      exam: 'sp25', number: '4(b)', title: 'DeepSeek — deep', points: 6,
      intro: 'Implement `deep`, which takes a `Tree` instance `t`. It returns a dictionary containing each unique node label of `t` as a key. The value for each key `k` is the largest depth of any node in `t` labeled `k`. **You may not call `deepest`.**\n\n*Hint:* For a dictionary `d`, `d.get(1, 2)` returns the value for the key `1` if that key appears in `d` and `2` otherwise.',
      code: code(`
def deep(t):
    """Return a dictionary containing each unique label of t as a key
    and the maximum depth of a node labeled with that key as its value.

    >>> deep(Tree(30, [Tree(20), Tree(20, [Tree(30, [Tree(20)])])]))
    {30: 2, 20: 3}
    """
    result = {}
    def visit(node, depth):
        ⟦d⟧ = max(⟦e⟧, result.get(⟦f⟧, 0))
        for b in node.branches:
            ⟦g⟧
    visit(t, 0)
    return result
`),
    },
    'sp25-5a': {
      exam: 'sp25', number: '5(a)', title: 'Just Add and Multiply — muladd', points: 5,
      intro: '**Definition.** A *plus-times-expression* for a list (or linked list) of numbers inserts either `+` or `*` between each adjacent pair of numbers. For example, `2*3+4+5` is one possible plus-times-expression for `[2, 3, 4, 5]`.\n\nImplement `muladd`, which takes a linked list of numbers `s`. It returns the value of the plus-times-expression that starts with `*` and then alternates between `+` and `*`. If `s` has only one element, `muladd` returns that element.',
      code: code(`
def muladd(s):
    """Combine the numbers in linked list s by alternately multiplying and adding.

    >>> example = Link(9, Link(4, Link(7, Link(2, Link(0)))))  # <9 4 7 2 0>
    >>> muladd(example)  # 9 * 4 + 7 * 2 + 0, not 9 * (4 + 7 * (2 + 0))
    50
    >>> muladd(Link(2, example))  # 2 * 9 + 4 * 7 + 2 * 0
    46
    >>> muladd(Link(2))
    2
    """
    if s is Link.empty:
        return 0
    elif s.rest is Link.empty:
        return ⟦a⟧
    else:
        return ⟦b⟧
`),
    },
    'sp25-5b': {
      exam: 'sp25', number: '5(b)', title: 'Just Add and Multiply — ways', points: 5,
      intro: 'Implement `ways`, which takes positive integers `k` and `n`. It returns the number of possible plus-times-expressions for a list of length `n` that have at most `k` `*`-symbols in a row. For example, `2+3*4*5*6+7*8*9+10+11*12*13*14+15*16` has 3 in a row (`3*4*5*6`), then 2 in a row (`7*8*9`), then 3 in a row, then 1 in a row.',
      code: code(`
def ways(k, n):
    """Return the number of plus-times-expressions with at most k consecutive *'s for n numbers.

    >>> ways(1, 4)  # For [2, 3, 4, 5], these 5 ways: 2+3+4+5, 2+3+4*5, 2+3*4+5, 2*3+4+5, 2*3+4*5
    5
    >>> ways(2, 4)  # For [2, 3, 4, 5], the 7 ways would also include 2+3*4*5 and 2*3*4+5
    7
    >>> ways(2, 5)  # Some examples for [2, 3, 4, 5, 6]: 2+3*4+5*6 & 2*3*4+5*6 (but not 2+3*4*5*6)
    13
    """
    def f(left, n):
        if ⟦c⟧:
            return 1
        result = f(⟦d⟧, n - 1)
        if left:
            result += ⟦e⟧
        return result
    return f(k, n)
`),
    },
    'sp25-5c': {
      exam: 'sp25', number: '5(c)', title: 'Just Add and Multiply — close', points: 6,
      intro: 'Implement `close`, which takes a list of numbers `s` and a number `x`. It returns the number closest (in absolute value) to `x` that is the value of some plus-times-expression for `s`.\n\n*Hint:* A slice that starts past the end of a list is empty. For example, `[2, 3, 4][3:]` evaluates to `[]`.',
      code: code(`
def close(s, x):
    """Return the value of a plus-times-expression for s that is closest to x.

    >>> print(close([1, 2, 3, 4], 10))  # 1 + 2 + 3 + 4 = 10
    10
    >>> print(close([1, 2, 3, 4], 20))  # 1 * 2 * 3 * 4 = 24 (4 away from 20)
    24
    >>> print(close([1, 2, 3, 4], 30))  # 1 + 2 * 3 * 4 = 25 (5 away from 30)
    25
    >>> print(close([3, 7, 5, 4, 2, 6], 66))  # 3 * 7 + 5 * 4 * 2 + 6 = 67 (1 away from 66)
    67
    """
    if not s:
        return 0
    choices = [product(s[:i]) + ⟦f⟧ for i in range(1, len(s) + 1)]
    return min(choices, key=⟦g⟧)

def product(s):
    """Return the result of multiplying together the elements of a non-empty list of numbers s."""
    if len(s) == 1:
        return s[0]
    return s[0] * product(s[1:])
`),
    },
    'sp25-5d': {
      exam: 'sp25', number: '5(d)', title: 'Just Add and Multiply — A+ question', points: 0,
      intro: 'This A+ question is not worth any points. Fill in the blank of `close_exp`, which takes a list of numbers `s` and a number `x`. It returns a string containing a plus-times-expression for `s` that evaluates to a number that is as close (in absolute value) as possible to `x`. The built-in `eval` function takes a string containing an expression and returns its value; e.g. `eval(\'2+2\')` evaluates to `4`. Uses `close` from part (c).',
      code: code(`
def close_exp(s, x):
    """Return the plus-times-expression of s that has a value closest to x.

    >>> print(close_exp([1, 2, 3, 4], 10))
    1+2+3+4
    >>> print(close_exp([1, 2, 3, 4], 20))
    1*2*3*4
    >>> print(close_exp([1, 2, 3, 4], 30))
    1+2*3*4
    >>> print(close_exp([3, 7, 5, 4, 2, 6], 66))
    3*7+5*4*2+6
    """
    goal = close(s, x)
    term = ''
    for i in range(len(s)):
        if term:
            term += '*'
        term += str(s[i])
        candidate = term
        if i < len(s) - 1:
            candidate += ⟦A+⟧
        if eval(candidate) == goal:
            return candidate
`),
    },

    // ───────────────────────────── Fall 2024 Midterm 2 ─────────────────────────────
    'fa24-1': {
      exam: 'fa24', number: '1', title: 'What Would Python Display?', points: 5,
      intro: 'Assume the following code has been executed. The `Tree` class appears on the midterm 2 study guide (page 2, left side).',
      code: code(`
scare = Tree(0, [Tree(4), Tree(5, [Tree(10)]), Tree(2)])
crow = Tree(9, [scare, Tree(7, [Tree(6)])])

def climb(t, f):
    if t.is_leaf():
        return [t.label]
    return [t.label] + climb(max(t.branches, key=f), f)

def run(t):
    if t.is_leaf():
        return t.label
    else:
        return max(map(run, t.branches))

def hide(t):
    return t.label

jump = {(2 * x - 1): x for x in range(50)}
`),
      outro: 'Write the value of each expression below or *Error* if an error occurs.',
    },
    'fa24-2': {
      exam: 'fa24', number: '2', title: 'Pizza by the Slice', points: 5,
      intro: 'Answer the questions about the code below. You are encouraged to draw an environment diagram, but the diagram itself will not be scored.',
      figure: { src: 'assets/fa24-mt2-q2.png', width: 683, height: 216, alt: 'From the exam: the code with line numbers 1 to 12, and a blank environment diagram. The Global frame binds slice_up to func slice_up(s) [parent=Global] and has one more blank binding. Frame f1: slice_up [parent=Global] has three blank bindings and a blank Return value.', slots: [[294, 44, 86], [391, 44, 44], [295, 97, 85], [391, 97, 44], [295, 120, 85], [391, 120, 44], [295, 141, 85], [391, 141, 44], [391, 167, 44]] },
      code: code(`
def slice_up(s):
    copy = s
    t = [copy]
    while len(s) > 1:
        t.append(s[:len(s)-1])
        s.pop()
        s[0] = len(s)
    return t

t = [3, 4, 5]
print(slice_up(t))
print(t)
`),
      lineNumbers: true,
    },
    'fa24-3': {
      exam: 'fa24', number: '3', title: 'CS 61A Software Store', points: 6,
      intro: 'A `Store` instance has a list of `branches`, and each branch is also a `Store` instance, forming a tree of stores. Each `Store` instance also has a list of programs (strings) called its `inventory`. For a `Store`:\n\n• The `copies(s)` method returns the number of times `s` appears in the inventories of all nodes in its tree of stores.\n\n• The `add_to(k)` method returns a function that takes a string and appends it to the `inventory` of its `k`th branch. Assume that `k` is non-negative and less than the number of branches.',
      code: code(`
class Store:
    """A Store selling programs has branches forming a tree of Stores.
    >>> north, south = Store(['Cats', 'Ants']), Store(['Cats', 'Cats', 'Hog'])
    >>> east, west = Store(['Cats', 'Hog', 'Hog'], [north, south]), Store(['Cats', 'Cats', 'Ants'])
    >>> main = Store(['Ants', 'Ants', 'Hog'], [east, west])
    >>> east.copies('Cats')  # 1 in north, 2 in south, 1 in east
    4
    >>> main.copies('Ants')  # 2 in main, 1 in north, 1 in west
    4
    >>> main.add_to(1)('Ants') # Add 'Ants' to the inventory of west, the branch of main at index 1
    >>> [main.copies('Ants'), west.copies('Ants')]  # increased copies in both main and west
    [5, 2]
    """
    def __init__(self, programs, branches=[]):
        assert all([isinstance(b, Store) for b in branches])
        self.branches = branches
        self.inventory = programs

    def copies(self, s):
        """Return the number of times s (string) appears in all inventories of this tree."""
        return sum([⟦a⟧ for p in self.inventory if p == s] + [⟦b⟧ for b in self.branches])

    def add_to(self, k):
        """Return a function that appends a string to the inventory of the branch at index k."""
        return ⟦c⟧
`),
    },
    'fa24-4a': {
      exam: 'fa24', number: '4(a)', title: 'Almost a Perfect Question — semiperfect', points: 6,
      intro: '**Definition.** A *proper divisor* of an integer `n` is an integer `d` less than `n` that evenly divides `n`, and so `n` divided by `d` has no remainder. A *semiperfect* number is a positive integer that is the sum of some (or all) of its proper divisors. For example, 24 = 2 + 4 + 6 + 12 and so it is semiperfect. The sum of divisors cannot contain repeated numbers.\n\nImplement `semiperfect`, which takes a positive integer `n`. It returns `True` if `n` is semiperfect and `False` otherwise.',
      code: code(`
def semiperfect(n):
    """Return whether positive integer n is a sum of some (or all) of its proper divisors.
    >>> [k for k in range(1, 40) if semiperfect(k)]
    [6, 12, 18, 20, 24, 28, 30, 36]
    """
    def f(s, d):
        if ⟦a⟧:
            return True
        if d >= n:
            return False
        if ⟦b⟧ and f(⟦c⟧, d + 1):
            return True
        return ⟦d⟧
    return f(n, 1)
`),
    },
    'fa24-4b': {
      exam: 'fa24', number: '4(b)', title: 'Almost a Perfect Question — subsums', points: 6,
      intro: 'Implement `subsums`, a generator function that takes a list of **unique** (no repeats) positive integers `s` and a positive integer `n`. It yields all sublists of `s` that sum to `n`. A sublist of `s` is a list containing some of the elements of `s` in order. The `subsums` function should not yield the same list twice. The lists may appear in any order.',
      code: code(`
def subsums(s, n):
    """Yield all sublists of s that sum to n.
    >>> list(subsums([1, 2, 3, 6, 9], 18))
    [[1, 2, 6, 9], [3, 6, 9]]
    >>> list(subsums([1, 2, 3, 4, 6], 16))
    [[1, 2, 3, 4, 6]]
    >>> list(subsums([1, 2, 3, 4, 6, 8, 12], 12))
    [[1, 2, 3, 6], [1, 3, 8], [2, 4, 6], [4, 8], [12]]
    """
    if s:
        if ⟦e⟧:
            yield [n]
        for t in ⟦f⟧:
            yield ⟦g⟧
        yield from ⟦h⟧
`),
    },
    'fa24-4c': {
      exam: 'fa24', number: '4(c)', title: 'Almost a Perfect Question — semisums', points: 6,
      intro: '**Definition.** A *proper divisor* of an integer `n` is an integer `d` less than `n` that evenly divides `n`, and so `n` divided by `d` has no remainder. A *semiperfect* number is a positive integer that is the sum of some (or all) of its proper divisors. For example, 24 = 2 + 4 + 6 + 12 and so it is semiperfect. The sum of divisors cannot contain repeated numbers.\n\nImplement `semisums`, which takes a positive integer `n`. It returns a list of all lists of unique (no repeats) proper divisors of `n` that sum to `n`. You may call `semiperfect` and `subsums`.',
      code: code(`
def semisums(n):
    """Return a list of all lists (with no repeats) of
    proper divisors of n that sum to n.

    >>> semisums(22)  # 22 is not semiperfect, so there are no sums.
    []
    >>> semisums(30)  # 30 is semiperfect. It has three different sums.
    [[1, 3, 5, 6, 15], [2, 3, 10, 15], [5, 10, 15]]
    """
    return list(⟦i⟧([k for k in range(1, n) if ⟦j⟧], ⟦k⟧))

def primitive_semiperfect(n):
    """Return whether n is semiperfect and has no semiperfect proper divisors.

    >>> [k for k in range(1, 300) if primitive_semiperfect(k)]
    [6, 20, 28, 88, 104, 272]
    """
    return semiperfect(n) and not any(map(semiperfect, filter(⟦l⟧)))
`),
    },
    'fa24-5a': {
      exam: 'fa24', number: '5(a)', title: 'How Long is this Exam? — longer', points: 5,
      intro: 'Implement `longer`, which takes two linked lists of numbers `s` and `t`. It returns the longer of the two. If they have the same length, it returns `s`.\n\nA linked list is either a `Link` instance or `Link.empty`. The `Link` class is on page 2 of the midterm 2 study guide.',
      code: code(`
def longer(s, t):
    """Return the longer linked list, s or t. (Same length? return s.)

    >>> longer(Link(2, Link(3)), Link.empty)
    Link(2, Link(3))
    >>> longer(Link(2, Link(3)), Link(4, Link(5)))
    Link(2, Link(3))
    >>> longer(Link(2, Link(3)), Link(4, Link(5, Link(6, Link(7)))))
    Link(4, Link(5, Link(6, Link(7))))
    >>> longer(Link.empty, Link.empty) is Link.empty
    True
    """
    a, b = s, t

    while b is not Link.empty:

        if ⟦a⟧:

            return ⟦b⟧

        ⟦c⟧

    return ⟦d⟧
`),
    },
    'fa24-5b': {
      exam: 'fa24', number: '5(b)', title: 'How Long is this Exam? — longest', points: 6,
      intro: 'Implement `longest`, which takes a linked list of postive integers `s` and a positive integer `n`. It returns the longest sublist of `s` with elements that sum to a number less than or equal to `n`. **Do not mutate `s`.** In case of a tie, return any of the longest sublists whose sum is `n` or less. Assume `longer` is implemented correctly.\n\nA sublist of a linked list `s` is a linked list with some (or none or all) of the elements of `s` in order.\n\nAssume the sum of the elements of `Link.empty` is 0. `Link.empty` is a sublist of any linked list.',
      code: code(`
def longest(s, n):
    """Return the longest sublist of s that sums to n or less.

    >>> longest(Link(5, Link(1, Link(3, Link(4, Link(2, Link(7)))))), 7)
    Link(1, Link(3, Link(2)))
    >>> longest(Link(5, Link(1, Link(3, Link(4, Link(2, Link(7)))))), 70)
    Link(5, Link(1, Link(3, Link(4, Link(2, Link(7))))))
    >>> longest(Link(3, Link(4, Link(5))), 2) is Link.empty
    True
    """
    if s is Link.empty:
        return s

    t = ⟦e⟧

    if ⟦f⟧:

        return longer(⟦g⟧, t)
    else:
        return t
`),
    },
    'fa24-6': {
      exam: 'fa24', number: '6', title: 'Nice Path! — A+ question', points: 0,
      intro: '**This A+ question is not worth any points. It can only affect your course grade if you have a high A and might receive an A+. Finish the rest of the exam first!**\n\nFill in the blank of `max_path`, which takes a Tree of integers `t` and a function `g`. It returns a list `s` containing the labels along the path from the root of `t` to a leaf for which `g(s)` is as large or larger than for any other path. In case of a tie, return any path with a maximum `g(s)` value.',
      code: code(`
def climb(t, f):
    if t.is_leaf():
        return [t.label]
    return [t.label] + climb(max(t.branches, key=f), f)

def max_path(t, g):
    """Return the path s from the root of t to a leaf for which g(s) is largest.

    >>> scare = Tree(0, [Tree(4), Tree(5, [Tree(10)]), Tree(2)])
    >>> crow = Tree(4, [Tree(5), Tree(9, [scare, Tree(7, [Tree(6)])]), Tree(8)])
    >>> max_path(crow, lambda p: -p[-1])             # The path to the smallest leaf
    [4, 9, 0, 2]
    >>> max_path(crow, len)                          # The longest path
    [4, 9, 0, 5, 10]
    >>> max_path(crow, lambda p: -abs(p[0]-p[-1]))  # To the leaf closest in value to the root
    [4, 9, 0, 4]
    """

    x = [t.label]  # You can use x instead of [t.label] to shorten your answer!

    return climb(t, lambda b: ⟦A+⟧)
`),
    },

    // ───────────────────────────── Spring 2024 Midterm 2 ─────────────────────────────
    'sp24-1': {
      exam: 'sp24', number: '1', title: 'What Would Python Display?', points: 7,
      intro: 'Assume the following code has been executed. The `Link` class appears on the midterm 2 study guide (page 2, left side).',
      code: code(`
def shake(it):
    if it is not Link.empty and it.rest is not Link.empty:
        if it.first + 1 < it.rest.first:
            it.rest = Link(it.rest.first-1, it.rest)
            shake(it)
        else:
            shake(it.rest)
it = Link(2, Link(5, Link(7)))
off = Link(1, it.rest)
shake(it)

def cruel(summer):
    while summer is not Link.empty:
        yield summer.first
        summer = summer.rest
        if summer is not Link.empty:
            summer = summer.rest
summer = Link(1, Link(2, Link(3, Link(4))))
`),
      outro: 'Write the output printed for each expression below or *Error* if an error occurs.',
    },
    'sp24-2': {
      exam: 'sp24', number: '2', title: 'Spin Cycle', points: 6,
      intro: 'Complete the environment diagram below and then answer the questions that follow. Do not add frames for calls to built-in functions (such as `print`).',
      figure: { src: 'assets/sp24-mt2-q2.png', width: 663, height: 251, alt: 'From the exam: the code with line numbers 1 to 13, and an environment diagram to complete. The Global frame binds cycle to func cycle(a) [parent=Global] and has a blank binding for c. Frame f1: cycle [parent=Global] has blank bindings for a and b, binds f to func f(rest) [parent=f1], and shows Return value None. Frame f2: f [parent=f1] has a blank binding for rest and a blank Return value.', slots: [[391, 45, 44], [391, 98, 44], [391, 142, 44], [391, 219, 44], [391, 242, 43]] },
      code: code(`
def cycle(a):
    def f(rest):
        rest.append(a.pop())
        return [rest.append(a)]
    b = []
    a = f(b)
    b = b + [5]
    print(a)
    print(b)

c = [2, 3, 4]
cycle(c)
print(c)
`),
      lineNumbers: true,
    },
    'sp24-3': {
      exam: 'sp24', number: '3', title: 'Fearless', points: 8,
      intro: 'If you sing lyrics into a mic, every connected speaker repeats them.\n\nA `Mic` instance has a dictionary `speakers` containing `Speaker` instances as values, each with its location (`str`) as its key. Its `sing` method takes a string `lyrics` and invokes the `repeat` method of each `Speaker` instance connected to it.\n\nA `Speaker` takes a `transform` function that takes and returns a string. To `connect` a `Speaker` instance to `m` (`Mic`) in a `location` (`str`), add that instance to the `speakers` dictionary of `m` in that `location`. To `repeat` a signal `s` (`str`), return the result of calling the speaker’s `transform` function on `s`.\n\nEvery `Mic` starts connected to a `Speaker` in the `Front` location that repeats the exact same signal it receives.\n\nImplement the `Mic` and `Speaker` classes to match the doctests. The `str.lower` and `str.upper` functions return lowercased and uppercased versions of a string, respectively.',
      code: code(`
class Mic:
    """A microphone connected to speakers.

    >>> m = Mic()  # Front is connected automatically
    >>> m.sing('Is this thing on?')
    Front - Is this thing on?
    >>> Speaker(str.lower).connect(m, 'Left Side')
    >>> Speaker(str.upper).connect(m, 'Right Side')
    >>> m.sing("You belong with me.")
    Front - You belong with me.
    Left Side - you belong with me.
    Right Side - YOU BELONG WITH ME.
    """
    def __init__(self):
        self.speakers = ⟦a⟧

    def sing(self, lyrics):
        for k in self.speakers.keys():  # iterate over the keys of a dictionary
            print(k, '-', ⟦b⟧.repeat(lyrics))

class Speaker:
    def __init__(self, transform):
        self.transform = transform

    def connect(self, m, location):
        ⟦c⟧

    def repeat(self, s):
        return ⟦d⟧
`),
    },
    'sp24-4a': {
      exam: 'sp24', number: '4(a)', title: 'Who’s counting? — is_strip', points: 4,
      intro: '**Definition.** A *strip* is a list of integers in which each integer is one more than the last. For example, `[3, 4, 5, 6]` is a strip. Empty and one-element lists are strips.\n\nImplement `is_strip`, which takes a list of integers `s` and returns whether it is a strip.',
      code: code(`
def is_strip(s):
    """Return whether list s is a strip.

    >>> is_strip([3, 4, 5, 6])
    True
    >>> is_strip([3, 3, 3])        # 3 after 3
    False
    >>> is_strip([3, 4, 5, 4, 6])  # 4 after 5
    False
    >>> is_strip([3, 4, 5, 5, 6])  # 5 after 5
    False
    >>> is_strip([3, 4, 5, 6, 8])  # 8 after 6
    False
    >>> is_strip([5])
    True
    >>> is_strip([])
    True
    """
    assert type(s) == list
    return ⟦a⟧ or s == list(range(⟦b⟧, ⟦c⟧))
`),
    },
    'sp24-4b': {
      exam: 'sp24', number: '4(b)', title: 'Who’s counting? — drip', points: 7,
      intro: '**Definition.** A *strip* is a list of integers in which each integer is one more than the last. For example, `[3, 4, 5, 6]` is a strip. Empty and one-element lists are strips.\n\nImplement `drip`, which takes two non-empty lists of integers `s` and `t`. It returns `True` if there is a strip containing all and only the elements of `s` and `t` **starting with `s[0]`** in which the elements of `s` appear in order and the elements of `t` appear in order. It returns `False` otherwise.',
      code: code(`
def drip(s, t):
    """Return whether there is a strip made out of interleaving s and t.

    >>> drip([1, 3, 5], [2, 4, 6])     # 1 2 3 4 5 6
    True
    >>> drip([1, 4, 5], [2, 3, 6])     # 1 2 3 4 5 6
    True
    >>> drip([1, 2, 3], [4, 5, 6])     # 1 2 3 4 5 6
    True
    >>> drip([2, 4, 5], [1, 3, 6])     # No strip starting with 2 can contain 1
    False
    >>> drip([1, 2, 4, 5], [1, 3, 6])  # No strip can contain 1 and 1
    False
    >>> drip([1, 4, 5], [2, 3, 7])     # No strip can contain 5 and 7 but no 6
    False
    >>> drip([1, 5, 4], [2, 3, 6])     # No strip can contain 5 before 4
    False
    >>> drip([2], [3, 4, 5])           # 2 3 4 5
    True
    >>> drip([1], [2, 3, 5])           # No strip can contain 3 and 5 but no 4
    False
    """
    while s and t:
        if s[0] + 1 == t[0]:
            s, t = ⟦a⟧  # The next element of the strip is in t
        elif ⟦b⟧:
            s = s[1:]        # The next element of the strip is in s
        else:
            return ⟦c⟧
    return ⟦d⟧
`),
    },
    'sp24-4c': {
      exam: 'sp24', number: '4(c)', title: 'Who’s counting? — longest', points: 6,
      intro: '**Definition.** A *strip* is a list of integers in which each integer is one more than the last. For example, `[3, 4, 5, 6]` is a strip. Empty and one-element lists are strips.\n\nImplement `longest`, which takes a list of integers `s`. It returns the longest strip whose elements appear in `s` in order. If two such strips exist, return the one that starts earlier in `s`. **Hint:** `s[-1]` is the last element in list `s`.',
      code: code(`
def longest(s):
    """Return the longest strip whose elements appear in s in order.
    >>> longest([4, 2, 3, 5, 6, 4, 6, 5])  # 2 3 4 5 is the longest strip in s
    [2, 3, 4, 5]
    >>> longest([4, 2, 3, 5, 6, 4])  # 4 5 6 is as long as 2 3 4 and is earlier
    [4, 5, 6]
    >>> longest([2, 4, 6])
    [2]
    """
    if len(s) == 0:
        return []
    return max([longest_with_s0(s), ⟦a⟧], key=⟦b⟧)

def longest_with_s0(s):
    """Return the longest strip in s that starts with s[0]."""
    result = ⟦c⟧
    for k in s[1:]:
        if ⟦d⟧:
            result.append(k)
    return result
`),
    },
    'sp24-4d': {
      exam: 'sp24', number: '4(d)', title: 'Who’s counting? — has_strip', points: 5,
      intro: '**Definition.** A *strip* is a list of integers in which each integer is one more than the last. For example, `[3, 4, 5, 6]` is a strip. Empty and one-element lists are strips.\n\nImplement `has_strip`, which takes a `Tree` of integers `t`. It returns whether there is a strip containing the labels along some path from the root to a leaf of `t`. The `Tree` class is on the midterm 2 study guide (page 2 left side).',
      // The exam prints blank (b) as "if _______" without the colon; it is added here so the filled-in code runs.
      code: code(`
def has_strip(t):
    """Return whether the elements of some root-to-leaf path form a strip.

    >>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2), Tree(3)])]))  # 1, 2, 3
    True
    >>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2, [Tree(3)])])]))
    False
    >>> has_strip(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2)])]))
    False
    >>> has_strip(Tree(1, [Tree(2, [Tree(4)]), Tree(3, [Tree(3)])]))
    False
    """
    if t.is_leaf():
        return ⟦a⟧
    for b in t.branches:
        if ⟦b⟧:
            return True
    return ⟦c⟧
`),
    },
    'sp24-4e': {
      exam: 'sp24', number: '4(e)', title: 'Who’s counting? — strips', points: 7,
      intro: '**Definition.** A *strip* is a list of integers in which each integer is one more than the last. For example, `[3, 4, 5, 6]` is a strip. Empty and one-element lists are strips.\n\nImplement `strips`, a generator function that takes a `Tree` of integers `t`. It yields all strips that contain the labels along a path from the root to a leaf of `t`.',
      code: code(`
def strips(t):
    """Yield the paths from the root to a leaf of Tree t that form strips.

    >>> list(strips(Tree(1, [Tree(3, [Tree(4)]), Tree(2, [Tree(2), Tree(3)])])))
    [[1, 2, 3]]
    >>> list(strips(Tree(1, [Tree(2), Tree(2, [Tree(2), Tree(3, [Tree(4)]), Tree(3)])])))
    [[1, 2], [1, 2, 3, 4], [1, 2, 3]]
    """
    if t.is_leaf():
        yield ⟦a⟧

    for b in t.branches:
        if ⟦b⟧:

            for s in ⟦c⟧:

                yield ⟦d⟧
`),
    },
    'sp24-4aplus': {
      exam: 'sp24', number: '4(e) v', title: 'Who’s counting? — A+ question', points: 0,
      intro: '**This A+ question is not worth any points. It can only affect your course grade if you have a high A and might receive an A+. Finish the rest of the exam first!**\n\nFill in the blank of `only_strips`, which takes a Tree of integers `t`. It removes all nodes that are **not** on a *strip path*. A *strip path* is a path from the root to a leaf whose labels form a strip. You may use functions implemented earlier in this question.',
      code: code(`
def test_only_strips(t):
    """Call only_strips(t) and then return t. Assume has_strip(t) is True.

    >>> test_only_strips(Tree(1, [Tree(2), Tree(2, [Tree(2), Tree(3, [Tree(4)]), Tree(3)])]))
    Tree(1, [Tree(2), Tree(2, [Tree(3, [Tree(4)]), Tree(3)])])
    >>> test_only_strips(Tree(5, [Tree(6), Tree(6, [Tree(7, [Tree(9)])]), Tree(7)]))
    Tree(5, [Tree(6)])
    """
    only_strips(t)
    return t

def only_strips(t):
    """Remove all nodes of Tree t that are not on a path from the root to a leaf
    whose labels form a strip. Assume has_strip(t) is True.
    """
    t.branches = [b for b in t.branches if ⟦A+⟧]
`),
    },

    // ───────────────────────────── Fall 2023 Midterm 2 ─────────────────────────────
    'fa23-1': {
      exam: 'fa23', number: '1', title: 'What Would Python Display?', points: 4,
      intro: 'Assume the following code has been executed.',
      code: code(`
s = range(3, 7)
t = iter(s)
u = map(lambda x: 2 * x, t)
v = [next(t), next(t)]      # This line does not cause an error
`),
      outro: 'Choose the output **displayed by the interactive Python interpreter** when each expression below is evaluated or *Error* if an error occurs. These expressions are evaluated **in order** and the value of later expressions may be affected by evaluating previous expressions.',
    },
    'fa23-2': {
      exam: 'fa23', number: '2', title: 'Making a List, Checking it Twice', points: 6,
      intro: 'Complete the environment diagram below and then answer the questions that follow. There is one question for each labeled blank in the diagram. The blanks with no labels have no questions associated with them and are not scored. **Some blanks may be empty or unused. If a blank contains an arrow to a function, write the function as it would appear in the diagram. Do not add frames for calls to built-in functions.**\n\n**Reminder**: `list(s)` creates a new list with the same elements as `s`; `s.pop()` removes and returns the last element of `s`.',
      figure: { src: 'assets/fa23-mt2-q2.png', width: 557, height: 281, alt: 'From the exam: the code and an environment diagram to complete. The Global frame binds push to func push(t, x) [parent=Global] and pull to func pull() [parent=Global], and has empty boxes for s and t. Frame f1: pull [parent=Global] has empty boxes for s and for its Return value, and a box for u labeled (a). Frame f2: push [parent=Global] has empty boxes for t, x and s, and Return value None.',
        slots: [[263, 60, 33], [263, 80, 33], [263, 121, 33], [263, 142, 33], [263, 162, 33], [263, 204, 33], [263, 225, 33], [263, 248, 33]] },
      code: code(`
def push(t, x):
    s = list(t)
    s[1].append(x)

def pull():
    s = list(t)
    u = s.pop()
    return u[1][0]

s = [7, [8, 9]]
t = [6, s]

push(s, pull())
print(t)
`),
    },
    'fa23-3': {
      exam: 'fa23', number: '3', title: '24-Hour Library', points: 6,
      intro: 'Anyone can check out a book from a library and then bring that book back. Implement the `Library` and `Book` classes. A `Library` takes a list of unique strings called `titles` and constructs a `books` dictionary that has strings as keys and `Book` objects as values. Its `checkout` method takes a string `title` and returns the corresponding `Book` object if that `title` is not checked out, or prints a message. After `bring_back` is invoked on that book, it can be checked out again.',
      code: code(`
class Library:
    """A library with one copy of each title that can be checked out.

    >>> cs = Library(['Composing Programs', 'Python Docs', 'Berkeley Academic Guide'])
    >>> bs = [cs.checkout('Composing Programs'), cs.checkout('Python Docs')]
    >>> cs.checkout('Composing Programs')        # This time, no Book is returned
    Composing Programs is checked out
    >>> bs[0].bring_back()
    >>> cs.checkout('Composing Programs').title  # This time, a Book is returned
    'Composing Programs'
    """
    def __init__(self, titles):
        self.books = {t: Book(t, ⟦a⟧) for t in titles}
        self.out = []  # A list of Book objects

    def checkout(self, title):
        assert title in self.books, title + " isn't in this library's collection"
        book = ⟦b⟧
        if book not in self.out:
            ⟦c⟧
            return book
        else:
            print(book, 'is checked out')

class Book:
    def __init__(self, title, library):
        self.title = title      # a string
        self.library = library  # a Library object

    def bring_back(self):
        ⟦d⟧.remove(⟦e⟧)

    def __str__(self):
        return ⟦f⟧
`),
    },
    'fa23-4a': {
      exam: 'fa23', number: '4(a)', title: 'A Perfect Question — fit', points: 7,
      intro: '**Definition.** A *perfect square* is `k*k` for some integer `k`.\n\nImplement `fit`, which takes **positive** integers `total` and `n`. It returns `True` or `False` indicating whether there are `n` **positive** perfect squares that sum to `total`. The perfect squares need not be unique.',
      code: code(`
def fit(total, n):
    """Return whether there are n positive perfect squares that sums to total.

    >>> [fit(4, 1), fit(4, 2), fit(4, 3), fit(4, 4)]  # 1*(2*2) for n=1; 4*(1*1) for n=4
    [True, False, False, True]
    >>> [fit(12, n) for n in range(3, 8)]  # 3*(2*2), 3*(1*1)+3*3, 4*(1*1)+2*(2*2)
    [True, True, False, True, False]
    >>> [fit(32, 2), fit(32, 3), fit(32, 4), fit(32, 5)] # 2*(4*4), 3*(1*1)+2*2+5*5
    [True, False, False, True]
    """
    def f(total, n, k):

        if ⟦a⟧:
            return True

        elif ⟦b⟧:
            return False
        else:
            return ⟦c⟧

    return f(total, n, 1)
`),
    },
    'fa23-4b': {
      exam: 'fa23', number: '4(b)', title: 'A Perfect Question — squares', points: 9,
      intro: '**Definition.** A *perfect square* is `k*k` for some integer `k`.\n\nImplement the generator function `squares`, which takes **positive** integers `total` and `k`. It yields all lists of perfect squares greater or equal to `k*k` that sum to `total`. Each list is in non-increasing order (large to small).',
      code: code(`
def squares(total, k):
    """Yield the ways in which perfect squares greater or equal to k*k sum to total.

    >>> list(squares(10, 1))  # All lists of perfect squares that sum to 10
    [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [4, 1, 1, 1, 1, 1, 1], [4, 4, 1, 1], [9, 1]]
    >>> list(squares(20, 2))  # Only use perfect squares greater or equal to 4 (2*2).
    [[4, 4, 4, 4, 4], [16, 4]]
    """
    assert total > 0 and k > 0
    if total == k * k:

        yield ⟦d⟧
    elif total > k * k:

        for s in ⟦e⟧:

            yield ⟦f⟧
        yield from squares(total, k + 1)
`),
    },
    'fa23-5': {
      exam: 'fa23', number: '5', title: 'Only Paths', points: 7,
      intro: 'Implement `only_paths`, which takes a Tree of numbers `t` and a number `n`. It returns a new Tree with only the nodes of `t` on a path from the root to a leaf with labels that sum to `n`, or `None` if no path sums to `n`. Do not mutate `t`.\n\nThe Tree class appears on the midterm 2 study guide. Here is an illustration of the doctest examples involving `t`.',
      illustration: { src: 'assets/fa23-mt2-q5.png', width: 541, height: 80, alt: 'From the exam: three trees drawn as boxes. t: root 3 with branches 4 and 1; 1 has branches 3 (with branch 2), 2 (with branch 1), 5 and 3. only_paths(t, 7): root 3 with branches 4 and 1; 1 has branches 2 (with branch 1) and 3. only_paths(t, 9): root 3 with branch 1; 1 has branches 3 (with branch 2) and 5.' },
      code: code(`
def only_paths(t, n):
    """Return a Tree with only the nodes of t along paths from the root to a leaf of t
    for which the node labels of the path sum to n. If no paths sum to n, return None.

    >>> print(only_paths(Tree(5, [Tree(2), Tree(1, [Tree(2)]), Tree(1, [Tree(1)])]), 7))
    5
      2
      1
        1
    >>> t = Tree(3, [Tree(4), Tree(1, [Tree(3, [Tree(2)]), Tree(2, [Tree(1)]), Tree(5), Tree(3)])])
    >>> print(only_paths(t, 7))
    3
      4
      1
        2
          1
        3
    >>> print(only_paths(t, 9))
    3
      1
        3
          2
        5
    >>> print(only_paths(t, 3))
    None
    """
    if ⟦a⟧:

        return t

    new_branches = [⟦b⟧ for b in t.branches]

    if ⟦c⟧(new_branches):

        return Tree(t.label, [b for b in new_branches if ⟦d⟧])
`),
    },
    'fa23-5aplus': {
      exam: 'fa23', number: '5(e)', title: 'Only Paths — A+ question', points: 0,
      intro: '**This A+ question is not worth any points. It can only affect your course grade if you have a high A and might receive an A+. Finish the rest of the exam first!** Fill in the blank to implement `only_long_paths`, which takes a Tree of numbers `t` and a number `n`. It returns a new Tree containing only the nodes of `t` that lie on a path from the root to a leaf for which the sum of the labels **plus the length of the path** is `n`. Do not mutate `t`. You may not write `and`, `or`, `if`, `[` or `]`. Assume `only_paths` is implemented correctly.',
      code: code(`
only_paths = ⟦A+⟧

def only_long_paths(t, n):
    """Return a Tree with only the nodes of t along paths from the root to a leaf of t
    for which the sum of node labels plus the length of the path is n.

    >>> example = Tree(5, [Tree(3), Tree(1, [Tree(2)]), Tree(1, [Tree(1)])])
    >>> only_long_paths(example, 10)  # Result has paths 5-3 (length 2) and 5-1-1 (length 3)
    Tree(5, [Tree(3), Tree(1, [Tree(1)])])
    """
    return only_paths(t, n)
`),
    },
    'fa23-6': {
      exam: 'fa23', number: '6', title: 'After Party', points: 6,
      intro: 'Implement `after`, which takes a linked list `s` and values `a` and `b`. It returns whether an element of `s` equal to `b` appears after an element of `s` equal to `a`. The `Link` class appears on the Midterm 2 study guide.',
      code: code(`
def after(s, a, b):
    """Return whether b comes after a in linked list s.

    >>> t = Link(3, Link(6, Link(5, Link(4))))
    >>> after(t, 6, 4)
    True
    >>> after(t, 4, 6)
    False
    >>> after(t, 6, 6)
    False
    """
    def find(s, n, f):

        if s == Link.empty:

            return ⟦a⟧

        elif s.first == n:
            return f(s.rest)
        else:
            return find(s.rest, n, f)

    return find(s, a, lambda rest: ⟦b⟧)
`),
    },

    // ───────────────────────────── Spring 2023 Midterm 2 ─────────────────────────────
    'sp23-1': {
      exam: 'sp23', number: '1', title: 'What Would Python Display?', points: 6,
      intro: 'Assume the following code has been executed.',
      code: code(`
def chain(s):
    return [s[0], s[1:]]

silver = [2, chain([3, 4, 5])]
gold = [silver[0], silver[1].pop()]
silver[0] = 1
platinum = chain(chain([6, 7, 8]))
`),
      outro: 'Write the output **displayed by the interactive Python interpreter** when each expression below is evaluated.\n\n*Hint*: Try drawing an environment diagram!\n\n*Reminder*: `s.pop()` removes and returns the last item in list `s`.',
    },
    'sp23-2a': {
      exam: 'sp23', number: '2(a)', title: 'Letter Grade — Letter', points: 4,
      intro: 'Implement the `Letter` class. A `Letter` has two instance attributes: `contents` (a `str`) and `sent` (a `bool`). Each `Letter` can only be sent once. The `send` method prints whether the letter was sent, and if it was, returns the reply, which is a new `Letter` instance with the same `contents`, but in all caps. *Hint*: `\'hi\'.upper()` evaluates to `\'HI\'`.',
      code: code(`
class Letter:
    """A letter receives an all-caps reply when sent successfully.

    >>> hi = Letter('Hello, World!')
    >>> hi.send()
    Hello, World! has been sent.
    HELLO, WORLD!
    >>> hi.send()
    Hello, World! was already sent.
    >>> Letter('Hey').send().send()
    Hey has been sent.
    HEY has been sent.
    HEY
    """
    def __init__(self, contents):
        self.contents = contents
        ⟦a⟧
    def send(self):
        if self.sent:
            print(self, 'was already sent.')
        else:
            print(self, 'has been sent.')
            ⟦b⟧
            return ⟦c⟧
    def __repr__(self):
        # Note: since no __str__ method is defined, the repr and str strings are the same.
        return self.contents
`),
    },
    'sp23-2b': {
      exam: 'sp23', number: '2(b)', title: 'Letter Grade — Numbered', points: 6,
      intro: 'Implement the `Numbered` class. A `Numbered` letter has a `number` attribute equal to how many numbered letters have previously been constructed. This number appears in its `repr` string. Assume `Letter` is implemented correctly.',
      code: code(`
class Numbered(Letter):
    """A numbered letter has a different repr method that shows its number.

    >>> hey = Numbered('Hello, World!')
    >>> hey.send()
    #0 has been sent.
    HELLO, WORLD!
    >>> Numbered('Hi!').send()
    #1 has been sent.
    HI!
    >>> hey
    #0
    """
    number = 0

    def __init__(self, contents):
        super().__init__(contents)
        ⟦d⟧
        ⟦e⟧

    def __repr__(self):
        return '#' + ⟦f⟧
`),
    },
    'sp23-3a': {
      exam: 'sp23', number: '3(a)', title: 'Prefixes — prefix', points: 3,
      intro: '**Definition.** A *prefix sum* of a sequence of numbers is the sum of the first `n` elements for some positive length `n`.\n\nImplement `prefix`, which takes a list of numbers `s` and returns a list of the prefix sums of `s` in increasing order of the length of the prefix.',
      code: code(`
def prefix(s):
    """Return a list of all prefix sums of list s.

    >>> prefix([1, 2, 3, 0, 4, 5])
    [1, 3, 6, 6, 10, 15]
    >>> prefix([2, 2, 2, 0, -5, 5])
    [2, 4, 6, 6, 1, 6]
    """
    return [⟦a⟧ for k in ⟦b⟧]
`),
    },
    'sp23-3a-iii': {
      exam: 'sp23', number: '3(a) iii', title: 'Prefixes — order of growth', points: 1,
      intro: '**Definition.** A *prefix sum* of a sequence of numbers is the sum of the first `n` elements for some positive length `n`.',
      code: code(`
def prefix(s):
    """Return a list of all prefix sums of list s."""
    t = 0
    result = []
    for x in s:
        t = t + x
        result.append(t)
    return result
`),
    },
    'sp23-3b': {
      exam: 'sp23', number: '3(b)', title: 'Prefixes — tens', points: 5,
      intro: '**Definition.** A *prefix sum* of a sequence of numbers is the sum of the first `n` elements for some positive length `n`.\n\nImplement `tens`, which takes a **non-empty** linked list of numbers `s` represented as a `Link` instance. It prints all of the prefix sums of `s` that are multiples of 10 in increasing order of the length of the prefix.\n\nThe `Link` class appears on the midterm 2 study guide.',
      code: code(`
def tens(s):
    """Print all prefix sums of Link s that are multiples of ten.

    >>> tens(Link(3, Link(9, Link(8, Link(10, Link(0, Link(14, Link(6))))))))
    20
    30
    30
    50
    """

    def f(suffix, total):

        if total % 10 == 0:

            print(total)

        if ⟦d⟧:

            ⟦e⟧

    ⟦f⟧
`),
    },
    'sp23-4a': {
      exam: 'sp23', number: '4(a)', title: 'Tree Trimming — exclude', points: 7,
      intro: 'Implement `exclude`, which takes a `Tree` instance `t` and a value `x`. It returns a `Tree` containing the root node of `t` as well as each non-root node of `t` with a label not equal to `x`. The parent of a node in the result is its nearest ancestor node that is not excluded. The input `t` must not be modified.\n\nThe `Tree` class appears on the midterm 2 study guide.',
      code: code(`
def exclude(t, x):
    """Return a Tree with the non-root nodes of t whose labels are not equal to x.

    >>> t = Tree(1, [Tree(2, [Tree(2), Tree(3)]), Tree(4, [Tree(1)])])
    >>> exclude(t, 2)
    Tree(1, [Tree(3), Tree(4, [Tree(1)])])
    >>> t               # t is not changed
    Tree(1, [Tree(2, [Tree(2), Tree(3)]), Tree(4, [Tree(1)])])
    >>> exclude(t, 1)  # The root node cannot be excluded
    Tree(1, [Tree(2, [Tree(2), Tree(3)]), Tree(4)])
    """

    filtered_branches = map(lambda y: ⟦a⟧, t.branches)

    bs = []

    for b in filtered_branches:

        if ⟦b⟧:

            bs.⟦c⟧(⟦d⟧)

        else:

            bs.append(b)

    return Tree(t.label, bs)
`),
    },
    'sp23-4b': {
      exam: 'sp23', number: '4(b)', title: 'Tree Trimming — remove', points: 3,
      intro: 'Implement `remove`, which takes a `Tree` instance `t` and a value `x`. It removes all non-root nodes from `t` that have a label equal to `x`, then returns `t`. The parent of a node in `t` is its nearest ancestor that is not removed. Assume that `exclude` is implemented correctly.',
      code: code(`
def remove(t, x):
    """Remove all non-root nodes labeled x from t and return t.

    >>> t = Tree(1, [Tree(2, [Tree(2), Tree(3)]), Tree(4)])
    >>> remove(t, 2)
    Tree(1, [Tree(3), Tree(4)])
    >>> remove(t, 3)  # t was changed, so both 2 and 3 are now removed.
    Tree(1, [Tree(4)])
    """

    ⟦e⟧

    return t
`),
    },
    'sp23-5a': {
      exam: 'sp23', number: '5(a)', title: 'Parking — count_park', points: 4,
      intro: '**Definition.** When parking vehicles in a row, a *motorcycle* takes up 1 parking spot and a *car* takes up 2 adjacent parking spots. A string of length `n` can represent `n` adjacent parking spots using `%` for a motorcycle, `<>` for a car, and `.` for an empty spot. For example `\'.%%.<><>\'` represents an empty spot, then two spots containing motorcycles, then another empty spot, then four spots containing two cars.\n\nThanks to the Berkeley Math Circle for introducing this question.\n\nImplement `count_park`, which returns the number of ways that vehicles can be parked in `n` adjacent parking spots for positive integer `n`. Some or all spots can be empty.',
      code: code(`
def count_park(n):
    """Count the ways to park cars and motorcycles in n adjacent spots.

    >>> count_park(1)  # '.' or '%'
    2
    >>> count_park(2)  # '..', '.%', '%.', '%%', or '<>'
    5
    >>> count_park(4)  # some examples: '<><>', '.%%.', '%<>%', '%.<>'
    29
    """

    if n < 0:

        return 0

    if n == 0:

        return ⟦a⟧

    return ⟦b⟧
`),
    },
    'sp23-5b': {
      exam: 'sp23', number: '5(b)', title: 'Parking — park', points: 6,
      intro: '**Definition.** When parking vehicles in a row, a *motorcycle* takes up 1 parking spot and a *car* takes up 2 adjacent parking spots. A string of length `n` can represent `n` adjacent parking spots using `%` for a motorcycle, `<>` for a car, and `.` for an empty spot.\n\nImplement `park`, a generator function that takes a non-negative integer `n`. It yields (in any order) all possible strings representing `n` adjacent parking spots.',
      // The exam has two one-line blanks, (c) and (d), answered together as one part; here they are one blank, (c, d).
      code: code(`
def park(n):
    """Yield the ways to park cars and motorcycles in n adjacent spots.

    >>> sorted(park(1))
    ['%', '.']
    >>> sorted(park(2))
    ['%%', '%.', '.%', '..', '<>']
    >>> sorted(park(3))
    ['%%%', '%%.', '%.%', '%..', '%<>', '.%%', '.%.', '..%', '...', '.<>', '<>%', '<>.']
    >>> len(list(park(4)))
    29
    """
    if n == 0:
        yield ''
    elif n > 0:
        for s in park(n-1):
            ⟦c, d⟧
        for s in ⟦e⟧:
            ⟦f⟧
`),
    },
    'sp23-5aplus': {
      exam: 'sp23', number: '5(c)', title: 'Parking — A+ question', points: 0,
      intro: '**This A+ question is not worth any points. It can only affect your course grade if you have a high A and might receive an A+. Finish the rest of the exam first!**\n\nImplement `pack`, a generator function that takes a non-negative integer `n`. It yields (in any order) all possible strings representing `n` adjacent parking spots in which an equal number of cars and motorcycles are parked, no motorcycle is adjacent to a car, and no empty spot is adjacent to another empty spot.',
      code: code(`
def pack(n):
    """Yield the ways to park an equal number of cars and motorcycles
    in n adjacent spots with no motorcycle adjacent to a car and no
    empty spot adjacent to another empty spot.

    >>> sorted(pack(4))
    ['%.<>', '<>.%']
    >>> sorted(pack(7))
    ['%%.<><>', '<><>.%%']
    >>> sorted(pack(8))
    ['%%.<>.<>', '%%.<><>.', '%.%.<><>', '%.<><>.%', '.%%.<><>',
     '.<><>.%%', '<>.%%.<>', '<>.<>.%%', '<><>.%%.', '<><>.%.%']
    """
    def f(n, k):
        if n == 0 and k == 0:
            yield ''
        elif n > 0:
            yield from g(n-1, k-1, '<', '%' )
            yield from g(n-1, k,   '.', '.' )
            yield from g(n-2, k+1, '%', '<>')

    def g(n, k, no, yes):

        yield from ⟦A+⟧

    yield from f(n, 0)
`),
    },

    // ───────────────────────────── Fall 2022 Midterm 2 ─────────────────────────────
    'fa22-1': {
      exam: 'fa22', number: '1', title: 'What would Python Python?', points: 7,
      intro: 'Assume the code below has been executed.',
      code: code(`
class Snake:
    legs = 0
    def __init__(self, name):
        self.name = name
    def __str__(self):
        return self.name
    def run(self, s):
        print("Snakes don't run")
        return self.crawl()
    def crawl(self):
        print(f"{self} crawled")
    def eat(self, s):
        self.run(s)
        print("Nom nom")

class Python(Snake):
    def run(self, s):
        print(eval(s))  # eval(s) evaluates string s as a Python expression

snek = Snake("atari")
solidsnake = Snake("David")
solidsnake.legs = 2
solidsnake.run = lambda s: print("He ran")
python = Python("pypy")
`),
      outro: 'For each expression below, write the output **displayed by the interactive Python interpreter** when the expression is evaluated.\n\n• If an output has multiple lines, write each line separately.\n\n• If an error occurs, write “Error”, but include all output displayed before the error.\n\n• If evaluation would run forever, write “Forever”.\n\n• To display a function value, write “Function”.\n\nEach expression below should be evaluated independently of previously-evaluated expressions.',
    },
    'fa22-2': {
      exam: 'fa22', number: '2', title: 'Environmental Disaster', points: 6,
      intro: 'Your friend asks you to help debug their program below, which doesn’t print what they expect. Complete the environment diagram, then answer questions about it. The diagram itself will not be scored; only the questions based on it.',
      figure: { src: 'assets/fa22-mt2-q2.png', width: 685, height: 311, alt: 'From the exam: the code and an environment diagram to complete. The Global frame binds of to func of(us) [parent=Global] and surround to func surround(n, f) [parent=Global], and has a blank value for result. Frame f1: of [parent=Global] has a box for us labeled (a), and last and its Return value point to func last(k) [parent=f1]. Frame f2: surround [parent=Global] binds n to 3 and has boxes labeled (b) for f, (c) for result and (d) for its Return value. Frame f3: last has a blank parent, and blank values for k and its Return value.',
        slots: [[377, 64, 37], [379, 102, 33], [379, 199, 33], [379, 221, 33], [379, 242, 33], [350, 266, 52], [377, 284, 37], [377, 303, 37]] },
      code: code(`
def of(us):
    def last(k):
        "The last k items of us"
        while k > 0:
            result.append(us.pop())
            k = k - 1
        return result
    return last

def surround(n, f):
    "n is the first and last item of f(2)"
    result = [n]
    result = f(2)
    result[0] = [n]
    return result.append(n)

result = [1]
surround(3, of([4, 5, 6]))
print(result)
`),
    },
    'fa22-3a': {
      exam: 'fa22', number: '3(a)', title: 'Hog Revisited — make_test_dice', points: 3,
      intro: 'In Project 1, we created a simulator for the game of Hog without using lists or iterators. Let’s revise the implementation, but instead of representing dice as zero-argument functions, **we’ll represent dice as iterators over outcomes**.\n\nImplement `make_test_dice`, which takes a list of `outcomes`. It returns an infinite iterator that repeatedly cycles through the outcomes.',
      code: code(`
def make_test_dice(outcomes):
    """Return an infinite iterator that cycles through the elements of outcomes.

    >>> dice = make_test_dice([1, 2, 3])
    >>> next(dice)
    1
    >>> next(dice)
    2
    >>> next(dice)
    3
    >>> next(dice)
    1
    >>> next(dice)
    2
    >>> next(dice)
    3
    >>> next(dice)
    1
    >>> next(dice)
    2
    """
    outcomes = list(outcomes)
    while True:
        for i in ⟦a⟧:
            ⟦b⟧
`),
    },
    'fa22-3b': {
      exam: 'fa22', number: '3(b)', title: 'Hog Revisited — roll_dice', points: 5,
      intro: 'In Project 1, we created a simulator for the game of Hog without using lists or iterators. Let’s revise the implementation, but instead of representing dice as zero-argument functions, **we’ll represent dice as iterators over outcomes**.\n\nImplement `roll_dice`, which takes two arguments: a positive integer called `num_rolls` giving the number of dice to roll and a `dice` iterator that provides outcomes. It returns the number of points scored by rolling the `dice` `num_rolls` times in a turn. The points scored are either the sum of the dice outcomes or 1 (Sow Sad).\n\n• Sow Sad. If any of the dice outcomes is a 1, the current player’s score for the turn is 1.',
      code: code(`
def roll_dice(num_rolls, dice):
    """Return the number of points scored by rolling dice num_rolls times.

    >>> dice = make_test_dice([6, 6, 6, 6, 6, 1])
    >>> roll_dice(5, dice) # 6, 6, 6, 6, 6
    30
    >>> roll_dice(5, dice) # 1, 6, 6, 6, 6
    1
    >>> roll_dice(2, dice) # 6, 1
    1
    >>> roll_dice(10,  make_test_dice([2, 4, 3])) # 2, 4, 3, 2, 4, 3, 2, 4, 3, 2
    29
    """
    rolls = ⟦a⟧
    if ⟦b⟧:
        return 1
    ⟦c⟧
`),
    },
    'fa22-4a': {
      exam: 'fa22', number: '4(a)', title: 'The Lambdanean Hydra — is_hydra', points: 4,
      intro: 'Heracles is fighting the Lambdanean Hydra, a many-headed monster, where two heads regrow when one head gets chopped off. A hydra is represented by a tree, each head is represented by a leaf labeled 1, and each non-leaf node has two branches and is labeled with the number of leaves among its descendants. Here’s a six-headed hydra named `lerna`:\n\n```\nlerna=Tree(6,[Tree(4,[Tree(2,[Tree(1),Tree(1)]),Tree(2,[Tree(1),Tree(1)])]),Tree(2,[Tree(1),Tree(1)])]\n```\n\nImplement `is_hydra`, which takes in as input a Tree instance `t` and determines if `t` represents a valid hydra.',
      illustration: { src: 'assets/fa22-mt2-q4a.png', width: 797, height: 313, alt: 'From the exam: a drawing of the six-headed hydra lerna, and the same tree drawn with circles: root 6 with branches 4 and 2; 4 has two branches labeled 2, each with two leaves labeled 1; 2 has two leaves labeled 1.' },
      code: code(`
def is_hydra(t):
    """Return True if Tree instance t properly represents a hydra and False otherwise.

    >>> is_hydra(Tree(1))
    True
    >>> is_hydra(Tree(2, [Tree(1), Tree(1)]))
    True
    >>> is_hydra(Tree(3, [Tree(1), Tree(2)]))  # Wrong leaf label
    False
    >>> is_hydra(Tree(3, [Tree(1), Tree(1)]))  # Wrong root label
    False
    >>> is_hydra(Tree(3, [Tree(3, [Tree(1), Tree(1)]), Tree(1)]))  # Wrong node label below root
    False
    >>>is_hydra(lerna)  # lerna the six-headed hydra is defined above
    True
    """
    if t.is_leaf():
        return t.label == 1
    if len(t.branches) != 2:
        return False
    return (t.label == ⟦a⟧) and ⟦b⟧
`),
    },
    'fa22-4b': {
      exam: 'fa22', number: '4(b)', title: 'The Lambdanean Hydra — chop_head', points: 5,
      intro: 'If Heracles cuts off the second head from the left, two new heads appear there, and all ancestor labels are updated.\n\nImplement `chop_head(hydra, n)`, which takes as input a Tree instance `hydra` representing a hydra and a positive integer `n`. It mutates `hydra` by chopping off the `n`th head from the left (adding two new adjacent heads in its place).',
      illustration: { src: 'assets/fa22-mt2-q4b.png', width: 883, height: 217, alt: 'From the exam: the six-headed hydra before and after its second head from the left is chopped off. Before: root 6 with branches 4 and 2, and the second leaf (labeled 1) outlined. After: root 7 with branches 5 and 2; 5 has branches 3 and 2; 3 has a leaf 1 and a new node 2 with two new leaves labeled 1, outlined.' },
      code: code(`
def chop_head(hydra, n):
    """
    >>> lerna = Tree(1)
    >>> chop_head(lerna, 1)  # Note that n is 1-indexed
    >>> chop_head(lerna, 1)
    >>> chop_head(lerna, 3)
    >>> chop_head(lerna, 1)
    >>> chop_head(lerna, 3)
    >>> lerna                # Now lerna is a six-headed hydra (above left)
    Tree(6,[Tree(4,[Tree(2,[Tree(1),Tree(1)]),Tree(2,[Tree(1),Tree(1)])]),
            Tree(2,[Tree(1),Tree(1)])])
    >>> chop_head(lerna, 2)
    >>> lerna                # The mutated lerna now has seven heads (above right)
    Tree(7,[Tree(5,[Tree(3,[Tree(1),Tree(2,[Tree(1),Tree(1)])]),Tree(2,[Tree(1),Tree(1)])]),
            Tree(2,[Tree(1),Tree(1)])])
    """
    assert is_hydra(hydra)
    assert n > 0 and n <= hydra.label
    if hydra.is_leaf():
        ⟦a⟧  # This blank may be filled with multiple lines of code
        return
    ⟦b⟧
    left, right = hydra.branches
    if ⟦c⟧:
        chop_head(right, ⟦d⟧)
    else:
        chop_head(left, n)
`),
      outro: 'The options for blank (a), part i:\n\n```\nOption 1:  hydra = Tree(2,[Tree(1), Tree(1)])\n\nOption 2:  for _ in range(2):\n               hydra.branches.append(Tree(1))\n               hydra.label = 2\n\nOption 3:  hydra.label = Tree(2)\n           hydra.branches = [Tree(1),Tree(1)]\n\nOption 4:  hydra.label = 2\n           hydra.branches = [Tree(1), Tree(1)]\n\nOption 5:  hydra.label = 2\n           hydra.branches = [Tree(1)] * 2\n```',
    },
    'fa22-5a': {
      exam: 'fa22', number: '5', title: 'Aim for 100 — count_subsets', points: 6,
      intro: 'The function `count_subsets` takes as input a list of positive integers `s`. It returns the number of lists that sum to 100 and contain a subset of the elements of `s` in order.\n\n(a) Complete the following implementation of `count_subsets`.',
      code: code(`
def count_subsets(s):
    """
    >>> count_subsets([25, 50, 75, 100, 125, 150])  # [25, 75], [100]
    2
    >>> count_subsets([25, 50, 25, 75])  # [25, 75] (first 25), [25, 75] (second 25), [25, 50, 25]
    3
    >>> count_subsets(list(range(1,10000)))
    444793
    """

def count_subsets(s):
    def helper(sum_so_far, index):
        if ⟦a⟧:
            if ⟦b⟧:
                return 1
            return 0
        return ⟦c⟧ + ⟦d⟧
    return helper(0,0)
`),
    },
    'fa22-5b-ii': {
      exam: 'fa22', number: '5(b) ii', title: 'Aim for 100 — order of growth', points: 1,
      intro: 'We decide to rewrite `count_subsets`, following a different approach:',
      code: code(`
def count_subsets(s):
    values = [1]+[0]*100
    for i in s:
        for j in reversed(range(100-i+1)):
            values[j+i]+=values[j]
    return values[100]
`),
    },
    'fa22-6a': {
      exam: 'fa22', number: '6(a)', title: 'Point A to Point B — destinations', points: 2,
      intro: 'A *graph* is a structure consisting of two parts:\n\n• A set of n nodes, which are labeled from 0 to n-1.\n\n• A set of directed edges, which go from one node (the source node) to another node (the destination).\n\nThe above is an example of a graph with 6 nodes, with edges represented as arrows. Note that a graph can have:\n\n• Nodes that have no edges to/from them (Node 3)\n\n• Two edges between the same two nodes, with source and destination reversed (The edges between Nodes 0 and 2)\n\n• An edge from a node to itself (Node 5)\n\nHowever, a graph cannot have two distinct edges from one node to another. For example, we cannot have a graph where two edges go from Node 0 to Node 1.\n\nWe say that a Node j is a **destination** of Node i if there is a directed edge from Node i to Node j. Thus, in the above example, Node 0 has two destinations (Nodes 1 and 2), and Node 1 has one destination (Node 4). Note that Node 0 is not considered a destination of Node 1.\n\nWe say that there is a **path** from Node i to Node j if either `i==j`, or we can go from Node i to Node j by following a sequence of edges in the graph. For example, we can get from Node 1 to Node 0 by following the edges `1->4`, then `4->2`, then `2->0`.\n\nGraphs are often used to represent transportation maps, where nodes represent individual locations, and edges represent a path you can take to go from one node to another.\n\nA `Graph` instance is constructed from a number of nodes and begins with no edges. Edges are added, and then the `destinations` method lists destinations for a node and the `has_path` method determines if a path exists between two nodes.\n\n```\n>>> g = Graph(6)       # A graph with 6 nodes and no edges.\n>>> g.add_edge(0, 2)  # Add an edge from node 0 (source) to node 2 (destination)\n>>> g.add_edge(2, 0)  # Add an edge from node 2 (source) to node 0 (destination)\n>>> g.add_edge(0, 1)\n>>> g.add_edge(1, 4)\n>>> g.add_edge(4, 2)\n>>> g.add_edge(5, 4)\n>>> g.add_edge(5, 5)\n>>> g.destinations(0)\n[1, 2]\n>>> g.destinations(5)\n[4, 5]\n>>> g.destinations(3)\n[]\n>>> g.has_path(0,2)  # 0 -> 2\nTrue\n>>> g.has_path(5,1)  # 5 -> 4 -> 2 -> 0 -> 1\nTrue\n>>> g.has_path(3,3)  # 3\nTrue\n>>> g.has_path(1,5)  # No path exists\nFalse\n```\n\nImplement the `destinations` method of the `Graph` class.',
      illustration: { src: 'assets/fa22-mt2-q6.png', width: 241, height: 212, alt: 'From the exam: a graph of nodes 0 to 5 with edges 0 to 1, 0 to 2, 2 to 0, 1 to 4, 4 to 2, 5 to 4 and 5 to 5. Node 3 has no edges.' },
      code: code(`
class Graph:
    "A graph."

    def __init__(self, nodes):
        self.nodes = nodes
        self.edges = []

    def add_edge(self, source, destination):
        "Add an edge from source to destination."
        if source >= 0 and source < self.nodes:
            if destination >= 0 and destination < self.nodes:
                if (source, destination) not in self.edges:
                    self.edges.append((source, destination))

    def destinations(self, source):
        "Returns a list of all destinations of the given node."
        assert source >= 0 and source < self.nodes
        return ⟦a⟧

    def has_path(self, source, destination):
        "Returns True if a path exists from source to destination, and False otherwise."
        ... # The implementation of this method is omitted, but assume it works.
`),
    },
    'fa22-6b': {
      exam: 'fa22', number: '6(b)', title: 'Point A to Point B — compose_path', points: 6,
      intro: 'The function `compose_path` takes in a list of functions `funcs` and three non-negative integers, `x`, `y`, and `maxval`. It returns whether there exists a list of numbers `s` such that:\n\n• `s` begins with `x` and ends with `y`.\n\n• `s[i+1] = f(s[i])` for some `f` in `funcs`, for every adjacent pair of elements `s[i]` and `s[i+1]`.\n\n• `0 <= s[i]` and `s[i] < maxval` for all elements `s[i]`.\n\nAssume `x` and `y` are less than `maxval` and that all elements of `funcs` are one-argument functions that take in an integer and output an integer. Complete the implementation of `compose_path`. (**Hint**: Treat each function call f(x) as “moving” from x to f(x).)',
      code: code(`
def compose_path(funcs, x, y, maxval):
    """
    >>> f, g, h = lambda x: 2*x-1, lambda x: x*x+1, lambda x: x-4
    >>> #3->10->6->11->122->118->114->110->106->102->98
    >>> # g   h  f  g   h   h   h   h   h   h
    >>> compose_path([f, g, h], 3, 98, 1000)
    True
    >>> #The above path hits 122, and no other path exists to get from 3 to 98
    >>> compose_path([f, g, h], 3, 98, 122)
    False
    >>> [i for i in range(100) if compose_path([h], 10, i, 100)]
    [2, 6, 10]
    """
    g = Graph(⟦a⟧)
    for f in funcs:
        ⟦b⟧:
            ⟦c⟧
    ⟦d⟧
`),
    },
    'fa22-7': {
      exam: 'fa22', number: '7', title: 'A+ Question 2: Deforestation', points: 0,
      intro: '**This A+ question is not worth any points. It can only affect your course grade if you have a high A and might receive an A+. Finish the rest of the exam first!**\n\nImplement the function `tree_to_graph`, which takes as input a Tree instance. It returns a Graph instance (defined in the previous question) corresponding to the tree, with nodes ordered in pre-order starting with 0. Pre-order is defined as:\n\n• The root node is assigned the lowest value unassigned.\n\n• After this, the first branch of the tree is assigned values according to pre-order.\n\n• Then, the second branch of the tree is assigned values, and so on.\n\nFor example, calling `tree_to_graph` on this Tree instance to the left should create this Graph instance to the right.',
      illustration: { src: 'assets/fa22-mt2-q7.png', width: 817, height: 247, alt: 'From the exam: on the left, the hydra tree with root 6, branches 4 and 2, and leaves labeled 1; on the right, the same shape as a graph with nodes numbered in pre-order: 0 at the root, 1 to 7 down the left branch (1, then 2 with 3 and 4, then 5 with 6 and 7), and 8 with 9 and 10 on the right.' },
      code: code(`
def tree_to_graph(tree):
    def helper(tree, op1, op2):
        a = op1()
        return op2(a, [helper(b, op1, op2) for b in tree.branches]) or a
    num_nodes = helper(tree, ⟦a⟧, ⟦b⟧)
    g = Graph(num_nodes)
    b = iter(range(num_nodes))
    helper(tree, ⟦c⟧,⟦d⟧)
    return g
`),
    },
    'fa22-8': {
      exam: 'fa22', number: '8', title: 'OPTIONAL', points: 0,
      intro: '',
      code: '',
    },

    // ───────────────────────────── Fall 2021 Midterm 2 ─────────────────────────────
    'fa21-1': {
      exam: 'fa21', number: '1', title: 'Hawkeye', points: 7,
      intro: 'The box-and-pointer diagram for the value of `s` is shown after each line of the program below. Fill in the blanks to match the diagrams.',
      illustration: { src: 'assets/fa21-mt2-q1.png', width: 395, height: 664, alt: 'From the exam: box-and-pointer diagrams of s after each line. After line 1: s is the list [3, 4]. After line 2: a third element points to a new one-element list whose element points back to s. After line 3: that inner list has three elements: a pointer to s, 4, and a pointer to itself. After line 4: s[2] points to a new one-element list whose element points to the inner list, which now holds a pointer to s and 4.' },
      code: code(`
s = [3, 4]

s.append(⟦a⟧)

⟦b⟧.⟦c⟧(⟦d⟧)

s[2] = ⟦e⟧
`),
    },
    'fa21-2a': {
      exam: 'fa21', number: '2(a)', title: 'Doctor Change — change', points: 6,
      intro: 'Implement `change`, a function that takes an integer `n` and a list of positive integers `coins`. It returns whether there is a subset of the values in `coins` that sums to `n`. As a side effect, `change` modifies `coins`.',
      code: code(`
def change(n, coins):
    """Return whether a subset of coins adds up to n.

    >>> change(10, [2, 7, 1, 8, 2])  # e.g., 2 + 8
    True
    >>> change(20, [2, 7, 1, 8, 2])  # e.g., 2 + 7 + 1 + 8 + 2
    True
    >>> change(6, [2, 7, 1, 8, 2])   # Impossible; only two 2's in coins
    False
    """
    if n == 0:
        return True
    elif ⟦a⟧:
        return False
    coin = coins.pop()  # remove the end of coins and name it "coin"
    return change(n, ⟦b⟧) ⟦c⟧ change(⟦d⟧, ⟦e⟧)
`),
    },
    'fa21-2b': {
      exam: 'fa21', number: '2(b)', title: 'Doctor Change — amounts', points: 5,
      intro: 'Implement `amounts`, which takes a list of positive integers `coins`. It returns a sorted list of all unique non-negative integers `n` for which `change(n, coins)` returns `True`. You **may not** call `change`.',
      code: code(`
def amounts(coins):
    """List all unique n such that change(n, coins) returns True (in sorted order).

    >>> amounts([2, 5, 3])
    [0, 2, 3, 5, 7, 8, 10]
    >>> amounts([2, 7, 1, 8, 2])
    [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
    """
    if not coins:
        return ⟦a⟧
    coin = coins[0]
    rest = amounts(⟦b⟧)
    return sorted(⟦c⟧ + [k + coin for ⟦d⟧])
`),
    },
    'fa21-3a': {
      exam: 'fa21', number: '3(a)', title: 'Shang-Chi — Valet and Garage', points: 6,
      intro: 'Implement the `Valet` and `Garage` classes.\n\nA `Valet` instance has two instance attributes: their total `tips` and the `garage` where they work (a `Garage` instance).\n\n• The `park` method takes a string `car` and parks it in the `Garage` where they work.\n\n• The `wash` method takes a string `car` that has been parked in their garage and a number `tip`. The `Valet` who washed the car and the `Valet` who **most recently** parked the car split the tip.\n\nThe `Garage` constructor takes a list of the `Valet`s who work in that `Garage`. Assume that `park` and `wash` are only invoked on a `Valet` that already has a `Garage`.',
      code: code(`
class Valet:
    """A valet is tipped after they wash a car,
    or after one of their parked cars is washed.

    >>> shaun = Valet()
    >>> katy = Valet()
    >>> g = Garage([shaun, katy])
    >>> shaun.park('Benz')
    >>> katy.park('BMW')
    >>> shaun.wash('Benz', 1)   # $1.0 to Shaun
    >>> katy.wash('Benz', 2)    # $1.0 to Katy, $1.0 to Shaun

    >>> shaun.park('Rolls')
    >>> katy.park('Rolls')
    >>> katy.wash('BMW', 2)     # $2.0 to Katy
    >>> shaun.wash('Rolls', 2)  # $1.0 to Shaun, $1.0 to Katy
    >>> [shaun.tips, katy.tips]
    [3.0, 4.0]
    """
    def __init__(self):
        self.tips = 0
        self.garage = None

    def park(self, car):
        ⟦a⟧

    def wash(self, car, tip):
        self.tips += tip / 2
        ⟦b⟧ += tip / 2

class Garage:
    """A garage holds cars parked by the valets who work there."""
    def __init__(self, valets):
        self.cars = {}
        for valet in valets:
            ⟦c⟧ = ⟦d⟧
`),
    },
    'fa21-3b': {
      exam: 'fa21', number: '3(b)', title: 'Shang-Chi — ring', points: 2,
      intro: '**Definition.** An *infinite* iterator `t` is one for which `next(t)` can be called any number of times and always returns a value.\n\nImplement `ring`, a generator function that takes a non-empty list `s`. It returns an infinite generator that repeatedly yields the values of `s` in the order they appear in `s`.',
      code: code(`
def ring(s):
    """Yield all values of non-empty s in order, repeatedly.

    >>> t = ring([2, 5, 3])
    >>> [next(t), next(t), next(t), next(t), next(t), next(t), next(t)]
    [2, 5, 3, 2, 5, 3, 2]
    """
    ⟦a⟧:
        ⟦b⟧
`),
    },
    'fa21-3c': {
      exam: 'fa21', number: '3(c)', title: 'Shang-Chi — fork', points: 5,
      intro: '**Definition.** An *infinite* iterator `t` is one for which `next(t)` can be called any number of times and always returns a value.\n\nImplement `fork`, a function that takes an infinite iterator `t`. It returns two infinite iterators that each iterate over the contents of `t`.',
      code: code(`
def fork(t):
    """Return two iterators with the same contents as infinite iterator t.

    >>> a, b = fork(ring([1, 2, 3]))
    >>> [next(a), [next(b), next(b), next(b)], next(a), [next(b), next(b), next(b)], next(a)]
    [1, [1, 2, 3], 2, [1, 2, 3], 3]
    """
    s = []
    def copy():
        i = 0
        while True:
            if ⟦a⟧:
                s.append(⟦b⟧)
            yield ⟦c⟧
            i += 1
    return ⟦d⟧
`),
    },
    'fa21-4a': {
      exam: 'fa21', number: '4(a)', title: 'Thanos — snap', points: 4,
      intro: '*Hint*: you may call built-in sequence functions: `sum`, `max`, `min`, `all`, `any`, `map`, `filter`, `zip`, and `reversed`.\n\nImplement `snap`, which takes a one-argument function `f`, a one-argument function `g`, and a sequence `s`. It returns a list of `(x, f(x))` pairs (two-element tuples) for all `x` in `s` for which `g(f(x))` is a true value. The implementation of `snap` only calls `f` once per element of `s`; never twice.\n\n**Important:** For full credit, your implementation may only call `f` **once** on each element of `s`.',
      code: code(`
def snap(f, g, s):
    """Return a list of (x, f(x)) pairs for each x in s such that g(f(x)) is a true value.

    >>> snap(lambda x: x * x, lambda x: x < 10, range(5))
    [(0, 0), (1, 1), (2, 4), (3, 9)]
    >>> snap(lambda x: x * x, lambda x: x > 10, range(5))
    [(4, 16)]
    >>> snap(lambda x: x * x, lambda x: x and x - 9, range(5))
    [(1, 1), (2, 4), (4, 16)]
    """
    return [(x, ⟦a⟧) for ⟦b⟧ in ⟦c⟧ if ⟦d⟧]
`),
    },
    'fa21-4b': {
      exam: 'fa21', number: '4(b)', title: 'Thanos — max_diff', points: 4,
      intro: '*Hint*: you may call built-in sequence functions: `sum`, `max`, `min`, `all`, `any`, `map`, `filter`, `zip`, and `reversed`.\n\nImplement `max_diff`, which takes a non-empty sequence `s` and a one-argument function `f`. It returns a pair of elements `(v, w)` in `s` for which `f(v) - f(w)` is largest. `v` and `w` may be the same or different elements of `s`. Also, describe the order of growth of the run time of `max_diff`.',
      code: code(`
def max_diff(s, f):
    """Return two elements (v, w) of s for which f(v) - f(w) is largest.

    >>> max_diff(range(-7, 4), lambda x: x * x)  # (-7 * -7) - (0 * 0) = 49
    (-7, 0)
    >>> max_diff(['what', 'a', 'great', 'film'], len)  # len('great') - len('a')
    ('great', 'a')
    """
    assert s, 's cannot be empty'
    v, w = None, None
    for x in s:
        for y in s:
            if v is None or ⟦a⟧:
                ⟦b⟧
    return v, w
`),
    },
    'fa21-4c': {
      exam: 'fa21', number: '4(c)', title: 'Thanos — max_diff_fast', points: 2,
      intro: '*Hint*: you may call built-in sequence functions: `sum`, `max`, `min`, `all`, `any`, `map`, `filter`, `zip`, and `reversed`.\n\nImplement `max_diff_fast`, which has the same signature and behavior as `max_diff`, but has a faster order of growth of its run time.\n\n**Important.** You may **not** use a list comprehension in your solution.',
      code: code(`
def max_diff_fast(s, f):

    return ⟦a⟧ , ⟦b⟧
`),
    },
    'fa21-5a': {
      exam: 'fa21', number: '5(a)', title: 'Groot — twig', points: 4,
      intro: '**Definition.** A *twig* is a tree that is not a leaf but whose branches are all leaves.\n\nThe `Tree` and `Link` classes appear on your midterm 2 study guide. Assume they are defined.\n\nImplement `twig`, which takes a `Tree` instance t. It returns `True` if `t` is a twig and `False` otherwise.',
      code: code(`
def twig(t):
    """Return True if Tree t is a twig and False otherwise.

    >>> twig(Tree(1))
    False
    >>> twig(Tree(1, [Tree(2), Tree(3)]))
    True
    >>> twig(Tree(1, [Tree(2), Tree(3, [Tree(4)])]))
    False
    """
    return ⟦a⟧ and ⟦b⟧
`),
    },
    'fa21-5b': {
      exam: 'fa21', number: '5(b)', title: 'Groot — twigs', points: 5,
      intro: '**Definition.** A *twig* is a tree that is not a leaf but whose branches are all leaves.\n\nThe `Tree` and `Link` classes appear on your midterm 2 study guide. Assume they are defined.\n\nImplement `twigs`, which takes a `Tree` instance `t`. It returns a linked list (either a `Link` instance or `Link.empty`) containing all of the labels of the twigs in `t`. Labels should be in the same order as they appear in `repr(t)`.',
      code: code(`
def twigs(t):
    """Return a linked list of the labels of the twigs in t.

    >>> t = Tree(1, [Tree(2), Tree(3, [Tree(4)]), Tree(5, [Tree(6, [Tree(7), Tree(8)])])])
    >>> print(twigs(t))
    <3 6>
    >>> print(twigs(Tree(0, [t, t, t])))
    <3 6 3 6 3 6>
    >>> twigs(Tree(0)) is Link.empty
    True
    """

    def add_twigs(t, rest):

        if twig(t):

            return ⟦a⟧

        for b in reversed(t.branches):

            rest = ⟦b⟧

        return rest

    return add_twigs(t, ⟦c⟧)
`),
    },
  };

  // type: single_choice | multi_select | short_answer | code
  // mono: render choices in monospace (code) like the exam; prose choices use the serif face
  const QUESTIONS = [
    // Fall 2025 — Q1
    { id: 'fa25-1a', problem: 'fa25-1', label: '(a)', points: 1, topics: ['generators'], difficulty: 'easy',
      type: 'single_choice', mono: true, prompt: '`print(next(t))`',
      choices: ['5', '6', '7', '[6, 7]'] },
    { id: 'fa25-1b', problem: 'fa25-1', label: '(b)', points: 3, topics: ['generators', 'recursion'], difficulty: 'hard',
      type: 'short_answer', prompt: '`print([x for x in t])`' },
    { id: 'fa25-1c', problem: 'fa25-1', label: '(c)', points: 1, topics: ['efficiency'], difficulty: 'medium',
      type: 'single_choice', prompt: 'What is the order of growth of the time it takes to execute `even(s)` for a list of numbers `s` in terms of the length of `s`? Assume that `len`, `list.append`, accessing a list item using square brackets, and all arithmetic operators (such as `-`, `<`, and `*`) each takes a constant amount of time.',
      choices: ['exponential', 'quadratic', 'linear', 'logarithmic', 'constant'] },
    // Fall 2025 — Q2
    { id: 'fa25-2a', problem: 'fa25-2', label: '(a)', points: 4, topics: ['env', 'lists', 'hof'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What is displayed by running this code? If the code errors, write *Error*.' },
    // Fall 2025 — Q3
    { id: 'fa25-3a', problem: 'fa25-3', label: '(a)', points: 1, topics: ['trees'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).',
      choices: ['p < len(part.branches)', 'w < len(whole.branches)', 'p < len(part.branches) or w < len(whole.branches)', 'p < len(part.branches) and w < len(whole.branches)'] },
    { id: 'fa25-3b', problem: 'fa25-3', label: '(b)', points: 2, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa25-3c', problem: 'fa25-3', label: '(c)', points: 2, topics: ['trees'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    // Fall 2025 — Q4
    { id: 'fa25-4a', problem: 'fa25-4', label: '(a)', points: 2, topics: ['lists'], difficulty: 'easy', blank: 'a',
      type: 'short_answer', prompt: 'Implement `exclude`.' },
    { id: 'fa25-4b', problem: 'fa25-4', label: '(b)', points: null, topics: ['links'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in the first blank of `exclude_link` (if condition).' },
    { id: 'fa25-4c', problem: 'fa25-4', label: '(c)', points: null, topics: ['links'], difficulty: 'easy', blank: 'c',
      type: 'short_answer', prompt: 'Fill in the second blank of `exclude_link` (first return statement).' },
    { id: 'fa25-4d', problem: 'fa25-4', label: '(d)', points: null, topics: ['links'], difficulty: 'easy', blank: 'd',
      type: 'short_answer', prompt: 'Fill in the third blank of `exclude_link` (elif condition).' },
    { id: 'fa25-4e', problem: 'fa25-4', label: '(e)', points: null, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'e',
      type: 'short_answer', prompt: 'Fill in the fourth blank of `exclude_link` (elif return statement).' },
    { id: 'fa25-4f', problem: 'fa25-4', label: '(f)', points: null, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'f',
      type: 'short_answer', prompt: 'Fill in the fifth blank of `exclude_link` (else return statement).' },
    // Fall 2025 — Q5
    { id: 'fa25-5a', problem: 'fa25-5', label: '(a)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).',
      choices: ['q - self.pizzas', 'abs(q - self.pizzas)', 'max(0, q - self.pizzas)', 'min(0, q - self.pizzas)'] },
    { id: 'fa25-5b', problem: 'fa25-5', label: '(b)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).',
      choices: ['price * quantity', 'price * self.quantity', 'price * pizzas', 'price * self.pizzas', 'self.price * quantity', 'self.price * self.quantity', 'self.price * pizzas', 'self.price * self.pizzas'] },
    { id: 'fa25-5c', problem: 'fa25-5', label: '(c)', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c). **IMPORTANT:** You **may not** call `type` or `isinstance`.' },
    { id: 'fa25-5d', problem: 'fa25-5', label: '(d)', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'fa25-5e', problem: 'fa25-5', label: '(e)', points: 3, topics: ['oop'], difficulty: 'hard', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e). **IMPORTANT:** You **may not** write `=`.' },
    { id: 'fa25-5f', problem: 'fa25-5', label: '(f)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    // Fall 2025 — Q6
    { id: 'fa25-6a', problem: 'fa25-6a', label: 'i.', points: 2, topics: ['fundamentals'], difficulty: 'medium', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).',
      choices: ['k in d and d[k] in d', 'k in d.keys() and d[k] in d.values()', 'k in d.keys() and v in d.values()', 'd[k] == d.get(k)', 'd[k] == d.get(v)', 'd[k] == v and d.get(v) == k', 'd[k] != v or d.get(v) == k', 'd[k].get(v) == v', 'd[k].get(v) == k', 'd[k].get(k) == v', 'd[k].get(k) == k', 'd.get(d[k]) == v', 'd.get(d[k]) == k', 'd.get(d[k]) == d.get(v)', 'd.get(d[k]) == d.get(k)'] },
    { id: 'fa25-6b', problem: 'fa25-6b', label: 'i.', points: 1, topics: ['fundamentals'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).',
      choices: ['or disallow.get(previous) == slice', 'and disallow.get(previous) == slice', 'or disallow.get(previous) == disallow.get(slice)', 'and disallow.get(previous) == disallow.get(slice)'] },
    { id: 'fa25-6c', problem: 'fa25-6b', label: 'ii.', points: 1, topics: ['fundamentals'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['previous = slice', 'previous = pizza[slice]', 'previous = previous + 1', 'slice = previous', 'slice = pizza[slice]', 'slice = disallow.get(previous)'] },
    { id: 'fa25-6d', problem: 'fa25-6b', label: 'iii.', points: 2, topics: ['fundamentals'], difficulty: 'hard', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d). **IMPORTANT:** You **may not** call `acceptable`.' },
    { id: 'fa25-6e', problem: 'fa25-6c', label: 'i.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'fa25-6f', problem: 'fa25-6c', label: 'ii.', points: 1, topics: ['recursion'], difficulty: 'medium', blank: 'f',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (f).',
      choices: ["'_' in [first, previous]", "first in ['M', 'P']", "first in ['M', 'P'] or previous in ['M', 'P']", 'first != previous'] },
    { id: 'fa25-6g', problem: 'fa25-6c', label: 'iii.', points: 1, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'g',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (g).',
      choices: ['slice_types', 'list(slice_types)', '[first, previous]', "[first, previous, '_']"] },
    { id: 'fa25-6h', problem: 'fa25-6c', label: 'iv.', points: 3, topics: ['recursion'], difficulty: 'hard', blank: 'h',
      type: 'short_answer', prompt: 'Fill in blank (h).' },
    { id: 'fa25-6i', problem: 'fa25-6d', label: 'i.', points: 1, topics: ['recursion', 'lists'], difficulty: 'easy', blank: 'i',
      type: 'short_answer', prompt: 'Fill in blank (i).' },
    { id: 'fa25-6j', problem: 'fa25-6d', label: 'ii.', points: 2, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'j',
      type: 'short_answer', prompt: 'Fill in blank (j). **IMPORTANT:** You **may not** call `pizzas` in this blank.' },
    { id: 'fa25-6k', problem: 'fa25-6d', label: 'iii.', points: 1, topics: ['lists', 'generators'], difficulty: 'easy', blank: 'k',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (k).',
      choices: ['yield', 'yield from', 'return', 'ways =', 'ways.append', 'ways.extend'] },
    { id: 'fa25-6l', problem: 'fa25-6d', label: 'iv.', points: 2, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'l',
      type: 'short_answer', prompt: 'Fill in blank (l).' },
    { id: 'fa25-6m', problem: 'fa25-6d', label: 'v.', points: 2, topics: ['hof', 'iterators'], difficulty: 'medium', blank: 'm',
      type: 'short_answer', prompt: 'Fill in blank (m). **IMPORTANT:** You **may only** write names, parentheses, and commas. No `[ ]`.' },
    { id: 'fa25-6aplus', problem: 'fa25-6aplus', label: 'vi.', points: 0, topics: ['generators', 'hof'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank. If your answer is too long, you can write it on multiple lines.' },

    // Spring 2025 — Q1
    { id: 'sp25-1a', problem: 'sp25-1', label: '(a)', points: 2, topics: ['lists'], difficulty: 'easy',
      type: 'short_answer', prompt: '`[x[1] for x in s if isinstance(x, list)]`' },
    { id: 'sp25-1b', problem: 'sp25-1', label: '(b)', points: 1, topics: ['iterators'], difficulty: 'easy',
      type: 'single_choice', mono: true, prompt: '`next(m)`', choices: ['3', '5', '7', '9', '11'] },
    { id: 'sp25-1c', problem: 'sp25-1', label: '(c)', points: 1, topics: ['iterators', 'lists'], difficulty: 'easy',
      type: 'single_choice', mono: true, prompt: '`t.pop()`', choices: ['1', '3', '5', '7', '9'] },
    { id: 'sp25-1d', problem: 'sp25-1', label: '(d)', points: 2, topics: ['iterators', 'recursion'], difficulty: 'hard',
      type: 'short_answer', prompt: '`[next(m) for z in range(2)]`' },
    // Spring 2025 — Q2
    { id: 'sp25-2a', problem: 'sp25-2', label: '(a)', points: 3, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'short_answer', prompt: 'What is displayed by the call to `print` on line 7?' },
    { id: 'sp25-2b', problem: 'sp25-2', label: '(b)', points: 3, topics: ['env', 'lists'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What is displayed by the call to `print` on line 14?' },
    { id: 'sp25-2c', problem: 'sp25-2c', label: '(c)', points: 1, topics: ['efficiency'], difficulty: 'medium',
      type: 'single_choice', prompt: 'What is the order of growth of the time it takes to execute `result = nest(n)` in terms of positive integer `n`?',
      choices: ['exponential', 'quadratic', 'linear', 'logarithmic', 'constant'] },
    // Spring 2025 — Q3
    { id: 'sp25-3a', problem: 'sp25-3a', label: 'i.', points: 1, topics: ['oop', 'generators'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['0', 'None', 'self', 'start', 'self.start'] },
    { id: 'sp25-3b', problem: 'sp25-3a', label: 'ii.', points: 3, topics: ['oop', 'generators'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp25-3c', problem: 'sp25-3a', label: 'iii.', points: 1, topics: ['oop', 'generators'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['start = start + length', 'start = self.start + length', 'self.start = start + length', 'self.start = self.start + length'] },
    { id: 'sp25-3d', problem: 'sp25-3b', label: 'i.', points: 2, topics: ['oop', 'generators'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'sp25-3e', problem: 'sp25-3b', label: 'ii.', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'e',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (e).', choices: ['e', 'self', 'self.e'] },
    { id: 'sp25-3f', problem: 'sp25-3b', label: 'iii.', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'f',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (f).',
      choices: ['self', 'self.start', 'self.end', 'e', 'e.start', 'e.end'] },
    { id: 'sp25-3g', problem: 'sp25-3b', label: 'iv.', points: 1, topics: ['oop'], difficulty: 'medium', blank: 'g',
      type: 'multi_select', mono: true, prompt: 'Fill in blank (g). **Select all that apply.**',
      choices: ['time', 'self.time', 'self.BerkeleyEvent.time', 'BerkeleyEvent.time', 'Event.time'] },
    // Spring 2025 — Q4
    { id: 'sp25-4a', problem: 'sp25-4a', label: 'i.', points: 3, topics: ['trees', 'recursion', 'lists'], difficulty: 'hard', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a). Include `for` and `in` and `if` in your answer.' },
    { id: 'sp25-4b', problem: 'sp25-4a', label: 'ii.', points: 1, topics: ['trees'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).',
      choices: ['x in depths', 'depths', 'not depths', 't == x', 't.label == x', 't.is_leaf()'] },
    { id: 'sp25-4c', problem: 'sp25-4a', label: 'iii.', points: 1, topics: ['trees', 'lists'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'sp25-4d', problem: 'sp25-4b', label: 'i.', points: 2, topics: ['trees', 'fundamentals'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'sp25-4e', problem: 'sp25-4b', label: 'ii.', points: 1, topics: ['trees'], difficulty: 'easy', blank: 'e',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (e).', choices: ['0', '1', 'depth', 't.label', 'node.label'] },
    { id: 'sp25-4f', problem: 'sp25-4b', label: 'iii.', points: 1, topics: ['trees'], difficulty: 'easy', blank: 'f',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (f).', choices: ['depth', 't', 't.label', 'node', 'node.label'] },
    { id: 'sp25-4g', problem: 'sp25-4b', label: 'iv.', points: 2, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'g',
      type: 'short_answer', prompt: 'Fill in blank (g).' },
    // Spring 2025 — Q5
    { id: 'sp25-5a', problem: 'sp25-5a', label: 'i.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['0', '1', 's.first', 's.rest', 's.rest.first'] },
    { id: 'sp25-5b', problem: 'sp25-5a', label: 'ii.', points: 4, topics: ['links', 'recursion'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b). If your answer is too long, you can continue on another line.' },
    { id: 'sp25-5c', problem: 'sp25-5b', label: 'i.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).', choices: ['left == 0', 'left == 1', 'n == 0', 'n == 1'] },
    { id: 'sp25-5d', problem: 'sp25-5b', label: 'ii.', points: 1, topics: ['recursion'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).', choices: ['left', 'left - 1', 'k', 'k - 1'] },
    { id: 'sp25-5e', problem: 'sp25-5b', label: 'iii.', points: 3, topics: ['recursion'], difficulty: 'hard', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'sp25-5f', problem: 'sp25-5c', label: 'i.', points: 4, topics: ['recursion', 'lists'], difficulty: 'hard', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    { id: 'sp25-5g', problem: 'sp25-5c', label: 'ii.', points: 2, topics: ['hof'], difficulty: 'medium', blank: 'g',
      type: 'multi_select', mono: true, prompt: 'Fill in blank (g). **Select all that apply.** Assume `sub` has been imported from the `operator` module. The `sub` function takes two arguments and subtracts the second from the first.',
      choices: ['abs', 'sub', 'abs(sub)', 'sub(abs)', 'lambda y: abs(x - y)', 'lambda x, y: abs(x - y)'] },
    { id: 'sp25-5h', problem: 'sp25-5d', label: 'i.', points: 0, topics: ['recursion'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank. If your answer is too long, you can continue on another line.' },

    // Fall 2024 — Q1
    { id: 'fa24-1a', problem: 'fa24-1', label: '(a)', points: 1, topics: ['trees'], difficulty: 'easy',
      type: 'short_answer', prompt: '`crow.branches[0].label`' },
    { id: 'fa24-1b', problem: 'fa24-1', label: '(b)', points: 1, topics: ['trees', 'lists'], difficulty: 'easy',
      type: 'short_answer', prompt: '`[hide(b) for b in scare.branches]`' },
    { id: 'fa24-1c', problem: 'fa24-1', label: '(c)', points: 1, topics: ['trees', 'hof', 'recursion'], difficulty: 'medium',
      type: 'short_answer', prompt: '`climb(crow, hide)`' },
    { id: 'fa24-1d', problem: 'fa24-1', label: '(d)', points: 1, topics: ['trees', 'hof', 'recursion'], difficulty: 'hard',
      type: 'short_answer', prompt: '`climb(crow, run)`' },
    { id: 'fa24-1e', problem: 'fa24-1', label: '(e)', points: 1, topics: ['fundamentals'], difficulty: 'medium',
      type: 'short_answer', prompt: '`jump[jump[13]]`' },
    // Fall 2024 — Q2
    { id: 'fa24-2a', problem: 'fa24-2', label: '(a)', points: 3, topics: ['env', 'lists'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What would be printed by the expression `print(slice_up(t))` on line 11?' },
    { id: 'fa24-2b', problem: 'fa24-2', label: '(b)', points: 1, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'single_choice', mono: true, prompt: 'What would be printed by the expression `print(t)` on line 12?',
      choices: ['[1]', '[2]', '[3]', '[1, 4]', '[2, 4]', '[3, 4]', '[1, 4, 5]', '[2, 4, 5]', '[3, 4, 5]'] },
    { id: 'fa24-2c', problem: 'fa24-2', label: '(c)', points: 1, topics: ['efficiency'], difficulty: 'easy',
      type: 'single_choice', prompt: 'What is the order of growth of the time it takes to evaluate `list(list(q))` for a list of numbers `q` in terms of the length of `q`. Assume that creating a list with one element takes constant time, and making a copy of a list takes linear time in the length of the list.',
      choices: ['exponential', 'quadratic', 'linear', 'logarithmic', 'constant'] },
    // Fall 2024 — Q3
    { id: 'fa24-3a', problem: 'fa24-3', label: '(a)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['1', 'p', 'len(p)', 'len(self.inventory)'] },
    { id: 'fa24-3b', problem: 'fa24-3', label: '(b)', points: 2, topics: ['oop', 'trees', 'recursion'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa24-3c', problem: 'fa24-3', label: '(c)', points: 3, topics: ['oop', 'hof'], difficulty: 'hard', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    // Fall 2024 — Q4
    { id: 'fa24-4a', problem: 'fa24-4a', label: 'i.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['n == 0', 's == 0', 's == d', 'n == d'] },
    { id: 'fa24-4b', problem: 'fa24-4a', label: 'ii.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).', choices: ['n % d == 0', 's % d == 0', 'n % d > 0', 's % d > 0'] },
    { id: 'fa24-4c', problem: 'fa24-4a', label: 'iii.', points: 2, topics: ['recursion'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa24-4d', problem: 'fa24-4a', label: 'iv.', points: 2, topics: ['recursion'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'fa24-4e', problem: 'fa24-4b', label: 'i.', points: 1, topics: ['generators', 'lists'], difficulty: 'easy', blank: 'e',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (e).', choices: ['n == s', 'n == s[0]', 'n in s', '[n] == s'] },
    { id: 'fa24-4f', problem: 'fa24-4b', label: 'ii.', points: 3, topics: ['generators', 'recursion', 'lists'], difficulty: 'hard', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    { id: 'fa24-4g', problem: 'fa24-4b', label: 'iii.', points: 1, topics: ['generators', 'lists'], difficulty: 'medium', blank: 'g',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (g).', choices: ['s + t', '[s] + t', 's[1:] + t', 's[:1] + t'] },
    { id: 'fa24-4h', problem: 'fa24-4b', label: 'iv.', points: 1, topics: ['generators', 'recursion'], difficulty: 'medium', blank: 'h',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (h).',
      choices: ['subsums(s, n)', 'subsums(s[1:], n)', 'subsums(s, n - 1)', 'subsums(s[1:], n - 1)'] },
    { id: 'fa24-4i', problem: 'fa24-4c', label: 'i.', points: 1, topics: ['generators', 'hof'], difficulty: 'easy', blank: 'i',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (i).', choices: ['map', 'filter', 'sorted', 'subsums', 'semiperfect'] },
    { id: 'fa24-4j', problem: 'fa24-4c', label: 'ii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'j',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (j).',
      choices: ['semiperfect(n)', 'semiperfect(k)', 'semiperfect(n) or semiperfect(k)', 'n % k == 0'] },
    { id: 'fa24-4k', problem: 'fa24-4c', label: 'iii.', points: 1, topics: ['generators'], difficulty: 'easy', blank: 'k',
      type: 'short_answer', prompt: 'Fill in blank (k).' },
    { id: 'fa24-4l', problem: 'fa24-4c', label: 'iv.', points: 3, topics: ['hof', 'iterators'], difficulty: 'hard', blank: 'l',
      type: 'short_answer', prompt: 'Fill in blank (l) of `primitive_semiperfect`, a function that takes a positive integer `n`. It returns `True` if `n` is semiperfect and no smaller semiperfect number is a divisor of `n`. Your answer should have two expressions separated by a comma.' },
    // Fall 2024 — Q5
    { id: 'fa24-5a', problem: 'fa24-5a', label: 'i.', points: 2, topics: ['links'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa24-5b', problem: 'fa24-5a', label: 'ii.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).', choices: ['a', 'b', 's', 't', 'longer(a, b)', 'longer(s, t)'] },
    { id: 'fa24-5c', problem: 'fa24-5a', label: 'iii.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['a = a.rest', 'a = s.rest', 'b = b.rest', 'b = t.rest', 'a, b = a.rest, b.rest', 'a, b = s.rest, t.rest'] },
    { id: 'fa24-5d', problem: 'fa24-5a', label: 'iv.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).', choices: ['a', 'b', 's', 't', 'longer(a, b)', 'longer(s, t)'] },
    { id: 'fa24-5e', problem: 'fa24-5b', label: 'i.', points: 1, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'e',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (e).',
      choices: ['longest(s, n)', 'longest(s, n - s.first)', 'longest(s.rest, n)', 'longest(s.rest, n - s.first)'] },
    { id: 'fa24-5f', problem: 'fa24-5b', label: 'ii.', points: 2, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    { id: 'fa24-5g', problem: 'fa24-5b', label: 'iii.', points: 3, topics: ['links', 'recursion'], difficulty: 'hard', blank: 'g',
      type: 'short_answer', prompt: 'Fill in blank (g).' },
    // Fall 2024 — Q6 (A+)
    { id: 'fa24-6a', problem: 'fa24-6', label: '(a)', points: 0, topics: ['trees', 'hof', 'recursion'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank.' },

    // Spring 2024 — Q1
    { id: 'sp24-1a', problem: 'sp24-1', label: '(a)', points: 2, topics: ['links', 'recursion'], difficulty: 'hard',
      type: 'single_choice', mono: true, prompt: '`print(it)`',
      choices: ['<2 5 7>', '<2 4 5 7>', '<2 4 5 6 7>', '<2 3 4 5 7>', '<2 4 3 5 7>', '<2 3 4 5 6 7>', '<2 4 3 5 6 7>'] },
    { id: 'sp24-1b', problem: 'sp24-1', label: '(b)', points: 2, topics: ['links'], difficulty: 'hard',
      type: 'short_answer', prompt: '`print(off)`' },
    { id: 'sp24-1c', problem: 'sp24-1', label: '(c)', points: 2, topics: ['generators', 'links'], difficulty: 'medium',
      type: 'short_answer', prompt: '`print([x*x for x in cruel(summer)])`' },
    { id: 'sp24-1d', problem: 'sp24-1', label: '(d)', points: 1, topics: ['efficiency'], difficulty: 'medium',
      type: 'single_choice', prompt: 'What is the order of growth of the time it takes to evaluate `shake(Link(1, Link(n)))` in terms of `n`?',
      choices: ['exponential', 'quadratic', 'linear', 'constant'] },
    // Spring 2024 — Q2
    { id: 'sp24-2a', problem: 'sp24-2', label: '(a)', points: 2, topics: ['env', 'lists', 'hof'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What would be printed by the expression `print(a)` on line 8?' },
    { id: 'sp24-2b', problem: 'sp24-2', label: '(b)', points: 2, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'short_answer', prompt: 'What would be printed by the expression `print(b)` on line 9?' },
    { id: 'sp24-2c', problem: 'sp24-2', label: '(c)', points: 2, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'short_answer', prompt: 'What would be printed by the expression `print(c)` on line 13?' },
    // Spring 2024 — Q3
    { id: 'sp24-3a', problem: 'sp24-3', label: '(a)', points: 3, topics: ['oop', 'fundamentals', 'hof'], difficulty: 'hard', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp24-3b', problem: 'sp24-3', label: '(b)', points: 2, topics: ['oop', 'fundamentals'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).',
      choices: ['self', 'self.speaker', 'self.speakers', 'self.speakers[k]', 'self.speakers[k].self', 'speaker', 'speakers', 'speakers[k]', 'speakers[k].self'] },
    { id: 'sp24-3c', problem: 'sp24-3', label: '(c)', points: 2, topics: ['oop', 'fundamentals'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'sp24-3d', problem: 'sp24-3', label: '(d)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['s', 'lyrics', 'transform', 'transform(s)', 'transform(lyrics)', 'self.transform', 'self.transform(s)', 'self.transform(lyrics)'] },
    // Spring 2024 — Q4 (blank letters restart in each part, so these ids include the part)
    { id: 'sp24-4a-a', problem: 'sp24-4a', label: 'i.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['len(s) == 0', 's[0] + 1 == s[1]', 's[0] + 1 in s', 's[0] + 1 in s[1:]'] },
    { id: 'sp24-4a-b', problem: 'sp24-4a', label: 'ii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp24-4a-c', problem: 'sp24-4a', label: 'iii.', points: 2, topics: ['lists'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['s', 's[0]', 's[1]', 's[0] + 1', 's[0] + len(s)', 's[len(s) - 1]', 's[1] - s[0]'] },
    { id: 'sp24-4b-a', problem: 'sp24-4b', label: 'i.', points: 1, topics: ['lists'], difficulty: 'medium', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['t, s', 't, s[1:]', 't[1:], s'] },
    { id: 'sp24-4b-b', problem: 'sp24-4b', label: 'ii.', points: 3, topics: ['lists'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp24-4b-c', problem: 'sp24-4b', label: 'iii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['False', 's[0] != t[0]', 'is_strip(s) or is_strip(t)', 'not (is_strip(s) or is_strip(t))', 'is_strip(s) and is_strip(t)', 'not (is_strip(s) and is_strip(t))'] },
    { id: 'sp24-4b-d', problem: 'sp24-4b', label: 'iv.', points: 2, topics: ['lists'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['True', 'is_strip(s)', 'is_strip(t)', 'is_strip(s) or is_strip(t)', 'not (is_strip(s) or is_strip(t))', 'is_strip(s) and is_strip(t)', 'not (is_strip(s) and is_strip(t))'] },
    { id: 'sp24-4c-a', problem: 'sp24-4c', label: 'i.', points: 2, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp24-4c-b', problem: 'sp24-4c', label: 'ii.', points: 1, topics: ['hof'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).', choices: ['len', 'len(s)', 's[0]', 'lambda i: s[i]'] },
    { id: 'sp24-4c-c', problem: 'sp24-4c', label: 'iii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).', choices: ['[]', '[s]', 's[0]', 's[:1]'] },
    { id: 'sp24-4c-d', problem: 'sp24-4c', label: 'iv.', points: 2, topics: ['lists'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'sp24-4d-a', problem: 'sp24-4d', label: 'i.', points: 1, topics: ['trees', 'recursion'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).',
      choices: ['True', 'False', 't', 't.label', 't.label == t + 1', 't + 1 == t.label'] },
    { id: 'sp24-4d-b', problem: 'sp24-4d', label: 'ii.', points: 3, topics: ['trees', 'recursion'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp24-4d-c', problem: 'sp24-4d', label: 'iii.', points: 1, topics: ['trees', 'recursion'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['True', 'False', 't', 't.label', 't.label == t + 1', 't + 1 == t.label'] },
    { id: 'sp24-4e-a', problem: 'sp24-4e', label: 'i.', points: 2, topics: ['generators', 'trees'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['None', 't', 't.label', '[t]', '[t.label]'] },
    { id: 'sp24-4e-b', problem: 'sp24-4e', label: 'ii.', points: 1, topics: ['generators', 'trees'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).',
      choices: ['t.label == b.label + 1', 'b.label == t.label + 1', 't.label == b.label + 1 and is_strip(b)', 'b.label == t.label + 1 and is_strip(b)'] },
    { id: 'sp24-4e-c', problem: 'sp24-4e', label: 'iii.', points: 2, topics: ['generators', 'trees', 'recursion'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['strips(t)', 'strips(b)', 't.branches', 'b.branches', 'range(len(t.branches))', 'range(len(b.branches))'] },
    { id: 'sp24-4e-d', problem: 'sp24-4e', label: 'iv.', points: 2, topics: ['generators', 'trees', 'lists'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['s', 't', 't + s', 't.label + s', '[t] + s', '[t.label] + s', '[t] + [s]', '[t.label] + [s]'] },
    { id: 'sp24-4aplus', problem: 'sp24-4aplus', label: 'v.', points: 0, topics: ['trees', 'recursion', 'lists'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank.' },
    // Fall 2023 — Q1
    { id: 'fa23-1a', problem: 'fa23-1', label: '(a)', points: 1, topics: ['iterators', 'lists'], difficulty: 'easy',
      type: 'single_choice', mono: true, prompt: '`[-k for k in v if k in s]`', choices: ['[]', '[3, 4]', '[-3, -4]', 'Error'] },
    { id: 'fa23-1b', problem: 'fa23-1', label: '(b)', points: 1, topics: ['iterators', 'hof'], difficulty: 'medium',
      type: 'single_choice', mono: true, prompt: '`tuple(u)`',
      choices: ['(3, 4, 5, 6)', '(3, 4, 5, 6, 7)', '(6, 8, 10, 12)', '(6, 8, 10, 12, 14)', '(10, 12)', '(10, 12, 14)', 'Error'] },
    { id: 'fa23-1c', problem: 'fa23-1', label: '(c)', points: 1, topics: ['iterators'], difficulty: 'medium',
      type: 'single_choice', mono: true, prompt: '`next(t)`', choices: ['3', '5', 'range(3, 7)', 'range(5, 7)', 'Error'] },
    { id: 'fa23-1d', problem: 'fa23-1', label: '(d)', points: 1, topics: ['iterators'], difficulty: 'easy',
      type: 'single_choice', mono: true, prompt: '`next(iter(s)) + next(iter(s))`', choices: ['6', '7', '10', '11', 'Error'] },
    // Fall 2023 — Q2
    { id: 'fa23-2a', problem: 'fa23-2', label: '(a)', points: 3, topics: ['env', 'lists'], difficulty: 'hard',
      type: 'multi_select', prompt: 'What value fills blank (a)? Select **all** that apply.',
      choices: ['None', 'A list', 'A number', 'The object bound to global s', 'The object bound to global t', 'The same object that s[0] would evaluate to in the global frame', 'The same object that s[1] would evaluate to in the global frame', 'The same object that t[0] would evaluate to in the global frame', 'The same object that t[1] would evaluate to in the global frame'] },
    { id: 'fa23-2b', problem: 'fa23-2', label: '(b)', points: 3, topics: ['env', 'lists'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What would be printed by the expression `print(t)` at the end?' },
    // Fall 2023 — Q3
    { id: 'fa23-3a', problem: 'fa23-3', label: '(a)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['self', 'self.books', 'Library', 'Library()', 'Library(titles)'] },
    { id: 'fa23-3b', problem: 'fa23-3', label: '(b)', points: 1, topics: ['oop', 'fundamentals'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa23-3c', problem: 'fa23-3', label: '(c)', points: 1, topics: ['oop', 'lists'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['out.append(book)', 'out.extend(book)', 'Library.append(book)', 'Library.extend(book)', 'self.out.append(book)', 'self.out.extend(book)'] },
    { id: 'fa23-3d', problem: 'fa23-3', label: '(d)', points: 1, topics: ['oop'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).', choices: ['self.', 'self.out', 'library', 'library.out', 'self.library.out'] },
    { id: 'fa23-3e', problem: 'fa23-3', label: '(e)', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'e',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (e).', choices: ['self', 'title', 'library', 'self.title', 'self.library'] },
    { id: 'fa23-3f', problem: 'fa23-3', label: '(f)', points: 1, topics: ['oop'], difficulty: 'medium', blank: 'f',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (f).', choices: ['self', 'title', 'self.title', 'repr(self)', 'repr(title)', 'repr(self.title)'] },
    // Fall 2023 — Q4
    { id: 'fa23-4a', problem: 'fa23-4a', label: 'i.', points: 2, topics: ['recursion'], difficulty: 'hard', blank: 'a',
      type: 'multi_select', mono: true, prompt: 'Select **all** of the options that could fill blank (a).',
      choices: ['total == 0', 'n == k', 'total == 0 and n == 0', 'total == k * k', 'total == k * k and n == 1', 'total == n * k * k'] },
    { id: 'fa23-4b', problem: 'fa23-4a', label: 'ii.', points: 2, topics: ['recursion'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa23-4c', problem: 'fa23-4a', label: 'iii.', points: 3, topics: ['recursion'], difficulty: 'hard', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c) with an expression of the form `f(___, ___, ___) ___ f(___, ___, ___)`.' },
    { id: 'fa23-4d', problem: 'fa23-4b', label: 'i.', points: 2, topics: ['generators', 'lists'], difficulty: 'easy', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'fa23-4e', problem: 'fa23-4b', label: 'ii.', points: 3, topics: ['generators', 'recursion'], difficulty: 'hard', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'fa23-4f', problem: 'fa23-4b', label: 'iii.', points: 1, topics: ['generators', 'lists'], difficulty: 'medium', blank: 'f',
      type: 'multi_select', mono: true, prompt: 'Select **all** of the options that could fill in blank (f).',
      choices: ['s + k*k', 's.append(k*k)', 's + [k*k]', '[s] + [k*k]'] },
    { id: 'fa23-4b-iv', problem: 'fa23-4b', label: 'iv.', points: 3, topics: ['generators', 'hof'], difficulty: 'hard',
      type: 'short_answer', prompt: 'Write an expression containing `a` that evaluates to the **shortest** list of perfect squares that sum to an integer `a`. For example, if `a = 32`, your expression should evaluate to `[16, 16]` (not `[25, 4, 1, 1, 1]`). If there are two or more such lists that are both shortest, it can evaluate to any of them. Assume `squares` is implemented correctly.' },
    // Fall 2023 — Q5
    { id: 'fa23-5a', problem: 'fa23-5', label: '(a)', points: 2, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa23-5b', problem: 'fa23-5', label: '(b)', points: 3, topics: ['trees', 'recursion', 'lists'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa23-5c', problem: 'fa23-5', label: '(c)', points: 1, topics: ['trees', 'hof'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).', choices: ['all', 'any', 'has', 'only_paths'] },
    { id: 'fa23-5d', problem: 'fa23-5', label: '(d)', points: 1, topics: ['trees', 'lists'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['only_paths(b, n)', 'b.label == n', 'b.label != n', 'b is None', 'b is not None'] },
    { id: 'fa23-5aplus', problem: 'fa23-5aplus', label: '(e)', points: 0, topics: ['hof', 'trees', 'recursion'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank.' },
    // Fall 2023 — Q6
    { id: 'fa23-6a', problem: 'fa23-6', label: '(a)', points: 1, topics: ['links', 'recursion'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['n', 'True', 'False', 'a < b', 'f(Link.empty)'] },
    { id: 'fa23-6b', problem: 'fa23-6', label: '(b)', points: 4, topics: ['links', 'hof', 'recursion'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b). **You may not use `or`, `and`, `if`, `[`, or `]`.**' },
    { id: 'fa23-6c', problem: 'fa23-6', label: '(c)', points: 1, topics: ['efficiency'], difficulty: 'easy',
      type: 'single_choice', prompt: 'What is the order of growth of the run time of an efficient implementation of `after` in terms of the length of `s`? Here, *efficient* means that you have filled in the blanks to give the function the fastest order of growth.',
      choices: ['Constant', 'Logarithmic', 'Linear', 'Quadratic', 'Exponential'] },

    // Spring 2023 — Q1
    { id: 'sp23-1a', problem: 'sp23-1', label: '(a)', points: 2, topics: ['lists'], difficulty: 'medium',
      type: 'short_answer', prompt: '`silver`' },
    { id: 'sp23-1b', problem: 'sp23-1', label: '(b)', points: 2, topics: ['lists'], difficulty: 'medium',
      type: 'short_answer', prompt: '`gold`' },
    { id: 'sp23-1c', problem: 'sp23-1', label: '(c)', points: 2, topics: ['lists'], difficulty: 'hard',
      type: 'short_answer', prompt: '`platinum`' },
    // Spring 2023 — Q2
    { id: 'sp23-2a', problem: 'sp23-2a', label: 'i.', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp23-2b', problem: 'sp23-2a', label: 'ii.', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp23-2c', problem: 'sp23-2a', label: 'iii.', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'sp23-2d', problem: 'sp23-2b', label: 'i.', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['Numbered.number = 0', 'Numbered.number = number', 'Numbered.number = self.number', 'self.number = 0', 'self.number = number', 'self.number = Numbered.number'] },
    { id: 'sp23-2e', problem: 'sp23-2b', label: 'ii.', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'sp23-2f', problem: 'sp23-2b', label: 'iii.', points: 2, topics: ['oop'], difficulty: 'medium', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    // Spring 2023 — Q3
    { id: 'sp23-3a', problem: 'sp23-3a', label: 'i.', points: 2, topics: ['lists'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp23-3b', problem: 'sp23-3a', label: 'ii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).', choices: ['s', '[s]', 's[1:]', 'range(s)', 'range(len(s))'] },
    { id: 'sp23-3a-iii', problem: 'sp23-3a-iii', label: 'iii.', points: 1, topics: ['efficiency'], difficulty: 'easy',
      type: 'single_choice', prompt: 'What is the order of growth of the time to run this alternate implentation in terms of the length of `s`?\n\nAssume that the `append` method of a list takes just 1 step (constant time).',
      choices: ['Constant', 'Logarithmic', 'Linear', 'Quadratic', 'Exponential'] },
    { id: 'sp23-3d', problem: 'sp23-3b', label: 'i.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['s is not Link.empty', 's.rest is not Link.empty', 's.rest.rest is not Link.empty', 'suffix is not Link.empty', 'suffix.rest is not Link.empty', 'suffix.rest.rest is not Link.empty'] },
    { id: 'sp23-3e', problem: 'sp23-3b', label: 'ii.', points: 2, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'sp23-3f', problem: 'sp23-3b', label: 'iii.', points: 2, topics: ['links', 'recursion'], difficulty: 'medium', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    // Spring 2023 — Q4
    { id: 'sp23-4a', problem: 'sp23-4a', label: 'i.', points: 2, topics: ['trees', 'recursion', 'hof'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp23-4b', problem: 'sp23-4a', label: 'ii.', points: 2, topics: ['trees'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp23-4c', problem: 'sp23-4a', label: 'iii.', points: 1, topics: ['trees', 'lists'], difficulty: 'easy', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).', choices: ['remove', 'pop', 'append', 'extend'] },
    { id: 'sp23-4d', problem: 'sp23-4a', label: 'iv.', points: 2, topics: ['trees', 'lists'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (d).',
      choices: ['b', 'b.branches', 'exclude(b, x)', 'Tree(b.label, [exclude(y, x) for y in b.branches])'] },
    { id: 'sp23-4e', problem: 'sp23-4b', label: 'i.', points: 3, topics: ['trees'], difficulty: 'hard', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    // Spring 2023 — Q5
    { id: 'sp23-5a', problem: 'sp23-5a', label: 'i.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'sp23-5b', problem: 'sp23-5a', label: 'ii.', points: 3, topics: ['recursion'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'sp23-5cd', problem: 'sp23-5b', label: 'i.', points: 3, topics: ['generators', 'recursion'], difficulty: 'medium', blank: 'c, d',
      type: 'short_answer', prompt: 'Fill in blanks (c) and (d) with two lines of code. You may **not** use `yield from`.' },
    { id: 'sp23-5e', problem: 'sp23-5b', label: 'ii.', points: 1, topics: ['generators', 'recursion'], difficulty: 'easy', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'sp23-5f', problem: 'sp23-5b', label: 'iii.', points: 2, topics: ['generators'], difficulty: 'medium', blank: 'f',
      type: 'short_answer', prompt: 'Fill in blank (f).' },
    { id: 'sp23-5aplus', problem: 'sp23-5aplus', label: 'i.', points: 0, topics: ['generators', 'recursion'], difficulty: 'hard', blank: 'A+',
      type: 'code', prompt: 'Fill in the blank.' },

    // Fall 2022 — Q1 (blank letters restart in each part of Q3–Q6, so those ids include the part)
    { id: 'fa22-1a', problem: 'fa22-1', label: '(a)', points: 1, topics: ['oop'], difficulty: 'easy',
      type: 'short_answer', prompt: '`[snek.legs, Snake.legs]`' },
    { id: 'fa22-1b', problem: 'fa22-1', label: '(b)', points: 2, topics: ['oop', 'hof'], difficulty: 'medium',
      type: 'short_answer', prompt: '`solidsnake.eat("python")`' },
    { id: 'fa22-1c', problem: 'fa22-1', label: '(c)', points: 2, topics: ['oop'], difficulty: 'hard',
      type: 'short_answer', prompt: '`python.eat("snek")`' },
    { id: 'fa22-1d', problem: 'fa22-1', label: '(d)', points: 2, topics: ['oop'], difficulty: 'medium',
      type: 'short_answer', prompt: '`Snake.run(python, python)`' },
    // Fall 2022 — Q2
    { id: 'fa22-2a', problem: 'fa22-2', label: '(a)', points: 1, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'single_choice', prompt: '*Blank (a)*: What is the name `us` bound to in f1?', choices: ['A list [4, 5, 6]', 'A list [4, 5]', 'A list [4]'] },
    { id: 'fa22-2b', problem: 'fa22-2', label: '(b)', points: 1, topics: ['env', 'hof'], difficulty: 'easy',
      type: 'single_choice', prompt: '*Blank (b)*: What is the name `f` bound to in frame `f2`?', choices: ['func of(us) [parent=Global]', 'func last(k) [parent=f1]', 'None of the above'] },
    { id: 'fa22-2c', problem: 'fa22-2', label: '(c)', points: 1, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'single_choice', prompt: '*Blank (c)*: What is the name `result` bound to in frame `f2`?', choices: ['The same list bound to the name result in the Global frame', 'A list that is not bound to any name in the Global frame'] },
    { id: 'fa22-2d', problem: 'fa22-2', label: '(d)', points: 1, topics: ['env', 'lists'], difficulty: 'medium',
      type: 'single_choice', prompt: '*Blank (d)*: What is the return value of frame `f2`?', choices: ['The same list bound to the name result in f2', 'A list that is one element longer than the one bound to the name result in f2', 'None of the above'] },
    { id: 'fa22-2e', problem: 'fa22-2', label: '(e)', points: 2, topics: ['env', 'lists'], difficulty: 'hard',
      type: 'short_answer', prompt: 'What is displayed by the last line, `print(result)`?' },
    // Fall 2022 — Q3
    { id: 'fa22-3a-a', problem: 'fa22-3a', label: 'i.', points: 1, topics: ['iterators', 'generators'], difficulty: 'easy', blank: 'a',
      type: 'multi_select', mono: true, prompt: 'Which of these could fill in blank (a)? Select **all** that apply.',
      choices: ['outcomes', 'outcomes + make_test_dice(outcomes)', 'outcomes.extend(make_test_dice(outcomes))', 'outcomes[0] + make_test_dice(outcomes[1:])', 'make_test_dice(outcomes) + make_test_dice(outcomes)', 'make_test_dice(outcomes[0]) + make_test_dice(outcomes[1:])'] },
    { id: 'fa22-3a-b', problem: 'fa22-3a', label: 'ii.', points: 2, topics: ['generators'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa22-3b-a', problem: 'fa22-3b', label: 'i.', points: 2, topics: ['iterators', 'lists'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa22-3b-b', problem: 'fa22-3b', label: 'ii.', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa22-3b-c', problem: 'fa22-3b', label: 'iii.', points: 2, topics: ['lists'], difficulty: 'easy', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    // Fall 2022 — Q4
    { id: 'fa22-4a-a', problem: 'fa22-4a', label: 'i.', points: 2, topics: ['trees', 'lists'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa22-4a-b', problem: 'fa22-4a', label: 'ii.', points: 2, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa22-4b-a', problem: 'fa22-4b', label: 'i.', points: 2, topics: ['trees'], difficulty: 'hard', blank: 'a',
      type: 'multi_select', prompt: 'Select **all** options that could fit in blank (a), which may have multiple lines.',
      choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'] },
    { id: 'fa22-4b-b', problem: 'fa22-4b', label: 'ii.', points: 1, topics: ['trees'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa22-4b-c', problem: 'fa22-4b', label: 'iii.', points: 1, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa22-4b-d', problem: 'fa22-4b', label: 'iv.', points: 1, topics: ['trees', 'recursion'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    // Fall 2022 — Q5
    { id: 'fa22-5a-a', problem: 'fa22-5a', label: '(a) i.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (a).', choices: ['index == s', 'index == len(s)', 'sum_so_far == 100', 'sum_so_far != 100'] },
    { id: 'fa22-5a-b', problem: 'fa22-5a', label: '(a) ii.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (b).', choices: ['index == s', 'index == len(s)', 'sum_so_far == 100', 'sum_so_far != 100'] },
    { id: 'fa22-5a-c', problem: 'fa22-5a', label: '(a) iii.', points: 1, topics: ['recursion'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Fill in blank (c).',
      choices: ['count_subsets(s[index:])', 'count_subsets(s[1:])', 'helper(sum_so_far, index)', 'helper(sum_so_far, index + 1)'] },
    { id: 'fa22-5a-d', problem: 'fa22-5a', label: '(a) iv.', points: 2, topics: ['recursion'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'fa22-5b-i', problem: 'fa22-5a', label: '(b) i.', points: 1, topics: ['efficiency'], difficulty: 'easy',
      type: 'single_choice', prompt: 'What is the order of growth of the time required to evaluate `count_subsets`, in terms of the length of `s`?',
      choices: ['Exponential', 'Quadratic', 'Linear', 'Logarithmic', 'Constant'] },
    { id: 'fa22-5b-ii', problem: 'fa22-5b-ii', label: '(b) ii.', points: 1, topics: ['efficiency'], difficulty: 'medium',
      type: 'single_choice', prompt: 'What is the order of growth of the time required to evaluate the new version of `count_subsets`, in terms of the length of `s`?',
      choices: ['Exponential', 'Quadratic', 'Linear', 'Logarithmic', 'Constant'] },
    // Fall 2022 — Q6
    { id: 'fa22-6a-a', problem: 'fa22-6a', label: 'i.', points: 2, topics: ['oop', 'lists'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa22-6b-a', problem: 'fa22-6b', label: 'i.', points: 1, topics: ['oop', 'hof'], difficulty: 'easy', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa22-6b-b', problem: 'fa22-6b', label: 'ii.', points: 1, topics: ['oop', 'hof'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa22-6b-c', problem: 'fa22-6b', label: 'iii.', points: 2, topics: ['oop', 'hof'], difficulty: 'hard', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa22-6b-d', problem: 'fa22-6b', label: 'iv.', points: 1, topics: ['oop'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    // Fall 2022 — Q7 (A+) and Q8 (optional)
    { id: 'fa22-7a', problem: 'fa22-7', label: '(a)', points: 0, topics: ['trees', 'hof'], difficulty: 'hard', blank: 'a',
      type: 'code', prompt: 'Fill in blank (a).' },
    { id: 'fa22-7b', problem: 'fa22-7', label: '(b)', points: 0, topics: ['trees', 'hof'], difficulty: 'hard', blank: 'b',
      type: 'code', prompt: 'Fill in blank (b).' },
    { id: 'fa22-7c', problem: 'fa22-7', label: '(c)', points: 0, topics: ['trees', 'hof', 'iterators'], difficulty: 'hard', blank: 'c',
      type: 'code', prompt: 'Fill in blank (c).' },
    { id: 'fa22-7d', problem: 'fa22-7', label: '(d)', points: 0, topics: ['trees', 'hof'], difficulty: 'hard', blank: 'd',
      type: 'code', prompt: 'Fill in blank (d).' },
    { id: 'fa22-8a', problem: 'fa22-8', label: '(a)', points: 0, topics: [], difficulty: 'easy',
      type: 'code', prompt: 'Draw a picture related to CS 61A or write a program about CS 61A.' },

    // Fall 2021 — Q1
    { id: 'fa21-1a', problem: 'fa21-1', label: '(a)', points: 2, topics: ['lists'], difficulty: 'medium', blank: 'a',
      type: 'multi_select', mono: true, prompt: 'Which of these could fill in blank (a)? Check all that apply.',
      choices: ['s', 's[:]', 's[0]', '[s]', '[s[:]]', '[s[0]]', 'list(s)', 'list(s[:])', 'list(s[0])'] },
    { id: 'fa21-1b', problem: 'fa21-1', label: '(b)', points: 1, topics: ['lists'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-1c', problem: 'fa21-1', label: '(c)', points: 1, topics: ['lists'], difficulty: 'easy', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa21-1d', problem: 'fa21-1', label: '(d)', points: 1, topics: ['lists'], difficulty: 'medium', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (d)? (Select one.)',
      choices: ['s[1]', 's[1:]', 's[1:2]', '[s[1]]', '[s[1:]]', '[s[1:2]]', '[s[1], s]', '[s[1]] + s'] },
    { id: 'fa21-1e', problem: 'fa21-1', label: '(e)', points: 2, topics: ['lists'], difficulty: 'hard', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    // Fall 2021 — Q2
    { id: 'fa21-2a-a', problem: 'fa21-2a', label: 'i.', points: 2, topics: ['recursion'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-2a-b', problem: 'fa21-2a', label: 'ii.', points: 1, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-2a-c', problem: 'fa21-2a', label: 'iii.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa21-2a-d', problem: 'fa21-2a', label: 'iv.', points: 1, topics: ['recursion'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (d)? (Select one.)',
      choices: ['n - coin', 'n - coins[0]', 'n - coins[1]', 'n - coins.pop()'] },
    { id: 'fa21-2a-e', problem: 'fa21-2a', label: 'v.', points: 1, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'e',
      type: 'short_answer', prompt: 'Fill in blank (e).' },
    { id: 'fa21-2b-a', problem: 'fa21-2b', label: 'i.', points: 1, topics: ['recursion', 'lists'], difficulty: 'easy', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-2b-b', problem: 'fa21-2b', label: 'ii.', points: 1, topics: ['recursion', 'lists'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-2b-c', problem: 'fa21-2b', label: 'iii.', points: 1, topics: ['recursion', 'lists'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (c)? (Select one.)',
      choices: ['rest', 'rest[1:]', 'amounts(rest)', 'amounts(rest[1:])', '[k + coin for k in rest]', '[k + coin for k in rest[1:]]'] },
    { id: 'fa21-2b-d', problem: 'fa21-2b', label: 'iv.', points: 2, topics: ['lists'], difficulty: 'hard', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    // Fall 2021 — Q3
    { id: 'fa21-3a-a', problem: 'fa21-3a', label: 'i.', points: 2, topics: ['oop', 'fundamentals'], difficulty: 'hard', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-3a-b', problem: 'fa21-3a', label: 'ii.', points: 2, topics: ['oop', 'fundamentals'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-3a-c', problem: 'fa21-3a', label: 'iii.', points: 1, topics: ['oop'], difficulty: 'medium', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa21-3a-d', problem: 'fa21-3a', label: 'iv.', points: 1, topics: ['oop'], difficulty: 'easy', blank: 'd',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (d)? (Select one.)',
      choices: ['Garage', 'valet', 'valets', 'garage', 'self.valet', 'self.valets', 'self.garage', 'self'] },
    { id: 'fa21-3b-a', problem: 'fa21-3b', label: 'i.', points: 1, topics: ['generators'], difficulty: 'easy', blank: 'a',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (a)? (Select one.)',
      choices: ['while True', 'while s', 'for x in s', 'for x in ring(s)'] },
    { id: 'fa21-3b-b', problem: 'fa21-3b', label: 'ii.', points: 1, topics: ['generators'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-3c-a', problem: 'fa21-3c', label: 'i.', points: 1, topics: ['generators', 'iterators'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-3c-b', problem: 'fa21-3c', label: 'ii.', points: 1, topics: ['iterators'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-3c-c', problem: 'fa21-3c', label: 'iii.', points: 1, topics: ['generators'], difficulty: 'medium', blank: 'c',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (c)? (Select one.)',
      choices: ['from s', 'from t', 's[0]', 's[i]', 'next(t)'] },
    { id: 'fa21-3c-d', problem: 'fa21-3c', label: 'iv.', points: 2, topics: ['generators'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    // Fall 2021 — Q4
    { id: 'fa21-4a-a', problem: 'fa21-4a', label: 'i.', points: 1, topics: ['lists', 'hof'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-4a-b', problem: 'fa21-4a', label: 'ii.', points: 1, topics: ['lists'], difficulty: 'medium', blank: 'b',
      type: 'single_choice', mono: true, prompt: 'Which of these could fill in blank (b)? (Select one.)', choices: ['x', 'x, y', 'y', 'y, z'] },
    { id: 'fa21-4a-c', problem: 'fa21-4a', label: 'iii.', points: 1, topics: ['hof', 'iterators', 'lists'], difficulty: 'hard', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
    { id: 'fa21-4a-d', problem: 'fa21-4a', label: 'iv.', points: 1, topics: ['hof'], difficulty: 'medium', blank: 'd',
      type: 'short_answer', prompt: 'Fill in blank (d).' },
    { id: 'fa21-4b-a', problem: 'fa21-4b', label: 'i.', points: 1, topics: ['hof', 'fundamentals'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-4b-b', problem: 'fa21-4b', label: 'ii.', points: 1, topics: ['fundamentals'], difficulty: 'easy', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-4b-iii', problem: 'fa21-4b', label: 'iii.', points: 2, topics: ['efficiency'], difficulty: 'easy',
      type: 'single_choice', prompt: 'What is the order of growth of the time required to evaluate `max_diff(s, f)` for a sequence `s` of length *n* and a function `f` that requires constant time to evaluate.',
      choices: ['Exponential, Θ(bⁿ)', 'Quadratic, Θ(n²)', 'Linear, Θ(n)', 'Logarithmic, Θ(log₂ n)', 'Constant, Θ(1)'] },
    { id: 'fa21-4c-a', problem: 'fa21-4c', label: 'i.', points: 1, topics: ['hof'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a), but do not use a comprehension.' },
    { id: 'fa21-4c-b', problem: 'fa21-4c', label: 'ii.', points: 1, topics: ['hof'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b), but do not use a comprehension.' },
    // Fall 2021 — Q5
    { id: 'fa21-5a-a', problem: 'fa21-5a', label: 'i.', points: 2, topics: ['trees'], difficulty: 'medium', blank: 'a',
      type: 'multi_select', mono: true, prompt: 'Which of these could fill in blank (a)? Check all that apply. *Hint*: The `bool` function returns `True` for a true value and `False` for a false value.',
      choices: ['t', 'bool(t)', 't.is_leaf()', 'not t.is_leaf()', 't.branches', 'bool(t.branches)', 'len(t.branches)', 'len(t.branches) > 0', 'len(t.branches) >= 0'] },
    { id: 'fa21-5a-b', problem: 'fa21-5a', label: 'ii.', points: 2, topics: ['trees', 'lists'], difficulty: 'medium', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-5b-a', problem: 'fa21-5b', label: 'i.', points: 2, topics: ['trees', 'links'], difficulty: 'medium', blank: 'a',
      type: 'short_answer', prompt: 'Fill in blank (a).' },
    { id: 'fa21-5b-b', problem: 'fa21-5b', label: 'ii.', points: 2, topics: ['trees', 'links', 'recursion'], difficulty: 'hard', blank: 'b',
      type: 'short_answer', prompt: 'Fill in blank (b).' },
    { id: 'fa21-5b-c', problem: 'fa21-5b', label: 'iii.', points: 1, topics: ['links'], difficulty: 'easy', blank: 'c',
      type: 'short_answer', prompt: 'Fill in blank (c).' },
  ];

  // correct: choice index (single), array of indices (multi)
  // accepted: official answer first (shown as "Official answer"), then equivalent forms auto-accepted
  const ANSWER_KEY = {
    'fa25-1a': { correct: 3, explanation: 'Calling `next(t)` runs `weird([5, [6, 7], 8])` until its first `yield`. Since `s` is non-empty and `len(s) > 1`, the first value yielded is `s[1]`, which is `[6, 7]`.' },
    'fa25-1b': { accepted: ['[8, 8, [6, 7], 5]'], explanation: 'After `[6, 7]`, the generator loops over `weird([[6, 7], 8])`, which yields its `s[1]` (8), then everything from `weird([8])` (just 8), then its `s[0]` (`[6, 7]`). Finally the outer call yields its own `s[0]`, 5.' },
    'fa25-1c': { correct: 3, explanation: '`i` starts at 1 and doubles on each recursive call (`i * 2`), stopping once `i >= len(s)`. That is about log₂(n) calls, each doing constant work.' },
    'fa25-2a': { accepted: ['[5, [3, [6, [7], 2]]]'], explanation: '`wrap(s)` returns `w = [5, s]`. `f(w)` is `s`, and `f(s)` is `s[1]`, which is `[6, [7]]`; appending 2 gives `[6, [7], 2]`. Inside `peel`, the local `s` is `w`, so `t = w[1]` is the global `s`, and `t[0] = 3` makes it `[3, [6, [7], 2]]`. Rebinding `t = [4]` changes nothing that is printed. `peel` returns `w`.' },
    'fa25-3a': { correct: 3, explanation: 'Keep scanning while there are branches left in **both** trees. If either runs out, the loop must stop, or indexing `part.branches[p]` or `whole.branches[w]` would fail.' },
    'fa25-3b': { accepted: ['includes(part.branches[p], whole.branches[w])'], explanation: 'Advance `p` only when the current part branch is included in the current whole branch. `w` always advances, which skips nodes of `whole` that get removed.' },
    'fa25-3c': { accepted: ['p == len(part.branches)', 'len(part.branches) == p', 'p >= len(part.branches)'], explanation: '`whole` includes `part` only if every branch of `part` was matched, in order.' },
    'fa25-4a': { accepted: ['[y for y in s if y != x]', '[e for e in s if e != x]', '[i for i in s if i != x]', '[v for v in s if v != x]', '[n for n in s if n != x]', 'list(filter(lambda y: y != x, s))'], explanation: 'A list comprehension builds a new list, so `s` is not modified. Note `3.0 == 3` is `True` in Python, so 3.0 is also removed.' },
    'fa25-4b': { accepted: ['s is Link.empty', 's == Link.empty'] },
    'fa25-4c': { accepted: ['s', 'Link.empty'] },
    'fa25-4d': { accepted: ['s.first == x', 'x == s.first'] },
    'fa25-4e': { accepted: ['exclude_link(s.rest, x)'] },
    'fa25-4f': { accepted: ['Link(s.first, exclude_link(s.rest, x))'], explanation: 'Build a new `Link` rather than mutating `s.rest`, so the input is not modified.' },
    'fa25-5a': { correct: 2, explanation: 'If `q <= self.pizzas`, nothing needs to be ordered from `alt` (0). Otherwise the overflow is `q - self.pizzas`. `max(0, ...)` handles both cases. Plain subtraction would give a negative number and make `self.pizzas` grow.' },
    'fa25-5b': { correct: 4, explanation: 'The parlor earns its own `price` (an instance attribute, so `self.price`) times the `quantity` argument, a local name. There is no `self.quantity`.' },
    'fa25-5c': { accepted: ['self.cook(quantity)'], explanation: 'Dynamic dispatch picks `Parlor.cook` or `MegaParlor.cook` with no type check. The method returns the overload amount.' },
    'fa25-5d': { accepted: ['rest * self.alt.price', 'self.alt.price * rest'] },
    'fa25-5e': { accepted: ['self.alt.order(rest, self)', 'self.alt.order(rest, source=self)'], explanation: 'Pass `self` as `source` so the alt prints the “forwarded an order” message.' },
    'fa25-5f': { accepted: ['0'], explanation: 'A `MegaParlor` can cook any quantity, so nothing overflows. Returning 0 also keeps `if rest:` from touching its missing `alt`.' },
    'fa25-6a': { correct: 12, explanation: 'For key `k`, its value is `d[k]`. The pair is symmetric when looking up that value gives back `k`. `d.get` returns `None` (not an error) when `d[k]` is not a key. Only `k` is bound in the comprehension, so options using `v` raise NameError.' },
    'fa25-6b': { correct: 1, explanation: 'On the first iteration `previous` is `\'\'`, which is falsy, so `and` short-circuits. After that, fail if the disallowed partner of `previous` is the current slice.' },
    'fa25-6c': { correct: 0, explanation: '`slice` is already a character, not an index, so just remember it for the next iteration.' },
    'fa25-6d': { accepted: ['disallow.get(slice) != pizza[0]', 'disallow.get(pizza[0]) != slice', 'disallow.get(pizza[-1]) != pizza[0]', 'disallow.get(pizza[0]) != pizza[-1]'], explanation: 'After the loop, `slice` is the last slice. The first and last slices are also adjacent, so check that pair too.' },
    'fa25-6e': { accepted: ['n == num_slices', 'num_slices == n'], explanation: '`n` counts how many slices have been placed so far. When it reaches `num_slices`, only the wrap-around (first, last) pair is left to check.' },
    'fa25-6f': { correct: 0, explanation: 'The first and last slices are compatible when they are equal or either one is `_`.' },
    'fa25-6g': { correct: 1, explanation: '`.remove` mutates the list, so each call needs a fresh copy. Using `slice_types` directly would permanently delete toppings for every later call.' },
    'fa25-6h': { accepted: ['f(n+1, first, x)', 'f(n + 1, first, x)'] },
    'fa25-6i': { accepted: ['[""]', "['']"], explanation: 'There is exactly one way to top zero slices: the empty string. The `not x` check in the comprehension relies on it.' },
    'fa25-6j': { accepted: ["['_' + x for x in recurse]", '["_" + x for x in recurse]'], explanation: 'A `_` can go in front of any shorter pizza.' },
    'fa25-6k': { correct: 5, explanation: '`ways` is a list, and the argument is a list of new pizzas to add, so use `extend`. `append` would nest the list.' },
    'fa25-6l': { accepted: ['x[0] != z', 'z != x[0]'], explanation: 'Putting `y` in front of `x` is only allowed if `x` does not start with the conflicting topping `z`.' },
    'fa25-6m': { accepted: ['list(filter(ok, ways))'] },
    'fa25-6aplus': { accepted: ['filter(lambda p: len(p) == n and acceptable(p), g(slices)), range(count_pizzas(n))'] },

    'sp25-1a': { accepted: ['[8]'], explanation: 'Only `[5, 8]` is a list. Its element at index 1 is 8. `map` is lazy, so nothing has been popped yet.' },
    'sp25-1b': { correct: 4, explanation: 'The first `next(m)` computes `add_t(2)` = `2 + t.pop()` = 2 + 9 = 11.' },
    'sp25-1c': { correct: 3, explanation: '9 was already popped by `next(m)`, so the last element is now 7.' },
    'sp25-1d': { accepted: ['[[10, 11], 12]'], explanation: '`t` is now `[1, 3, 5]`. `add_t([5, 8])` gives `[5 + 5, 8 + 3]`, which is `[10, 11]`. Then `add_t(11)` = 11 + 1 = 12.' },
    'sp25-2a': { accepted: ['[5, [4, 6], 3]'], explanation: '`list(this)` is a shallow copy, so `copy[1]` and `that` are the same inner list. `that[0] = 4` and `.append(6)` change that shared list, and `copy[0] = 5` changes only the copy.' },
    'sp25-2b': { accepted: ['[1, [4, 6, 7], 3, [4, 6, 7]]'], explanation: '`t[0]` is still 1, since only the copy changed. `this.append(that)` adds a second reference to the inner list, and appending 7 shows up in both places.' },
    'sp25-2c': { correct: 2, explanation: 'The loop runs `n` times with constant work each time. The structure only *looks* exponential because each level holds the same list twice.' },
    'sp25-3a': { correct: 4 },
    'sp25-3b': { accepted: ['Event(start, start + length)', 'Event(start, length + start)'] },
    'sp25-3c': { correct: 0, explanation: 'Update the local `start`. Changing `self.start` would modify the original event, and the spec says it must not change.' },
    'sp25-3d': { accepted: ['Event.split(self, k)', 'super().split(k)'], explanation: 'Reuse the parent’s generator: call it through the class, or use `super()`.' },
    'sp25-3e': { correct: 0 },
    'sp25-3f': { correct: 4 },
    'sp25-3g': { correct: [1, 3], explanation: '`time` is a class attribute. It can be reached through an instance (`self.time`) or the class (`BerkeleyEvent.time`). A bare `time` is not in scope inside the method, and `Event` has no `time`.' },
    'sp25-4a': { accepted: ['y+1 for y in below if y is not None', 'y + 1 for y in below if y != None', 'd + 1 for d in below if d is not None', 'b + 1 for b in below if b is not None'], explanation: 'Each branch result is a depth relative to that branch (or `None`). Add 1 for the edge to `t`, and drop the `None`s.' },
    'sp25-4b': { correct: 4 },
    'sp25-4c': { accepted: ['append(0)'], explanation: 'If the root itself is labeled `x`, then depth 0 is a candidate too.' },
    'sp25-4d': { accepted: ['result[node.label]'] },
    'sp25-4e': { correct: 2 },
    'sp25-4f': { correct: 4 },
    'sp25-4g': { accepted: ['visit(b, depth + 1)', 'visit(b, depth+1)'] },
    'sp25-5a': { correct: 2 },
    'sp25-5b': { accepted: ['s.first * s.rest.first + muladd(s.rest.rest)', 's.rest.first * s.first + muladd(s.rest.rest)', 'muladd(s.rest.rest) + s.first * s.rest.first'], explanation: 'Multiply the first two elements, then add the result of the same pattern on the rest of the list after those two.' },
    'sp25-5c': { correct: 3, explanation: 'With one number left there are no more operator slots, so there is exactly one expression.' },
    'sp25-5d': { correct: 2, explanation: 'The first call places a `+`, which resets the count of consecutive `*` back to `k`.' },
    'sp25-5e': { accepted: ['f(left - 1, n - 1)'], explanation: 'Place a `*`, using up one of the remaining consecutive `*`s.' },
    'sp25-5f': { accepted: ['close(s[i:], x - product(s[:i]))'], explanation: 'The first `i` numbers are multiplied together as one term. The rest of the list should come as close as possible to the remaining target.' },
    'sp25-5g': { correct: [4], explanation: '`key` must be a one-argument function that scores each candidate `y` by its distance to `x`.' },
    'sp25-5h': { accepted: ["'+' + close_exp(s[i+1:], x - eval(term))"] },

    'fa24-1a': { accepted: ['0'], explanation: '`crow.branches[0]` is `scare`, whose label is 0.' },
    'fa24-1b': { accepted: ['[4, 5, 2]'], explanation: '`hide` returns a tree’s label, so this lists the labels of `scare`’s branches in order.' },
    'fa24-1c': { accepted: ['[9, 7, 6]'], explanation: 'With `key=hide`, `climb` follows the branch with the largest label: from 9 it picks 7 (over `scare`, labeled 0), then the leaf 6.' },
    'fa24-1d': { accepted: ['[9, 0, 5, 10]'], explanation: '`run(t)` is the largest leaf label below `t`. `run(scare)` is 10 and `run(Tree(7, ...))` is 6, so `climb` goes to `scare` (0), then to `Tree(5, [Tree(10)])` (largest leaf 10), then to the leaf 10.' },
    'fa24-1e': { accepted: ['4'], explanation: '`jump` maps `2 * x - 1` to `x`. `jump[13]` is 7, and `jump[7]` is 4.' },
    'fa24-2a': { accepted: ['[[1], [3, 4], [2]]'], explanation: '`s` and `copy` are the global list `t`, and the local `t` starts as a list holding that same list. Each loop iteration appends a slice (a new list), pops the last element, then sets `s[0]`. The slices are `[3, 4]` and then `[2]`. By the end the original list is `[1]`, and since the first element of the result *is* that list, it prints as `[1]`.' },
    'fa24-2b': { correct: 0, explanation: 'The global `t` is the same list `slice_up` mutated: after the second pop it is `[2]`, and `s[0] = len(s)` makes it `[1]`.' },
    'fa24-2c': { correct: 2, explanation: 'Each `list(...)` copies a list of length n once. Two copies is still linear.' },
    'fa24-3a': { correct: 0, explanation: 'The comprehension already keeps only the matching programs, so count 1 for each.' },
    'fa24-3b': { accepted: ['b.copies(s)', 'Store.copies(b, s)'], explanation: 'Each branch is itself a `Store`, so it counts the copies in its own tree recursively.' },
    'fa24-3c': { accepted: ['self.branches[k].inventory.append', 'lambda s: self.branches[k].inventory.append(s)', 'lambda x: self.branches[k].inventory.append(x)', 'lambda p: self.branches[k].inventory.append(p)'], explanation: 'The bound method `append` of the branch’s inventory list is already a function that takes a string and appends it.' },
    'fa24-4a': { correct: 1, explanation: '`s` is how much of the sum is still left to make. Reaching exactly 0 means the chosen divisors add up to `n`.' },
    'fa24-4b': { correct: 0, explanation: 'Only proper divisors of `n` may be used, so `d` has to divide `n`.' },
    'fa24-4c': { accepted: ['s - d'], explanation: 'Using `d` leaves `s - d` still to make, using only larger candidates (`d + 1` onward), so no divisor repeats.' },
    'fa24-4d': { accepted: ['f(s, d + 1)'], explanation: 'Skip `d` and try the next candidate with the same amount left.' },
    'fa24-4e': { correct: 1, explanation: 'If the first element alone equals `n`, the one-element sublist `[n]` works.' },
    'fa24-4f': { accepted: ['subsums(s[1:], n-s[0])'], explanation: 'Sublists that use `s[0]`: the rest must come from `s[1:]` and sum to `n - s[0]`.' },
    'fa24-4g': { correct: 3, explanation: '`s[:1]` is the list `[s[0]]`, so this puts the first element in front of each sublist `t` from the rest.' },
    'fa24-4h': { correct: 1, explanation: 'Sublists that skip `s[0]` come from `s[1:]` and still sum to `n`.' },
    'fa24-4i': { correct: 3 },
    'fa24-4j': { correct: 3, explanation: 'Keep only the proper divisors of `n`. `subsums` then finds the groups of them that sum to `n`.' },
    'fa24-4k': { accepted: ['n'] },
    'fa24-4l': { accepted: ['lambda k: n % k == 0, range(1, n)', 'lambda d: n % d == 0, range(1, n)', 'lambda x: n % x == 0, range(1, n)'], explanation: '`filter` takes a function and an iterable: keep each `k` in `1 .. n-1` that divides `n`, then check whether any of them is semiperfect.' },
    'fa24-5a': { accepted: ['a is Link.empty', 'a == Link.empty'], explanation: '`a` and `b` move forward together. If `a` runs out while `b` still has elements, `t` is longer.' },
    'fa24-5b': { correct: 3 },
    'fa24-5c': { correct: 4 },
    'fa24-5d': { correct: 2, explanation: 'The loop ended because `b` ran out, so `s` is at least as long as `t`, and ties return `s`.' },
    'fa24-5e': { correct: 2, explanation: '`t` is the best sublist that leaves out `s.first`.' },
    'fa24-5f': { accepted: ['s.first <= n', 'n >= s.first'], explanation: '`s.first` can only be included if it fits within the limit.' },
    'fa24-5g': { accepted: ['Link(s.first, longest(s.rest, n - s.first))'], explanation: 'The best sublist that includes `s.first` is a new `Link` (so `s` is not mutated) in front of the longest sublist of the rest that fits in what is left, `n - s.first`.' },
    'fa24-6a': { accepted: ['g(x + max_path(b, lambda p: g(x + p)))'] },

    'sp24-1a': { correct: 5, explanation: '`shake` inserts the missing numbers: between 2 and 5 it adds 4 and then 3 (each time re-checking the same node), and between 5 and 7 it adds 6.' },
    'sp24-1b': { accepted: ['<1 5 6 7>'], explanation: '`off` shares the original `Link(5, Link(7))` node with `it`. `shake` changes that node’s `rest` to start with 6, which `off` sees too. The 3 and 4 were inserted before the 5 node, so `off` does not see them.' },
    'sp24-1c': { accepted: ['[1, 9]'], explanation: '`cruel` yields every other element, 1 and 3, so the squares are 1 and 9.' },
    'sp24-1d': { correct: 2, explanation: 'Each call inserts one number or moves one step forward, and there are about n numbers to insert, so the number of calls grows linearly.' },
    'sp24-2a': { accepted: ['[None]'], explanation: '`f` returns a list containing the result of `rest.append(a)`, and `append` returns `None`.' },
    'sp24-2b': { accepted: ['[4, [2, 3], 5]'], explanation: 'Inside `f`, `b` gets the popped 4 and then the list `a` (which is `c`, now `[2, 3]`). `b + [5]` makes a new list with 5 at the end.' },
    'sp24-2c': { accepted: ['[2, 3]'], explanation: '`a.pop()` removed 4 from `c`. Rebinding `a` inside `cycle` does not change `c`.' },
    'sp24-3a': { accepted: ["{'Front': Speaker(lambda x: x)}", "{'Front': Speaker(lambda s: s)}"], explanation: 'Each `Mic` gets its own new dictionary, with a `Front` speaker whose transform returns its input unchanged.' },
    'sp24-3b': { correct: 3 },
    'sp24-3c': { accepted: ['m.speakers[location] = self'] },
    'sp24-3d': { correct: 6 },
    'sp24-4a-a': { correct: 0, explanation: 'Check the empty list first: the other options index `s[0]` or `s[1]`, which fails for short lists.' },
    'sp24-4a-b': { accepted: ['s[0]'] },
    'sp24-4a-c': { correct: 4, explanation: 'A strip of length `len(s)` that starts at `s[0]` is `range(s[0], s[0] + len(s))`.' },
    'sp24-4b-a': { correct: 1, explanation: 'After using `s[0]`, the strip continues with `t[0]`, so swap the roles: `t` becomes the list whose first element comes next.' },
    'sp24-4b-b': { accepted: ['len(s) > 1 and s[0] + 1 == s[1]', 'len(s) > 1 and s[1] == s[0] + 1', 'len(s) >= 2 and s[0] + 1 == s[1]'], explanation: 'Otherwise the next number must be the next element of `s`. Check the length first so `s[1]` exists.' },
    'sp24-4b-c': { correct: 0 },
    'sp24-4b-d': { correct: 5, explanation: 'When one list is used up, what is left of the other must continue the strip by itself.' },
    'sp24-4c-a': { accepted: ['longest(s[1:])'] },
    'sp24-4c-b': { correct: 0, explanation: '`max` returns the first of equal-length strips, which is the one that starts earlier in `s`.' },
    'sp24-4c-c': { correct: 3, explanation: '`s[:1]` is a new one-element list starting the strip, and it supports `append`.' },
    'sp24-4c-d': { accepted: ['k == result[-1] + 1', 'result[-1] + 1 == k'] },
    'sp24-4d-a': { correct: 0, explanation: 'A path with one label is a strip.' },
    'sp24-4d-b': { accepted: ['b.label == t.label + 1 and has_strip(b)', 't.label + 1 == b.label and has_strip(b)'], explanation: 'A path through `b` is a strip if `b`’s label is one more than `t`’s and `b` has a strip path of its own.' },
    'sp24-4d-c': { correct: 1 },
    'sp24-4e-a': { correct: 4 },
    'sp24-4e-b': { correct: 1 },
    'sp24-4e-c': { correct: 1 },
    'sp24-4e-d': { correct: 5 },
    'sp24-4aplus': { accepted: ['has_strip(b) and (only_strips(b) or t.label + 1 == b.label)'] },
    'fa23-1a': { correct: 2, explanation: '`v` took the first two values from `t`, 3 and 4. Both are in `range(3, 7)`, so the comprehension negates them.' },
    'fa23-1b': { correct: 4, explanation: '`map` is lazy and shares the iterator `t`. Building `v` already used 3 and 4, so the map doubles only what is left: 5 and 6.' },
    'fa23-1c': { correct: 4, explanation: '`tuple(u)` used up the rest of `t`, so `next(t)` raises `StopIteration`.' },
    'fa23-1d': { correct: 0, explanation: 'Each `iter(s)` makes a new iterator over the range, so each `next` returns its first element, 3.' },
    'fa23-2a': { correct: [1, 3, 8], explanation: 'In `pull`, `s` is a copy of global `t` (which is `[6, s]`), and `u = s.pop()` is its last element: the list bound to global `s`, which is also what `t[1]` evaluates to.' },
    'fa23-2b': { accepted: ['[6, [7, [8, 9, 8]]]'], explanation: '`pull()` returns `u[1][0]`, which is 8. In `push`, `s` is a copy of global `s`, but `s[1]` is still the shared inner list `[8, 9]`, so 8 is appended to it, and `t` shows the change through global `s`.' },
    'fa23-3a': { correct: 0, explanation: 'Each book belongs to the library being constructed, which is `self`.' },
    'fa23-3b': { accepted: ['self.books[title]', 'self.books.get(title)'] },
    'fa23-3c': { correct: 4, explanation: 'Record the book as checked out. `append` adds one element; `extend` expects an iterable.' },
    'fa23-3d': { correct: 4, explanation: 'A book reaches its library’s list of checked-out books through its `library` attribute.' },
    'fa23-3e': { correct: 0, explanation: 'The book being brought back is `self`.' },
    'fa23-3f': { correct: 2, explanation: '`print` uses `__str__`, and the expected output is the bare title. `repr` would add quotes.' },
    'fa23-4a': { correct: [2, 4, 5], explanation: 'Each of these is true exactly when no more squares are needed or one more `k*k` (or `n` copies of it) finishes the sum. `total == n * k * k` stops soonest; the other two get there after more recursive calls.' },
    'fa23-4b': { accepted: ['total < k * k', 'k * k > total'], explanation: 'Only squares of `k*k` or larger are left to use, so if `total` is smaller than `k*k` there is no way.' },
    'fa23-4c': { accepted: ['f(total - k * k, n - 1, k) or f(total, n, k + 1)', 'f(total, n, k + 1) or f(total - k * k, n - 1, k)'], explanation: 'Either use `k*k` at least once (and possibly again), or move on to larger squares only.' },
    'fa23-4d': { accepted: ['[k * k]', '[total]'] },
    'fa23-4e': { accepted: ['squares(total - k * k, k)'], explanation: 'Every way to make `total - k*k` from squares of at least `k*k`, followed by one more `k*k`, is a way to make `total`, and stays in non-increasing order.' },
    'fa23-4f': { correct: [2], explanation: '`s` is a list, so it can only be joined with another list. `append` would return `None`.' },
    'fa23-4b-iv': { accepted: ['min(squares(a, 1), key=len)', 'min(list(squares(a, 1)), key=len)', 'min(squares(a, 1), key=lambda s: len(s))'], explanation: '`squares(a, 1)` yields every list of perfect squares summing to `a`; `min` with `key=len` picks a shortest one.' },
    'fa23-5a': { accepted: ['t.is_leaf() and n == t.label', 't.is_leaf() and t.label == n', 'n == t.label and t.is_leaf()'], explanation: 'A leaf whose label is exactly the remaining sum is a whole path on its own.' },
    'fa23-5b': { accepted: ['only_paths(b, n - t.label)'], explanation: 'Paths through `b` must make up whatever `t.label` leaves of `n`.' },
    'fa23-5c': { correct: 1, explanation: 'If at least one branch kept a path (is not `None`), build a tree; otherwise the function ends and returns `None`.' },
    'fa23-5d': { correct: 4 },
    'fa23-5aplus': { accepted: ['(lambda f: lambda t, n: f(t, n-1))(only_paths)'] },
    'fa23-6a': { correct: 2, explanation: 'Reaching the end of the list means `n` was never found.' },
    'fa23-6b': { accepted: ['find(rest, b, lambda rest: True)', 'find(rest, b, lambda r: True)', 'find(rest, b, lambda x: True)'], explanation: 'After finding `a`, look for `b` in the rest of the list; finding it returns `True`.' },
    'fa23-6c': { correct: 2, explanation: 'Each call moves one step down the list, so the work grows with its length. The official solution notes that Constant was also accepted (best case), but this site only marks Linear correct.' },

    'sp23-1a': { accepted: ['[1, [3]]'], explanation: '`silver[1]` is `chain([3, 4, 5])`, which is `[3, [4, 5]]`. `pop` removes `[4, 5]`, and then `silver[0]` becomes 1.' },
    'sp23-1b': { accepted: ['[2, [4, 5]]'], explanation: '`gold` was built before `silver[0]` changed, from 2 and the popped list `[4, 5]`.' },
    'sp23-1c': { accepted: ['[6, [[7, 8]]]'], explanation: '`chain([6, 7, 8])` is `[6, [7, 8]]`. Chaining that gives its first element, 6, and a slice holding the rest: `[[7, 8]]`.' },
    'sp23-2a': { accepted: ['self.sent = False'] },
    'sp23-2b': { accepted: ['self.sent = True'] },
    'sp23-2c': { accepted: ['Letter(self.contents.upper())'], explanation: 'The reply is a new plain `Letter` with the contents in capitals.' },
    'sp23-2d': { correct: 5, explanation: 'The new letter’s number is how many numbered letters came before it, kept in the class attribute.' },
    'sp23-2e': { accepted: ['Numbered.number += 1', 'Numbered.number = Numbered.number + 1'], explanation: 'Update the class attribute so the next numbered letter gets the next number. `self.number += 1` would only change this letter.' },
    'sp23-2f': { accepted: ['str(self.number)', 'repr(self.number)'], explanation: '`number` is an int, so convert it to a string before adding it to `\'#\'`.' },
    'sp23-3a': { accepted: ['sum(s[:k+1])', 'sum(s[0:k+1])'], explanation: 'The prefix of length `k + 1` is `s[:k+1]`.' },
    'sp23-3b': { correct: 4 },
    'sp23-3a-iii': { correct: 2, explanation: 'One pass over `s` with constant work per element.' },
    'sp23-3d': { correct: 3, explanation: 'Keep going while there are elements left in the part of the list not yet added.' },
    'sp23-3e': { accepted: ['f(suffix.rest, total + suffix.first)', 'f(suffix.rest, suffix.first + total)'] },
    'sp23-3f': { accepted: ['f(s.rest, s.first)'], explanation: 'Start with the first prefix sum, `s.first`, and the rest of the list still to add.' },
    'sp23-4a': { accepted: ['exclude(y, x)'] },
    'sp23-4b': { accepted: ['b.label == x', 'x == b.label'] },
    'sp23-4c': { correct: 3 },
    'sp23-4d': { correct: 1, explanation: 'An excluded branch is dropped, and its (already filtered) branches take its place in `bs`.' },
    'sp23-4e': { accepted: ['t.branches = exclude(t, x).branches'], explanation: '`exclude` builds a new tree, so copy its branches into `t` to change `t` itself.' },
    'sp23-5a': { accepted: ['1'], explanation: 'There is exactly one way to fill zero spots: leave them as they are.' },
    'sp23-5b': { accepted: ['2 * count_park(n-1) + count_park(n-2)', 'count_park(n-2) + 2 * count_park(n-1)', 'count_park(n-1) * 2 + count_park(n-2)', 'count_park(n-1) + count_park(n-1) + count_park(n-2)'], explanation: 'The last spot is empty or a motorcycle (two ways, each leaving `n-1` spots) or the last two spots are a car (leaving `n-2`).' },
    'sp23-5cd': { accepted: ["yield s + '.'\nyield s + '%'", "yield s + '%'\nyield s + '.'"], explanation: 'Every arrangement of `n-1` spots can be followed by an empty spot or a motorcycle. The order does not matter because the strings may be yielded in any order.' },
    'sp23-5e': { accepted: ['park(n-2)'] },
    'sp23-5f': { accepted: ["yield s + '<>'"] },
    'sp23-5aplus': { accepted: ['[yes + s for s in f(n, k) if not s or s[0] != no]', '(yes + s for s in f(n, k) if not s or s[0] != no)'] },

    'fa22-1a': { accepted: ['[0, 0]'], explanation: '`legs` is a class attribute. Only `solidsnake` got its own `legs`, so `snek.legs` finds the class value 0.' },
    'fa22-1b': { accepted: ['He ran\nNom nom'], explanation: '`solidsnake.run` is an instance attribute: a plain function (not a bound method) that prints “He ran”. `eat` calls it, then prints “Nom nom”.' },
    'fa22-1c': { accepted: ['atari\nNom nom'], explanation: '`Python.run` prints `eval("snek")`, the global `snek`, and printing it uses `__str__`, its name.' },
    'fa22-1d': { accepted: ["Snakes don't run\npypy crawled", 'Snakes don’t run\npypy crawled'], explanation: 'Calling through the class runs `Snake.run` with `self` bound to `python`, so `self.crawl()` prints the `pypy` name. The returned `None` is not displayed.' },
    'fa22-2a': { correct: 2, explanation: '`last(2)` pops two elements from `us` (6, then 5), leaving `[4]`.' },
    'fa22-2b': { correct: 1 },
    'fa22-2c': { correct: 0, explanation: '`last` appends to and returns the global `result` (its own frame has no `result`), so `f(2)` returns the global list.' },
    'fa22-2d': { correct: 2, explanation: '`result.append(n)` returns `None`, so the frame returns `None`.' },
    'fa22-2e': { accepted: ['[[3], 6, 5, 3]'], explanation: 'The global list starts as `[1]`, gets 6 and 5 from `last`, has its first element replaced by `[3]`, and then 3 appended.' },
    'fa22-3a-a': { correct: [0] },
    'fa22-3a-b': { accepted: ['yield i'] },
    'fa22-3b-a': { accepted: ['[next(dice) for _ in range(num_rolls)]', '[next(dice) for i in range(num_rolls)]', '[next(dice) for x in range(num_rolls)]'] },
    'fa22-3b-b': { accepted: ['1 in rolls'] },
    'fa22-3b-c': { accepted: ['return sum(rolls)'] },
    'fa22-4a-a': { accepted: ['sum([b.label for b in t.branches])', 'sum(b.label for b in t.branches)', 't.branches[0].label + t.branches[1].label'] },
    'fa22-4a-b': { accepted: ['is_hydra(t.branches[0]) and is_hydra(t.branches[1])', 'all([is_hydra(b) for b in t.branches])'] },
    'fa22-4b-a': { correct: [1, 3], explanation: 'Options 2 and 4 change the leaf itself into a two-headed node. Option 1 only rebinds the local name, Option 3 sets the label to a Tree, and Option 5 uses the same Tree object twice.' },
    'fa22-4b-b': { accepted: ['hydra.label += 1', 'hydra.label = hydra.label + 1'], explanation: 'Chopping one head adds one leaf below this node.' },
    'fa22-4b-c': { accepted: ['n > left.label', 'left.label < n'], explanation: 'The left branch holds the first `left.label` heads.' },
    'fa22-4b-d': { accepted: ['n - left.label'] },
    'fa22-5a-a': { correct: 1 },
    'fa22-5a-b': { correct: 2 },
    'fa22-5a-c': { correct: 3, explanation: 'Skip `s[index]`.' },
    'fa22-5a-d': { accepted: ['helper(sum_so_far+s[index], index + 1)', 'helper(s[index] + sum_so_far, index + 1)'], explanation: 'Use `s[index]`.' },
    'fa22-5b-i': { correct: 0, explanation: 'Every element is either used or skipped, so the calls double with each element of `s`.' },
    'fa22-5b-ii': { correct: 2, explanation: 'The inner loop runs at most 100 times, a constant, for each element of `s`.' },
    'fa22-6a-a': { accepted: ['[i[1] for i in self.edges if i[0] == source]', '[e[1] for e in self.edges if e[0] == source]'] },
    'fa22-6b-a': { accepted: ['maxval'] },
    'fa22-6b-b': { accepted: ['for j in range(maxval)'] },
    'fa22-6b-c': { accepted: ['g.add_edge(j, f(j))'], explanation: '`add_edge` ignores edges whose destination is outside the graph, so values of `f(j)` at or above `maxval` are dropped.' },
    'fa22-6b-d': { accepted: ['return g.has_path(x, y)'], explanation: 'The graph contains all allowed transitions j → f(j) after iterating through all `f` and all `j`, so `has_path` says whether a sequence of allowed transitions exists.' },
    'fa22-7a': { accepted: ['lambda: 1'] },
    'fa22-7b': { accepted: ['lambda a, b: a+sum(b)'] },
    'fa22-7c': { accepted: ['lambda: next(b)'] },
    'fa22-7d': { accepted: ['lambda a, b: any([g.add_edge(a,i) for i in b])'] },

    'fa21-1a': { correct: [3], explanation: 'After line 2, `s[2]` is a new one-element list whose element is `s` itself, which is `[s]`. Copies of `s` would point to a different list.' },
    'fa21-1b': { accepted: ['s[2]'] },
    'fa21-1c': { accepted: ['extend'] },
    'fa21-1d': { correct: 1, explanation: 'Extending the inner list by `s[1:]` adds 4 and a pointer to the inner list itself (`s[2]`).' },
    'fa21-1e': { accepted: ['[s[2].pop()]'], explanation: '`s[2].pop()` removes the inner list’s self-pointer and returns the inner list; wrapping it in a new list gives the final picture.' },
    'fa21-2a-a': { accepted: ['n < 0 or not coins', 'not coins'], explanation: 'With no coins left, a nonzero `n` can’t be made. The official solution accepts either form.' },
    'fa21-2a-b': { accepted: ['list(coins)', 'coins[:]'], explanation: 'The official solution notes that at least one of blanks (b) and (e) must copy `coins`, because `change` modifies the list it is given.' },
    'fa21-2a-c': { accepted: ['or'] },
    'fa21-2a-d': { correct: 0 },
    'fa21-2a-e': { accepted: ['list(coins)', 'coins[:]'] },
    'fa21-2b-a': { accepted: ['[0]'], explanation: 'With no coins, only 0 can be made.' },
    'fa21-2b-b': { accepted: ['coins[1:]'] },
    'fa21-2b-c': { correct: 0 },
    'fa21-2b-d': { accepted: ['k in rest if k + coin not in rest'], explanation: 'Add `coin` to each amount the rest can make, skipping sums already in `rest` so the result has no repeats.' },
    'fa21-3a-a': { accepted: ['self.garage.cars[car] = self'] },
    'fa21-3a-b': { accepted: ['self.garage.cars[car].tips'], explanation: 'The garage remembers the valet who most recently parked each car.' },
    'fa21-3a-c': { accepted: ['valet.garage'] },
    'fa21-3a-d': { correct: 7 },
    'fa21-3b-a': { correct: 0 },
    'fa21-3b-b': { accepted: ['yield from s'] },
    'fa21-3c-a': { accepted: ['len(s) == i', 'i == len(s)'], explanation: 'Only take a new value from `t` when this copy has caught up with everything seen so far.' },
    'fa21-3c-b': { accepted: ['next(t)'] },
    'fa21-3c-c': { correct: 3 },
    'fa21-3c-d': { accepted: ['copy(), copy()'] },
    'fa21-4a-a': { accepted: ['y'] },
    'fa21-4a-b': { correct: 1 },
    'fa21-4a-c': { accepted: ['zip(s, map(f, s))', '[(z, f(z)) for z in s]'], explanation: 'Pair each `x` with `f(x)` once, so `f` is never called twice on the same element.' },
    'fa21-4a-d': { accepted: ['g(y)'] },
    'fa21-4b-a': { accepted: ['f(x) - f(y) > f(v) - f(w)'] },
    'fa21-4b-b': { accepted: ['v, w = x, y'] },
    'fa21-4b-iii': { correct: 1, explanation: 'Two nested loops over `s`, each step constant time.' },
    'fa21-4c-a': { accepted: ['max(s, key=f)'] },
    'fa21-4c-b': { accepted: ['min(s, key=f)'], explanation: 'The largest difference pairs the element with the largest `f` value with the one with the smallest.' },
    'fa21-5a-a': { correct: [3, 5, 7], explanation: 'Each of these is true exactly when `t` has branches. `t` and `bool(t)` are always true, and `len(t.branches)` makes a leaf return 0 instead of `False`.' },
    'fa21-5a-b': { accepted: ['all([b.is_leaf() for b in t.branches])', 'all(b.is_leaf() for b in t.branches)'] },
    'fa21-5b-a': { accepted: ['Link(t.label, rest)'] },
    'fa21-5b-b': { accepted: ['add_twigs(b, rest)'], explanation: 'Going through the branches in reverse builds the linked list from the end, so labels come out in `repr` order.' },
    'fa21-5b-c': { accepted: ['Link.empty'] },
  };

  return { TOPICS, EXAMS, PROBLEMS, QUESTIONS, ANSWER_KEY, BUBBLE_NOTE };
})();
