// Question bank for the CS 61A practice prototype.
//
// Content source: CS 61A Fall 2025 Midterm 2 and Spring 2025 Midterm 2 (exam + official solutions),
// transcribed for a personal/prototype build. Verify course-material permissions before publishing.
//
// Shape:
//   TOPICS    – configurable category list (order = display order on the home page)
//   PROBLEMS  – shared context shown in the LEFT pane (intro text, code with blanks ⟦x⟧, notes)
//   QUESTIONS – one navigable item each, shown in the RIGHT pane
//   ANSWER_KEY – kept separate from QUESTIONS so display code never touches answers by accident
//
// Inline text markup (rendered safely by app.js): `code`, **bold**, *italic*.
// Code blanks: ⟦a⟧ renders as an exam-style blank labeled (a).

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
    { id: 'scheme', name: 'Scheme', blurb: 'Coming soon' },
  ];

  // complete: every question of the original PDF is transcribed (checked: both total 50 points).
  // Set it to false for a partial transcription; Exam Mode then labels the full exam as incomplete.
  const EXAMS = {
    fa25: { id: 'fa25', label: 'Fall 2025 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
    sp25: { id: 'sp25', label: 'Spring 2025 Midterm 2', url: 'https://cs61a.org/resources/', complete: true },
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
      exam: 'sp25', number: '2', title: 'This or That', points: 7,
      intro: 'Answer the questions about the code below. Draw an environment diagram, but the diagram itself will not be scored.',
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
  };

  return { TOPICS, EXAMS, PROBLEMS, QUESTIONS, ANSWER_KEY, BUBBLE_NOTE };
})();
