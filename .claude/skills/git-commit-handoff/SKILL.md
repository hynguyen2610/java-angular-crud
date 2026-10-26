---
name: git-commit-handoff
description: Check whether the current working-tree change is ready to commit. If it is not, say exactly what blocks it. If it is, print the git stage and git commit commands (Conventional Commits format) for the user to run. Use when the user asks "ready to commit?", "commit handoff", or "give me the commit command".
---

# Git commit handoff

Decide whether the current change is ready to commit, then either report what blocks it or hand over the commands. **Never run `git add`, `git commit` or `git push` yourself.** Give the commands for the user to run.

## 1. Gather the change

Run these commands (all read-only):

- `git status --short` and `git branch --show-current`
- `git diff` and `git diff --cached` for tracked changes; read every untracked file that will be part of the commit
- `git log --format=%s -15` to match the repo's commit style and scopes

If there are no changes, say so and stop.

## 2. Readiness checks

Every check gets a result: pass, fail or not verified. A check you could not run is **not verified**, never pass.

**Blockers (any one means not ready):**
1. **Build and tests pass for each area touched.**
   - `backend/` → `mvn test` in `backend/`. No local Maven? Run it in Docker:
     `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)":/w -v m2cache:/root/.m2 -w /w maven:3.9.9-eclipse-temurin-17 mvn -B -q test` (from `backend/`).
   - `frontend/` → `npm test` and `npm run build` in `frontend/`.
   - `compose*.yaml` or `.env.example` → `docker compose --env-file .env.example config --quiet`.
   - `docs/openapi.yaml` → check that the YAML parses and that it matches the controller changes in the diff.
   - If a failure looks environmental (Docker or Testcontainers unreachable, for example), report it as **not verified** with the error. Don't hide it, and don't call the code broken.
2. **No secrets:** real passwords, tokens, keys or a `.env` file being added. Placeholder values in `.env.example` are fine.
3. **No leftovers:** merge-conflict markers, debug prints, commented-out code blocks, `TODO`s added by this change without a note, focused or skipped tests (`@Disabled`, `fit(`, `fdescribe(`, `.only(`).
4. **One concern per commit.** If the diff mixes unrelated changes, say so and propose a split, with one set of commands per commit.
5. **Known open defects:** a bug found earlier in this conversation and not yet fixed blocks the commit, unless the user agrees to commit it as a known issue.

**Warnings (report them, but they don't block):**
- New behaviour without a test.
- API changes without a matching `docs/openapi.yaml` update, or docs and spec status (`docs/*.md`) now out of date.
- Line-ending (CRLF) warnings only; mention them once.
- Committing directly to `main`. Suggest a branch.

## 3. Output

Start with a one-line verdict: **Ready to commit** or **Not ready**.

### If not ready
Give a short list of blockers, each with the file or command that shows it and what fixes it. Then list warnings and not-verified items. Offer to fix the blockers. Don't print commit commands.

### If ready
1. Summarise in two or three lines what the commit contains, and list warnings or not-verified items.
2. Write a Conventional Commits message:
   - `type(scope): summary`, all lowercase, imperative, no trailing period, ≤ 72 characters, **no space before the `(`**.
   - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`. Pick the scope from the repo's recent subjects (`products`, `auth`, `docker`, `api`, `ui`, …).
   - Add a body only when the reason isn't obvious from the summary: wrap at 72 characters, explain *why*, and use bullets for several distinct changes.
   - Put `BREAKING CHANGE:` in the footer if the API contract changes in an incompatible way.
3. Give the commands in sections so each one can be copied on its own. For **each commit**, in the order they should be made:
   - A heading `#### Commit N: <plain-language name>` (for example "Commit 1: Image storage fixes" or "Commit 2: Skill update").
   - A **Stage** label, then a code block with only the `git add` command(s).
   - A **Commit** label, then a code block with only the `git commit` command.
   - Nothing else inside the code blocks: no comments, prompts or `PS>` prefixes, so a copy-paste runs as-is. Put explanations, like which interactive hunks to accept, in a line above the block.

   Rules for the commands:
   - Stage files **by explicit path** (never `git add -A` or `git add .`) so nothing unintended gets in. Put one path per line using PowerShell's backtick line continuation, so long lists stay readable. The backtick must be the last character on the line (no trailing space), and the last path has no backtick.
   - If a file belongs to more than one commit, stage it with `git add -p <file>` in the earlier commit, and say above the block which hunks to accept (`y`) and which to reject (`n`).
   - Use a PowerShell here-string for multi-line messages, because the user's terminal is PowerShell. The closing `'@` must start at column 0. For a one-line message, use `git commit -m "type(scope): summary"`.
   - End with a **Check** label and a block with `git status --short` to confirm nothing is left over.

Example of the expected layout:

#### Commit 1: Image storage fixes

**Stage**
```powershell
git add `
  backend/src/main/java/com/example/crud/product/ProductImageService.java `
  backend/src/main/java/com/example/crud/product/ProductService.java
```

**Commit**
```powershell
@'
fix(products): clean up orphaned image objects

- delete the previous object after a replace commits
- delete the image object when its product is deleted
'@ | git commit -F -
```

#### Commit 2: Skill update

**Stage**
```powershell
git add .claude/skills/git-commit-handoff/SKILL.md
```

**Commit**
```powershell
git commit -m "chore(claude): add git commit handoff skill"
```

**Check**
```powershell
git status --short
```
