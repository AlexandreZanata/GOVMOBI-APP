# Design System — Philosophy

> **Goal:** Keep GovMobile visual language trustworthy, clear, and efficient.

---

## Core Values

| Value      | Visual Expression                                             |
|------------|---------------------------------------------------------------|
| Trust      | Institutional palette, consistent hierarchy, generous spacing |
| Clarity    | High contrast, clear type scale, explicit states              |
| Efficiency | Clean layouts, low ornamentation, fast feedback               |

---

## Non-Negotiable Rules

- No hardcoded colors or sizes in UI code.
- No commercial/promotional/price-related content in UI strings.
- All user-facing strings must go through i18n.
- Every interactive element must have pressed/active feedback.
- Dark mode must be supported as a first-class mode.

---

## Implementation Anchors

- Theme source: `src/theme/index.ts`
- Theme hook: `useTheme()`
- i18n hook: `useTranslation()`
- Engineering standards: `docs/engineering-standards.md`

