# GovMobile — Testing Strategy

> **Goal:** Define testing levels, tools, coverage targets, and what must be tested at each layer.

---

## Testing Levels

| Level       | Scope                                      | Tool                              |
|-------------|--------------------------------------------|-----------------------------------|
| Unit        | Components, hooks, utilities, store slices | Jest + React Native Testing Library |
| Integration | Screen behavior, facade interactions       | Jest + RNTL + mock facades        |
| E2E         | Full user flows on device/emulator         | Detox (future)                    |

---

## Tools

| Tool                          | Purpose                                      |
|-------------------------------|----------------------------------------------|
| Jest                          | Test runner, assertions, mocking             |
| React Native Testing Library  | Component rendering and user interaction     |
| `@testing-library/jest-native`| Extended matchers for RN elements            |
| Zod                           | Runtime shape validation in model tests      |
| Mock facades                  | Isolate service layer from UI tests          |

---

## Coverage Target

- **Minimum:** 70% line coverage across `src/`
- **Goal:** 80%+ for `components/`, `hooks/`, `store/`, `services/facades/`
- Coverage is measured per CI run and reported as a build artifact
- Coverage drops below minimum must be justified in the PR description

---

## What to Test

### Atoms and Molecules (`src/components/`)

- Renders correctly with default props
- Renders all visual variants (primary, secondary, danger, etc.)
- Handles disabled and loading states
- Fires correct callbacks on press/change
- Displays correct content from props
- Does not crash with edge-case inputs (empty string, undefined optional props)

### Screens (`src/screens/`)

- Renders without crashing
- Shows loading/skeleton state while data is pending
- Shows error state when facade returns an error
- Renders correct content after data loads
- Key user interactions trigger the expected facade calls
- Navigation actions are called with correct params

### Store Slices (`src/store/slices/`)

- Initial state is correct
- Each action/reducer produces the expected state
- Selectors return correct derived values
- Async thunks handle success and error cases

### Facades (`src/services/facades/`)

- Mock mode returns expected data shapes
- Error paths return `Result<null, Error>` correctly
- Methods are called with correct arguments

### Hooks (`src/hooks/`)

- Returns correct initial values
- Updates state correctly on event
- Cleans up subscriptions on unmount

### Models (`src/models/`)

- TypeScript interfaces compile without error
- Zod schemas validate correct shapes
- Zod schemas reject invalid shapes

### i18n (`src/i18n/`)

- All keys exist in all locale files
- Interpolation works correctly
- Language switching updates the active locale

### Theme (`src/theme/`)

- All tokens are defined and non-null
- `useTheme()` returns correct values for light and dark mode

---

## Test File Placement

Co-locate tests with the feature they cover:

```
src/components/atoms/__tests__/Button.test.tsx
src/components/molecules/__tests__/MessageBubble.test.tsx
src/screens/Home/__tests__/HomeScreen.test.tsx
src/store/__tests__/authSlice.test.ts
src/services/facades/__tests__/AuthFacade.test.ts
src/hooks/__tests__/useAuthSession.test.ts
```

---

## Mocking Strategy

- Facades are mocked at the module level using Jest's `jest.mock()`
- All facade mocks return typed `Result<T, E>` objects
- No real network calls in any unit or integration test
- `useTheme()` is mocked to return a flat theme object in component tests
- `useTranslation()` is mocked to return the key as the translation value

### Example facade mock

```ts
jest.mock('src/services/facades', () => ({
  AuthFacade: {
    login: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    logout: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
```

---

## Running Tests

```bash
# Run all tests once
npm test -- --watchAll=false

# Run a specific test file
npm test -- --testPathPattern=Button

# Run with coverage
npm run test:coverage

# CI mode (coverage + threshold enforcement)
npm run test:ci

# Run POC test for a specific step
npm test -- --testPathPattern=theme.test
```

---

## CI Integration

- All tests run on every PR via GitHub Actions
- PRs cannot be merged if tests fail
- Coverage report is generated and stored as a CI artifact
- See `docs/devops.md` for the full CI pipeline definition

---

## Definition of Done (Testing)

A feature is testable when:

1. Unit tests cover the component/hook/slice in isolation
2. Integration test covers the primary user interaction path
3. All tests pass locally before opening a PR
4. No `console.error` or `console.warn` output in test runs (unless intentional and suppressed)

---

## Related Docs

- `docs/engineering-standards.md`
- `docs/devops.md`
- `README.md` (POC test per step)
