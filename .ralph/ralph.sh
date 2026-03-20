#!/usr/bin/env bash
# Ralph loop to create specs, tasks, and code
# Usage: ./.ralph/ralph.sh
#
# Exits when:
#   - The fix plan has no unchecked "- [ ]" tasks in the marked open-task section
#     (see openTasksStartMarker / openTasksEndMarker in config), after applying
#     ignoreBlockedUncheckedTasks, OR
#   - maxIterations copilot runs have completed (whichever comes first).
#
# If markers are missing from the fix plan, the whole file is scanned (legacy behavior).

set -euo pipefail

# Ensure we're in the project root
cd "$(dirname "$0")/.."

load_config() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "ralph.sh: python3 not found; using defaults." >&2
    export MAX_IT=20
    export FIX_PLAN=".ralph/fix_plan_poster.md"
    export PLAN_FILE=".cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md"
    export TASK_START="<!-- ralph-open-tasks-start -->"
    export TASK_END="<!-- ralph-open-tasks-end -->"
    export IGNORE_BLOCKED=1
    return
  fi
  eval "$(
    python3 <<'PY'
import json
import shlex
from pathlib import Path
p = Path(".ralph/config.json")
defaults = {
    "maxIterations": 20,
    "fixPlanFile": ".ralph/fix_plan_poster.md",
    "planFile": ".cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md",
    "ignoreBlockedUncheckedTasks": True,
    "openTasksStartMarker": "<!-- ralph-open-tasks-start -->",
    "openTasksEndMarker": "<!-- ralph-open-tasks-end -->",
}
if not p.exists():
    c = defaults
else:
    c = {**defaults, **json.loads(p.read_text())}
max_it = int(c.get("maxIterations", 20))
fix = c.get("fixPlanFile", ".ralph/fix_plan_poster.md")
plan = c.get("planFile", ".cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md")
ign = 1 if c.get("ignoreBlockedUncheckedTasks", True) else 0
ts = c.get("openTasksStartMarker") or ""
te = c.get("openTasksEndMarker") or ""
print(f"export MAX_IT={max_it}")
print("export FIX_PLAN=" + shlex.quote(fix))
print("export PLAN_FILE=" + shlex.quote(plan))
print("export TASK_START=" + shlex.quote(ts))
print("export TASK_END=" + shlex.quote(te))
print(f"export IGNORE_BLOCKED={ign}")
PY
  )"
}

# Lines to scan for open markdown tasks (- [ ]). If TASK_START/TASK_END are set and
# both appear in the file, only lines between markers (exclusive) are scanned.
get_task_scan_stream() {
  local file="$1"
  if [[ -n "${TASK_START:-}" && -n "${TASK_END:-}" ]] && grep -qF -- "$TASK_START" "$file" && grep -qF -- "$TASK_END" "$file"; then
    awk -v s="$TASK_START" -v e="$TASK_END" '
      index($0, s) { f = 1; next }
      index($0, e) { f = 0; next }
      f
    ' "$file"
  else
    cat "$file"
  fi
}

count_open_tasks() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "999"
    return
  fi
  local lines
  if [[ "${IGNORE_BLOCKED}" -eq 1 ]]; then
    lines=$(get_task_scan_stream "$file" | grep -E '^[[:space:]]*-[[:space:]]+\[[[:space:]]\][[:space:]]' | grep -iv 'blocked' || true)
  else
    lines=$(get_task_scan_stream "$file" | grep -E '^[[:space:]]*-[[:space:]]+\[[[:space:]]\][[:space:]]' || true)
  fi
  if [[ -z "${lines}" ]]; then
    echo "0"
  else
    printf '%s\n' "${lines}" | wc -l | tr -d '[:space:]'
  fi
}

append_exit_progress() {
  local msg="$1"
  local progress=".ralph/logs/progress.txt"
  if [[ -f "$progress" ]]; then
    printf '\n%s: Ralph loop: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$msg" >>"$progress"
  fi
}

load_config

if (( MAX_IT < 1 )); then
  echo "ralph.sh: maxIterations must be >= 1 in .ralph/config.json (got ${MAX_IT}). A value of 0 runs zero Copilot iterations." >&2
  exit 1
fi

if [[ ! -f "$FIX_PLAN" ]]; then
  echo "ralph.sh: fix plan not found: $FIX_PLAN" >&2
  exit 1
fi

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "ralph.sh: plan file not found: $PLAN_FILE (set planFile in .ralph/config.json)" >&2
  exit 1
fi

open_tasks="$(count_open_tasks "$FIX_PLAN")"
if [[ "${open_tasks}" == "0" ]]; then
  msg="exiting — no open tasks in marked section of ${FIX_PLAN} (blocked lines ignored: ${IGNORE_BLOCKED})."
  echo "ralph.sh: $msg" >&2
  append_exit_progress "$msg"
  exit 0
fi

iteration=0
while (( iteration < MAX_IT )); do
  open_tasks="$(count_open_tasks "$FIX_PLAN")"
  if [[ "${open_tasks}" == "0" ]]; then
    msg="exiting — all actionable open tasks in ${FIX_PLAN} are complete."
    echo "ralph.sh: $msg" >&2
    append_exit_progress "$msg"
    exit 0
  fi

  cat "$PLAN_FILE" ".ralph/PROMPT.md" "$FIX_PLAN" | copilot --yolo --no-ask-user --model gpt-5-mini --reasoning-effort high

  iteration=$((iteration + 1))

  open_tasks="$(count_open_tasks "$FIX_PLAN")"
  if [[ "${open_tasks}" == "0" ]]; then
    msg="exiting — all actionable open tasks complete after iteration ${iteration}."
    echo "ralph.sh: $msg" >&2
    append_exit_progress "$msg"
    exit 0
  fi
done

msg="stopped — reached maxIterations=${MAX_IT} with ${open_tasks} open task(s) still listed in ${FIX_PLAN} (marked section)."
echo "ralph.sh: $msg" >&2
append_exit_progress "$msg"
exit 0
