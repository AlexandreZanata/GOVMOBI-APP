# OneSignal Expo Dependency Troubleshooting

## Summary

This guide documents a common clean-install / CI failure in Sorrimobi when `app.config.js` references `onesignal-expo-plugin`, but the package is missing from the installed dependencies.

When Expo evaluates the config plugin list during build or prebuild, it must be able to resolve both:

- `onesignal-expo-plugin` — Expo config plugin
- `react-native-onesignal` — OneSignal SDK used by the app runtime

If either package is missing, CI and fresh environments can fail even when a local machine seems to work.

---

## Symptoms

You may see one or more of the following:

- Expo build fails while reading `app.config.js`
- CI validation fails after a clean checkout
- `npx expo run:android` or `npx expo prebuild` cannot resolve `onesignal-expo-plugin`
- Tests or validation jobs fail on machines that do not already have the package cached in `node_modules`

Typical diagnostic checks:

```bash
cat app.config.js | grep onesignal
npm ls onesignal-expo-plugin react-native-onesignal
ls node_modules | grep onesignal
```

---

## Root Cause

The Expo config declares `onesignal-expo-plugin` inside `plugins`, but the package was not installed in the project dependency tree.

This usually happens when:

1. The plugin was added to `app.config.js` before being added to `package.json`.
2. A local `node_modules` folder hides the problem temporarily.
3. CI runs `npm ci` or a fresh install, which only installs packages already declared in `package.json` and `package-lock.json`.

Important detail:

- `npm install` with no package arguments **does not add new dependencies**.
- It only restores the dependencies already declared in the manifest.

---

## How to Verify

Check the three places below:

### 1. Expo config

Confirm the plugin is referenced in `app.config.js`:

```js
plugins: [
  // ...existing plugins...
  'onesignal-expo-plugin',
]
```

### 2. Package manifest

Confirm both packages are listed in `package.json`:

```json
{
  "dependencies": {
    "onesignal-expo-plugin": "^2.4.0",
    "react-native-onesignal": "^5.4.3"
  }
}
```

### 3. Installed modules

Confirm they resolve locally:

```bash
npm ls onesignal-expo-plugin react-native-onesignal
```

If the command reports `empty` or `missing`, the install is incomplete.

---

## Fix

Install both packages explicitly:

```bash
npm install react-native-onesignal onesignal-expo-plugin
```

After that:

1. Commit the updated `package.json` and lockfile.
2. Re-run the Expo validation or Android/iOS build.
3. Re-run CI to confirm the clean-install path is green.

If you are validating locally, a safe follow-up is:

```bash
npx expo prebuild --clean
npx expo run:android
```

---

## CI Notes

This problem is especially visible in CI because the runner starts from a clean environment.

Recommended checks for CI failure triage:

- Ensure `package-lock.json` was updated after installing the plugin.
- Verify `npm ci` succeeds on a clean workspace.
- Confirm `app.config.js` only references plugins that exist in the manifest.
- Avoid relying on a developer machine's cached `node_modules` folder.

---

## Related Files

- `app.config.js`
- `package.json`
- `docs/ONESIGNAL_FRONTEND_QUICKSTART.md`

---

## Suggested Commit Message

```text
docs(onesignal): add expo plugin dependency troubleshooting guide
```

