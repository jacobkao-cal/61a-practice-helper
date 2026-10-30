# Doctest runner for the study-guide examples (called by study_guides_doctest.js).
import doctest, glob, sys

class Link:
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

class Tree:
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

bad = 0
files = sorted(glob.glob(sys.argv[1] + '/*.txt'))
for f in files:
    r = doctest.testfile(f, module_relative=False, globs={'Link': Link, 'Tree': Tree}, verbose=False)
    print(('OK  ' if not r.failed else 'FAIL'), f.split('/')[-1], f'{r.attempted} checks')
    bad += r.failed
print('ALL EXAMPLES CORRECT' if not bad else f'{bad} FAILED')
sys.exit(1 if bad else 0)
