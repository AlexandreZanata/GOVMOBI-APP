# Design Pattern — Quick Reference

> **Goal:** Fast lookup for day-to-day interaction and performance rules.

---

## Durations

- 100ms: micro feedback
- 150ms: fast interactions
- 220ms: standard transitions
- 300ms: deliberate full-screen transitions

---

## Transition Mapping

- Stack: horizontal slide
- Modal: vertical slide
- Tab switch: fade
- Auth to main: fade + subtle scale

---

## Golden Rules

1. Use native driver for opacity/transform.
2. Show skeletons immediately.
3. Keep list behavior performant and stable.
4. Respect reduced-motion preferences.
5. Keep touch targets at or above 44x44.
6. Avoid hardcoded UI values and strings.

