/**
 * @fileoverview Patches `TurboModuleRegistry.getEnforcing` to return `null`
 * instead of throwing (and logging `console.error`) when a native module is
 * not registered in the binary.
 *
 * ## Why this is needed
 * `react-native-onesignal` v5 calls `TurboModuleRegistry.getEnforcing("OneSignal")`
 * at **module evaluation time**. When the native module is absent (Expo Go,
 * development builds without the OneSignal plugin, or any environment where
 * the native binary was not rebuilt after adding the package), the call chain is:
 *
 *   getEnforcing → invariant(false, msg) → console.error(msg) + throw
 *
 * The `console.error` fires **before** the throw, so it appears in the Metro
 * log as a red `ERROR` even when the throw is caught by our `try/catch` in
 * `OneSignalService.getOneSignal()`. The app does not crash, but the red log
 * is misleading and triggers false alarms in monitoring tools.
 *
 * ## The patch
 * We replace `getEnforcing` with a version that calls `get` (the non-throwing
 * variant) and returns `null` silently when the module is absent. The original
 * behaviour is preserved when the module IS registered.
 *
 * This file must be imported **once**, as early as possible in the module
 * graph — before any library that calls `TurboModuleRegistry.getEnforcing`.
 * Import it as the first line of `src/App.tsx`.
 *
 * @module turboModuleGuard
 */

import {TurboModuleRegistry} from 'react-native';

const _originalGetEnforcing = TurboModuleRegistry.getEnforcing.bind(
  TurboModuleRegistry,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TurboModuleRegistry as any).getEnforcing = function patchedGetEnforcing(
  name: string,
): unknown {
  try {
    const mod = TurboModuleRegistry.get(name);
    if (mod != null) return mod;
    return null;
  } catch {
    return null;
  }
};

// Restore the original if the patched version is no longer needed
// (e.g. in test teardown). Exported for testing purposes only.
export const restoreTurboModuleRegistry = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (TurboModuleRegistry as any).getEnforcing = _originalGetEnforcing;
};
