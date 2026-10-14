#!/usr/bin/env bash
# Guard: fail if Spec Kit implement/converge skills lost the Ralph handoff override
# (e.g. after `specify preset remove ralph-handoff`). Not wired into CI.
set -e
rc=0
for s in implement converge; do
  f=".cursor/skills/speckit-$s/SKILL.md"
  if ! grep -q "RALPH-HANDOFF-PRESET" "$f" 2>/dev/null; then
    echo "FAIL: $f lacks RALPH-HANDOFF-PRESET marker. Reinstall: specify preset add --dev .specify/ralph-handoff-preset" >&2; rc=1
  fi
done
[ $rc -eq 0 ] && echo "OK: Ralph handoff override present"
exit $rc
