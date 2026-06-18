# Agent Context

This workspace is the platform layer for the electrical drawing auto-estimator.
It was created around the completed worker repo at:

```text
/home/jerov/workspace/construction
```

The worker repo remains the source of truth for PDF ingestion, sheet routing,
schedule extraction, symbol detection orchestration, costing, and webhook
delivery. This platform repo supplies the missing product shell: backend API,
frontend review UI, local detector mock, infrastructure skeleton, shared
contracts, and local end-to-end mock mode.

## Current Status

The project is a runnable MVP shell, not a fully live production deployment.

Implemented:

- `apps/orchestrator`: NestJS API with TypeORM entities and project/job/review/budget flows.
- `apps/web`: Next.js operational UI for projects, uploads, review, price catalog, and budgets.
- `packages/contracts`: Zod schemas mirroring the Python worker Pydantic contract.
- `services/detector`: FastAPI Grounded-SAM-compatible mock detector.
- `infra/terraform`: AWS skeleton for S3, SQS, RDS, ECR, secrets, and provider lock.
- No-Docker local mode using SQL.js, local filesystem storage, and mock worker output.

Not yet live:

- Real AWS S3/SQS/RDS deployment.
- Real worker deployment connected to this orchestrator.
- Real Anthropic/Textract/Grounded-SAM calls from the platform.
- Tenant scoping and frontend token handling for enforced auth.
- Production migrations.
- Full Playwright E2E suite.
- Git history for this workspace; `/home/jerov/workspace/auto-estimator-platform`
  is not initialized as a git repo at the time of writing.

## Hard Rules For Future Agents

- Do not change `/home/jerov/workspace/construction` unless the user explicitly asks.
- Treat `packages/contracts` as the platform mirror of the worker contract.
- Preserve the worker JSON field names: `project_id`, `s3_key`, `callback_url`, `unit_prices`.
- Keep `WORKER_MODE=mock` local behavior intact; this is the no-Docker development path.
- Keep production modes intact: PostgreSQL, S3, SQS or HTTP worker dispatch.
- Use TypeORM, not Prisma. The user prefers TypeORM.
- Do not remove SQL.js support unless Docker/Postgres local dev is replaced by another no-Docker path.
- Do not promise true end-to-end AI accuracy until live Anthropic, Textract, and detector endpoints are configured and tested.

## Fast Commands

From `/home/jerov/workspace/auto-estimator-platform`:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm install
COREPACK_HOME=/tmp/corepack corepack pnpm -r typecheck
COREPACK_HOME=/tmp/corepack corepack pnpm -r build
```

Detector tests:

```bash
python3 -m pip install --target /tmp/auto-estimator-detector-deps -r services/detector/requirements.txt
cd services/detector
PYTHONDONTWRITEBYTECODE=1 \
PYTHONPATH=/tmp/auto-estimator-detector-deps:. \
python3 -m pytest -q -p no:cacheprovider test_app.py
```

Terraform:

```bash
cd infra/terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```

## Local No-Docker Runtime

Backend:

```bash
DB_TYPE=sqljs \
STORAGE_MODE=local \
WORKER_MODE=mock \
SQLJS_DB_PATH=/tmp/auto-estimator-platform.sqlite \
LOCAL_STORAGE_DIR=/tmp/auto-estimator-storage \
PORT=4000 \
JWT_SECRET=local-dev \
node apps/orchestrator/dist/main.js
```

Frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api \
COREPACK_HOME=/tmp/corepack \
corepack pnpm --filter @auto-estimator/web start
```

Open:

```text
http://localhost:3000/projects
```

Backend health:

```text
http://localhost:4000/api/health
```

## Last Known Validation

The following passed after implementation:

- `COREPACK_HOME=/tmp/corepack corepack pnpm -r typecheck`
- `COREPACK_HOME=/tmp/corepack corepack pnpm -r build`
- detector tests: `3 passed`
- `terraform fmt -check`
- `terraform validate`
- local API smoke test using the real Whole Foods electrical PDF from the worker repo:
  - project created
  - PDF uploaded to local storage
  - mock worker result generated
  - 2 detections returned
  - budget recalculated to total `225`

## More Context

Start at the documentation hub: **`docs/README.md`** (overview + full map).

Suggested reading order:

1. `README.md`
2. `docs/PROJECT_CONTEXT.md` — why this exists, what is real vs mocked
3. `docs/ARCHITECTURE.md` — components, module graph, lifecycles (most diagrams)
4. `docs/LOCAL_DEVELOPMENT.md` — build, run, smoke test
5. `docs/CONFIGURATION.md` — env vars + run modes (supersedes `docs/ENVIRONMENT.md`)
6. `docs/CONTRACTS.md` — worker/detector/webhook contracts
7. `docs/NEXT_STEPS.md` — roadmap

Reference docs:

- `docs/ORCHESTRATOR.md` — backend module-by-module
- `docs/WEB.md` — frontend
- `docs/DATA_MODEL.md` — entities + ER diagram
- `docs/API_REFERENCE.md` — every HTTP endpoint
- `docs/DETECTOR.md`, `docs/INFRASTRUCTURE.md`, `docs/GLOSSARY.md`
- `docs/CODE_REVIEW.md` — architectural review + the refactor it drove

Note: the orchestrator was refactored into per-domain NestJS modules
(`config/`, `common/`, `persistence/`, `storage/`, `worker/`, and feature modules).
The old flat `apps/orchestrator/src/*.ts` shim files were removed; new backend
work should import from the feature folders.
