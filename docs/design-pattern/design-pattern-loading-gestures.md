# Design Pattern — Loading and Gestures

> **Goal:** Define perceived-performance loading behavior and consistent gesture semantics.

---

## Loading Patterns

### Perceived instant rule

- Show skeleton state at mount time.
- Do not show blank screen while data is loading.
- Transition from skeleton to content with a short cross-fade.

### Inline loading

- For actions, use local loading indicators (button/message/progress).
- Keep the interface interactive where safe.

---

## Skeleton Guidelines

- Shimmer loops must be subtle and lightweight.
- Skeleton shape should approximate real screen layout.
- In reduced-motion mode, prefer static skeletons.

---

## Gesture Patterns

### Swipe actions

- Use clear thresholds and reveal mechanics.
- Provide snap-back behavior when threshold is not reached.

### Pull-to-refresh

- Available on screen-level lists.
- Keep spinner visual aligned to theme semantics.

### Long press

- Trigger contextual actions with clear menu affordance.
- Pair with optional haptic feedback where appropriate.

### Back gesture

- Keep native back gestures enabled by default.
- Disable only for critical interruption contexts.

