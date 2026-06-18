# Glossary

Shared vocabulary for the Auto Estimator Platform — domain terms, runtime roles, and
key technical constructs. Terms are grouped and cross-linked to the relevant reference.

---

## Domain

**Electrical drawing set** — the input PDF: a multi-sheet set of electrical
construction drawings (panel schedules, floor plans, legends). Born-digital and
vector, with a strong text layer and very dense floor-plan geometry. See
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md#important-pdf-reality).

**Project** — the unit of work: one drawing set being turned into an estimate. The
central aggregate; see [DATA_MODEL.md](DATA_MODEL.md).

**Panel schedule** — a table on the drawings describing electrical circuits (circuit,
load, amps, …). Extracted by the worker into `PanelSchedule` rows. Relatively
low-risk to extract because of the strong text layer.

**Symbol / detection** — an electrical symbol found on a floor plan (e.g. *duplex
receptacle*, *luminaire*). Stored as a `DetectedSymbolEntity` with a label,
confidence, and bounding box. Counting these accurately is the hard R&D part.

**Bounding box** — the rectangle locating a detection on a page:
`{ page, x, y, width, height }`. See [CONTRACTS.md](CONTRACTS.md).

**Review** — the human step of accepting, rejecting, or editing detections before
pricing. Each decision appends a `DetectionReview` audit row. Review states:
`pending → accepted | rejected`.

**Price catalog** — a per-tenant map of detection **label → unit price**. A label
with no entry prices at `0`. See [DATA_MODEL.md](DATA_MODEL.md).

**Budget** — the priced roll-up of reviewed detections: line items (label, quantity,
unit price, total) plus subtotal/total. Recomputed on demand, excluding rejected
detections.

**Estimate** — the final reviewed, priced output, exported as JSON or CSV.

---

## Runtime roles

**Orchestrator** — the NestJS API; the platform's core. Owns all data, dispatch, and
ingestion. See [ORCHESTRATOR.md](ORCHESTRATOR.md).

**Web** — the Next.js review/upload UI. See [WEB.md](WEB.md).

**Worker** — the **external** AI pipeline (`/home/jerov/workspace/construction`) that
reads the PDF, extracts schedules, detects symbols, prices, and posts results back.
The source of truth for AI behaviour.

**Detector** — the FastAPI service the worker calls for symbol detection;
Grounded-SAM-shaped, mocked here. See [DETECTOR.md](DETECTOR.md).

**Tenant** — an organization boundary for multi-tenancy. Present on users, projects,
and price catalog items; full tenant scoping/enforcement is a roadmap item.

---

## Processing & data

**`ProcessRequest`** — the payload the orchestrator sends to the worker
(`project_id`, `s3_key`, `callback_url`, `unit_prices`).

**`ProcessResult`** — the payload the worker returns (schedules, symbols, optional
budget, errors, warnings). Validated and ingested atomically.

**Processing job** — a record of one dispatch attempt (`ProcessingJob`), with a status
derived from the worker result.

**Webhook (`pipeline.completed`)** — the signed HTTP callback the worker uses to
deliver a `ProcessResult`. Idempotent via a unique `(projectId, event)` marker.

**Worker result archive** — `WorkerResult.raw`: the unmodified `ProcessResult`, kept
alongside the normalized, reviewable records.

---

## Technical constructs

**Strategy** — an interface with interchangeable implementations chosen by a factory
from config. Used for **storage** (`local`/`s3`) and **worker dispatch**
(`mock`/`http`/`sqs`). See [ORCHESTRATOR.md](ORCHESTRATOR.md#storage).

**State machine** — `ProjectStatusMachine`, the single definition of legal
`ProjectStatus` transitions. See [ARCHITECTURE.md](ARCHITECTURE.md#project-status-state-machine).

**Transaction runner** — `TransactionRunner`, the helper that wraps multi-table writes
(result ingestion, budget recalculation) in one atomic transaction.

**Typed config (`APP_CONFIG`)** — the validated, frozen settings object built once
from the environment. See [CONFIGURATION.md](CONFIGURATION.md).

**Contracts** — the shared Zod schemas in `@auto-estimator/contracts` that define and
validate the worker/detector boundary. See [CONTRACTS.md](CONTRACTS.md).

**Run mode** — a configurable backend selection: `WORKER_MODE`, `STORAGE_MODE`,
`DB_TYPE`, `AUTH_ENFORCE`. See the [run-mode matrices](CONFIGURATION.md#run-mode-matrices).

---

## Acronyms

| Acronym | Expansion |
|---|---|
| **HMAC** | Hash-based Message Authentication Code — signs the webhook body |
| **DI** | Dependency Injection (NestJS providers) |
| **DLQ** | Dead-Letter Queue (SQS) |
| **ERD** | Entity-Relationship Diagram ([DATA_MODEL.md](DATA_MODEL.md)) |
| **SRP / OCP / DIP** | SOLID principles: Single-Responsibility / Open-Closed / Dependency-Inversion |
| **SAM** | Segment Anything Model (the detector is "Grounded-SAM-compatible") |
