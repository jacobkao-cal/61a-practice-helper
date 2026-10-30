// Plausible wrong answers used to validate the verified test suites (app/data/test_suites.js).
// Each variant replaces some blanks of the official solution; the suite must FAIL for every one.
// Wrong multiple-choice options and multi-select subsets are generated automatically by the verifier, and every
// accepted alternative answer must PASS, so neither is listed here.
// `alternatives` are other correct answers (not in the answer key) that the suite must also accept.
module.exports = {
  'fa25-3': {
    wrong: [
      { b: 'includes(whole.branches[w], part.branches[p])' },
      { b: 'part.branches[p] == whole.branches[w]' },
      { b: 'part.branches[p].label == whole.branches[w].label' },
      { c: 'p == len(whole.branches)' },
      { c: 'w == len(whole.branches)' },
      { c: 'True' },
      { c: 'p > 0' },
    ],
  },
  'fa25-4': {
    wrong: [
      { a: 's' },
      { a: '[y for y in s if y is not x]' },
      { a: 'list(set(s) - {x})' },
      { a: '[y for y in s if y != x][1:]' },
      { a: 's.remove(x) or s' },
      { b: 's.rest is Link.empty' },
      { c: 'None' },
      { d: 's.first != x' },
      { e: 's.rest' },
      { f: 's' },
      { f: 'Link(s.first, s.rest)' },
      { f: 'exclude_link(s.rest, x)' },
      { b: 's is None', c: 's' },
    ],
    alternatives: [
      { a: 'list(filter(lambda e: e != x, s))' },
      { a: '[s[i] for i in range(len(s)) if s[i] != x]' },
      { d: 'not s.first != x' },
    ],
  },
  'fa25-5': {
    wrong: [
      { c: 'self.cook(self.pizzas)' },
      { c: 'Parlor.cook(self, quantity)' },
      { c: 'quantity - self.pizzas' },
      { d: 'rest * self.price' },
      { d: 'self.alt.price' },
      { e: 'self.alt.order(rest)' },
      { e: 'self.alt.order(quantity, self)' },
      { e: 'self.alt.cook(rest)' },
      { f: 'q' },
      { f: 'None' },
    ],
  },
  'fa25-6a': { wrong: [] },
  'fa25-6b': {
    wrong: [
      { d: 'True' },
      { d: 'disallow.get(slice) == pizza[0]' },
      { d: 'pizza[0] != pizza[-1]' },
      { d: 'disallow.get(previous) != slice' },
      { d: 'disallow.get(pizza[0]) != pizza[1]' },
      { d: 'slice != pizza[0]' },
    ],
  },
  'fa25-6c': {
    wrong: [
      { e: 'n == num_slices - 1' },
      { e: 'n > num_slices' },
      { e: 'num_slices == 1' },
      { h: 'f(n+1, x, x)' },
      { h: 'f(n+1, first, previous)' },
      { h: 'f(n, first, x)' },
    ],
  },
  'fa25-6d': {
    wrong: [
      { i: '[]' },
      { i: '""' },
      { j: "['_' + x for x in pizzas(n-1)]" },
      { j: "['_' for x in recurse]" },
      { j: "[x + '_' for x in recurse]" },
      { l: 'x[0] == z' },
      { l: 'x[-1] != z' },
      { m: 'filter(ok, ways)' },
      { m: 'list(ways)' },
      { m: 'list(map(ok, ways))' },
    ],
    alternatives: [
      { j: "list(map(lambda x: '_' + x, recurse))" },
    ],
  },
  'fa25-6aplus': {
    wrong: [
      { 'A+': 'filter(lambda p: len(p) == n, g(slices)), range(count_pizzas(n))' },
      { 'A+': 'filter(lambda p: acceptable(p), g(slices)), range(count_pizzas(n))' },
      { 'A+': 'filter(lambda p: len(p) == n and acceptable(p), g(slices)), range(n)' },
      { 'A+': 'g(slices), range(count_pizzas(n))' },
    ],
    alternatives: [
      { 'A+': '(p for p in g(slices) if len(p) == n and acceptable(p)), range(count_pizzas(n))' },
    ],
  },
  'sp25-3a': {
    wrong: [
      { b: 'Event(start, length)' },
      { b: 'Event(self.start, self.start + length)' },
      { b: 'Event(start, self.end)' },
      { b: 'Event(start + length, start)' },
    ],
  },
  'sp25-4a': {
    wrong: [
      { a: 'y+1 for y in below' },
      { a: 'y for y in below if y is not None' },
      { a: 'y+1 for y in below if y' },
      { a: '1 for y in below if y is not None' },
      { c: 'append(1)' },
      { c: 'extend(0)' },
      { c: 'insert(0)' },
    ],
  },
  'sp25-4b': {
    wrong: [
      { d: 'result[depth]' },
      { d: 'result[node]' },
      { g: 'visit(b, depth)' },
      { g: 'visit(node, depth + 1)' },
    ],
  },
  'sp25-5a': {
    wrong: [
      { b: 's.first * muladd(s.rest)' },
      { b: 's.first * s.rest.first + muladd(s.rest)' },
      { b: 's.first * (s.rest.first + muladd(s.rest.rest))' },
      { b: 's.first + s.rest.first * muladd(s.rest.rest)' },
      { b: 's.first * s.rest.first' },
    ],
  },
  'sp25-5b': {
    wrong: [
      { e: 'f(left, n - 1)' },
      { e: 'f(k - 1, n - 1)' },
      { e: 'f(left - 1, n)' },
    ],
  },
  'sp25-5c': {
    wrong: [
      { f: 'close(s[i:], x)' },
      { f: 'close(s[i+1:], x - product(s[:i]))' },
      { f: 'close(s[i:], x + product(s[:i]))' },
      { f: 'product(s[i:])' },
      { f: 'close(s[:i], x - product(s[i:]))' },
    ],
  },
  'sp25-5d': {
    wrong: [
      { 'A+': "'+' + close_exp(s[i+1:], x)" },
      { 'A+': "'+' + close_exp(s[i:], x - eval(term))" },
      { 'A+': "'*' + close_exp(s[i+1:], x - eval(term))" },
      { 'A+': "'+' + str(close(s[i+1:], x - eval(term)))" },
    ],
  },
};
