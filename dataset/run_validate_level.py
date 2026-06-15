"""Run validate for a single level and time it."""
import subprocess, sys, os, time

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))

level = int(sys.argv[1]) if len(sys.argv) > 1 else 4

print(f"Validating level {level}...")
t0 = time.time()
result = subprocess.run(
    [sys.executable, os.path.join(DATASET_DIR, "validate_exercises.py"), "--level", str(level)],
    capture_output=True,
    text=True,
    encoding="utf-8",
    timeout=120,
    cwd=os.path.dirname(DATASET_DIR),
)
elapsed = time.time() - t0
output = result.stdout
print(f"Exit: {result.returncode}, Time: {elapsed:.1f}s")
print(output[-2000:] if len(output) > 2000 else output)
if result.stderr.strip():
    print("STDERR:", result.stderr[-500:])
