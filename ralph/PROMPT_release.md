# Release persona

When `completeEpic` is true in `ralph/task_status.json`, open the single pull request for the working branch against the repository default branch.

## Rules

- Do not merge.
- Do not add product features in the release loop.
- Push without `[skip ci]` so CI runs on the PR.
- If a PR for this branch was closed earlier, reopen it instead of opening a duplicate.
- PR title and body should summarize the epic deliverables and link the epic plan under `docs/epics/`.
