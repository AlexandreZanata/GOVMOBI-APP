# Requirements Document

## Introduction

This feature adds the two missing rating-related screens to GovMobile:

1. **Admin Avaliacoes Screen** — an ADMIN-only screen that calls `GET /admin/avaliacoes` and lists all ratings in the system.
2. **Motorista Minha Nota Screen** — a MOTORISTA-only screen that calls `GET /motoristas/minha-nota` and shows the driver's own rating summary.

The passenger rating flow (`POST /corridas/{id}/avaliar` via `AvaliarCorridaScreen`) is already fully implemented and is out of scope. This spec covers only the two new screens, their facades, navigation wiring, i18n keys, and POC tests.

---

## Glossary

- **Avaliacao**: A rating record submitted by a passenger after a completed ride. Contains at minimum a `nota` (1–5 integer) and an optional `comentario`.
- **AvaliacaoSummary**: The aggregated rating data returned for a driver — includes `mediaNotas` (average score), `totalAvaliacoes` (count), and optionally a breakdown by star value.
- **Admin_Avaliacoes_Screen**: The screen accessible only to users whose `papeis` array includes `'ADMIN'`, listing all `Avaliacao` records in the system.
- **Minha_Nota_Screen**: The screen accessible only to users whose `papeis` array includes `'MOTORISTA'`, showing the authenticated driver's `AvaliacaoSummary`.
- **AvaliacoesFacade**: The new facade (`IAvaliacoesFacade` / `AvaliacoesFacadeImpl`) responsible for `GET /admin/avaliacoes` and `GET /motoristas/minha-nota`.
- **AvaliacoesFacadeMock**: The mock implementation of `IAvaliacoesFacade` used when `ENV.MOCK_MODE` is true.
- **PassageiroCorridasStackParamList**: Existing typed param list for the passenger corridas stack navigator.
- **MotoristaCorridasStackParamList**: Existing typed param list for the driver corridas stack navigator.
- **Result**: The `Result<T, E>` discriminated union (`{ data: T; error: null } | { data: null; error: E }`) used by all facades.
- **FacadeError**: The standard error shape `{ code: string; message: string; statusCode?: number; retryable?: boolean }`.

---

## Requirements

### Requirement 1: Avaliacao Domain Model

**User Story:** As a developer, I want typed domain models for rating data, so that the compiler enforces correct data shapes across the feature.

#### Acceptance Criteria

1. THE System SHALL define an `Avaliacao` interface in `src/models/Avaliacao.ts` with at minimum: `id: string`, `corridaId: string`, `passageiroId: string`, `motoristaId: string`, `nota: number`, `comentario?: string`, `createdAt: string`.
2. THE System SHALL define an `AvaliacaoSummary` interface in `src/models/Avaliacao.ts` with at minimum: `motoristaId: string`, `mediaNotas: number`, `totalAvaliacoes: number`.
3. THE System SHALL export both interfaces from `src/models/index.ts`.
4. WHEN the `nota` field is read from an `Avaliacao`, THE System SHALL treat it as a number in the range `[1, 5]` (enforced by TypeScript type documentation, not runtime validation in the model file).

---

### Requirement 2: AvaliacoesFacade Contract and Implementation

**User Story:** As a developer, I want a typed facade for the two new rating endpoints, so that all backend calls are centralized and mockable.

#### Acceptance Criteria

1. THE AvaliacoesFacade SHALL define an `IAvaliacoesFacade` interface in `src/services/facades/AvaliacoesFacade.ts` with two methods:
   - `listAvaliacoes(): Promise<Result<Avaliacao[], FacadeError>>`
   - `getMinhaAvaliacaoSummary(): Promise<Result<AvaliacaoSummary, FacadeError>>`
2. WHEN `listAvaliacoes()` is called, THE AvaliacoesFacade SHALL call `GET /admin/avaliacoes` with the Bearer token and return the unwrapped data array.
3. WHEN `getMinhaAvaliacaoSummary()` is called, THE AvaliacoesFacade SHALL call `GET /motoristas/minha-nota` with the Bearer token and return the unwrapped summary object.
4. IF the HTTP response status is not 2xx, THEN THE AvaliacoesFacade SHALL return a `Result` with `error.code = 'NETWORK_ERROR'` and the HTTP status in `error.statusCode`.
5. IF a network exception is thrown, THEN THE AvaliacoesFacade SHALL return a `Result` with `error.code = 'NETWORK_ERROR'` and `error.retryable = true`.
6. WHEN `ENV.MOCK_MODE` is true, THE AvaliacoesFacade SHALL use `AvaliacoesFacadeMock` instead of `AvaliacoesFacadeImpl`.
7. THE AvaliacoesFacade SHALL be registered in `src/services/facades/index.ts` as `avaliacoesFacade` on the `Facades` interface and provided via `FacadeProvider`.

---

### Requirement 3: AvaliacoesFacadeMock

**User Story:** As a developer, I want a mock implementation of the ratings facade, so that the app works end-to-end without a backend in mock mode.

#### Acceptance Criteria

1. THE AvaliacoesFacadeMock SHALL implement `IAvaliacoesFacade` in `src/services/facades/mock/AvaliacoesFacadeMock.ts`.
2. WHEN `listAvaliacoes()` is called in mock mode, THE AvaliacoesFacadeMock SHALL return a non-empty array of at least 3 `Avaliacao` fixture objects after a simulated delay of 150–300 ms.
3. WHEN `getMinhaAvaliacaoSummary()` is called in mock mode, THE AvaliacoesFacadeMock SHALL return a valid `AvaliacaoSummary` fixture after a simulated delay of 150–300 ms.
4. THE AvaliacoesFacadeMock SHALL contain no `any` types.

---

### Requirement 4: Admin Avaliacoes Screen

**User Story:** As an admin, I want to see all ride ratings in the system, so that I can monitor service quality.

#### Acceptance Criteria

1. WHEN the Admin_Avaliacoes_Screen mounts, THE Admin_Avaliacoes_Screen SHALL call `avaliacoesFacade.listAvaliacoes()` and display a loading indicator until the result resolves.
2. WHEN `listAvaliacoes()` returns successfully, THE Admin_Avaliacoes_Screen SHALL render a scrollable list of `Avaliacao` items, each showing `nota` (as stars or numeric), `comentario` (if present), and `createdAt`.
3. WHEN `listAvaliacoes()` returns an error, THE Admin_Avaliacoes_Screen SHALL display a localized error message and a retry button.
4. WHEN the retry button is pressed, THE Admin_Avaliacoes_Screen SHALL call `listAvaliacoes()` again.
5. WHEN the list is empty, THE Admin_Avaliacoes_Screen SHALL display a localized empty-state message.
6. WHILE the user's `papeis` array does not include `'ADMIN'`, THE Admin_Avaliacoes_Screen SHALL NOT be reachable via navigation (access is enforced at the navigator level by only registering the screen in the admin-accessible stack).
7. THE Admin_Avaliacoes_Screen SHALL use only `useTheme()` for colors and spacing — no hardcoded values.
8. THE Admin_Avaliacoes_Screen SHALL use `react-i18next` for all visible strings — no hardcoded text.

---

### Requirement 5: Motorista Minha Nota Screen

**User Story:** As a driver, I want to see my own rating summary, so that I can track my performance.

#### Acceptance Criteria

1. WHEN the Minha_Nota_Screen mounts, THE Minha_Nota_Screen SHALL call `avaliacoesFacade.getMinhaAvaliacaoSummary()` and display a loading indicator until the result resolves.
2. WHEN `getMinhaAvaliacaoSummary()` returns successfully, THE Minha_Nota_Screen SHALL display `mediaNotas` (formatted to one decimal place) and `totalAvaliacoes`.
3. WHEN `getMinhaAvaliacaoSummary()` returns an error, THE Minha_Nota_Screen SHALL display a localized error message and a retry button.
4. WHEN the retry button is pressed, THE Minha_Nota_Screen SHALL call `getMinhaAvaliacaoSummary()` again.
5. WHILE the user's `papeis` array does not include `'MOTORISTA'`, THE Minha_Nota_Screen SHALL NOT be reachable via navigation (access is enforced at the navigator level).
6. THE Minha_Nota_Screen SHALL use only `useTheme()` for colors and spacing — no hardcoded values.
7. THE Minha_Nota_Screen SHALL use `react-i18next` for all visible strings — no hardcoded text.

---

### Requirement 6: Navigation Wiring

**User Story:** As a developer, I want the new screens registered in the correct navigators, so that role-based routing is enforced by the navigation layer.

#### Acceptance Criteria

1. THE System SHALL add `AdminAvaliacoes: undefined` to `PassageiroCorridasStackParamList` in `src/navigation/types.ts` (ADMIN users are routed through `PassageiroNavigator`).
2. THE System SHALL register `AdminAvaliacoesScreen` in `PassageiroCorridasNavigator` under the `AdminAvaliacoes` route name.
3. THE System SHALL add `MinhaNota: undefined` to `MotoristaCorridasStackParamList` in `src/navigation/types.ts`.
4. THE System SHALL register `MinhaNotaScreen` in `MotoristaCorridasNavigator` under the `MinhaNota` route name.
5. WHEN a user with `papeis.includes('ADMIN')` navigates to `AdminAvaliacoes`, THE System SHALL render `AdminAvaliacoesScreen`.
6. WHEN a user with `papeis.includes('MOTORISTA')` navigates to `MinhaNota`, THE System SHALL render `MinhaNotaScreen`.

---

### Requirement 7: Navigation Entry Points

**User Story:** As a user, I want a clear way to reach the new screens from within the app, so that I can access rating information without knowing the route name.

#### Acceptance Criteria

1. THE System SHALL add a navigation entry point to `AdminAvaliacoesScreen` from within the passenger/admin corridas list or home screen (e.g. a list item, button, or header icon).
2. THE System SHALL add a navigation entry point to `MinhaNotaScreen` from within the driver corridas list or `MotoristaScreen` (e.g. a button in the idle sheet or a header icon).

---

### Requirement 8: i18n Coverage

**User Story:** As a developer, I want 100% i18n coverage for all new strings, so that the app supports pt-BR, en-US, and es without hardcoded text.

#### Acceptance Criteria

1. THE System SHALL add all new string keys for `AdminAvaliacoesScreen` under `avaliacoes.admin` in `src/i18n/locales/pt-BR.json`, `en-US.json`, and `es.json`.
   - Required keys: `title`, `empty`, `errorMessage`, `retry`, `notaLabel`, `comentarioLabel`, `createdAtLabel`.
2. THE System SHALL add all new string keys for `MinhaNotaScreen` under `avaliacoes.minhaNota` in all three locale files.
   - Required keys: `title`, `mediaLabel`, `totalLabel`, `errorMessage`, `retry`, `noRatingsYet`.
3. WHEN a key is present in `pt-BR.json`, THE System SHALL ensure the same key exists in `en-US.json` and `es.json`.

---

### Requirement 9: POC Tests

**User Story:** As a developer, I want proof-of-concept tests for the new screens and facade, so that regressions are caught early.

#### Acceptance Criteria

1. THE System SHALL create `src/screens/Corridas/__tests__/AdminAvaliacoesScreen.poc.test.tsx` with tests covering: loading state, error state with retry, and successful list render.
2. THE System SHALL create `src/screens/Motorista/__tests__/MinhaNotaScreen.poc.test.tsx` with tests covering: loading state, error state with retry, and successful summary render.
3. THE System SHALL create `src/services/facades/__tests__/avaliacoesFacade.poc.test.ts` with a round-trip property test: `AvaliacoesFacadeMock.listAvaliacoes()` returns an array where every item has `nota` in `[1, 5]`.
4. WHEN any of the above tests are run with `jest --testPathPattern`, THE System SHALL produce zero failures.
