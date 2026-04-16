# Route: /pesquisa/geocoding — Address Search

> **Domain:** Pesquisa (address geocoding)
> **Base URL:** `http://172.19.2.116:3000` (env: `API_BASE_URL`)
> **Auth required:** Yes (`Authorization: Bearer <accessToken>`)
> **Provider:** Mapbox (with Redis cache)

---

## What This Route Does

`GET /pesquisa/geocoding` searches for an address/place text and returns coordinate candidates (`lat`, `lng`) with a human-readable `placeName`.

The backend uses Mapbox geocoding and caches results in Redis to reduce latency and provider calls.

---

## API Endpoint

| Method | Endpoint              | Description                                  | Success |
| ------ | --------------------- | -------------------------------------------- | ------- |
| `GET`  | `/pesquisa/geocoding` | Search address and return coordinate matches | `200`   |

---

## GET /pesquisa/geocoding

Searches address candidates by free text.

### Query params

| Name | Type   | Required | Description                  |
| ---- | ------ | -------- | ---------------------------- |
| `q`  | string | Yes      | Address/place term to search |

### Example request

```bash
curl -X GET \
  'http://172.19.2.116:3000/pesquisa/geocoding?q=dtalia' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <accessToken>'
```

### Response `200`

```json
[
  {
    "address": "dtalia",
    "placeName": "Rua Dalia Vermelha, Aparecida de Goiania - Goias, Brasil",
    "lng": -49.235608,
    "lat": -16.768804
  },
  {
    "address": "dtalia",
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

---

## Frontend Integration Notes

- Debounce text input (recommended `300ms` to `500ms`) before calling this route.
- Do not call with empty `q`; require at least 3 characters.
- Show top 3 to 5 suggestions and let users pick one.
- Persist selected place as `{ placeName, lat, lng }` in form state.
- Handle rate-limit headers and fallback gracefully (retry with backoff).

---

## Facade Contract Suggestion

```ts
export type GeocodingResult = {
  address: string;
  placeName: string;
  lng: number;
  lat: number;
};

export async function geocodeAddress(
  query: string,
): Promise<GeocodingResult[]> {
  // GET /pesquisa/geocoding?q=${encodeURIComponent(query)}
}
```

---

## Error Handling

- `400`: missing/invalid `q`
- `401`: invalid or expired JWT
- `429`: too many requests (short window rate limit)
- `5xx`: provider or backend transient failure
