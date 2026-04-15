# Design Pattern — Motion and Navigation

> **Goal:** Define shared timing, easing, and transition behavior.

---

## Motion Scale

Use a constrained duration scale:

- `micro`: 100ms
- `fast`: 150ms
- `standard`: 220ms
- `deliberate`: 300ms

Rule: avoid durations above 300ms in repeated interactions.

---

## Easing Rules

Preferred curves:

- Enter: ease-out cubic
- Exit: ease-in cubic
- Move: ease-in-out cubic
- Confirm: subtle back ease only

Forbidden for production flows:

- Bounce
- Elastic
- Low-damping spring effects

---

## Native Driver Contract

- Use `useNativeDriver: true` for opacity/transform animation.
- For layout-driven changes, use `LayoutAnimation` or structure-preserving alternatives.

---

## Navigation Transitions

| Navigation Action | Pattern |
|---|---|
| Stack push/pop | Horizontal slide |
| Modal open/close | Vertical slide up/down |
| Tab-to-tab | Opacity fade |
| Auth to main app | Fade + subtle scale |

---

## Consistency Rule

Every navigation action should map to one transition type only. Avoid mixing transition styles for the same route behavior.

