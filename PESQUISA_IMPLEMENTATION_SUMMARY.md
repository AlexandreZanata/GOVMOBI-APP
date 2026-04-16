# Pesquisa Routes Implementation Summary

## ✅ Completed Implementation

### 1. **GET /pesquisa/config** — Map Token Fetch
- **Facade**: `PesquisaFacadeImpl.getPesquisaConfig()`
- **Usage**: Called on `PassageiroScreen` mount via `usePassageiro` hook
- **Flow**:
  1. Screen mounts → `useEffect` fires `pesquisaFacade.getPesquisaConfig()`
  2. Token arrives → stored in `mapboxToken` state
  3. `useEffect` in screen calls `MapboxGL.setAccessToken(mapboxToken)`
  4. Map renders with server-issued token

### 2. **GET /pesquisa/geocoding** — Forward Geocoding
- **Facade**: `PesquisaFacadeImpl.geocodeAddress(input)`
- **Usage**: Search bar in `PassageiroScreen`
- **Flow**:
  1. User types ≥ 3 chars → debounced call to `pesquisaFacade.geocodeAddress({query, proximity})`
  2. Proximity bias uses user GPS location (`userLocation.latitude`, `userLocation.longitude`)
  3. Results mapped from `GeocodingResult[]` → `SearchResult[]` for Redux store
  4. Rendered in `FlatList` with `placeName` and `address`
- **Auth**: JWT token from Redux (`state.auth.token`) attached via `Authorization: Bearer <token>`

### 3. **GET /pesquisa/reverse-geocoding** — Reverse Geocoding
- **Facade**: `PesquisaFacadeImpl.reverseGeocode(input)`
- **Status**: Implemented but not yet wired to UI
- **Potential use**: Convert map pin coordinates → address for form prefill

---

## 🔧 Key Fixes Applied

### Issue 1: Map Not Loading
**Root cause**: `ENV.MAPBOX_ACCESS_TOKEN` was hardcoded at module load time.

**Fix**:
- Removed `mod.default.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN)` from module-level init
- Added `useEffect` in `PassageiroScreen` that calls `MapboxGL.setAccessToken(mapboxToken)` after token fetch
- Map render gated on `MapboxGL && mapboxToken` — shows spinner while loading

### Issue 2: Search Not Authenticated
**Root cause**: `FacadeProvider` in `App.tsx` didn't receive a `getToken` prop.

**Fix**:
- Moved `FacadeProvider` inside `AppShell` (where Redux state is accessible)
- Created `getToken` callback: `const getToken = useMemo(() => () => token, [token]);`
- Passed `getToken` to `<FacadeProvider getToken={getToken}>`
- `PesquisaFacadeImpl` now attaches `Authorization: Bearer <token>` to all requests

### Issue 3: Home/Work Shortcuts in Idle State
**Root cause**: UI showed placeholder shortcuts instead of prompting user to type.

**Fix**:
- Replaced shortcuts with "type at least 3 characters" hint (`pesquisa.geocoding.minChars`)
- Search overlay states:
  - `isSearching` → spinner
  - `searchResults.length > 0` → FlatList
  - `query ≥ 3 chars && no results` → "no results" message
  - `query < 3 chars` → "type at least 3 characters" hint

---

## 📁 Files Modified

| File | Change |
|------|--------|
| `src/types/pesquisa.ts` | Domain types for all 3 endpoints |
| `src/services/facades/PesquisaFacade.ts` | Facade contract + impl with auth headers |
| `src/services/facades/mock/PesquisaFacadeMock.ts` | Mock impl for `MOCK_MODE` |
| `src/services/facades/index.ts` | Registered `pesquisaFacade` in provider |
| `src/screens/Passageiro/usePassageiro.ts` | Fetch config on mount, use `geocodeAddress` with proximity |
| `src/screens/Passageiro/PassageiroScreen.tsx` | Token-driven Mapbox init, removed shortcuts |
| `src/App.tsx` | Pass `getToken` to `FacadeProvider` |
| `src/i18n/locales/{pt-BR,en-US,es}.json` | Added `pesquisa` namespace strings |
| `src/screens/Passageiro/__tests__/PesquisaSearchBar.test.tsx` | POC tests (6 scenarios) |

---

## 🧪 Testing

Run the POC test suite:
```bash
npm test -- src/screens/Passageiro/__tests__/PesquisaSearchBar.test.tsx
```

Covers:
- Loading state (spinner while geocoding)
- Success (results rendered)
- Empty state (no results message)
- Min-chars guard (< 3 chars → no API call)
- Result selection (closes overlay, sets destination)

---

## 🚀 Next Steps (Optional)

1. **Reverse geocoding UI**: Wire `reverseGeocode` to a map long-press gesture for address prefill
2. **Rate limit handling**: Show toast when `429` is returned (`pesquisa.geocoding.rateLimited`)
3. **Offline fallback**: Cache recent searches in AsyncStorage for offline mode
4. **Analytics**: Track search queries and selection rates

---

## 📝 Commit Message

```
feat(pesquisa): implement geocoding routes with auth and dynamic map token

- src/types/pesquisa.ts — PesquisaConfig, GeocodingResult, ReverseGeocodingResult
- src/services/facades/PesquisaFacade.ts — IPesquisaFacade + impl with JWT auth
- src/services/facades/mock/PesquisaFacadeMock.ts — mock for MOCK_MODE
- src/services/facades/index.ts — register pesquisaFacade in provider
- src/screens/Passageiro/usePassageiro.ts — fetch config on mount, geocode with proximity
- src/screens/Passageiro/PassageiroScreen.tsx — token-driven Mapbox init, remove shortcuts
- src/App.tsx — pass getToken to FacadeProvider for authenticated requests
- src/i18n/locales/*.json — pesquisa namespace strings
- src/screens/Passageiro/__tests__/PesquisaSearchBar.test.tsx — 6 tests, TSC clean

Fixes:
- Map now loads with server-issued token from GET /pesquisa/config
- Search bar uses GET /pesquisa/geocoding with JWT auth and proximity bias
- Idle state shows "type at least 3 characters" hint instead of shortcuts
```
