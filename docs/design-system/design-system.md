# Sorrimobi — Design System

> **Goal:** Standardize visual/UI decisions with modular documentation that is easy to maintain.

---

## Structure

Use this file as the entry point for all design system documentation.

1. [Design Philosophy](./design-system-philosophy.md)
2. [Tokens (Color, Typography, Spacing, Elevation)](./design-system-tokens.md)
3. [Component Rules](./design-system-components.md)
4. [Accessibility Rules](./design-system-accessibility.md)
5. [AI Prompting Guidelines](./design-system-ai-guidelines.md)
6. [Theme Reference (TypeScript)](./design-system-theme-reference.md)
7. [Quick Reference](./design-system-quick-reference.md)

---

## Usage Rule

- For UI implementation, always use `useTheme()` from `src/theme/index.ts`.
- For user-facing text, always use i18n via `useTranslation()`.
- Do not hardcode colors/sizes in components.

---

## Naming Standard

This documentation follows the same naming convention as the existing docs:

- lowercase
- kebab-case
- one responsibility per file

Examples in `docs/`:

- `commit-rules.md`
- `engineering-standards.md`
- `git-workflow.md`
- `design-system-*.md`

