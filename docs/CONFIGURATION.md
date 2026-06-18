# Configuration & Environment

Everything the orchestrator (and the rest of the platform) reads from the
environment, how it is validated, and which run modes the variables select.

> The orchestrator reads `process.env` in **exactly one place** —
> `apps/orchestrator/src/config/configuration.ts` — and exposes a typed, validated
> `AppConfig` object through the `APP_CONFIG` injection token. Nothing else reads
> env directly. See [ORCHESTRATOR.md](ORCHESTRATOR.md#configuration).

---

## The typed config model

```mermaid
flowchart LR
    env["process.env<br/>(+ .env via @nestjs/config)"] --> build["buildAppConfig()"]
    build -->|missing required in prod| fail([❌ throw & refuse to boot])
    build -->|ok| cfg["AppConfig"]
    cfg --> g1["jwt"]
    cfg --> g2["auth"]
    cfg --> g3["database"]
    cfg --> g4["storage"]
    cfg --> g5["worker"]
    cfg --> g6["webhook"]
```

`buildAppConfig()` rules:

- **Development** (`NODE_ENV !== "production"`) — applies the *dev defaults* below and
  sets `synchronize: true`.
- **Production** (`NODE_ENV === "production"`) — `synchronize: false`, and **missing
  required secrets cause a startup error** listing every missing variable.

> ⚠️ There are **no insecure fallback secrets** in production. The old
> `JWT_SECRET ?? "change-me"` and AWS `?? "test"` defaults were removed; production
> must supply real values or the app will not start.

---

## Orchestrator variables

### Core / HTTP

| Variable | Used by | Dev default | Production |
|---|---|---|---|
| `NODE_ENV` | config | `development` | set to `production` |
| `PORT` | `main.ts` | `4000` | as needed |
| `PUBLIC_API_URL` | processing (webhook callback URL) | `http://localhost:${PORT}` | public base URL, **no** `/api` suffix |
| `WEB_ORIGIN` | `main.ts` CORS | unset ⇒ allow any origin | **set** a comma-separated allowlist |

### Auth

| Variable | Used by | Dev default | Production |
|---|---|---|---|
| `JWT_SECRET` | `AuthModule` (JWT signing) | `local-dev-secret-change-me` | **required** — strong secret |
| `JWT_EXPIRES_IN` | `AuthModule` | `8h` | as desired |
| `AUTH_ENFORCE` | conditional API auth enforcement | `false` | `true` for protected API deployments; current web UI still needs token handling |

### Database

| Variable | Used by | Dev default | Production |
|---|---|---|---|
| `DB_TYPE` | `DatabaseModule` | `postgres` unless set to `sqljs` | `postgres` |
| `SQLJS_DB_PATH` | sqljs mode | `/tmp/auto-estimator-platform.sqlite` | — |
| `DATABASE_URL` | postgres mode | `postgres://auto_estimator:auto_estimator@localhost:5432/auto_estimator` | **required** |

### Storage

| Variable | Used by | Dev default | Production |
|---|---|---|---|
| `STORAGE_MODE` | `StorageModule` | `s3` unless set to `local` | `s3` |
| `LOCAL_STORAGE_DIR` | local mode | `/tmp/auto-estimator-storage` | — |
| `S3_BUCKET` | s3 mode | `auto-estimator-local` | real bucket |
| `S3_ENDPOINT` | s3 mode | unset ⇒ real AWS | set for LocalStack (enables path-style) |

### Worker dispatch

| Variable | Used by | Dev default | Production |
|---|---|---|---|
| `WORKER_MODE` | `WorkerModule` | `http` unless `mock`/`sqs` | `sqs` or `http` |
| `WORKER_HTTP_URL` | http mode | `http://localhost:8000/process` | worker URL |
| `SQS_QUEUE_URL` | sqs mode | — | **required for sqs** |
| `SQS_ENDPOINT` | sqs mode | unset ⇒ real AWS | set for LocalStack |
| `WORKER_WEBHOOK_SECRET` | webhook controller | unset ⇒ signature check skipped | **set** to enforce HMAC |

### AWS credentials (shared by S3 + SQS clients)

| Variable | Behaviour |
|---|---|
| `AWS_REGION` | default `us-east-1` |
| `AWS_ACCESS_KEY_ID` | if set, credentials are passed explicitly; otherwise the AWS default chain is used |
| `AWS_SECRET_ACCESS_KEY` | paired with the access key (no insecure default) |

---

## Detector service variables

The FastAPI detector (`services/detector`) is configured separately — see
[DETECTOR.md](DETECTOR.md).

| Variable | Default | Meaning |
|---|---|---|
| `DETECTOR_MODE` | `mock` | `mock` returns deterministic detections; `real` returns `501` until a model is wired |
| `DETECTOR_PORT` | `8010` (Dockerfile) | container port |

## Web variables

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `apps/web/app/lib/api-client.ts` | e.g. `http://localhost:4000/api`. **Baked into the client bundle at build time** — rebuild the web app if it changes. |

---

## Run-mode matrices

```mermaid
flowchart LR
    subgraph W[WORKER_MODE]
        w1["mock<br/>sync, no external call"]
        w2["http → WORKER_HTTP_URL"]
        w3["sqs → SQS_QUEUE_URL"]
    end
    subgraph S[STORAGE_MODE]
        s1["local → LOCAL_STORAGE_DIR"]
        s2["s3 → S3_BUCKET (+S3_ENDPOINT)"]
    end
    subgraph D[DB_TYPE]
        d1["sqljs → SQLJS_DB_PATH"]
        d2["postgres → DATABASE_URL"]
    end
```

| Mode set | Worker | Storage | DB |
|---|---|---|---|
| 🧪 No-Docker local (proven) | `mock` | `local` | `sqljs` |
| Docker local | `http` (detector/worker) | `s3` (LocalStack) | `postgres` |
| Production | `sqs` or `http` | `s3` | `postgres` |

---

## Known-good local combination

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

Web (after build):
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api \
COREPACK_HOME=/tmp/corepack \
corepack pnpm --filter @auto-estimator/web start
```

---

## Production readiness checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` set to a strong secret
- [ ] `DATABASE_URL` set; migrations applied (not `synchronize`)
- [ ] `STORAGE_MODE=s3` with a real `S3_BUCKET` and IAM credentials
- [ ] `WORKER_MODE=sqs` (or `http`) with `SQS_QUEUE_URL` / `WORKER_HTTP_URL`
- [ ] `WORKER_WEBHOOK_SECRET` set (and shared with the worker)
- [ ] `WEB_ORIGIN` set to the real web origin(s)
- [ ] `PUBLIC_API_URL` set to the public API base URL

> If any required production variable is missing, `buildAppConfig()` throws on boot
> with a message naming the missing variables — fail fast, not insecure defaults.
