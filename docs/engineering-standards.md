# 📘 Engineering Standards — Commits, JSDoc, and Clean Code

> **Goal:** Define practical contribution rules for commit quality, documentation quality, and maintainable code.

---

## 1) ✅ Rules to Commit (Commit Hygiene)

Use this checklist before every commit:

- [ ] Commit only one logical change (single purpose)
- [ ] Keep commits small and reviewable (prefer multiple small commits over one large commit)
- [ ] Ensure code builds/tests pass locally when applicable
- [ ] Do not commit secrets (`.env`, API keys, private tokens)
- [ ] Do not commit generated or local IDE files
- [ ] Include related documentation updates when behavior changes

**Commit scope guidance:**

- One bug fix = one commit
- One feature slice = one commit (or a small sequence of commits)
- Refactor-only changes should not be mixed with feature behavior changes

**Avoid:**

- "WIP" commits on shared branches
- Mixed commits (feature + refactor + formatting + rename in one shot)
- "fix stuff" style messages

---

## 2) 🧾 Commit Message Rules (Conventional Commits)

Use this format:

```text
type(scope): short imperative summary
```

Scope is optional:

```text
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
- Use imperative mood in summary (`add login validation`, not `added`)
- Keep summary concise (around 50-72 chars)
- No trailing period in summary
- Add body when context is needed (why, impact, migration notes)

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

## 3) 🏷 JSDoc Rules (JavaScript/TypeScript)

Write JSDoc for exported/public items and complex internal logic.

### Must document

- Exported functions
- Exported classes/interfaces/types
- Reusable hooks and utilities
- Non-obvious algorithms or business rules

### Recommended JSDoc structure

```js
/**
 * Short summary of what it does.
 *
 * @param {Type} name - Description and constraints.
 * @returns {Type} What is returned.
 * @throws {ErrorType} When this can fail.
 */
```

### Rules

- First line explains intent, not implementation details
- Document parameter constraints and side effects
- Keep comments synchronized with code changes
- Prefer precise types in code signatures and use JSDoc to explain meaning
- Add `@example` for APIs that are easy to misuse

### Example

```ts
/**
 * Formats call duration into MM:SS.
 *
 * @param seconds - Total duration in seconds (must be >= 0).
 * @returns A zero-padded MM:SS string.
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
```

---

## 4) 🧠 Clean Code Best Practices

### Naming

- Use clear, intention-revealing names (`isAuthenticated`, `fetchUserProfile`)
- Avoid vague names (`data`, `temp`, `value1`)
- Keep naming consistent across modules

### Functions

- Keep functions focused on one responsibility
- Prefer small functions with clear inputs/outputs
- Avoid hidden side effects
- Replace deep nesting with guard clauses

### Structure

- Separate UI, business logic, and data access
- Keep files cohesive (one main responsibility per file/module)
- Remove dead code and commented-out blocks

### Error handling

- Fail fast with meaningful messages
- Handle expected errors explicitly (network, validation, auth)
- Do not swallow errors silently

### Testing mindset

- Add/update tests for behavior changes
- Test critical paths and edge cases
- Keep tests readable and deterministic

---

## 5) 🗂 File Naming and Project Organization Rules

Use consistent naming so code is easy to find and maintain.

### File naming rules

- Use `PascalCase` for React components and screen files (`HomeScreen.tsx`, `NotificationItem.tsx`)
- Use `camelCase` for hooks, utilities, and helpers (`useAuthSession.ts`, `formatDuration.ts`)
- Use `camelCase` for store slices and services (`authSlice.ts`, `chatFacade.ts`)
- Use `*.test.ts` or `*.test.tsx` for tests, next to feature or in `__tests__/`
- Avoid generic file names like `utils.ts`, `helpers.ts`, `temp.ts`

### Folder organization rules

- Group by domain/feature first, then by technical type when needed
- Keep one main responsibility per folder (`screens/Chat`, `services/facades`, `store/slices`)
- Co-locate related files (`Component.tsx`, `Component.styles.ts`, `useComponent.ts`)
- Keep folder depth practical (prefer up to 3 levels in most cases)
- Put shared cross-feature code in dedicated shared folders (`components`, `hooks`, `utils`)

### Placement conventions

- UI components: `src/components/{atoms|molecules|organisms|templates}`
- Screens and local screen logic: `src/screens/<Feature>/`
- Business/service access: `src/services/`
- Global state: `src/store/`
- Shared utilities and formatters: `src/utils/`

### Quick validation

- [ ] New files follow naming style for their layer
- [ ] File is placed in the correct domain/layer folder
- [ ] No duplicate or ambiguous file names introduced

---

## 6) 🚀 Expo Development Workflow Rules

Expo is the default environment for local development in this project.

### Standard development commands

```bash
npm install
npm start
npm run android
npm run ios
npm run web
```

### Rules

- Use Expo scripts from `package.json` instead of custom local commands
- Keep `app.json` and Expo-related config changes isolated in dedicated commits
- For Expo package changes, use `chore(expo): ...` commit messages when possible
- Test at least one target platform before opening a PR (`android`, `ios`, or `web`)
- Document any environment-specific requirement in `SETUP.md`

### Config-change checklist

- [ ] `app.json` changes are intentional and explained in PR description
- [ ] Related setup docs were updated (`SETUP.md` or `README.md`)
- [ ] Expo startup still works with `npm start`

---

## 7) 🔎 Pre-PR Quick Checklist

Before opening a PR:

- [ ] Commits follow Conventional Commits
- [ ] No unrelated changes in diff
- [ ] JSDoc updated for public APIs
- [ ] Complex code has clear naming and structure
- [ ] New files follow naming and organization conventions
- [ ] Expo workflow/config changes are documented and validated
- [ ] Tests pass (or test impact explained in PR)
- [ ] README/docs updated when needed

---

## ✅ Definition of Done

A change is ready when:

1. Commit history is clean and meaningful
2. Public APIs are documented with JSDoc
3. Code is readable, maintainable, and tested
4. File naming and placement follow project conventions
5. Documentation reflects behavior changes

