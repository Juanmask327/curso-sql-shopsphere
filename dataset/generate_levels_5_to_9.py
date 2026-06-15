"""Run generate_expected for levels 5-9 only, with verbose output to file."""
import sys, os

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(DATASET_DIR)

# Redirect stdout/stderr to file
log_path = os.path.join(DATASET_DIR, "gen_5to9_log.txt")
log = open(log_path, "w", encoding="utf-8", buffering=1)
sys.stdout = log
sys.stderr = log

print("=== generate levels 5-9 ===")
sys.stdout.flush()

try:
    exec(compile(
        open(os.path.join(DATASET_DIR, "generate_expected.py"), encoding="utf-8").read(),
        "generate_expected.py", "exec"
    ))
except SystemExit as e:
    print(f"\nSystemExit: {e.code}")
except Exception as e:
    print(f"\nException: {e}")
finally:
    log.flush()
    log.close()
