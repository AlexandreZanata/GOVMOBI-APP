# Implementation Plan: Ride Ratings — Admin & Motorista Screens

## Overview

Implements the two missing rating screens: an ADMIN-only list of all system ratings (`GET /admin/avaliacoes`) and a MOTORISTA-only personal rating summary (`GET /motoristas/minha-nota`). Follows the same facade + mock + screen + i18n + test pattern established by the existing ride-experience spec.

## Tasks

- [x] 1. Domain models
  - [x] 1.1 Create `src/models/Avaliacao.ts`
    - Define `Avaliacao` interface: `id`, `corridaId`, `passageiroId`, `motoristaId`, `nota` (number, JSDoc: range [1,5]), `comentario?`, `createdAt`
    - Define `AvaliacaoSummary` interface: `motoristaId`, `mediaNotas`, `totalAvaliacoes`
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 1.2 Export `Avaliacao` and `AvaliacaoSummary` from `src/models/index.ts`
    - Add `export * from './Avaliacao';`
    - _Requirements: 1.3_

- [-] 2. `AvaliacoesFacade` — contract and real implementation
  - [ ] 2.1 Create `src/services/facades/AvaliacoesFacade.ts`
    - Define `IAvaliacoesFacade` interface with `listAvaliacoes()` and `getMinhaAvaliacaoSummary()`
    - Implement `AvaliacoesFacadeImpl` with `getToken` constructor config (same pattern as `FrotaFacadeImpl`)
    - `listAvaliacoes()` → `GET /admin/avaliacoes` with Bearer token; unwrap response array
    - `getMinhaAvaliacaoSummary()` → `GET /motoristas/minha-nota` with Bearer token; unwrap summary object
    - Return `NETWORK_ERROR` on non-2xx; `NETWORK_ERROR` with `retryable: true` on exception
    - Export `AvaliacoesFacadeConfig` interface extending `FacadeConfig`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. `AvaliacoesFacadeMock`
  - [ ] 3.1 Create `src/services/facades/mock/AvaliacoesFacadeMock.ts`
    - Implement `IAvaliacoesFacade` with at least 3 `Avaliacao` fixture objects in `listAvaliacoes()`
    - `getMinhaAvaliacaoSummary()` returns a valid `AvaliacaoSummary` fixture
    - Simulated delay 150–300 ms on both methods; zero `any` types
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Wire `AvaliacoesFacade` into `src/services/facades/index.ts`
  - [ ] 4.1 Add `avaliacoesFacade: IAvaliacoesFacade` to the `Facades` interface
  - [ ] 4.2 In the mock branch of `createDefaultFacades`, require and instantiate `AvaliacoesFacadeMock`
    - Follow the same `require('./mock/AvaliacoesFacadeMock')` pattern used for `FrotaFacadeMock`
  - [ ] 4.3 In the real branch, instantiate `AvaliacoesFacadeImpl({...resolvedConfig, getToken})`
  - [ ] 4.4 Add `export * from './AvaliacoesFacade';` at the bottom of `index.ts`
  - _Requirements: 2.6, 2.7_

- [ ] 5. i18n strings
  - [ ] 5.1 Add `avaliacoes.admin` namespace to `src/i18n/locales/pt-BR.json`
    - Keys: `title`, `empty`, `errorMessage`, `retry`, `notaLabel`, `comentarioLabel`, `createdAtLabel`
    - _Requirements: 8.1_
  - [ ] 5.2 Add `avaliacoes.minhaNota` namespace to `src/i18n/locales/pt-BR.json`
    - Keys: `title`, `mediaLabel`, `totalLabel`, `errorMessage`, `retry`, `noRatingsYet`
    - _Requirements: 8.2_
  - [ ] 5.3 Mirror both namespaces in `src/i18n/locales/en-US.json`
    - _Requirements: 8.3_
  - [ ] 5.4 Mirror both namespaces in `src/i18n/locales/es.json`
    - _Requirements: 8.3_

- [ ] 6. `AdminAvaliacoesScreen`
  - [ ] 6.1 Create `src/screens/Corridas/AdminAvaliacoesScreen.tsx`
    - On mount: call `avaliacoesFacade.listAvaliacoes()`; show `ActivityIndicator` while loading
    - On success: render `FlatList` of `Avaliacao` items — each row shows `nota` (stars via `MaterialIcons`), `comentario` (if present), `createdAt` (formatted)
    - On error: show localized `t('avaliacoes.admin.errorMessage')` + retry `Pressable`
    - On empty list: show `t('avaliacoes.admin.empty')`
    - Use `useTheme()` exclusively for all colors and spacing; `useTranslation()` for all strings
    - Co-locate `useAdminAvaliacoes.ts` hook (fetch logic + retry state) and `AdminAvaliacoes.styles.ts` in the same folder
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8_

- [ ] 7. `MinhaNotaScreen`
  - [ ] 7.1 Create `src/screens/Motorista/MinhaNotaScreen.tsx`
    - On mount: call `avaliacoesFacade.getMinhaAvaliacaoSummary()`; show `ActivityIndicator` while loading
    - On success: display `mediaNotas` formatted to 1 decimal place and `totalAvaliacoes`
    - When `totalAvaliacoes === 0`: show `t('avaliacoes.minhaNota.noRatingsYet')` instead of the summary
    - On error: show localized `t('avaliacoes.minhaNota.errorMessage')` + retry `Pressable`
    - Use `useTheme()` exclusively; `useTranslation()` for all strings
    - Co-locate `useMinhaAvaliacaoSummary.ts` hook and `MinhaNotaScreen.styles.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

- [ ] 8. Navigation wiring
  - [ ] 8.1 Add `AdminAvaliacoes: undefined` to `PassageiroCorridasStackParamList` in `src/navigation/types.ts`
    - _Requirements: 6.1_
  - [ ] 8.2 Add `MinhaNota: undefined` to `MotoristaCorridasStackParamList` in `src/navigation/types.ts`
    - _Requirements: 6.3_
  - [ ] 8.3 Register `AdminAvaliacoesScreen` in `src/navigation/PassageiroCorridasNavigator.tsx`
    - Add `<Stack.Screen component={AdminAvaliacoesScreen} name="AdminAvaliacoes" options={{title: t('avaliacoes.admin.title'), headerShown: true}} />`
    - _Requirements: 6.2, 6.5_
  - [ ] 8.4 Register `MinhaNotaScreen` in `src/navigation/MotoristaCorridasNavigator.tsx`
    - Add `<Stack.Screen component={MinhaNotaScreen} name="MinhaNota" options={{title: t('avaliacoes.minhaNota.title'), headerShown: true}} />`
    - _Requirements: 6.4, 6.6_

- [ ] 9. Navigation entry points
  - [ ] 9.1 Add entry point to `AdminAvaliacoesScreen` from `src/screens/Corridas/PassageiroCorridasListScreen.tsx`
    - Add a header right button or list header row that calls `navigation.navigate('AdminAvaliacoes')`
    - Gate visibility with `papeis.includes('ADMIN')` via `useAppSelector(s => s.auth.papeis)`
    - _Requirements: 7.1, 4.6_
  - [ ] 9.2 Add entry point to `MinhaNotaScreen` from `src/screens/Motorista/MotoristaCorridasListScreen.tsx`
    - Add a header right button or list header row that calls `navigation.navigate('MinhaNota')`
    - Gate visibility with `papeis.includes('MOTORISTA')` via `useAppSelector(s => s.auth.papeis)`
    - _Requirements: 7.2, 5.5_

- [ ] 10. POC tests
  - [ ] 10.1 Create `src/screens/Corridas/__tests__/AdminAvaliacoesScreen.poc.test.tsx`
    - Test: renders `ActivityIndicator` while `listAvaliacoes` is pending
    - Test: renders error message and retry button when `listAvaliacoes` returns an error; pressing retry calls the facade again
    - Test: renders list items when `listAvaliacoes` returns 3 fixtures
    - _Requirements: 9.1_
  - [ ] 10.2 Create `src/screens/Motorista/__tests__/MinhaNotaScreen.poc.test.tsx`
    - Test: renders `ActivityIndicator` while `getMinhaAvaliacaoSummary` is pending
    - Test: renders error message and retry button when facade returns an error; pressing retry calls the facade again
    - Test: renders `mediaNotas` (1 decimal) and `totalAvaliacoes` on success
    - _Requirements: 9.2_
  - [ ] 10.3 Create `src/services/facades/__tests__/avaliacoesFacade.poc.test.ts`
    - Property test: every item returned by `AvaliacoesFacadeMock.listAvaliacoes()` has `nota` in `[1, 5]`
    - _Requirements: 9.3, 9.4_

- [ ] 11. Final checkpoint
  - Run `tsc --noEmit` across all new and modified files; confirm zero errors
  - Confirm zero hardcoded strings and zero hardcoded style values in new screens
