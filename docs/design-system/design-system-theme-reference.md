# Design System — Theme Reference (TypeScript)

> **Goal:** Document the runtime theme contract used by Sorrimobi.

---

## Source of Truth

Implementation file:

- `src/theme/index.ts`

Core exports:

- `createTheme(mode)`
- `ThemeProvider`
- `useTheme()`
- `useColorMode()`
- `Theme` type
- `ColorMode` type

---

## Theme Contract

The `Theme` object includes:

- `mode`
- `colors`
- `typography`
- `spacing`
- `borderRadius`
- `shadows`
- `zIndex`
- `animation`

---

## Usage Example

```ts
import { useTheme } from '@theme';

export function ExampleCard() {
  const theme = useTheme();
  return {
    containerStyle: {
      backgroundColor: theme.colors.background.card,
      borderColor: theme.colors.border.default,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
    },
  };
}
```

---

## Rules

- Do not duplicate token values in component files.
- Do not import raw palette constants into UI components.
- Use semantic tokens (`colors.background.*`, `colors.content.*`, etc.) only.
- If a new visual primitive is needed, add it to `src/theme/index.ts` first.

---

## Note on Full Token Values

The complete token/value map already lives in `src/theme/index.ts` and should be treated as canonical runtime documentation.

