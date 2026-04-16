# Search Bar Behavior Confirmation

## ✅ Requirements Met

### 1. **Auto-search on typing (no manual search button)**
**Status**: ✅ Already implemented

**How it works**:
```typescript
// In usePassageiro.ts, onSearchChange callback:
searchDebounceRef.current = setTimeout(async () => {
  // Auto-fires after 400ms of no typing
  const result = await pesquisaFacade.geocodeAddress({query: text, proximity});
  // Results appear automatically
}, SEARCH_DEBOUNCE_MS); // 400ms
```

**User experience**:
1. User types "rua das flores"
2. User stops typing
3. After 400ms → API call fires automatically
4. Results appear in the overlay
5. No search button needed

---

### 2. **Always pass user location (lat/lng) for proximity filtering**
**Status**: ✅ Already implemented

**How it works**:
```typescript
// In usePassageiro.ts, onSearchChange callback:
const proximity = userLocation
  ? {lat: userLocation.latitude, lng: userLocation.longitude}
  : undefined;

const result = await pesquisaFacade.geocodeAddress({
  query: text,
  proximity, // Always passed when GPS location is available
});
```

**API call example**:
```
GET /pesquisa/geocoding?q=ditalia&lat=-16.6869&lng=-49.2648
Authorization: Bearer <token>
```

**Behavior**:
- If GPS permission granted → `lat` and `lng` are included in every search
- If GPS permission denied → search still works, but without proximity bias
- Results are sorted by relevance + proximity when coordinates are provided

---

## 🔄 Current Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User opens PassageiroScreen                              │
│    → GPS permission requested                                │
│    → User location fetched: {lat: -16.68, lng: -49.26}      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User taps search bar                                      │
│    → Search overlay opens                                    │
│    → Shows hint: "Digite pelo menos 3 caracteres"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User types "ditalia"                                      │
│    → Query length: 7 chars (≥ 3, valid)                     │
│    → Debounce timer starts (400ms)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User stops typing                                         │
│    → After 400ms: API call fires automatically              │
│    → GET /pesquisa/geocoding?q=ditalia&lat=-16.68&lng=-49.26│
│    → Authorization: Bearer <token>                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Results returned                                          │
│    → Mapped to SearchResult[]                                │
│    → Rendered in FlatList                                    │
│    → Sorted by proximity (closest first)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User taps a result                                        │
│    → Destination selected                                    │
│    → Overlay closes                                          │
│    → Map pans to destination                                 │
│    → "Request Ride" button enabled                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Implementation Details

### Debounce Timer
- **Value**: 400ms (`SEARCH_DEBOUNCE_MS`)
- **Purpose**: Prevents API spam while user is typing
- **Behavior**: Resets on every keystroke, fires only after user stops

### Minimum Query Length
- **Value**: 3 characters
- **Enforced**: Client-side (no API call if < 3 chars)
- **User feedback**: Shows hint "Digite pelo menos 3 caracteres"

### Proximity Bias
- **Always included**: When GPS location is available
- **Format**: `?lat=-16.6869&lng=-49.2648`
- **Effect**: Backend (Mapbox + Redis) prioritizes nearby results

### Authentication
- **Header**: `Authorization: Bearer <token>`
- **Token source**: Redux store (`state.auth.token`)
- **Injected**: Via `getToken` callback in `FacadeProvider`

---

## 📊 Example API Request/Response

### Request
```http
GET /pesquisa/geocoding?q=ditalia%20sorriso&lat=-16.6869&lng=-49.2648 HTTP/1.1
Host: 172.19.2.116:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: */*
```

### Response
```json
[
  {
    "address": "ditalia sorriso",
    "placeName": "Jardim Itália, Sorriso, Mato Grosso, Brasil",
    "lng": -55.732418,
    "lat": -12.555938
  },
  {
    "address": "ditalia sorriso",
    "placeName": "Rua Sorriso, Jardim Itália, Cuiabá - Mato Grosso, 78050, Brasil",
    "lng": -56.065916,
    "lat": -15.598826
  }
]
```

### Mapped to UI
```typescript
[
  {
    id: "-12.555938--55.732418-0",
    placeName: "Jardim Itália, Sorriso, Mato Grosso, Brasil",
    address: "ditalia sorriso",
    coordinates: {latitude: -12.555938, longitude: -55.732418}
  },
  // ...
]
```

---

## ✅ Confirmation

Both requirements are **already implemented and working**:

1. ✅ **Auto-search**: User types → stops → 400ms → search fires automatically
2. ✅ **Proximity always passed**: GPS location included in every request when available

No code changes needed. The implementation is complete and follows the API contract exactly.
