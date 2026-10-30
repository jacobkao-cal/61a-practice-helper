// Study guides for Learning Insights (Exam Mode results).
//
// Keyed by TOPICS ids in questions.js. Each topic has 2–4 foundational concepts:
//   title    – short concept name
//   body     – explanation (same inline markup as questions: `code`, **bold**, *italic*; blank line = new paragraph)
//   code     – optional example in doctest form (>>> / ...). Every example is self-contained and was run
//              with Python's doctest using the course's Link and Tree classes, so the shown output is real.
//   pitfall  – a common mistake or exam tip
//
// Written for this site; not official CS 61A material. A topic without an entry here shows a
// "no study guide yet" note instead of generated filler.

window.CS61A_GUIDES = {
  fundamentals: [
    {
      title: 'Evaluating call expressions',
      body: 'To evaluate a call, Python evaluates the operator, then each operand from left to right, and only then runs the function body. `print` displays its arguments as a side effect and **returns `None`**.',
      code: `>>> print(print(1), print(2))
1
2
None None`,
      pitfall: 'Displaying is not returning. A function with no `return` statement returns `None`, and the interactive prompt shows nothing for a `None` value.',
    },
    {
      title: 'Truthiness and short-circuiting',
      body: '`and` and `or` return one of their operands, not necessarily `True` or `False`. `and` returns the first false value (or the last value); `or` returns the first true value (or the last value). Evaluation stops as soon as the result is known.\n\nFalse values include `0`, `None`, `False`, `\'\'` and empty containers.',
      code: `>>> 0 or 'hi'
'hi'
>>> 3 and 0
0
>>> 1 and 2 and 3
3`,
      pitfall: 'In "What Would Python Display?" questions, `x or y` can display a number or string. Short-circuiting also means the right side may never be evaluated, so its errors or prints never happen.',
    },
    {
      title: 'Dictionaries',
      body: 'A dictionary maps unique keys to values. `d[k]` raises a `KeyError` for a missing key, while `d.get(k, default)` returns the default. Assigning `d[k] = v` adds or replaces one entry. Iterating over a dictionary gives its keys in insertion order.',
      code: `>>> d = {'a': 1, 'b': 2}
>>> d['c'] = d['a'] + d['b']
>>> list(d)
['a', 'b', 'c']
>>> d.get('z', 0)
0`,
      pitfall: 'Keys must be immutable values such as numbers, strings or tuples. A list cannot be a key.',
    },
  ],

  hof: [
    {
      title: 'Functions are values',
      body: 'A function can be passed as an argument, returned from another function, and stored in a name. Writing `f` refers to the function; writing `f()` calls it. A function defined inside another function can use the enclosing function\'s names (a closure).',
      code: `>>> def make_adder(n):
...     return lambda x: x + n
>>> add3 = make_adder(3)
>>> add3(4)
7
>>> make_adder(1)(2)
3`,
      pitfall: 'Check whether a blank needs a function or a call. `make_adder(1)` is a function; `make_adder(1)(2)` is a number.',
    },
    {
      title: 'Lambda expressions and late binding',
      body: 'A lambda is a function whose body is a single expression. Like any function, its body runs when it is **called**, not when it is defined, so a name in the body is looked up at call time.',
      code: `>>> fs = [lambda: i for i in range(3)]
>>> [f() for f in fs]
[2, 2, 2]`,
      pitfall: 'All three lambdas look up the same `i` when they are called, after the loop has finished, so they all see its final value.',
    },
    {
      title: 'key functions',
      body: '`max`, `min` and `sorted` accept a `key` function that takes **one** element and returns the value to compare. The result is still an element of the input, not the key value.',
      code: `>>> max(['apple', 'fig', 'banana'], key=len)
'banana'
>>> min([3, -5, 2], key=abs)
2
>>> sorted([3, -5, 2], key=abs)
[2, 3, -5]`,
      pitfall: 'A two-argument function such as `lambda x, y: ...` cannot be used as a `key`; it must take exactly one argument.',
    },
  ],

  env: [
    {
      title: 'Frames and name lookup',
      body: 'Each call creates a new local frame. Its parent is the frame where the function was **defined**, not the frame that called it. To look up a name, Python checks the current frame, then its parent, and so on up to the global frame.',
      code: `>>> x = 1
>>> def f():
...     return x
>>> def g():
...     x = 2
...     return f()
>>> g()
1`,
      pitfall: '`f` was defined in the global frame, so its parent is global and it sees the global `x`, even though `g` called it.',
    },
    {
      title: 'Assignment versus mutation',
      body: 'Assignment (`t = ...`) binds a name in the current frame and affects nothing else. Mutation (`t.append(...)`, `t[0] = ...`) changes the object itself, so every name bound to that object sees the change.',
      code: `>>> s = [1, 2]
>>> def h(t):
...     t.append(3)
...     t = [0]
>>> h(s)
>>> s
[1, 2, 3]`,
      pitfall: 'Inside `h`, `t = [0]` only rebinds the local `t`. The earlier `append` already changed the list that `s` refers to.',
    },
    {
      title: 'Drawing a diagram step by step',
      body: 'A `def` statement creates a function value labeled with its parent frame and binds its name. A call: (1) evaluate the operator and operands, (2) create a new frame whose parent is the function\'s parent, (3) bind the parameters to the arguments, (4) run the body, (5) record the return value.\n\nLists and other objects are drawn once, with arrows from every name that refers to them.',
      pitfall: 'Draw a new box only when a new list is created (a list literal, slicing, `list(...)`, `+`). `t = s` adds an arrow to the existing box.',
    },
  ],

  recursion: [
    {
      title: 'Base cases',
      body: 'A recursive function must handle the simplest inputs directly, without a recursive call. Every recursive call should move the input closer to a base case.',
      code: `>>> def fact(n):
...     if n == 0:
...         return 1
...     return n * fact(n - 1)
>>> fact(5)
120`,
      pitfall: 'Check the smallest inputs (0, an empty list, a leaf) by hand. A missing or unreachable base case means infinite recursion.',
    },
    {
      title: 'Trust the recursive call, and return its result',
      body: 'Assume the recursive call correctly solves the smaller problem (the "leap of faith"), then ask how to use its result to solve the current one. The result has to be **returned**; calling the function without using its value does nothing useful.',
      code: `>>> def total(s):
...     if not s:
...         return 0
...     return s[0] + total(s[1:])
>>> total([1, 2, 3])
6`,
      pitfall: 'Writing `total(s[1:])` without `return` (or without adding `s[0]`) makes the function return `None`.',
    },
    {
      title: 'Tree recursion',
      body: 'Some problems split into several smaller problems, so the function makes more than one recursive call and combines the results. Counting problems usually split into "use this option" and "don\'t use it".',
      code: `>>> def count_partitions(n, m):
...     if n == 0:
...         return 1
...     if n < 0 or m == 0:
...         return 0
...     return count_partitions(n - m, m) + count_partitions(n, m - 1)
>>> count_partitions(6, 4)
9`,
      pitfall: 'Order the base cases carefully: here `n == 0` (one way found) must be checked before `n < 0 or m == 0` (no ways).',
    },
  ],

  lists: [
    {
      title: 'List comprehensions build new lists',
      body: '`[expr for x in s if cond]` evaluates `expr` for each `x` in `s` that satisfies `cond`, collecting the results in a **new** list. The original list is not changed.',
      code: `>>> s = [1, 2, 3, 4]
>>> [x * x for x in s if x % 2 == 0]
[4, 16]
>>> s
[1, 2, 3, 4]`,
      pitfall: 'The `if` filters elements; it does not choose between two values. For that, use a conditional expression in `expr`: `[a if c else b for x in s]`.',
    },
    {
      title: 'Aliasing and shallow copies',
      body: 'Assignment never copies a list: `b = a` makes both names refer to the same list. Slicing (`a[:]`) and `list(a)` create a new outer list, but its elements are the same objects (a shallow copy).',
      code: `>>> a = [1, [2]]
>>> b = a
>>> c = a[:]
>>> a.append(3)
>>> a[1].append(4)
>>> b
[1, [2, 4], 3]
>>> c
[1, [2, 4]]`,
      pitfall: '`c` did not get the `3` (it is a different outer list) but did see the `4`, because `c[1]` and `a[1]` are the same inner list.',
    },
    {
      title: 'append, extend and +',
      body: '`append` adds one element (even if that element is a list). `extend` adds each element of an iterable. Both mutate the list and return `None`. `+` creates a new list and leaves both operands unchanged.',
      code: `>>> t = [1]
>>> t.append([2, 3])
>>> t.extend([4, 5])
>>> t
[1, [2, 3], 4, 5]
>>> u = t + [6]
>>> u is t
False`,
      pitfall: '`t = t.append(x)` sets `t` to `None`, because `append` returns `None`.',
    },
  ],

  links: [
    {
      title: 'Link.first, Link.rest and Link.empty',
      body: 'A linked list is either `Link.empty` or a `Link` whose `first` is an element and whose `rest` is another linked list. Walk it by following `rest` until you reach `Link.empty`.',
      code: `>>> s = Link(1, Link(2, Link(3)))
>>> s.rest.first
2
>>> s.rest.rest.rest is Link.empty
True`,
      pitfall: 'Compare with `s is Link.empty`. `rest` must be a `Link` or `Link.empty`; `Link(1, 2)` is an error.',
    },
    {
      title: 'Recursion on linked lists',
      body: 'Most linked-list functions follow one shape: the base case handles `Link.empty`, and the recursive case does something with `s.first` and recurses on `s.rest`. To build a new list, return `Link(new_first, f(s.rest))`.',
      code: `>>> def double(s):
...     if s is Link.empty:
...         return Link.empty
...     return Link(s.first * 2, double(s.rest))
>>> double(Link(1, Link(2)))
Link(2, Link(4))`,
      pitfall: 'Returning a new `Link` leaves the input unchanged; assigning to `s.first` or `s.rest` mutates it. Read the question to see which one is wanted.',
    },
    {
      title: 'Mutation versus reassignment',
      body: 'Assigning to an attribute (`s.rest = ...`, `s.first = ...`) changes the linked list itself, so every name referring to it sees the change. Reassigning a name (`s = s.rest`) only moves that one name and changes no list.',
      code: `>>> s = Link(1, Link(2, Link(3)))
>>> t = s
>>> s.rest = s.rest.rest
>>> t
Link(1, Link(3))
>>> s = s.rest
>>> t
Link(1, Link(3))`,
      pitfall: 'When removing elements in a loop, change `.rest` of the node *before* the one you remove; moving a local name never removes anything.',
    },
  ],

  trees: [
    {
      title: 'label, branches and is_leaf',
      body: 'A `Tree` has a `label` and a list of `branches`, each of which is itself a `Tree`. A leaf is a tree with no branches.',
      code: `>>> t = Tree(1, [Tree(2, [Tree(4)]), Tree(3)])
>>> t.label
1
>>> [b.label for b in t.branches]
[2, 3]
>>> t.branches[1].is_leaf()
True`,
      pitfall: '`t.branches` is a list of trees, not of labels. Use `b.label` to get a branch\'s label.',
    },
    {
      title: 'Recursing over branches',
      body: 'Tree functions usually handle a leaf (or the current node) directly, then make one recursive call per branch and combine the results with `sum`, `max`, a list comprehension, or a loop.',
      code: `>>> def height(t):
...     if t.is_leaf():
...         return 0
...     return 1 + max([height(b) for b in t.branches])
>>> height(Tree(1, [Tree(2, [Tree(4)]), Tree(3)]))
2`,
      pitfall: 'Calling `max` on an empty list raises an error, which is why the leaf case comes first. Depth counts down from the root; height counts up from the leaves.',
    },
    {
      title: 'Mutating a tree in place',
      body: 'Assigning to `t.label` or changing `t.branches` mutates the tree. A mutating function usually returns `None` and recurses into every branch.',
      code: `>>> def double_labels(t):
...     t.label = t.label * 2
...     for b in t.branches:
...         double_labels(b)
>>> t = Tree(1, [Tree(2, [Tree(4)]), Tree(3)])
>>> double_labels(t)
>>> t
Tree(2, [Tree(4, [Tree(8)]), Tree(6)])`,
      pitfall: 'Rebinding the loop variable (`b = Tree(...)`) does not change `t.branches`. To replace branches, assign to `t.branches` or to `t.branches[i]`.',
    },
  ],

  iterators: [
    {
      title: 'iter, next and exhaustion',
      body: '`iter(iterable)` returns an iterator. Each `next(it)` returns the next element and advances it. An iterator only goes forward: once it is used up, it stays empty, and `next` raises `StopIteration`.',
      code: `>>> it = iter([1, 2, 3])
>>> next(it)
1
>>> list(it)
[2, 3]
>>> list(it)
[]`,
      pitfall: '`list(it)` and a `for` loop also use up the iterator. A second pass over the same iterator gives nothing.',
    },
    {
      title: 'map, filter and zip are lazy',
      body: '`map`, `filter` and `zip` return iterators. They compute each element only when it is requested, and they can be used up just like any other iterator.',
      code: `>>> m = map(lambda x: x * 10, [1, 2, 3])
>>> next(m)
10
>>> list(m)
[20, 30]`,
      pitfall: 'Printing a `map` object shows something like `<map object at ...>`, not its elements, and a function passed to `map` only runs when elements are requested.',
    },
    {
      title: 'Iterables versus iterators',
      body: 'A list is an iterable: each `iter(...)` call on it gives a fresh iterator starting at the beginning. Calling `iter` on an iterator returns the same iterator.',
      code: `>>> s = [1, 2]
>>> iter(s) is iter(s)
False
>>> it = iter(s)
>>> iter(it) is it
True`,
      pitfall: 'Two `for` loops over a list each start from the beginning; two loops over the same iterator do not.',
    },
  ],

  generators: [
    {
      title: 'Generator functions run lazily',
      body: 'A function containing `yield` returns a generator when called; none of its body runs yet. Each `next` runs the body until the next `yield`, which produces a value and pauses the function.',
      code: `>>> def countdown(n):
...     print('start')
...     while n > 0:
...         yield n
...         n -= 1
>>> g = countdown(2)
>>> next(g)
start
2
>>> list(g)
[1]`,
      pitfall: '`countdown(2)` alone prints nothing. `start` only appears on the first `next`.',
    },
    {
      title: 'yield from',
      body: '`yield from it` yields every value of the iterable `it` in order. It is the usual way to write recursive generators: yield from the recursive call.',
      code: `>>> def flatten(s):
...     for x in s:
...         if type(x) == list:
...             yield from flatten(x)
...         else:
...             yield x
>>> list(flatten([1, [2, [3]], 4]))
[1, 2, 3, 4]`,
      pitfall: '`yield flatten(x)` would yield a generator object as a single value instead of its elements.',
    },
    {
      title: 'Generators are iterators',
      body: 'A generator is a one-pass iterator. When its body finishes (or reaches `return`), it is exhausted and stays that way.',
      code: `>>> def evens(n):
...     for i in range(0, n, 2):
...         yield i
>>> g = evens(5)
>>> list(g)
[0, 2, 4]
>>> list(g)
[]`,
      pitfall: 'Call the generator function again (`evens(5)`) to start over; reusing the same generator object gives nothing.',
    },
  ],

  oop: [
    {
      title: 'Class attributes and instance attributes',
      body: 'Looking up `obj.name` checks the instance first, then its class (and then base classes). Assigning `obj.name = ...` always creates or changes an **instance** attribute and never changes the class.',
      code: `>>> class Account:
...     interest = 0.02
...     def __init__(self, holder):
...         self.holder = holder
>>> a = Account('Ana')
>>> b = Account('Ben')
>>> a.interest = 0.05
>>> b.interest, Account.interest
(0.02, 0.02)`,
      pitfall: 'To change the value every instance sees, assign to the class: `Account.interest = 0.04`. Instances with their own `interest` keep it.',
    },
    {
      title: 'Methods and self',
      body: 'Calling `obj.method(args)` passes `obj` as the first argument, `self`. Inside a method, attributes and other methods must be reached through `self`; a bare name is looked up as a local or global name.',
      code: `>>> class Dog:
...     def speak(self, word):
...         return word * 2
>>> d = Dog()
>>> d.speak('woof') == Dog.speak(d, 'woof')
True`,
      pitfall: 'Inside a method, `price` and `self.price` are different names. Use `self.` for attributes, and a plain name only for parameters and locals.',
    },
    {
      title: 'Inheritance and dynamic dispatch',
      body: 'A subclass inherits its base class\'s attributes and methods and can override them. When a method calls `self.other()`, Python looks up `other` on the actual object\'s class, so the subclass version runs even from code written in the base class.',
      code: `>>> class Animal:
...     def sound(self):
...         return '...'
...     def speak(self):
...         return self.sound() + '!'
>>> class Cat(Animal):
...     def sound(self):
...         return 'meow'
>>> Cat().speak()
'meow!'`,
      pitfall: 'Writing `Animal.sound(self)` would skip the override. Use `super().method(...)` only when you specifically want the base class version.',
    },
  ],

  efficiency: [
    {
      title: 'Counting steps as the input grows',
      body: 'Order of growth describes how the number of steps grows with the input size `n`, ignoring constant factors and smaller terms. One loop over `n` items doing constant work is linear; a loop inside a loop over the same items is quadratic.',
      pitfall: 'Hidden loops count. `x in s`, slicing `s[1:]`, `sum(s)` and `list(s)` each take time proportional to `len(s)`.',
    },
    {
      title: 'Logarithmic growth',
      body: 'If each step halves the remaining problem, or doubles a counter until it reaches `n`, the number of steps is about log₂(n).',
      code: `>>> def halvings(n):
...     count = 0
...     while n > 1:
...         n = n // 2
...         count += 1
...     return count
>>> halvings(1024)
10
>>> halvings(2048)
11`,
      pitfall: 'Doubling `n` adds just one more step. That is the signature of logarithmic growth.',
    },
    {
      title: 'Exponential tree recursion',
      body: 'A function that makes two recursive calls on an input only slightly smaller (like `n - 1` and `n - 2`) does an amount of work that grows exponentially, because the same subproblems are solved again and again.',
      code: `>>> calls = 0
>>> def fib(n):
...     global calls
...     calls += 1
...     if n < 2:
...         return n
...     return fib(n - 1) + fib(n - 2)
>>> fib(20)
6765
>>> calls
21891`,
      pitfall: 'Count recursive calls, not lines of code. Recursion that shrinks `n` by one with a single call is linear; two such calls is exponential.',
    },
  ],
};
