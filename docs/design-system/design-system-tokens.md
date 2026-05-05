# Design System — Tokens

> **Goal:** Define semantic tokens used by all components in light and dark mode.

---

## 1) Color Tokens

Use semantic tokens only (never raw palette values directly in components).

### Background

- `background.primary`
- `background.secondary`
- `background.card`
- `background.overlay`
- `background.input`
- `background.inputFocused`

### Content

- `content.primary`
- `content.secondary`
- `content.tertiary`
- `content.placeholder`
- `content.disabled`
- `content.onPrimary`
- `content.onAccent`
- `content.link`

### Border

- `border.default`
- `border.strong`
- `border.focus`
- `border.error`

### Brand

- `brand.primary`
- `brand.primaryHover`
- `brand.primaryPressed`
- `brand.accent`
- `brand.accentHover`

### Semantic + Calls

- `semantic.success|warning|error|info`
- `semantic.successBg|warningBg|errorBg|infoBg`
- `call.incoming|outgoing|missed|active`

---

## 2) Typography

### Font families

- `primary`: IBMPlexSans-Regular
- `medium`: IBMPlexSans-Medium
- `semibold`: IBMPlexSans-SemiBold
- `bold`: IBMPlexSans-Bold
- `mono`: IBMPlexMono-Regular

### Type scale

- `3xl`: 30/38
- `2xl`: 24/32
- `xl`: 20/28
- `lg`: 18/26
- `md`: 16/24
- `sm`: 14/20
- `xs`: 12/16

### Rules

- Never set raw `fontSize` in component styles.
- Use semantic variants (`heading`, `subheading`, `body`, `label`, `caption`, `code`).

---

## 3) Spacing and Grid

Base unit is 4px.

- `space.1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`, `16=64`

Layout rules:

- Screen horizontal padding: 16
- Card internal padding: 16
- Min touch target: 44x44
- Section gap: 12 (minor), 24 (major)

---

## 4) Shadows and Elevation

- `shadows.none`, `xs`, `sm`, `md`, `lg`, `xl`
- Dark mode: reduce strong shadow opacity and rely more on surface contrast.

---

## 5) Border Radius

- `none=0`, `xs=2`, `sm=4`, `md=8`, `lg=12`, `xl=16`, `2xl=24`, `full=9999`

Defaults:

- Inputs: `sm`
- Cards: `md`
- Primary buttons: `md`
- Avatars: `full`

---

## 6) Z-Index

- `base=0`
- `raised=10`
- `dropdown=100`
- `sticky=200`
- `overlay=300`
- `modal=400`
- `toast=500`
- `systemTop=999`

---

## 7) Motion

### Durations

- `instant=0`
- `fast=100`
- `normal=200`
- `slow=300`
- `verySlow=500`

### Rules

- Respect reduced motion settings.
- Use `useNativeDriver: true` for opacity/transform animations.
- Avoid width/height/backgroundColor animations in baseline flows.

---

## Source of Truth

For exact token values, use `docs/design-system-theme-reference.md` and `src/theme/index.ts`.

