# Project Context

## Purpose

This platform is intended to turn large electrical drawing PDFs into a reviewed,
priced electrical estimate.

The product flow is:

```text
Upload electrical PDF
  -> store original document
  -> create processing job
  -> send worker ProcessRequest
  -> worker extracts schedules and detects symbols
  -> worker posts signed ProcessResult webhook
  -> orchestrator persists raw + normalized result
  -> user reviews detections on plan coordinates
  -> budget is recalculated
  -> user exports JSON/CSV
```

## Related Repositories

Completed worker repo:

```text
/home/jerov/workspace/construction
```

New platform repo/workspace:

```text
/home/jerov/workspace/auto-estimator-platform
```

The worker repo contains the AI processing pipeline. This platform repo is the
product and infrastructure shell around it.

## Important PDF Reality

The known Whole Foods electrical PDF is:

- 16 sheets.
- Born-digital vector PDF, not scanned.
- Excellent selectable text layer.
- Very dense floor-plan vector paths.
- No optional-content PDF layers.
- No reusable Form XObject symbol blocks.

Implications:

- Schedule extraction is relatively low risk because the text layer is strong.
- Floor-plan symbol counting is the hard R&D part.
- The worker cannot rely on toggling CAD layers off.
- The worker cannot count reusable symbol block references.
- Floor plans need render -> tile -> detect -> merge -> human review.

## User Preferences Captured

- The user prefers TypeORM over Prisma.
- The user wants an end-to-end finished product, not just isolated libraries.
- The user accepts mocked behavior when API keys or live services are unavailable, as long as the mock contract matches production.
- The project should remain pragmatic and production-oriented.
- The app should expose the actual workflow first, not a marketing landing page.

## What Is Real In This Repo

Real:

- Monorepo structure.
- Shared TypeScript contracts.
- NestJS backend structure.
- TypeORM entities.
- Project creation.
- PDF upload endpoint.
- Local file storage mode.
- S3 storage mode.
- Processing job creation.
- HTTP/SQS/mock worker dispatch modes.
- Worker webhook endpoint.
- HMAC verification helper.
- Detection persistence.
- Review accept/reject/update actions.
- Budget recalculation.
- CSV/JSON exports.
- Next.js pages for core workflows.
- FastAPI detector mock endpoint.
- Terraform skeleton.

Mocked or incomplete:

- Real user authorization on project routes.
- Real deployed worker execution.
- Real detector model.
- Real AWS account resources.
- Real S3/SQS LocalStack bootstrap scripts.
- Production database migrations.
- Browser E2E automation.
- PDF rendering in the frontend review surface.

## Design Intent

This repo is deliberately shaped so agents can make progress in layers:

1. Local mock mode proves the product flow without Docker or API keys.
2. Docker mode can add Postgres, LocalStack, and detector container.
3. Worker integration mode can call `/home/jerov/workspace/construction`.
4. Production mode can deploy AWS resources and real AI services.

Do not skip directly to production changes before keeping local mock mode green.
