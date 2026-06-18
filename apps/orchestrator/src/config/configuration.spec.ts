import { buildAppConfig } from "./configuration";

describe("buildAppConfig", () => {
  it("applies safe development defaults", () => {
    const config = buildAppConfig({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(config.isProduction).toBe(false);
    expect(config.jwt.secret).toBe("local-dev-secret-change-me");
    expect(config.port).toBe(4000);
    expect(config.webOrigins).toBe(true);
    expect(config.synchronize).toBe(true);
  });

  it("fails fast in production when required secrets are missing", () => {
    expect(() => buildAppConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(
      /Missing required environment variables/,
    );
  });

  it("accepts a fully-configured production environment", () => {
    const config = buildAppConfig({
      NODE_ENV: "production",
      JWT_SECRET: "super-secret",
      DATABASE_URL: "postgres://user:pass@db:5432/app",
      WEB_ORIGIN: "https://app.example.com, https://admin.example.com",
    } as NodeJS.ProcessEnv);
    expect(config.isProduction).toBe(true);
    expect(config.synchronize).toBe(false);
    expect(config.jwt.secret).toBe("super-secret");
    expect(config.webOrigins).toEqual([
      "https://app.example.com",
      "https://admin.example.com",
    ]);
  });

  it("selects the sqljs backend when DB_TYPE=sqljs", () => {
    const config = buildAppConfig({
      NODE_ENV: "development",
      DB_TYPE: "sqljs",
      SQLJS_DB_PATH: "/tmp/test.sqlite",
    } as NodeJS.ProcessEnv);
    expect(config.database).toEqual({ type: "sqljs", location: "/tmp/test.sqlite" });
  });
});
