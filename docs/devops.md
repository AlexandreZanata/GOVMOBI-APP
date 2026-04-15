# GovMobile — DevOps

> **Goal:** Define the CI/CD pipeline, build process, and deployment strategy.

---

## CI Pipeline (GitHub Actions)

Every pull request and push to `main` triggers the following pipeline:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Install │ →  │   Lint   │ →  │  Types   │ →  │  Tests   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Steps

| Step         | Command                          | Fails on                              |
|--------------|----------------------------------|---------------------------------------|
| Install      | `npm ci`                         | Dependency resolution errors          |
| Lint         | `npm run lint`                   | ESLint errors (warnings allowed)      |
| Type check   | `npm run type-check`             | TypeScript errors (`tsc --noEmit`)    |
| Tests        | `npm run test:ci`                | Any failing test or coverage < 70%    |

### Rules

- All steps must pass before a PR can be merged
- Pipeline runs on Node.js 18 (matches `engines` field in `package.json`)
- `npm ci` is used instead of `npm install` to ensure reproducible installs from `package-lock.json`

---

## Branch Strategy

Follows the Git workflow defined in `docs/git-workflow.md`.

| Branch        | Purpose                                      | Protected |
|---------------|----------------------------------------------|-----------|
| `main`        | Stable, always deployable                    | Yes       |
| `develop`     | Integration branch for completed features    | Yes       |
| `feat/*`      | Feature development                          | No        |
| `fix/*`       | Bug fixes                                    | No        |
| `chore/*`     | Tooling, config, dependency updates          | No        |

---

## Build Process

### Development

```bash
npm start          # Start Metro bundler
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS simulator/device
npm run web        # Run in browser (Expo Web)
```

### Production Build (Expo EAS — Future)

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

- EAS Build configuration will be defined in `eas.json`
- Production builds use environment variables from EAS Secrets (never committed to source)
- Android: generates signed `.aab` for Play Store submission
- iOS: generates signed `.ipa` for App Store submission

---

## Environment Configuration

| Environment   | Purpose                                  | API Base URL                        |
|---------------|------------------------------------------|-------------------------------------|
| `development` | Local development with mock data         | `http://localhost:3000`             |
| `staging`     | Integration testing against real backend | `https://api.staging.govmobile.gov` |
| `production`  | Live application                         | `https://api.govmobile.gov`         |

- Environment variables are managed via `.env` files (never committed)
- `.env.example` documents all required variables without values
- Expo's `extra` field in `app.json` exposes env vars to the app at build time

---

## Dependency Management

- `npm audit` runs as part of the CI pipeline
- High and critical vulnerabilities block the pipeline
- Dependencies are reviewed and updated monthly via a `chore(deps): ...` commit
- `package-lock.json` is always committed and kept in sync

---

## Monitoring (Future)

| Tool               | Purpose                             |
|--------------------|-------------------------------------|
| Sentry             | Crash reporting and error tracking  |
| Firebase Analytics | Usage analytics (privacy-compliant) |
| EAS Update         | Over-the-air JS bundle updates      |

- Sentry must be configured to scrub PII from reports before enabling
- Analytics must comply with applicable data protection regulations

---

## CD — Deployment (Future)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│  CI Pass │ →  │ EAS Build│ →  │  Staging │ →  │  Production  │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘
```

- Staging deployment is automatic on merge to `develop`
- Production deployment requires manual approval from a `MANAGER` or `ADMIN` team member
- Rollback is performed via EAS Update (JS bundle) or store rollback (native changes)

---

## Pre-Release Checklist

- [ ] All CI steps pass on `main`
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Environment variables are set in EAS Secrets
- [ ] `app.json` version and build number are incremented
- [ ] Security checklist in `docs/security.md` is complete
- [ ] SETUP.md is up to date

---

## Related Docs

- `docs/git-workflow.md`
- `docs/engineering-standards.md`
- `docs/testing-strategy.md`
- `docs/security.md`
- `SETUP.md`
