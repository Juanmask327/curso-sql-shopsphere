"""Run validate_exercises.py as a subprocess and write output to a file."""
import subprocess, sys, os

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(DATASET_DIR, "validate_result.txt")

print(f"Running validate_exercises.py... output -> {LOG}")
sys.stdout.flush()

result = subprocess.run(
    [sys.executable, os.path.join(DATASET_DIR, "validate_exercises.py")],
    capture_output=True,
    text=True,
    encoding="utf-8",
    timeout=600,
    cwd=os.path.dirname(DATASET_DIR),
)

# Combine stdout and stderr
output = result.stdout + ("\n--- STDERR ---\n" + result.stderr if result.stderr.strip() else "")
with open(LOG, "w", encoding="utf-8") as f:
    f.write(output)

print(f"Done. Exit code: {result.returncode}")
print(f"Output size: {len(output)} chars, {output.count(chr(10))} lines")
print("Last 30 lines:")
lines = output.strip().split("\n")
for line in lines[-30:]:
    print(line)
