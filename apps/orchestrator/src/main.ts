import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { APP_CONFIG } from "./config/app-config";
import type { AppConfig } from "./config/app-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get<AppConfig>(APP_CONFIG);

  app.enableCors({ origin: config.webOrigins, credentials: true });
  app.setGlobalPrefix("api");

  await app.listen(config.port);
  Logger.log(`orchestrator listening on :${config.port}`, "Bootstrap");
}

void bootstrap();
