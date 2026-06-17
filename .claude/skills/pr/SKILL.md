---
name: pr
description: Create a GitHub pull request from the current changes. Use when the user asks to "open a PR", "create a pull request", "subir un PR", or wants their committed/uncommitted work turned into a PR against main. Handles branching off main, committing, pushing, and opening the PR (via gh CLI, or a compare URL when gh is unavailable).
---

# Create a Pull Request

Turn the current work into a GitHub pull request against the default branch (`main`).

## Preconditions

- Repo: `1756096090/json-editor-2`, remote `origin` (HTTPS).
- Default/base branch: `main`.
- `gh` CLI may NOT be installed — detect it and fall back to a compare URL.
- Commit/PR conventions (from CLAUDE.md and repo rules):
  - End every commit message with:
    `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  - End every PR body with:
    `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Steps

1. **Inspect state.** Run `git status --short` and `git branch --show-current`.
   - If there are no commits ahead of `origin/main` AND no pending changes, stop and tell the user there is nothing to PR.

2. **Pick a branch.**
   - If currently on `main`: create a feature branch first. Derive a short
     kebab-case name from the work (e.g. `feat/auto-fix-commas`,
     `fix/vercel-deps`). Run `git switch -c <branch>`.
   - If already on a non-`main` branch: keep using it.
   - Never commit straight to `main`.

3. **Commit pending changes** (only if `git status` shows any):
   - Stage with `git add -A` (or specific files if the user scoped it).
   - Write a Conventional-Commits message (`feat:`, `fix:`, `chore:`, …) with a
     concise subject and a short body explaining the why.
   - End the message with the `Co-Authored-By` line above. Use a heredoc for the
     multi-line message. Do NOT use `--no-verify`.

4. **Push** the branch: `git push -u origin <branch>`.

5. **Open the PR.** First check for gh: `command -v gh` (bash) or
   `Get-Command gh` (PowerShell).
   - **If gh exists:** create it with a title and a heredoc body:
     ```
     gh pr create --base main --head <branch> \
       --title "<type>: <summary>" \
       --body "$(cat <<'EOF'
     ## Summary
     - <what changed and why, 1-3 bullets>

     ## Testing
     - npm run build
     - npm test

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     EOF
     )"
     ```
     Relay the PR URL that `gh` prints.
   - **If gh is NOT installed:** do not fail. After pushing, build the compare
     URL and give it to the user to finish in the browser:
     `https://github.com/1756096090/json-editor-2/compare/main...<branch>?expand=1`
     Also print the suggested title and body (with the Generated-with line) so
     they can paste it.

6. **Report:** the branch name, the commit(s) included, and the PR URL (or
   compare URL). Mention whether build/tests were run.

## Guardrails

- Confirm before pushing if the working tree contains unrelated changes the user
  may not want in this PR.
- Don't force-push. Don't target a base other than `main` unless asked.
- If `git push` is rejected (branch diverged), surface the error — don't
  `--force` without the user's go-ahead.
- Prefer running `npm run build` and `npm test` before opening the PR when the
  change touches app code, and note the result in the PR body.
