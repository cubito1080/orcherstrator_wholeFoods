# Next Steps

This repo is useful and runnable, but it is not the final production system.
These are the main remaining workstreams.

## 1. Finish Auth And Tenant Scoping

Current state:

- Register/login exists.
- JWT issuance exists.
- A global `AUTH_ENFORCE` guard protects non-public routes when enabled.
- `AUTH_ENFORCE=false` remains the default so the current no-login web flow works.
- Tenant scoping is not yet applied to project, price, detection, budget, or export queries.

Implement:

- Frontend login/token storage and authenticated API requests.
- Tenant scoping on all project, price, detection, budget, and export queries.
- Tests proving users cannot access other tenants' data.

## 2. Add TypeORM Migrations

Current state:

- `synchronize` is used outside production.
- SQL.js local mode uses portable TypeORM column types.

Implement:

- Migration generation for PostgreSQL.
- Production config with `synchronize: false`.
- Migration command scripts.
- CI migration validation.

## 3. Improve Frontend PDF Review

Current state:

- Detection boxes render on a fixed plan-like surface.
- The original PDF page is not rendered under the boxes.

Implement:

- PDF.js or another browser PDF renderer.
- Page selector.
- Coordinate scaling from worker pixel/page space to rendered PDF viewport.
- Zoom/pan.
- Box drag/resize.
- Keyboard-efficient review.

## 4. Connect Real Worker

Current state:

- `WORKER_MODE=mock` is locally proven.
- `WORKER_MODE=http` and `WORKER_MODE=sqs` are implemented but not live-tested against deployed worker.

Implement:

- Run Python worker API from `/home/jerov/workspace/construction`.
- Configure `WORKER_HTTP_URL`.
- Configure worker `ORCHESTRATOR_WEBHOOK_URL`.
- Configure shared `WORKER_WEBHOOK_SECRET`.
- Run full local HTTP callback test.
- Then test SQS mode with LocalStack or AWS.

## 5. Connect Real Storage And Queue

Current state:

- Local storage mode works.
- S3/SQS clients exist.
- Docker is not available in this WSL environment.

Implement:

- LocalStack bootstrap script when Docker is available.
- Create S3 bucket and SQS queue automatically in local setup.
- Add SQS DLQ handling.
- Add job retry and failure state mapping.

## 6. Replace Detector Mock Internals

Current state:

- `services/detector` exposes the correct HTTP shape.
- It returns deterministic mock detections.

Implement:

- Real Grounded-SAM-compatible model wrapper.
- GPU Docker image.
- Confidence thresholding.
- Prompt-level configuration.
- Batch/tile performance tests.
- RunPod/Modal/SageMaker deployment target.

## 7. Production Infrastructure

Current state:

- Terraform validates.
- Resources are a skeleton, not a full deploy.

Implement:

- VPC/subnets/security groups or import existing network.
- ECS service for orchestrator.
- Web deployment target.
- RDS parameter/storage/backups.
- IAM policies for S3/SQS/Secrets.
- CloudWatch dashboards and alarms.
- Remote Terraform backend.
- Environment-specific tfvars.

## 8. Full E2E Tests

Current state:

- Manual smoke test passed with real PDF and mock worker.
- Detector unit tests pass.
- TypeScript builds pass.

Implement:

- API integration tests for orchestrator.
- Playwright tests for upload, process, review, budget, export.
- Mock worker webhook fixture test.
- Real worker gated smoke test.
- Regression fixture based on the Whole Foods PDF.

## 9. Data Quality And Auditability

Implement:

- Immutable raw worker result archive.
- Review audit trail with user identity.
- Export versioning.
- Budget snapshot after final review.
- Warning/error surfacing in UI.
- Confidence filters and review queues.

## 10. Product Polish

Implement:

- Better empty/loading/error states.
- Upload progress.
- Project deletion/archive.
- Price catalog import/export.
- Symbol label aliases.
- Schedule table viewer.
- Final estimate summary page.
- PDF/Excel export.

## Suggested Agent Order

1. Auth guard and tenant scoping.
2. PDF.js review surface.
3. Orchestrator integration tests.
4. Local worker HTTP integration.
5. PostgreSQL migrations.
6. Playwright E2E.
7. AWS/LocalStack queue and storage hardening.
8. Real detector service.
