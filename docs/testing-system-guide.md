# GovMobile — Full System Testing Guide

> Practical guide to test the whole system locally before opening a PR.

---

## Goal

Use this checklist to validate code quality, type safety, and core app behavior end-to-end in a repeatable way.

---

## Prerequisites

- Node.js `>=18`
- Dependencies installed: `npm install`
- Environment variables configured (if required for your target flow)
- Android emulator or iOS simulator available for manual validation

---

## Quick Full-Test Command Set

Run the commands in this order from project root:

```bash
# 1) Lint and static quality
npm run lint

# 2) Type safety
npm run type-check

# 3) Unit + integration tests
npm test -- --watchAll=false

# 4) Coverage report
npm run test:coverage
```

If you need CI-equivalent test mode:

```bash
npm run test:ci
```

---

## Manual System Validation (App Flows)

After automated checks pass, run the app and validate key user flows:

```bash
npm run android
# or
npm run ios
```

Minimum manual smoke checklist:

1. Authentication: login, token refresh behavior, logout.
2. Navigation: push/pop transitions, back actions, deep nested stack behavior.
3. Profile module: edit/save profile, open settings, return using back.
4. Chat and calls screens: render, navigation, basic interaction without crashes.
5. Notifications: list rendering and mark-as-read behavior.
6. Theme and i18n: language switch and visual consistency across screens.

---

## Recommended Test Matrix

Validate at least one run in each configuration:

- Light theme + English
- Light theme + Portuguese
- Dark theme + English
- Offline/poor network simulation (where applicable)

---

## Exit Criteria (Ready for PR)

A branch is ready when all are true:

- `npm run lint` passes with no errors
- `npm run type-check` passes
- `npm test -- --watchAll=false` passes
- Critical manual flows complete without regressions
- No blocking warnings in Metro related to the changed feature

---

## Troubleshooting

- Jest hangs after completion: run with `--detectOpenHandles` and check unclosed timers/subscriptions.
- Failing snapshots or RN rendering assertions: verify test mocks for `useTheme`, navigation, and i18n.
- Inconsistent local vs CI result: clear cache and retry (`npm test -- --clearCache`).
- Emulator-only issues: validate on a second platform (Android/iOS) before merging.

---

## Related Docs

- `docs/testing-strategy.md`
- `docs/engineering-standards.md`
- `docs/devops.md`
