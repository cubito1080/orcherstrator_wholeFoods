# Code Review — Auto Estimator Platform (Orchestrator + Web)

_Date: 2026-06-17 · Scope: `apps/orchestrator` (NestJS) and `apps/web` (Next.js)._

This review accompanies a deep architectural refactor. Each finding below is verified
against the source, rated by severity, mapped to the principle it violates, and linked to
the refactor phase that resolves it. Phases are tracked in
`/.claude/plans/understand-all-the-docs-deep-map.md`.

## Summary

The platform is a well-documented, runnable MVP. The architecture is sound at the
seams (clear monorepo boundaries, shared Zod contracts, dependency injection, repository
pattern via TypeORM, decoupled frontend), but the orchestrator concentrates almost all
business logic in a single service and resolves infrastructure choices with inline
`process.env` branching. The result works today but resists testing, extension, and
multi-tenant scale. The web app is functional but duplicates its data-fetching and type
definitions across every page.

Nothing here is a correctness emergency for the local MVP; these are the changes that move
the codebase from "works" to "clean and scalable."

## Findings

| # | Finding | Location | Severity | Principle | Phase |
|---|---------|----------|----------|-----------|-------|
| 1 | **God service** — project CRUD, document upload, processing, detection review, budget calc, export, price catalog, and worker-result ingestion all live in one 395-line class with 11 injected repositories. | `apps/orchestrator/src/projects.service.ts` | High | SRP | 2 |
| 2 | **Infrastructure mode chosen by `if` on `process.env`** inside single classes, with SDK clients `new`'d in field initializers (untestable, unswappable). | `storage.service.ts`, `worker-dispatch.service.ts`, `app.module.ts:databaseOptions` | High | OCP / DIP | 3 |
| 3 | **No transactions** — `applyWorkerResult` and `recalculateBudget` delete from up to four tables then re-insert; a mid-sequence failure leaves the project in an inconsistent state. | `projects.service.ts:162-191, 255-272` | High | Data consistency | 4 |
| 4 | **Insecure config defaults, read ad-hoc and unvalidated** — `JWT_SECRET ?? "change-me"`, AWS `secretAccessKey ?? "test"`, CORS `origin ?? true` (allow-all). `process.env` is read directly in many files with no boot-time validation. | `app.module.ts:53`, `storage.service.ts:16`, `worker-dispatch.service.ts:13`, `main.ts:8` | High | 12-factor / security | 0 |
| 5 | **Untyped request bodies** — controller params typed as loose object literals and cast `body as never` into the service; no global validation pipe. | `projects.controller.ts:67-69`, `main.ts` | Medium | Type safety | 4 |
| 6 | **Auth issued but never enforced** — register/login mint JWTs, but no route is guarded and `me()` calls `jwt.verify` by hand in the controller. No tenant scoping on queries. | `auth.controller.ts:22-29`, all `projects` routes | Medium | Security | 4 |
| 7 | **Mock leaks into the domain** — the service inspects `dispatch.mode === "mock"` and a `mockWorkerResult()` fixture lives inside the production service file. | `projects.service.ts:121-123, 368-394` | Medium | OCP | 3 |
| 8 | **No structured logging; generic `throw new Error()`** in dispatch instead of Nest HTTP exceptions. No log line at processing/webhook boundaries. | `worker-dispatch.service.ts:26, 44` | Medium | Observability | 3, 4 |
| 9 | **Implicit state machine** — `ProjectStatus` transitions are assigned inline in several places with nested ternaries; no single definition of legal transitions. | `projects.service.ts:85, 118, 193-199` | Medium | Maintainability | 4 |
| 10 | **Dead code** — `AuditLog` entity is never written or read; `DetectionReview.labelOverride/quantityOverride/boxOverride` columns are never populated. | `entities.ts:201-208, 309-325` | Low | Cleanliness | 1 |
| 11 | **Monolithic entity file** — 14 entities + 3 enums in one 326-line file. | `entities.ts` | Low | Navigability | 1 |
| 12 | **Frontend duplication** — the same `load()/try/catch/useEffect` data-fetch block is copy-pasted across 6 pages; response types (`Project`, `Detection`, `ProjectStatus`) are re-declared inline instead of reused from `@auto-estimator/contracts`; the `api()`/`uploadPdf()` fetch core is duplicated. | `apps/web/app/**/page.tsx`, `apps/web/app/api.ts` | Medium | DRY | 5 |

## Strengths (kept as-is)

- Clean monorepo separation (`apps` / `packages` / `services`) with a shared, runtime-validated contracts package.
- Constructor-based dependency injection throughout the NestJS layer.
- Idempotent webhook ingestion guarded by a unique `(projectId, event)` index, with timing-safe HMAC signature verification.
- Sensible run modes (mock/http/sqs, local/s3, sqljs/postgres) that make the MVP runnable with zero external services — the refactor preserves every mode, only changing how the choice is wired.

## Decisions taken during the refactor

- **Dead code removed**, not retrofitted into features (`AuditLog`, unused override columns).
- **Auth enforcement built but left opt-in** (config flag, default OFF) so the current no-auth web flow keeps working; full enablement needs a web login screen and is tracked as follow-up.
- **Pragmatic read/write method separation** instead of a full `@nestjs/cqrs` command bus, which would be disproportionate to the domain.
- **No new web runtime dependency** — a small `useAsyncData` hook rather than TanStack Query.

## Implementation notes & deviations

- **Validation without Zod.** `zod` is only a transitive dependency of the
  orchestrator (via `@auto-estimator/contracts`) and is not directly resolvable,
  so inbound API bodies are validated with small hand-rolled helpers in
  `common/validation.ts` rather than a `ZodValidationPipe`. The existing
  contracts schemas still validate the worker request/result payloads. Adding
  `zod` to the orchestrator's `package.json` would let these be unified later.
- **Repository abstraction via services.** Persistence is fully encapsulated
  behind the focused domain services (no controller or cross-domain code touches
  a TypeORM `Repository`). Dedicated repository port interfaces/adapters were not
  introduced because they interact awkwardly with the transaction boundary
  (`EntityManager` threading) and add wiring with little marginal benefit at this
  size; the service boundary already provides the decoupling. This is the one
  scoped-down item versus the original "repository ports" wording.
- **Legacy shim files removed.** The pre-refactor files under
  `apps/orchestrator/src/*.ts` (e.g. `projects.service.ts`, `storage.service.ts`,
  `webhook.controller.ts`) were removed after a green typecheck.
- **Status:** typecheck, test, and build have been run successfully after the
  refactor.

## Out of scope (not addressed here)

Tooling/CI (ESLint, Prettier config, GitHub Actions), TypeORM production migrations, the
FastAPI detector, and Terraform infrastructure. Characterization tests are added to the
orchestrator only as the safety net for this refactor.
