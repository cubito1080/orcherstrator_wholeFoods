import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { InternalServerErrorException } from "@nestjs/common";
import type { ProcessRequest } from "@auto-estimator/contracts";
import type { WorkerConfig } from "../config/app-config";
import type { DispatchOutcome, WorkerDispatchStrategy } from "./worker-dispatch.strategy";

/** Enqueues the processing request on SQS; results arrive via webhook. */
export class SqsWorkerStrategy implements WorkerDispatchStrategy {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(config: WorkerConfig) {
    if (!config.sqsQueueUrl) {
      throw new InternalServerErrorException("SQS_QUEUE_URL is required when WORKER_MODE=sqs");
    }
    this.queueUrl = config.sqsQueueUrl;
    this.client = new SQSClient({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
    });
  }

  async dispatch(payload: ProcessRequest): Promise<DispatchOutcome> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(payload),
      }),
    );
    return { mode: "sqs" };
  }
}
