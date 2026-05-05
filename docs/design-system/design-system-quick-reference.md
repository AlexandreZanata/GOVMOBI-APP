# Design System — Quick Reference

> **Goal:** Fast day-to-day lookup for common UI standards.

---

## Colors

- Primary brand: `theme.colors.brand.primary`
- Accent: `theme.colors.brand.accent`
- Page bg: `theme.colors.background.primary`
- Card bg: `theme.colors.background.card`
- Primary text: `theme.colors.content.primary`
- Border: `theme.colors.border.default`

---

## Typography

- `3xl` 30/38 (bold)
- `2xl` 24/32 (bold)
- `xl` 20/28 (semibold)
- `lg` 18/26 (semibold)
- `md` 16/24 (regular)
- `sm` 14/20 (regular)
- `xs` 12/16 (regular)

---

## Spacing

4px grid:

- `1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`, `16=64`

---

## Radius

- `xs=2`
- `sm=4`
- `md=8`
- `lg=12`
- `xl=16`
- `2xl=24`
- `full=9999`

---

## Accessibility

- Min touch target: `44x44`
- Body contrast: `4.5:1`
- Large text contrast: `3:1`
- Add `accessibilityLabel` for icon-only controls

---

## Always Rules

- Use `useTheme()` for all visual values
- Use i18n for all user-facing strings
- Use `StyleSheet.create()`
- Set `displayName`
- Include `testID` props on reusable components

