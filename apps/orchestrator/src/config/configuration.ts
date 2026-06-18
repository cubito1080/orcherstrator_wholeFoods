import type {
  AppConfig,
  AwsCredentials,
  DatabaseConfig,
  StorageConfig,
  WorkerConfig,
  WorkerMode,
} from "./app-config";

/**
 * Reads `process.env`, applies clearly-marked development defaults, and fails
 * fast when a production deployment is missing a required secret. This is the
 * single place env vars are read; everything else depends on the typed
 * {@link AppConfig} object this returns.
 */
export function buildAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const missing: string[] = [];

  const requireEnv = (name: string, devDefault: string): string => {
    const value = env[name];
    if (value && value.trim()) return value;
    if (isProduction) {
      missing.push(name);
      return "";
    }
    return devDefault;
  };

  const jwtSecret = requireEnv("JWT_SECRET", "local-dev-secret-change-me");
  const database = buildDatabaseConfig(env, requireEnv);
  const storage = buildStorageConfig(env);
  const worker = buildWorkerConfig(env);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}`,
    );
  }

  const webOriginsRaw = env.WEB_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    isProduction,
    port: Number(env.PORT ?? 4000),
    publicApiUrl: env.PUBLIC_API_URL ?? `http://localhost:${env.PORT ?? 4000}`,
    webOrigins: webOriginsRaw && webOriginsRaw.length > 0 ? webOriginsRaw : true,
    jwt: { secret: jwtSecret, expiresIn: env.JWT_EXPIRES_IN ?? "8h" },
    auth: { enforce: (env.AUTH_ENFORCE ?? "false") === "true" },
    database,
    storage,
    worker,
    webhook: { secret: env.WORKER_WEBHOOK_SECRET || undefined },
    synchronize: !isProduction,
  };
}

type RequireFn = (name: string, devDefault: string) => string;

function buildDatabaseConfig(env: NodeJS.ProcessEnv, requireEnv: RequireFn): DatabaseConfig {
  if (env.DB_TYPE === "sqljs") {
    return {
      type: "sqljs",
      location: env.SQLJS_DB_PATH ?? "/tmp/auto-estimator-platform.sqlite",
    };
  }
  return {
    type: "postgres",
    url: requireEnv(
      "DATABASE_URL",
      "postgres://auto_estimator:auto_estimator@localhost:5432/auto_estimator",
    ),
  };
}

function buildStorageConfig(env: NodeJS.ProcessEnv): StorageConfig {
  const mode = (env.STORAGE_MODE ?? "s3") === "local" ? "local" : "s3";
  return {
    mode,
    localDir: env.LOCAL_STORAGE_DIR ?? "/tmp/auto-estimator-storage",
    bucket: env.S3_BUCKET ?? "auto-estimator-local",
    region: env.AWS_REGION ?? "us-east-1",
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: readAwsCredentials(env),
  };
}

function buildWorkerConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const mode: WorkerMode =
    env.WORKER_MODE === "mock" || env.WORKER_MODE === "sqs"
      ? env.WORKER_MODE
      : "http";
  return {
    mode,
    httpUrl: env.WORKER_HTTP_URL ?? "http://localhost:8000/process",
    sqsQueueUrl: env.SQS_QUEUE_URL || undefined,
    region: env.AWS_REGION ?? "us-east-1",
    endpoint: env.SQS_ENDPOINT || undefined,
    credentials: readAwsCredentials(env),
  };
}

function readAwsCredentials(env: NodeJS.ProcessEnv): AwsCredentials | undefined {
  if (!env.AWS_ACCESS_KEY_ID) return undefined;
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
  };
}
