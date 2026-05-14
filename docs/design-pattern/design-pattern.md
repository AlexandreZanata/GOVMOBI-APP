# Sorrimobi — Design Pattern

> **Goal:** Standardize UI/UX interaction patterns, transitions, motion, and performance behavior.

---

## Structure

1. [Pattern Philosophy](./design-pattern-philosophy.md)
2. [Motion and Navigation](./design-pattern-motion-navigation.md)
3. [Screen and Component Interactions](./design-pattern-interactions.md)
4. [Loading and Gesture Patterns](./design-pattern-loading-gestures.md)
5. [Performance and List Rules](./design-pattern-performance.md)
6. [Feedback, Accessibility, and Anti-patterns](./design-pattern-accessibility-anti-patterns.md)
7. [Quick Reference](./design-pattern-quick-reference.md)

---

## Rules Snapshot

- Motion must improve clarity, never decorate.
- Repeated actions should stay under 300ms.
- Use `useNativeDriver: true` for opacity/transform.
- Show skeletons immediately; avoid blank loading states.
- Follow FlatList defaults for long lists.
- Respect reduced motion and accessibility touch targets.

---

## Related Docs

- `docs/design-system/design-system.md`
- `docs/engineering-standards.md`
- `docs/commit-rules.md`

