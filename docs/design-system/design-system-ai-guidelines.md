# Design System — AI Prompting Guidelines

> **Goal:** Keep AI-generated code aligned with Sorrimobi standards.

---

## Master Prompt Block

Use this at the start of feature prompts:

```text
You are building a feature for Sorrimobi, a React Native public administration app.

STRICT RULES — violating any of these is a bug:
1. All colors and sizes come from useTheme(). Zero hardcoded values.
2. All user-facing strings use useTranslation(). Zero raw literals in JSX.
3. Every component exports a typed Props interface.
4. Every component sets displayName.
5. Every component accepts testID.
6. Use StyleSheet.create() for styles. No inline style objects in JSX.
7. Respect dark mode with semantic tokens only.
8. All touch targets are minimum 44x44px.
9. Animations use useNativeDriver: true and respect reduced motion.
10. No any types in TypeScript.
```

---

## Step Add-ons

### Atoms

- No business logic
- No imports from molecules/organisms/screens
- Theme tokens only

### Molecules

- Import atoms/theme only
- Use domain models from `src/models/`
- Keep async behavior minimal in UI layer

### Screen hooks

- Return shape: `{ data, isLoading, error, actions }`
- Handle facade errors explicitly
- Keep UI-only concerns out of hooks

### Facades

- Return typed `Result<T, E>` style responses
- Keep mock mode realistic
- Log method-level calls in dev mode

---

## Output Formatting Rules

When you need deterministic code output from AI:

- Output files separately with clear file headers
- List required packages at the end
- Add a POC checklist
- Keep explanations short and practical

---

## Quality Gate Prompt

```text
Review this React Native component for Sorrimobi standards.
Report: FILE | LINE | ISSUE | FIX
Checks:
1) Hardcoded colors/sizes
2) Raw JSX strings without i18n
3) Missing testID
4) Missing displayName
5) Missing Props interface export
6) Inline styles in JSX
7) any type usage
8) Touch target below 44px
9) Missing accessibilityLabel for icon-only buttons
10) Animations missing useNativeDriver: true
If no issue: "PASSES all Sorrimobi standards"
```

---

## Documentation Reference

- Index: `docs/design-system.md`
- Tokens: `docs/design-system-tokens.md`
- Theme API: `docs/design-system-theme-reference.md`

