# HTTP API Reference

Complete reference for the orchestrator's REST API. All routes are served under the
global prefix **`/api`** (set in `main.ts`). In local development the base URL is
`http://localhost:4000/api`.

> Endpoint behaviour is implemented in the controllers/services documented in
> [ORCHESTRATOR.md](ORCHESTRATOR.md). Payload shapes for the worker boundary are
> defined in [CONTRACTS.md](CONTRACTS.md).

---

## Conventions

- **Content type** — request and response bodies are JSON, except `…/upload`
  (`multipart/form-data`) and `…/export.csv` (`text/csv`).
- **IDs** — all resource IDs are UUID strings.
- **Errors** — standard NestJS error envelope:
  ```json
  { "statusCode": 404, "message": "project not found", "error": "Not Found" }
  ```
- **Auth** — JWT is issued by `/auth/*`. `GET /me` always requires Bearer auth.
  Other non-public routes are open while `AUTH_ENFORCE=false` and require
  `Authorization: Bearer <token>` when `AUTH_ENFORCE=true`.

---

## Endpoint summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create a user + default tenant, return a token |
| `POST` | `/auth/login` | — | Authenticate, return a token |
| `GET` | `/me` | 🔒 Bearer | Decoded current user |
| `GET` | `/health` | — | Liveness probe |
| `GET` | `/price-catalog` | conditional Bearer | List price catalog items |
| `POST` | `/price-catalog` | conditional Bearer | Upsert a price |
| `POST` | `/projects` | conditional Bearer | Create a project |
| `GET` | `/projects` | conditional Bearer | List projects (newest first) |
| `GET` | `/projects/:id` | conditional Bearer | Get one project |
| `POST` | `/projects/:id/upload` | conditional Bearer | Upload a PDF (multipart) |
| `POST` | `/projects/:id/process` | conditional Bearer | Start processing |
| `GET` | `/projects/:id/status` | conditional Bearer | Project + latest job status |
| `GET` | `/projects/:id/result` | conditional Bearer | Full result aggregate |
| `GET` | `/projects/:id/detections` | conditional Bearer | List detections |
| `PATCH` | `/projects/:id/detections/:detectionId` | conditional Bearer | Edit a detection |
| `POST` | `/projects/:id/detections/:detectionId/accept` | conditional Bearer | Accept a detection |
| `POST` | `/projects/:id/detections/:detectionId/reject` | conditional Bearer | Reject a detection |
| `GET` | `/projects/:id/budget` | conditional Bearer | Get budget + line items |
| `POST` | `/projects/:id/budget/recalculate` | conditional Bearer | Recalculate budget |
| `GET` | `/projects/:id/export.json` | conditional Bearer | Export result as JSON |
| `GET` | `/projects/:id/export.csv` | conditional Bearer | Export budget as CSV |
| `POST` | `/worker/webhooks/pipeline-completed` | HMAC | Ingest a worker result |

---

## Authentication

### `POST /auth/register`

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | ✅ | lower-cased server-side |
| `password` | string | ✅ | hashed with bcrypt (12 rounds) |
| `tenantName` | string | — | defaults to `"Default Tenant"` |

**Response `201`**
```json
{
  "accessToken": "eyJhbGciOi…",
  "user": { "id": "uuid", "email": "a@b.com", "tenantId": "uuid" }
}
```
**Errors** — `409 Conflict` if the email is already registered; `400` if email/password missing.

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"secret","tenantName":"Acme"}'
```

### `POST /auth/login`

Body `{ email, password }` → same shape as register. `401 Unauthorized` on bad credentials.

### `GET /me` 🔒

Requires `Authorization: Bearer <token>`. Returns the decoded claims:
```json
{ "sub": "uuid", "email": "a@b.com", "tenantId": "uuid" }
```
`401` if the token is missing or invalid.

---

## Health

### `GET /health`
```json
{ "ok": true, "service": "orchestrator" }
```

---

## Price catalog

### `GET /price-catalog`
Returns `PriceCatalogItem[]` ordered by label:
```json
[{ "id": "uuid", "label": "duplex receptacle", "unitPrice": 85, "unit": "each" }]
```

### `POST /price-catalog`
Upsert by label.

| Field | Type | Required |
|---|---|---|
| `label` | string | ✅ |
| `unitPrice` | number ≥ 0 | ✅ |
| `unit` | string | — (default `each`) |

```bash
curl -X POST http://localhost:4000/api/price-catalog \
  -H 'Content-Type: application/json' \
  -d '{"label":"luminaire","unitPrice":140,"unit":"each"}'
```

---

## Projects

### `POST /projects`
Body `{ "name": "Whole Foods" }` → `Project` (`status: "draft"`). `400` if name blank.

### `GET /projects`
`Project[]`, newest first.

### `GET /projects/:id`
One `Project`. `404` if not found.
```json
{ "id": "uuid", "name": "Whole Foods", "status": "needs_review",
  "createdAt": "2026-06-18T10:00:00.000Z", "updatedAt": "…" }
```

### `POST /projects/:id/upload`
`multipart/form-data` with a single field **`file`** (must be `application/pdf`).
Stores the PDF and moves the project to `uploaded`. Returns the `DocumentEntity`.
`400` if the file is missing or not a PDF.

```bash
curl -X POST http://localhost:4000/api/projects/$ID/upload \
  -F 'file=@drawings.pdf;type=application/pdf'
```

### `POST /projects/:id/process`
Builds a `ProcessRequest`, records a `ProcessingJob`, moves to `queued`, and
dispatches via the configured `WORKER_MODE`. In `mock` mode the result is applied
synchronously before responding. Returns the `ProcessingJob`. `400` if the project
has no uploaded PDF.

### `GET /projects/:id/status`
```json
{ "projectId": "uuid", "status": "needs_review",
  "job": { "id": "uuid", "status": "needs_review", "error": null } }
```

### `GET /projects/:id/result`
The full aggregate used by JSON export:
```json
{
  "project": { "id": "uuid", "name": "…", "status": "needs_review" },
  "rawResult": { "...": "the worker ProcessResult, or null" },
  "detections": [ /* DetectedSymbol[] */ ],
  "schedules": [ /* PanelSchedule[] */ ],
  "budget": { "budget": { "subtotal": 225, "total": 225 }, "lineItems": [ /* … */ ] }
}
```

---

## Detections

### `GET /projects/:id/detections`
`DetectedSymbol[]` ordered by label:
```json
[{ "id": "uuid", "label": "duplex receptacle", "confidence": 0.92,
   "box": { "page": 0, "x": 320, "y": 260, "width": 28, "height": 22 },
   "reviewStatus": "pending", "quantity": 1 }]
```

### `PATCH /projects/:id/detections/:detectionId`
Edit a detection. All fields optional; only provided fields change.

| Field | Type | Notes |
|---|---|---|
| `label` | string | |
| `quantity` | number | |
| `box` | `{ page, x, y, width, height }` | all numeric |

```bash
curl -X PATCH http://localhost:4000/api/projects/$ID/detections/$DID \
  -H 'Content-Type: application/json' \
  -d '{"quantity":3}'
```
`404` if the detection does not belong to the project.

### `POST /projects/:id/detections/:detectionId/accept`
### `POST /projects/:id/detections/:detectionId/reject`
Set `reviewStatus` and append a `DetectionReview` audit row. Returns the updated
detection. Rejected detections are excluded from budget recalculation.

---

## Budget & export

### `GET /projects/:id/budget`
```json
{ "budget": { "id": "uuid", "subtotal": 225, "total": 225 },
  "lineItems": [ { "id": "uuid", "description": "duplex receptacle",
                   "quantity": 1, "unitPrice": 85, "total": 85 } ] }
```
`budget` may be `null` before the first calculation.

### `POST /projects/:id/budget/recalculate`
Re-aggregates non-rejected detections by label, prices them against the catalog
(missing price ⇒ `0`), and replaces the stored budget (transactional). Returns the
new `{ budget, lineItems }`.

### `GET /projects/:id/export.json`
Same payload as `GET …/result`. `Content-Type: application/json`.

### `GET /projects/:id/export.csv`
`Content-Type: text/csv`. Columns: `description,quantity,unit_price,total`.
```csv
description,quantity,unit_price,total
"duplex receptacle",1,85,85
"luminaire",1,140,140
```

---

## Worker webhook

### `POST /worker/webhooks/pipeline-completed`

Inbound ingestion endpoint for the AI worker (http/sqs modes). Validates the event
header and HMAC signature, then runs the idempotent transactional ingestion.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-Auto-Estimator-Event` | `pipeline.completed` (required, else `401`) |
| `X-Auto-Estimator-Signature` | `sha256=<hmac>` over the raw body (required when `WORKER_WEBHOOK_SECRET` is set) |

**Body** — a `ProcessResult` (see [CONTRACTS.md](CONTRACTS.md#worker-result)).

**Response `201`**
```json
{ "duplicate": false, "projectId": "uuid" }
```
A repeat delivery for the same `(projectId, pipeline.completed)` returns
`{ "duplicate": true, … }` and changes nothing.

**Errors** — `401` for a wrong event or bad/missing signature; `400` if the body
fails `ProcessResultSchema`.

> 🧪 In `WORKER_MODE=mock` this endpoint is **not** called — the orchestrator applies
> the mock result internally through the same ingestion path.
