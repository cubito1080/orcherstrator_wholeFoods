import { Body, Controller, Headers, Inject, Post, Req, UnauthorizedException } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { PipelineCompletedEvent } from "@auto-estimator/contracts";
import { Public } from "../auth/public.decorator";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { ProcessingService } from "./processing.service";

@Controller("worker/webhooks")
@Public()
export class WebhookController {
  constructor(
    private readonly processing: ProcessingService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post("pipeline-completed")
  async pipelineCompleted(
    @Body() body: unknown,
    @Headers("x-auto-estimator-event") event?: string,
    @Headers("x-auto-estimator-signature") signature?: string,
    @Req() request?: RawBodyRequest<Request>,
  ) {
    if (event !== PipelineCompletedEvent) {
      throw new UnauthorizedException("invalid webhook event");
    }
    verifyWebhookSignature(this.config.webhook.secret, request?.rawBody, signature);
    return this.processing.applyWorkerResult(body);
  }
}

function verifyWebhookSignature(
  secret: string | undefined,
  rawBody: Buffer | undefined,
  signature: string | undefined,
) {
  if (!secret) {
    return;
  }
  if (!rawBody || !signature?.startsWith("sha256=")) {
    throw new UnauthorizedException("missing webhook signature");
  }
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new UnauthorizedException("invalid webhook signature");
  }
}
