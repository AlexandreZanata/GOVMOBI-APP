# Contributing to GovMobile

> Read this before opening a PR.

---

## Setup

```bash
git clone <repo>
npm install
cp .env.example .env
npm start
```

See `SETUP.md` for full prerequisites.

---

## Before you code

1. Read `docs/README.md` — understand the architecture and standards
2. Check `docs/product/use-cases.md` — understand the business context
3. Follow the build order in `README.md` — don't skip steps

---

## Branch naming

```
feat/short-description
fix/short-description
chore/short-description
docs/short-description
```

Branch from `develop`. Never commit directly to `main` or `develop`.

---

## Commit messages

Follow Conventional Commits:

```
feat(chat): add typing indicator to ChatRoomScreen
fix(auth): handle token refresh race condition
docs: update API contract with /notifications endpoint
```

Full rules: `docs/engineering-standards.md`

---

## Code rules (enforced by CI)

- `npm run lint` must pass — no ESLint errors
- `npm run type-check` must pass — zero TypeScript errors
- `npm run test:ci` must pass — all tests green, coverage ≥ 70%

These run automatically on every PR. Fix them locally before pushing.

---

## UI code rules

- All colors and sizes via `useTheme()` — no hardcoded values
- All user-facing strings via `useTranslation()` — no hardcoded text
- Components must have `testID` and `displayName`
- Exported functions and interfaces must have JSDoc

---

## Opening a PR

The PR template will guide you. Key points:

- One logical change per PR
- Tests must cover the new behavior
- Screenshots required for UI changes
- Link the related issue if one exists

---

## Questions?

Check `docs/README.md` first. If the answer isn't there, open a discussion.
