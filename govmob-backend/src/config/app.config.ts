import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const AppConfigSchema = z.object({
  app: z.object({
    name: z.string().default('govmob-backend'),
    nodeEnv: z
      .enum(['development', 'staging', 'production', 'test'])
      .default('development'),
    port: z.coerce.number().int().positive().default(3000),
    apiPrefix: z.string().default('api'),
    corsOrigins: z.string().default('*'),
    skipThrottle: z.coerce.boolean().default(false),
  }),
  database: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().positive().default(5432),
    user: z.string().min(1),
    password: z.string().min(1),
    name: z.string().min(1),
    schema: z.string().default('public'),
    ssl: z.coerce.boolean().default(false),
    poolMin: z.coerce.number().int().nonnegative().default(1),
    poolMax: z.coerce.number().int().positive().default(20),
    connectionTimeoutMs: z.coerce.number().int().positive().default(5000),
  }),
  redis: z.object({
    host: z.string().min(1).default('localhost'),
    port: z.coerce.number().int().positive().default(6379),
    password: z.string().optional(),
    db: z.coerce.number().int().default(0),
    ttlDefaultSeconds: z.coerce.number().default(3600),
    maxRetriesPerRequest: z.coerce.number().int().default(3),
    clusterMode: z.coerce.boolean().default(false),
    routeCacheTtlSeconds: z.coerce.number().int().positive().default(86400), // 24h default
  }),
  mapbox: z.object({
    accessToken: z.string().min(1),
  }),
  onesignal: z.object({
    appId: z.string().min(1),
    restApiKey: z.string().min(1),
  }),
  auth: z.object({
    accessSecret: z.string().min(8).default('access_secret_change_me'),
    refreshSecret: z.string().min(8).default('refresh_secret_change_me'),
    jwtExpiresIn: z.string().default('1d'),
  }),
  geo: z.object({
    municipioId: z.string().min(1),
    raioInicialDespachoKm: z.coerce.number().positive().default(5),
    raioPassoExpansaoKm: z.coerce.number().positive().default(5),
    raioMaximoDespachoKm: z.coerce.number().positive().default(20),
    limitarPorMunicipio: z.coerce.boolean().default(true),
    raioGeofenceKm: z.coerce.number().positive().optional(),
    nivelAutoridade: z.coerce.number().int().positive().default(8),
    maxTentativasDespacho: z.coerce.number().int().positive().default(3),
    timeoutAceiteSegundos: z.coerce.number().int().positive().default(30),
    intervaloExpansaoSegundos: z.coerce.number().int().positive().default(30),
    maxDiasAvaliacao: z.coerce.number().int().positive().default(3),
  }),
  jobs: z.object({
    defaultJobOptions: z.object({
      attempts: z.coerce.number().int().default(5),
      backoff: z.object({
        type: z.enum(['fixed', 'exponential']).default('exponential'),
        delay: z.coerce.number().default(2000),
      }),
    }),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export default registerAs('config', (): AppConfig => {
  const values = {
    app: {
      name: process.env.APP_NAME,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      apiPrefix: process.env.API_PREFIX,
      corsOrigins: process.env.CORS_ORIGINS,
      skipThrottle: process.env.APP_SKIP_THROTTLE,
    },
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      name: process.env.DATABASE_NAME,
      schema: process.env.DB_SCHEMA,
      ssl: process.env.DB_SSL,
      poolMin: process.env.DB_POOL_MIN,
      poolMax: process.env.DB_POOL_MAX,
      connectionTimeoutMs: process.env.DB_CONNECTION_TIMEOUT_MS,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB,
      ttlDefaultSeconds: process.env.REDIS_TTL_DEFAULT,
      maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES,
      clusterMode: process.env.REDIS_CLUSTER_MODE,
      routeCacheTtlSeconds: process.env.REDIS_ROUTE_CACHE_TTL,
    },
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN,
    },
    onesignal: {
      appId: process.env.ONESIGNAL_APP_ID,
      restApiKey: process.env.ONESIGNAL_REST_API_KEY,
    },
    auth: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    },
    geo: {
      municipioId: process.env.GEO_MUNICIPIO_ID,
      raioInicialDespachoKm: process.env.GEO_RAIO_INICIAL_KM,
      raioPassoExpansaoKm: process.env.GEO_RAIO_PASSO_KM,
      raioMaximoDespachoKm: process.env.GEO_RAIO_MAX_DESPACHO_KM,
      limitarPorMunicipio: process.env.GEO_LIMITAR_MUNICIPIO,
      raioGeofenceKm: process.env.GEO_RAIO_GEOFENCE_KM,
      nivelAutoridade: process.env.GEO_NIVEL_AUTORIDADE,
      maxTentativasDespacho: process.env.GEO_MAX_TENTATIVAS_DESPACHO,
      timeoutAceiteSegundos: process.env.GEO_TIMEOUT_ACEITE_SEG,
      intervaloExpansaoSegundos: process.env.GEO_INTERVALO_EXPANSAO_SEG,
      maxDiasAvaliacao: process.env.GEO_MAX_DIAS_AVALIACAO,
    },
    jobs: {
      defaultJobOptions: {
        attempts: process.env.BULL_DEFAULT_ATTEMPTS,
        backoff: {
          type: process.env.BULL_BACKOFF_TYPE,
          delay: process.env.BULL_BACKOFF_DELAY,
        },
      },
    },
  };

  const parsed = AppConfigSchema.safeParse(values);

  if (!parsed.success) {
    console.error(
      '❌ Invalid configuration:',
      JSON.stringify(parsed.error.format(), null, 2),
    );
    throw new Error('Invalid configuration');
  }

  return parsed.data;
});
