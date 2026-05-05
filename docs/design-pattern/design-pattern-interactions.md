# Design Pattern — Screen and Component Interactions

> **Goal:** Standardize micro-interactions and screen-level animation sequencing.

---

## Screen-Level Entrance Patterns

- Prefer staggered entrance for sectioned/list-heavy screens.
- Animate key hierarchy first (header before lists).
- Do not animate below-the-fold items on initial mount.

---

## Chat and Time-Sensitive Screens

- Render core content immediately.
- Keep transitions minimal and stable.
- Avoid translating message rows on entry; use subtle fade when needed.

---

## Interruption Screens

For urgent screens (example: incoming call):

- Prioritize immediate visibility
- Add contextual haptic feedback
- Sequence controls after core caller context appears

---

## Component Micro-interactions

### Buttons

- Press in/out scale feedback is mandatory.
- Keep durations short and consistent.

### List items

- Use subtle scale feedback.
- Avoid opacity dimming that harms contrast.

### Badges and status chips

- Use controlled pop animation for count changes.
- Avoid exaggerated spring behavior.

### Tab active indicator

- Animate indicator movement; do not jump state abruptly.

---

## Interaction Quality Rules

- First visual response should happen immediately on touch start.
- Loading/disabled states must preserve layout stability.
- Error transitions should be clear and recoverable.

