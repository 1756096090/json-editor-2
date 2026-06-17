---
name: pr-update
description: Push follow-up commits to the pull request for the current branch and optionally refresh its description. Use when the user asks to "update the PR", "push more changes", "actualizar el PR", or has made additional edits after a PR was opened. Does NOT create a new PR — use the `pr` skill for that.
---

# Update an Existing Pull Request

Add the latest work to the PR that already exists for the current branch.

## Preconditions

- Repo: `1756096090/json-editor-2`, remote `origin`, base branch `main`.
- A branch + PR already exist for the current work. If the current branch is
  `main` or has no upstream, stop and suggest the `pr` skill instead.
- Conventions:
  - Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  - PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Steps

1. **Verify context.** `git branch --show-current` and `git status --short`.
   - If on `main`: stop — there is no feature branch to update.
   - If there are no pending changes and nothing unpushed (`git log @{u}..` is
     empty): tell the user the PR is already up to date.

2. **Commit pending changes** (if any): `git add -A`, then a Conventional-Commits
   message describing the follow-up, ending with the `Co-Authored-By` line. Use a
   heredoc. Do not use `--no-verify`.

3. **Run checks** when app code changed: `npm run build` and `npm test`. Report
   results; fix failures before pushing unless the user says otherwise.

4. **Push:** `git push` (the branch already has an upstream). Never `--force`
   without explicit approval; if rejected, surface the error.

5. **Refresh the PR description (optional).** Only if the change is significant or
   the user asks:
   - With `gh`: `gh pr edit --body "$(cat <<'EOF' … EOF)"` keeping the
     Generated-with line at the end.
   - Without `gh`: print an updated summary the user can paste into the PR.

6. **Report:** new commit(s), push result, and the PR URL
   (`gh pr view --json url -q .url` when available, otherwise the branch's PR page).

## Guardrails

- Never open a second PR for the same branch.
- Don't amend or rebase already-pushed commits unless the user asks (prefer a new
  commit).
- Confirm before including unrelated staged changes.
