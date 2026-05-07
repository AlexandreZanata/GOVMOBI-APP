/**
 * @fileoverview Payload parsers and timed fetch for Pesquisa domain.
 */
import type {
  GeocodingResult,
  PesquisaConfig,
  PesquisaRouteResult,
  ReverseGeocodingResult,
} from '../../../types/pesquisa';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const REQUEST_TIMEOUT_MS = 10000;

export const unwrapEnvelopeData = (payload: unknown): unknown => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

export const toPesquisaConfig = (payload: unknown): PesquisaConfig | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const token =
    unwrapped.mapboxPublicToken ?? unwrapped.mapboxToken ?? unwrapped.token;

  if (typeof token === 'string' && token.trim().length > 0) {
    return {mapboxPublicToken: token.trim()};
  }

  return null;
};

const parseLngLatFromRecord = (
  item: Record<string, unknown>,
): {lat: number; lng: number} => {
  if (Array.isArray(item.center) && item.center.length >= 2) {
    const lng = Number(item.center[0]);
    const lat = Number(item.center[1]);
    return {lat, lng};
  }

  return {
    lat: Number(item.lat ?? item.latitude ?? NaN),
    lng: Number(item.lng ?? item.longitude ?? NaN),
  };
};

const toGeocodingResultFromRecord = (
  item: Record<string, unknown>,
): GeocodingResult | null => {
  const {lat, lng} = parseLngLatFromRecord(item);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const placeName = String(
    item.placeName ??
      item.place_name ??
      item.text ??
      item.name ??
      item.display_name ??
      item.formatted_address ??
      item.address ??
      '',
  ).trim();

  const address = String(
    item.address ??
      item.place_name ??
      item.placeName ??
      item.formatted_address ??
      item.display_name ??
      item.fullAddress ??
      item.text ??
      item.name ??
      '',
  ).trim();

  const resolvedPlaceName = placeName || address;
  const resolvedAddress = address || placeName;

  if (!resolvedPlaceName || !resolvedAddress) {
    return null;
  }

  return {
    address: resolvedAddress,
    placeName: resolvedPlaceName,
    lat,
    lng,
  };
};

export const toGeocodingResults = (payload: unknown): GeocodingResult[] => {
  const unwrapped = unwrapEnvelopeData(payload);

  const candidates = Array.isArray(unwrapped)
    ? unwrapped
    : isRecord(unwrapped) && Array.isArray(unwrapped.features)
      ? unwrapped.features
      : isRecord(unwrapped) && Array.isArray(unwrapped.results)
        ? unwrapped.results
        : [];

  return candidates
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map(toGeocodingResultFromRecord)
    .filter((item): item is GeocodingResult => item !== null);
};

export const fetchWithTimeout = async (
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetch(url, init), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const toReverseGeocodingResult = (
  payload: unknown,
): ReverseGeocodingResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  const candidate = Array.isArray(unwrapped)
    ? unwrapped[0]
    : isRecord(unwrapped) && Array.isArray(unwrapped.results)
      ? unwrapped.results[0]
      : unwrapped;

  if (!isRecord(candidate)) {
    return null;
  }

  const address =
    candidate.address ??
    candidate.placeName ??
    candidate.place_name ??
    candidate.formatted_address;
  const lat = candidate.lat ?? candidate.latitude;
  const lng = candidate.lng ?? candidate.longitude;

  if (
    typeof address !== 'string' ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  ) {
    return null;
  }

  return {
    address: String(address),
    lat: Number(lat),
    lng: Number(lng),
  };
};

const toRouteGeometry = (
  payload: unknown,
): PesquisaRouteResult['geometry'] | null => {
  if (!isRecord(payload)) {
    return null;
  }

  if (payload.type === 'Feature' && isRecord(payload.geometry)) {
    return toRouteGeometry(payload.geometry);
  }

  if (payload.type !== 'LineString' || !Array.isArray(payload.coordinates)) {
    return null;
  }

  const normalizedCoordinates = payload.coordinates
    .map(coord => {
      if (
        Array.isArray(coord) &&
        coord.length >= 2 &&
        Number.isFinite(Number(coord[0])) &&
        Number.isFinite(Number(coord[1]))
      ) {
        return [Number(coord[0]), Number(coord[1])] as [number, number];
      }

      if (isRecord(coord)) {
        const lng = Number(coord.lng ?? coord.longitude);
        const lat = Number(coord.lat ?? coord.latitude);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          return [lng, lat] as [number, number];
        }
      }

      return null;
    })
    .filter((coord): coord is [number, number] => coord !== null);

  if (normalizedCoordinates.length < 2) {
    return null;
  }

  return {
    type: 'LineString',
    coordinates: normalizedCoordinates,
  };
};

export const toPesquisaRouteResult = (
  payload: unknown,
): PesquisaRouteResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const directGeometry =
    toRouteGeometry(unwrapped.geometry) ??
    toRouteGeometry(unwrapped.geometria) ??
    toRouteGeometry(unwrapped.routeGeometry) ??
    toRouteGeometry(unwrapped.route);
  const routeSource =
    !directGeometry &&
    ((Array.isArray(unwrapped.routes) && unwrapped.routes.length > 0
      ? unwrapped.routes[0]
      : null) ??
      (isRecord(unwrapped.rota) ? unwrapped.rota : null) ??
      (isRecord(unwrapped.route) ? unwrapped.route : null));
  const routeRecord = isRecord(routeSource) ? routeSource : null;
  const geometry =
    directGeometry ??
    toRouteGeometry(routeRecord?.geometry) ??
    toRouteGeometry(routeRecord?.geometria);

  if (!geometry) {
    return null;
  }

  const rawDistance = Number(
    unwrapped.distanciaMetros ??
      routeRecord?.distanciaMetros ??
      unwrapped.distance ??
      routeRecord?.distance,
  );
  const rawDuration = Number(
    unwrapped.duracaoSegundos ??
      routeRecord?.duracaoSegundos ??
      unwrapped.duration ??
      routeRecord?.duration,
  );

  const start = geometry.coordinates[0];
  const end = geometry.coordinates[geometry.coordinates.length - 1];
  const fallbackDistanceMeters =
    Number.isFinite(Number(start?.[0])) && Number.isFinite(Number(end?.[0]))
      ? Math.round(
          Math.hypot(
            Number(end[0]) - Number(start[0]),
            Number(end[1]) - Number(start[1]),
          ) * 111000,
        )
      : 0;

  const distance = Number.isFinite(rawDistance)
    ? rawDistance
    : Math.max(0, fallbackDistanceMeters);
  const duration = Number.isFinite(rawDuration)
    ? rawDuration
    : Math.max(60, Math.round(distance / 8));

  return {
    geometry,
    distanciaMetros: distance,
    duracaoSegundos: duration,
  };
};
