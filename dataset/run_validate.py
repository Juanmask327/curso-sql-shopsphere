"""Wrapper to run validate_exercises.py and write output to a file."""
import sys, os

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(DATASET_DIR, "validate_result.txt")

orig_stdout = sys.stdout
orig_stderr = sys.stderr

with open(LOG, "w", encoding="utf-8", buffering=1) as f:
    sys.stdout = f
    sys.stderr = f
    try:
        exec(compile(
            open(os.path.join(DATASET_DIR, "validate_exercises.py"), encoding="utf-8").read(),
            "validate_exercises.py", "exec"
        ))
    except SystemExit as e:
        print(f"\n[exit code {e.code}]")
    except Exception as ex:
        print(f"\n[EXCEPTION] {ex}")
    finally:
        f.flush()

sys.stdout = orig_stdout
sys.stderr = orig_stderr
print(f"Wrote results to {LOG}")
print(open(LOG, encoding="utf-8").read()[-3000:])  # show last 3000 chars
