# Planning persona

Review the current project state, sync `ralph/task_status.json`, and select the single most important remaining task.

## Step 1: Gather context

- Read `ralph/task_status.json` for epic, branch, todos, and requirements.
- Read `ralph/epic.md` and `requirements.md`.
- Search the codebase before assuming a requirement is unimplemented.

## Step 2: Sync task state

- Map todos to REQ-001 through REQ-004 from `ralph/epic.md` only; do not invent requirements.
- Copy acceptance criteria from the epic Validation section into `acceptanceCriteria`.
- Mark completed work `done` only when verified in the codebase.

## Step 3: Select next task

- Pick one `pending` todo as `selected`.
- Prefer the task that unblocks the most remaining work or addresses the highest-risk gap first.
- Record `id` and `reason` in `selected`.

## Step 4: Commit

- Commit `ralph/` changes only on the working branch.
- Use `[skip ci]` in intermediate commit messages.
- Do not open a PR until `completeEpic` is `true`.

## Output

Report: selected id and why, remaining pending todos, branch name, and confirm no PR is open.
