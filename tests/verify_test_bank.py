# Runs the test-bank variants built by verify_test_bank.js with the browser runner's own harness
# (run_student / run_case from app/runner.js), with the same 5-second limit per run and per case.
import json, os, signal, sys

dir = sys.argv[1]
exec(open(os.path.join(dir, 'harness.py')).read())

class _Timeout(BaseException):
    pass

def _alarm(signum, frame):
    raise _Timeout('timed out')

signal.signal(signal.SIGALRM, _alarm)

def limited(fn, *args):
    signal.setitimer(signal.ITIMER_REAL, 5)
    try:
        return fn(*args)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)

out = []
for job in json.load(open(os.path.join(dir, 'jobs.json'))):
    # Like the browser: the code runs once on its own first; if that fails, the cases do not run.
    stdout, error, truncated = limited(run_student, job['code'], 20000)
    if error:
        out.append({'passed': False, 'summary': 'code raised before tests: ' + error.strip().splitlines()[-1]})
        continue
    statuses = []
    for case in job['cases']:
        r = json.loads(limited(run_case, job['code'], job['setup'], case, 5000))
        statuses.append(r['status'])
    out.append({'passed': all(s == 'passed' for s in statuses), 'summary': ', '.join(statuses)})
print(json.dumps(out))
