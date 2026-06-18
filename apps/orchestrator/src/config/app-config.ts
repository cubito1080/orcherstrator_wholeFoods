/**
 * Strongly-typed application configuration.
 *
 * The whole app depends on this typed object instead of reading `process.env`
 * directly. It is built and validated once at boot (see {@link buildAppConfig})
 * and provided through the {@link APP_CONFIG} injection token.
 */

/** DI token for the validated {@link AppConfig} object. */
export const APP_CONFIG = Symbol("APP_CONFIG");

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export type DatabaseConfig =
  | { type: "sqljs"; location: string }
  | { type: "postgres"; url: string };

export interface StorageConfig {
  mode: "local" | "s3";
  localDir: string;
  bucket: string;
  region: string;
  endpoint?: string;
  credentials?: AwsCredentials;
}

export type WorkerMode = "mock" | "http" | "sqs";

export interface WorkerConfig {
  mode: WorkerMode;
  httpUrl: string;
  sqsQueueUrl?: string;
  region: string;
  endpoint?: string;
  credentials?: AwsCredentials;
}

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  /** Base URL the worker should call back on (used to build webhook callback URLs). */
  publicApiUrl: string;
  /** Allowed CORS origins, or `true` to allow any (dev only). */
  webOrigins: string[] | true;
  jwt: { secret: string; expiresIn: string };
  /** When false, auth guards are installed but do not block requests. */
  auth: { enforce: boolean };
  database: DatabaseConfig;
  storage: StorageConfig;
  worker: WorkerConfig;
  webhook: { secret?: string };
  /** Whether TypeORM should auto-synchronise the schema (never in production). */
  synchronize: boolean;
}
