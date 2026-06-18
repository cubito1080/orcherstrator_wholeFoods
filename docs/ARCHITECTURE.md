# Architecture

A tour of how the Auto Estimator Platform is put together — from the systems that
talk to each other, down to the NestJS modules inside the orchestrator and the
lifecycles that move a project from *upload* to *exported estimate*.

> New to the project? Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first, then this
> page. For the per-module reference, continue to [ORCHESTRATOR.md](ORCHESTRATOR.md)
> and [WEB.md](WEB.md).

---

## Contents

1. [Design principles](#design-principles)
2. [System context](#system-context)
3. [Containers & components](#containers--components)
4. [Orchestrator module graph](#orchestrator-module-graph)
5. [Layered request flow](#layered-request-flow)
6. [The processing lifecycle](#the-processing-lifecycle)
7. [Project status state machine](#project-status-state-machine)
8. [Configuration & run modes](#configuration--run-modes)
9. [Deployment topology](#deployment-topology)
10. [Cross-cutting concerns](#cross-cutting-concerns)

---

## Design principles

The codebase was refactored to follow a small set of explicit rules. Keep them in
mind when extending it.

| Principle | How it shows up |
|---|---|
| **Single responsibility** | Each domain (projects, documents, detections, budget, pricing, processing, auth) is its own NestJS module with focused services. No "god service." |
| **Open/closed via strategies** | Storage (local/S3) and worker dispatch (mock/http/sqs) are interfaces with interchangeable implementations chosen by a factory provider — adding a backend never edits a consumer. |
| **Dependency inversion** | Controllers depend on services; services hide persistence. Infrastructure clients are injected by token (`STORAGE`, `WORKER_DISPATCH`), never `new`'d inline. |
| **Fail fast & typed config** | Environment is read **once**, validated, and exposed as a typed object (`APP_CONFIG`). Production refuses to boot without required secrets. |
| **Atomic writes** | Multi-table ingestion and budget recalculation run inside a single transaction. |
| **Explicit state** | Project status transitions go through a state machine, not scattered assignments. |
| **Shared contracts** | One Zod source of truth (`packages/contracts`) validates the worker boundary for both the orchestrator and the worker. |

---

## System context

Who and what interacts with the platform.

```mermaid
flowchart TB
    estimator([👤 Estimator / Reviewer])
    worker([🤖 AI Worker<br/>/home/jerov/workspace/construction])

    subgraph platform[Auto Estimator Platform]
        web[Web UI<br/>Next.js]
        orch[Orchestrator API<br/>NestJS]
        det[Detector<br/>FastAPI mock]
    end

    db[(PostgreSQL / SQL.js)]
    store[(S3 / local disk)]
    queue[[SQS queue]]

    estimator -->|reviews & exports| web
    web -->|REST /api| orch
    orch -->|reads/writes| db
    orch -->|stores PDFs| store
    orch -->|enqueue or HTTP| queue
    orch -->|dispatch ProcessRequest| worker
    worker -->|signed webhook ProcessResult| orch
    worker -->|symbol detection| det
```

- **Estimator/Reviewer** — the human who uploads drawings and corrects detections.
- **AI Worker** — external; reads the PDF, extracts schedules, detects symbols, prices, and posts results back. Owns the heavy AI lifting.
- **Detector** — a Grounded‑SAM‑shaped HTTP service. In this repo it is a deterministic mock; the worker calls it during detection.

---

## Containers & components

A closer look at what runs where and how data moves between processes.

```mermaid
flowchart LR
    subgraph browser[Browser]
        pages["App Router pages<br/>projects · review · budget · price-catalog"]
        client["api-client + useAsyncData"]
        pages --> client
    end

    subgraph orchestrator[Orchestrator · NestJS]
        ctl["Controllers<br/>(HTTP edge)"]
        svc["Domain services<br/>(business logic)"]
        repo["TypeORM repositories"]
        ctl --> svc --> repo
    end

    contracts["@auto-estimator/contracts<br/>(Zod schemas + types)"]

    subgraph data[Data plane]
        db[(Database)]
        fs[(PDF storage)]
    end

    dispatch{{WorkerDispatchStrategy}}
    workerproc([Worker process])

    client -->|fetch JSON| ctl
    pages -. import type .-> contracts
    svc -. validate .-> contracts
    repo --> db
    svc --> fs
    svc --> dispatch
    dispatch -->|http / sqs| workerproc
    workerproc -->|POST /api/worker/webhooks/pipeline-completed| ctl
```

**Layers inside the orchestrator** (dependencies point downward only):

```mermaid
flowchart TB
    A["Controllers — translate HTTP ⇄ service calls, no business logic"]
    B["Domain services — business rules, orchestration, transactions"]
    C["Strategies & infra adapters — storage, worker dispatch, JWT"]
    D["Persistence — TypeORM entities & repositories"]
    E["Config — typed AppConfig (APP_CONFIG)"]
    A --> B
    B --> C
    B --> D
    C --> E
    B --> E
```

---

## Orchestrator module graph

The orchestrator is composed of **global** modules (config, common helpers,
database) and **feature** modules. Edges are NestJS `imports`; the graph is acyclic.

```mermaid
flowchart TB
    classDef global fill:#0f766e,color:#fff,stroke:#0b5a54;
    classDef infra fill:#334155,color:#fff,stroke:#1f2937;
    classDef feature fill:#ffffff,color:#18202a,stroke:#d7dce2;

    Config["AppConfigModule 🌐<br/>APP_CONFIG"]:::global
    Common["CommonModule 🌐<br/>TransactionRunner"]:::global
    DB["DatabaseModule<br/>TypeORM root"]:::global
    Persist["PersistenceModule<br/>repositories"]:::infra
    Storage["StorageModule<br/>STORAGE"]:::infra
    Worker["WorkerModule<br/>WORKER_DISPATCH"]:::infra

    Auth["AuthModule"]:::feature
    Pricing["PricingModule"]:::feature
    Detections["DetectionsModule"]:::feature
    Documents["DocumentsModule"]:::feature
    Projects["ProjectsModule"]:::feature
    Budget["BudgetModule"]:::feature
    Processing["ProcessingModule"]:::feature
    Health["HealthModule"]:::feature

    DB --> Config
    Storage --> Config
    Worker --> Config
    Auth --> Persist
    Pricing --> Persist
    Detections --> Persist
    Documents --> Persist
    Documents --> Storage
    Projects --> Persist
    Projects --> Documents
    Budget --> Persist
    Budget --> Projects
    Budget --> Pricing
    Processing --> Persist
    Processing --> Projects
    Processing --> Documents
    Processing --> Detections
    Processing --> Budget
    Processing --> Pricing
    Processing --> Worker
```

> 💡 `AppConfigModule`, `CommonModule`, and the database connection are global, so
> feature modules inject `APP_CONFIG`, `TransactionRunner`, and repositories without
> importing them explicitly. `ProcessingModule` is the application-service hub that
> coordinates the others; nothing imports it back, so there are no cycles.

| Module | Owns | Key provider(s) | Reference |
|---|---|---|---|
| `AppConfigModule` | validated configuration | `APP_CONFIG` | [CONFIGURATION.md](CONFIGURATION.md) |
| `CommonModule` | transactions, validators | `TransactionRunner` | [ORCHESTRATOR.md](ORCHESTRATOR.md#common) |
| `DatabaseModule` / `PersistenceModule` | connection + repositories | TypeORM | [DATA_MODEL.md](DATA_MODEL.md) |
| `StorageModule` | PDF persistence | `StorageStrategy` | [ORCHESTRATOR.md](ORCHESTRATOR.md#storage) |
| `WorkerModule` | job dispatch | `WorkerDispatchStrategy` | [ORCHESTRATOR.md](ORCHESTRATOR.md#worker-dispatch) |
| `AuthModule` | users, JWT, guard | `AuthService`, `JwtAuthGuard` | [ORCHESTRATOR.md](ORCHESTRATOR.md#auth) |
| `ProjectsModule` | project CRUD + lifecycle | `ProjectsService`, `ProjectStatusMachine` | [ORCHESTRATOR.md](ORCHESTRATOR.md#projects) |
| `DocumentsModule` | uploads | `DocumentsService` | [ORCHESTRATOR.md](ORCHESTRATOR.md#documents) |
| `DetectionsModule` | review of detections | `DetectionsService` | [ORCHESTRATOR.md](ORCHESTRATOR.md#detections) |
| `BudgetModule` | pricing roll-up + export | `BudgetService`, `ExportService` | [ORCHESTRATOR.md](ORCHESTRATOR.md#budget) |
| `PricingModule` | price catalog | `PricingService` | [ORCHESTRATOR.md](ORCHESTRATOR.md#pricing) |
| `ProcessingModule` | dispatch + result ingestion | `ProcessingService` | [ORCHESTRATOR.md](ORCHESTRATOR.md#processing) |

---

## Layered request flow

A read/write request that does **not** involve the worker — e.g. uploading a PDF.

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant C as ProjectsController
    participant P as ProjectsService
    participant D as DocumentsService
    participant S as StorageStrategy
    participant SM as ProjectStatusMachine
    participant DB as Repository

    U->>C: POST /api/projects/:id/upload (multipart)
    C->>P: uploadDocument(id, file)
    P->>P: getProject(id) — 404 if missing
    P->>D: store(project, file)
    D->>D: validate mimetype == application/pdf
    D->>S: putPdf(projectId, file)
    S-->>D: { bucket, key }
    D->>DB: save DocumentEntity
    P->>SM: assert(current → uploaded)
    P->>DB: save Project(status = uploaded)
    C-->>U: 201 DocumentEntity
```

---

## The processing lifecycle

The heart of the platform. `POST /process` builds a `ProcessRequest`, records a
`ProcessingJob`, and dispatches via the configured strategy. How the result comes
back depends on the mode.

### Dispatch (all modes)

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant PC as ProcessingController
    participant PS as ProcessingService
    participant PR as PricingService
    participant WD as WorkerDispatchStrategy
    U->>PC: POST /api/projects/:id/process
    PC->>PS: startProcessing(id)
    PS->>PS: getProject + find latest document
    PS->>PR: getPriceMap() → unit_prices
    PS->>PS: build & validate ProcessRequest (Zod)
    PS->>PS: save ProcessingJob(queued); project → queued
    PS->>WD: dispatch(payload)
    alt mock (synchronous)
        WD-->>PS: { mode:"mock", result }
        PS->>PS: applyWorkerResult(result)
    else http / sqs (result arrives later via webhook)
        WD-->>PS: { mode:"http" or "sqs" }
    end
    PC-->>U: ProcessingJob
```

### Result ingestion — one atomic transaction

Whether the result arrives synchronously (mock) or via the webhook
(`POST /api/worker/webhooks/pipeline-completed`), it funnels into
`ProcessingService.applyWorkerResult`, which is **idempotent** and **transactional**.

```mermaid
sequenceDiagram
    autonumber
    participant K as Worker / Mock
    participant WC as WebhookController
    participant PS as ProcessingService
    participant TX as TransactionRunner
    participant DB as EntityManager (txn)

    K->>WC: POST pipeline-completed (event + HMAC signature)
    WC->>WC: verify event + HMAC (timing-safe)
    WC->>PS: applyWorkerResult(body)
    PS->>PS: validate with ProcessResultSchema (Zod)
    PS->>DB: existing WebhookEvent(projectId,event)?
    alt duplicate (no-op)
        PS-->>WC: { duplicate:true }
    else first delivery
        PS->>PS: derive next ProjectStatus; assert transition
        PS->>TX: run(manager ⇒ …)
        TX->>DB: save WebhookEvent (idempotency marker)
        TX->>DB: save WorkerResult (raw archive)
        TX->>DB: replace PanelSchedules
        TX->>DB: replace DetectedSymbols
        alt worker provided a budget
            TX->>DB: persist worker budget verbatim
        else
            TX->>DB: recalc budget from detections × prices
        end
        TX->>DB: update Project + ProcessingJob status
        PS-->>WC: { duplicate:false }
    end
```

> ⚠️ **Idempotency.** The unique `(projectId, event)` index on `WebhookEvent` makes
> redelivery safe: a second `pipeline.completed` for the same project is a no-op.
> 🧪 In `WORKER_MODE=mock` the webhook is bypassed — `applyWorkerResult` is called
> directly with the mock result, so the same ingestion path is exercised.

---

## Project status state machine

`ProjectStatus` transitions are validated centrally by `ProjectStatusMachine`
(`projects/project-status.machine.ts`). Re-uploading and re-processing are allowed
from terminal states so a run can be retried.

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> uploaded: upload PDF
    uploaded --> queued: process
    queued --> processing: worker started
    queued --> needs_review: result has symbols
    queued --> complete: result, no symbols
    queued --> failed: result status=failed
    processing --> needs_review
    processing --> complete
    processing --> failed
    needs_review --> complete: all reviewed
    needs_review --> queued: re-process
    complete --> queued: re-process
    failed --> queued: re-process
    uploaded --> uploaded: re-upload
```

The related `ProcessingJob` status (`queued → processing → completed | needs_review | failed`)
is derived from the same result in the same transaction.

---

## Configuration & run modes

`process.env` is read in exactly one place — `config/configuration.ts` —
validated, and frozen into the typed `AppConfig` object behind `APP_CONFIG`.

```mermaid
flowchart LR
    env["process.env<br/>(+ .env via @nestjs/config)"] --> build["buildAppConfig()<br/>validate · defaults · fail-fast"]
    build --> cfg["AppConfig<br/>(APP_CONFIG token)"]
    cfg --> db["DatabaseModule"]
    cfg --> st["StorageModule factory"]
    cfg --> wk["WorkerModule factory"]
    cfg --> jwt["JwtModule"]
    cfg --> main["main.ts (CORS, port)"]
```

The platform runs in layered modes so the full product flow works with zero external
dependencies, then progressively wires real infrastructure. See
[CONFIGURATION.md](CONFIGURATION.md) for every variable.

| Concern | Variable | Modes |
|---|---|---|
| **Worker dispatch** | `WORKER_MODE` | `mock` (sync, local) · `http` (`WORKER_HTTP_URL`) · `sqs` (`SQS_QUEUE_URL`) |
| **PDF storage** | `STORAGE_MODE` | `local` (`LOCAL_STORAGE_DIR`) · `s3` (`S3_BUCKET`, optional `S3_ENDPOINT`) |
| **Database** | `DB_TYPE` | `sqljs` (`SQLJS_DB_PATH`) · `postgres` (`DATABASE_URL`) |
| **Auth enforcement** | `AUTH_ENFORCE` | `false` (default; guard installed but off) · `true` |

```mermaid
flowchart LR
    subgraph local["🧪 No-Docker local (proven)"]
        L1[DB_TYPE=sqljs] --- L2[STORAGE_MODE=local] --- L3[WORKER_MODE=mock]
    end
    subgraph dockerlocal["Docker local"]
        D1[postgres] --- D2[localstack S3/SQS] --- D3[detector container]
    end
    subgraph prod["Production"]
        P1[postgres RDS] --- P2[S3] --- P3[SQS → worker]
    end
    local --> dockerlocal --> prod
```

---

## Deployment topology

The Terraform skeleton (`infra/terraform`) describes the intended AWS shape. It is a
**skeleton** — see [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for what exists vs. what is
still to do.

```mermaid
flowchart TB
    subgraph aws[AWS]
        s3[(S3 bucket<br/>drawings)]
        sqs[[SQS jobs queue]]
        dlq[[SQS jobs DLQ]]
        rds[(RDS PostgreSQL 16)]
        ecrO[ECR: orchestrator image]
        ecrD[ECR: detector image]
        sm[Secrets Manager:<br/>worker webhook secret]
    end
    orch[Orchestrator] --> s3
    orch --> sqs
    sqs -. maxReceiveCount=3 .-> dlq
    orch --> rds
    orch -. reads .-> sm
    ecrO -.->|deployed image| orch
```

For local Docker development, `docker-compose.yml` provides `postgres:16`,
`localstack` (S3 + SQS), and the `detector` container.

---

## Cross-cutting concerns

| Concern | Where it lives | Notes |
|---|---|---|
| **Validation** | `common/validation.ts` + Zod contracts | API bodies validated by hand-rolled helpers; the worker boundary uses `ProcessRequestSchema` / `ProcessResultSchema`. |
| **Transactions** | `common/transaction.runner.ts` | `TransactionRunner.run(manager ⇒ …)` wraps multi-table writes. |
| **Auth** | `auth/` | `JwtAuthGuard`, `AuthEnforcementGuard`, `@Public()`, and `@CurrentUser()`. `GET /me` is always guarded; all non-public routes require Bearer auth when `AUTH_ENFORCE=true`. |
| **Webhook security** | `processing/webhook.controller.ts` | Event check + timing-safe HMAC over the raw body when `WORKER_WEBHOOK_SECRET` is set. |
| **Logging** | NestJS `Logger` | Dispatch, ingestion, and duplicate-webhook events are logged in `ProcessingService`. |
| **Errors** | NestJS HTTP exceptions | `BadRequest`/`NotFound`/`Unauthorized`/`ServiceUnavailable` — no bare `throw new Error` in request paths. |

Continue to **[ORCHESTRATOR.md](ORCHESTRATOR.md)** for the module-by-module reference.
