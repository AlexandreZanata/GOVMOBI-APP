# Design Pattern — Performance and List Rules

> **Goal:** Keep interactions smooth on mid-range mobile devices.

---

## Performance Budgets

Target baselines:

- JS frame work under 16ms
- UI frame work under 16ms
- Responsive screen interactivity under constrained network conditions

---

## Rendering Rules

- Memoize list rows with `React.memo`.
- Use stable callbacks (`useCallback`) for list handlers.
- Use focused selectors; avoid selecting entire state slices.
- Use memoized derived selectors for sorted/grouped lists.

---

## List Defaults

For large datasets:

- Use `FlatList` (not `ScrollView`)
- Define stable `keyExtractor`
- Configure render window and batch settings
- Use `getItemLayout` when row height is fixed
- Remove clipped subviews where appropriate

---

## Chat List Considerations

- Inverted list behavior should be stable.
- Preserve visible content position on incoming messages.
- Auto-scroll only when user is near the bottom.

---

## Media Rules

- Use explicit image dimensions.
- Prefer cached/optimized image loading for repeated avatars/thumbnails.
- Provide fallback placeholders for failed image loads.

