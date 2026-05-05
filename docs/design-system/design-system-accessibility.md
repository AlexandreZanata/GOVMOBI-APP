# Design System — Accessibility Rules

> **Goal:** Guarantee inclusive and compliant UI behavior by default.

---

## Mandatory Rules

- Text contrast follows WCAG 2.1 AA minimums.
- Interactive targets are at least 44x44.
- Icon-only controls require `accessibilityLabel`.
- Errors are not represented by color alone.
- Focus indicators are visible for interactive controls.
- Dynamic text scaling is supported.
- Motion is reduced/disabled when the OS requests reduced motion.

---

## Contrast Targets

- Body text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components/borders against adjacent surfaces: 3:1 minimum

---

## Motion + Accessibility

- Use `AccessibilityInfo.isReduceMotionEnabled()` for motion-sensitive UX.
- Prefer subtle opacity/transform transitions.
- Avoid decorative motion when it does not improve clarity.

---

## Screen Reader + Semantics

- Use `accessibilityRole` for controls and headings.
- Keep labels short, action-based, and unambiguous.
- Provide useful state context (selected, disabled, error, loading).

---

## Validation Checklist

- [ ] Every interactive element is reachable and labeled
- [ ] No critical information is color-only
- [ ] Minimum touch target is respected
- [ ] Reduced motion behavior is tested
- [ ] Error states are announced and understandable

