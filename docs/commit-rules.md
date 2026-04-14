# 🧾 Commit Rules

> **Goal:** Keep commit history clean, readable, and easy to review.

---

## 1) ✅ Commit Hygiene (Rules to Commit)

Use this checklist before every commit:

- [ ] Commit only one logical change (single purpose)
- [ ] Keep commits small and reviewable
- [ ] Ensure builds/tests pass locally when applicable
- [ ] Do not commit secrets (`.env`, API keys, private tokens)
- [ ] Do not commit generated or local IDE files
- [ ] Include documentation updates when behavior changes

**Scope guidance:**

- One bug fix = one commit
- One feature slice = one commit (or small sequence)
- Refactor-only changes must not be mixed with behavior changes

**Avoid:**

- `WIP` commits on shared branches
- Mixed commits (feature + refactor + formatting + rename)
- Vague messages like `fix stuff`

---

## 2) ✍️ Commit Message Standard (Conventional Commits)

Use one of these formats:

```text
type(scope): short imperative summary
type: short imperative summary
```

### Allowed types

- `feat`: new functionality
- `fix`: bug fix
- `docs`: documentation only
- `refactor`: internal code improvement without behavior change
- `test`: add/update tests
- `chore`: tooling, config, dependency, maintenance
- `style`: formatting changes (no logic impact)
- `perf`: performance improvement

### Message rules

- Use lowercase type (`feat`, not `FEAT`)
- Use imperative mood (`add`, `update`, `remove`)
- Keep summary concise (around 50-72 chars)
- Do not end summary with a period
- Add a body when more context is needed

### Examples

Good:

```text
feat(auth): add token refresh flow
fix(chat): handle empty message state
docs: add onboarding section to README
refactor(store): split notifications slice
```

Bad:

```text
update files
fixed bug
final commit
misc changes
```

---

## 3) 🔎 Commit Checks Before PR

- [ ] Commit messages follow Conventional Commits
- [ ] Diff contains only related changes
- [ ] Commit history is clean and meaningful

