# Spec Kit → Ralph single-path trial (2026-10-13, box scratch only, nothing pushed)

**specify-cli 1.2.0** (uv tool). Scratch clone: `poster/` (push URL set to `no_push`).

## Mechanism
Local **preset** `ralph-handoff` (`specify preset add --dev ../ralph-handoff-preset`), with `replaces: speckit.implement` / `speckit.converge`.
Project-local overrides (`.specify/templates/overrides/`) only cover templates. Commands are written into the integration's skill files, so a preset is the supported way to replace a command.

## Files created by `specify init --integration cursor-agent`
`.cursor/skills/speckit-{analyze,checklist,clarify,constitution,converge,implement,plan,specify,tasks,taskstoissues}/SKILL.md`
`.specify/{init-options.json,integration.json,integrations/*.manifest.json,memory/constitution.md,scripts/bash/*.sh,templates/*-template.md,workflows/speckit/workflow.yml}`

## Results
- **Override reaches the Cursor skill files:** yes. `speckit-implement/SKILL.md` and `speckit-converge/SKILL.md` were rewritten from the preset (`source: preset:ralph-handoff`). `preset resolve` shows the preset as the top layer. The bundled workflow's implement step calls `speckit.implement` by name, so it also goes through the handoff.
- **Stock commands:** replaced in place, so no stock implement or converge skill is left in the repo. The original template exists only inside the installed CLI package.
- **Durability:**
  - `integration upgrade`: blocked with a warning that the 2 files were modified, and nothing was overwritten.
  - `integration upgrade --force`: the override survived because Spec Kit reapplies the preset stack.
  - `preset update`, a second `init --here --force`, and `integration use`: the override survived each one.
  - `preset disable`: the commands stay as the override.
  - `preset remove`: brings back the stock implement and converge. This is the only way they come back, and it takes a deliberate command.
- **`integration status` caveat:** right after the preset was installed, it reported WARNING `managed-files-modified` (2 files). After `upgrade --force` it went back to clean (0).
- **Converter** (`.specify/scripts/speckit-to-ralph.py`): the paper pilot (`specs/005-mac-present-fullscreen`) produced 6 REQs, 2 ACs and 7 todos, all `passes:false`, with requirement↔todo links in both directions. It refuses to run if any FR has no task.
  - Existing epic marked complete: it archived epic-004 to `ralph/archive/` before writing.
  - Ralph epic still in progress: it refused with exit code 2.
  - `--converge`: added the qa-report GAP/FAIL lines as new `gap-*` todos and re-ran cleanly without duplicates. It does not touch `tasks.md` and never sets `passes`.
  - One relative-path bug turned up and was fixed during the trial.

## Ways a second path could still happen
1. `specify preset remove ralph-handoff` brings back the stock implement and converge.
2. The handoff is an instruction to the agent, so an agent could ignore it and write code anyway. It is a strong prompt, not a hard lock. The converter's checks are enforced, though.
3. The converter script is not tracked by Spec Kit (it survived every test) and has to be committed with the repo. The preset folder also needs a home in the repo, or `--dev` reinstall breaks.
4. In this trial, the checklist and analyze gate is a file convention (`checklists/` all ticked, `analyze-report.md` present with no CRITICAL). Spec Kit's analyze does not save a report by default.

## Verdict
**Works as a single path, with caveats.** Every upgrade and reinstall path kept the override. The stock commands only come back through an explicit `preset remove`. Remaining work before real adoption:
- Commit the preset and the script.
- Add a guard that warns if `preset remove` brings back the stock skills.
- Agree on the analyze-report convention.
- Check the converter against Ralph's real planning prompt.

## Key paths
- `ralph-handoff-preset/` (preset.yml, commands/, scripts/speckit-to-ralph.py)
- `poster/.cursor/skills/speckit-implement/SKILL.md` (override applied)
- `poster/specs/005-mac-present-fullscreen/`, `poster/ralph/{epic.md,task_status.json}`
- `skills-stock/` (the original skills, kept for diffing)
