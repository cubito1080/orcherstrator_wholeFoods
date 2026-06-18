# Orchestrator

NestJS API for uploads, jobs, signed worker webhooks, human review, and budget
exports.

## Local Run

Known-good no-Docker local mode from the repo root:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm install
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @auto-estimator/orchestrator build

DB_TYPE=sqljs \
STORAGE_MODE=local \
WORKER_MODE=mock \
SQLJS_DB_PATH=/tmp/auto-estimator-platform.sqlite \
LOCAL_STORAGE_DIR=/tmp/auto-estimator-storage \
PORT=4000 \
JWT_SECRET=local-dev \
node apps/orchestrator/dist/main.js
```

The app uses TypeORM `synchronize` outside production to keep the local MVP fast
to iterate. Production should replace this with checked-in migrations before the
first persistent deployment.

See `../../docs/LOCAL_DEVELOPMENT.md` and `../../docs/ENVIRONMENT.md` for the
full workflow and env-var reference.
