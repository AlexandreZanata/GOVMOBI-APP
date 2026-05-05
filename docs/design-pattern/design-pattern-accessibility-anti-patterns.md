# Design Pattern — Feedback, Accessibility, and Anti-patterns

> **Goal:** Ensure interaction feedback is clear, inclusive, and free of known bad practices.

---

## Visual and Haptic Feedback

- Map interaction states to semantic feedback consistently.
- Keep button, input, message, and connection-state transitions predictable.
- Haptics should be optional and preference-aware.

---

## Reduced Motion

- Honor OS reduced-motion setting.
- Replace movement-heavy transitions with opacity-first behavior.
- Disable decorative loops in reduced-motion mode.

---

## Touch Targets and Semantics

- Minimum touch area: 44x44 for interactive controls.
- Icon-only controls need `accessibilityLabel`.
- Use semantic roles and state announcements where relevant.

---

## Forbidden Anti-patterns

### Motion anti-patterns

- Bounce/elastic transitions in core production flows
- Long repeat animations
- `useNativeDriver: false` for transform/opacity
- Unnecessary concurrent screen-level animation overload

### UI anti-patterns

- Blank loading screens
- Hardcoded colors/spacing/strings
- `any` types for UI-facing domain data
- Inline style literals in reusable components

### Navigation anti-patterns

- Sliding between sibling tabs
- Misusing stack push where modal presentation is required
- Disabling back gesture without critical reason

