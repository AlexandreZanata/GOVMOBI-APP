# Route: /pesquisa/\* — Search and Geocoding

> **Domain:** Pesquisa (search/geocoding)
> **Base URL:** `http://172.19.2.116:3000` (env: `API_BASE_URL`)
> **Auth required:** Yes (`Authorization: Bearer <accessToken>`)
> **Provider:** Mapbox (with Redis cache)

---

## What This Route Does

`/pesquisa` provides map config, forward geocoding, and reverse geocoding APIs.

- `GET /pesquisa/config`: returns frontend map settings, including the public Mapbox token.
- `GET /pesquisa/geocoding`: text -> coordinate candidates (`lat`, `lng`) with `placeName`.
- `GET /pesquisa/reverse-geocoding`: coordinate pair -> human-readable address.

The backend uses Mapbox with Redis cache to reduce latency and provider calls.

---

## API Endpoint

| Method | Endpoint                      | Description                                  | Success |
| ------ | ----------------------------- | -------------------------------------------- | ------- |
| `GET`  | `/pesquisa/config`            | Return map settings for frontend usage       | `200`   |
| `GET`  | `/pesquisa/geocoding`         | Search address and return coordinate matches | `200`   |
| `GET`  | `/pesquisa/reverse-geocoding` | Convert coordinates to a readable address    | `200`   |

---

## GET /pesquisa/config

Returns map configuration values used by the frontend.

### Query params

None.

### Example request

```bash
curl -X GET \
  'http://172.19.2.116:3000/pesquisa/config' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <accessToken>'
```

### Response `200`

```json
{
  "mapboxPublicToken": "pk.********************************"
}
```

---

## GET /pesquisa/geocoding

Searches address candidates by free text.

### Query params

| Name  | Type   | Required | Description                                 |
| ----- | ------ | -------- | ------------------------------------------- |
| `q`   | string | Yes      | Address/place term to search                |
| `lat` | number | No       | Latitude used to prioritize nearby results  |
| `lng` | number | No       | Longitude used to prioritize nearby results |

### Example request

```bash
curl -X GET \
  'http://172.19.2.116:3000/pesquisa/geocoding?q=ditalia&lat=-16.6869&lng=-49.2648' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <accessToken>'
```

### Response `200`

```json
[
  {
    "address": "ditalia",
    "placeName": "Rua Dalia Vermelha, Aparecida de Goiania - Goias, Brasil",
    "lng": -49.235608,
    "lat": -16.768804
  },
  {
    "address": "ditalia",
    "placeName": "Rua Italia Nova Europa, Alto Da Boa Vista, Tres Lagoas - Mato Grosso do Sul, Brasil",
    "lng": -51.723769,
    "lat": -20.766677
  }
]
```

### Response headers (sample)

- `content-type: application/json; charset=utf-8`
- `x-ratelimit-limit-short: 10`
- `x-ratelimit-remaining-short: 9`
- `x-ratelimit-reset-short: 59999`

### Response `401`

```json
{
  "statusCode": 401,
  "timestamp": "2026-04-16T19:01:56.422Z",
  "path": "/pesquisa/geocoding?q=ditalia",
  "code": "Unauthorized",
  "message": "Acesso nao autorizado"
}
```

---

## GET /pesquisa/reverse-geocoding

Converts coordinates to a readable address.

### Query params

| Name  | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `lat` | number | Yes      | Latitude    |
| `lng` | number | Yes      | Longitude   |

### Example request

```bash
curl -X GET \
  'http://172.19.2.116:3000/pesquisa/reverse-geocoding?lat=-16.768804&lng=-49.235608' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <accessToken>'
```

### Response `200`

```json
{
  "address": "Rua Dalia Vermelha, Aparecida de Goiania - Goias, Brasil",
  "lat": -16.768804,
  "lng": -49.235608
}
```

### Response `401`

If the token is missing or invalid, the API returns unauthorized in the same error shape shown above.

---

## Frontend Integration Notes

- Debounce text input (recommended `300ms` to `500ms`) before calling this route.
- Do not call with empty `q`; require at least 3 characters.
- Show top 3 to 5 suggestions and let users pick one.
- Persist selected place as `{ placeName, lat, lng }` in form state.
- Handle rate-limit headers and fallback gracefully (retry with backoff).
- Load `/pesquisa/config` once on app boot and cache it in memory.
- Use `lat`/`lng` proximity when the device location is known to improve relevance.
- Use reverse geocoding to prefill forms from map pin position.

---

## Facade Contract Suggestion

```ts
export type GeocodingResult = {
  address: string;
  placeName: string;
  lng: number;
  lat: number;
};

export type PesquisaConfig = {
  mapboxPublicToken: string;
};

export async function getPesquisaConfig(): Promise<PesquisaConfig> {
  // GET /pesquisa/config
}

export async function geocodeAddress(
  query: string,
  proximity?: {lat: number; lng: number},
): Promise<GeocodingResult[]> {
  // GET /pesquisa/geocoding?q=${encodeURIComponent(query)}&lat=...&lng=...
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{
  address: string;
  lat: number;
  lng: number;
}> {
  // GET /pesquisa/reverse-geocoding?lat=${lat}&lng=${lng}
}
```

---

## Error Handling

- `400`: missing/invalid `q`
- `400`: missing/invalid `lat` or `lng` (reverse geocoding)
- `401`: invalid or expired JWT
- `429`: too many requests (short window rate limit)
- `5xx`: provider or backend transient failure
