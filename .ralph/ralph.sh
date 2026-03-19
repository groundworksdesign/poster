#!/bin/bash
# Ralph loop to create specs, tasks, and code
# Usage: ./.ralph/ralph.sh

# Ensure we're in the project root
cd "$(dirname "$0")/.."

while :; do
  cat ".cursor/plans/poster-remix-tests_d601662c.plan.md" ".ralph/PROMPT.md" ".ralph/fix_plan_poster.md" | copilot --yolo --no-ask-user --model gpt-5-mini --reasoning-effort high
done
