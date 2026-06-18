# Local Development

## Prerequisites

- Node.js is available in the current environment.
- `pnpm` is invoked through Corepack:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm --version
```

Docker is not available in the current WSL distro, so no-Docker mode is the
known-good path.

## Install

```bash
cd /home/jerov/workspace/auto-estimator-platform
COREPACK_HOME=/tmp/corepack corepack pnpm install
```

## Build Before Running

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm -r build
```

This creates:

- `packages/contracts/dist`
- `apps/orchestrator/dist`
- `apps/web/.next`

## Start Backend Without Docker

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

Health:

```bash
curl http://localhost:4000/api/health
```

Expected:

```json
{"ok":true,"service":"orchestrator"}
```

## Start Frontend

Use production mode after building:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api \
COREPACK_HOME=/tmp/corepack \
corepack pnpm --filter @auto-estimator/web start
```

Open:

```text
http://localhost:3000/projects
```

Note: `next dev` exited in this environment with `SyntaxError: Unexpected end of
JSON input`; `next build` and `next start` are the known-good path.

`NEXT_PUBLIC_API_URL` is baked into the Next.js client bundle. If that value
changes, rebuild the web app before `next start`.

## Smoke Test API Flow

With backend running:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = '/home/jerov/workspace/construction/Electrical Drawings (Whole Foods)_260614_115540.pdf';

async function main() {
  const base = 'http://localhost:4000/api';
  console.log(await fetch(`${base}/health`).then(r => r.json()));

  await fetch(`${base}/price-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'duplex receptacle', unitPrice: 85, unit: 'each' })
  }).then(assertOk);

  await fetch(`${base}/price-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'luminaire', unitPrice: 140, unit: 'each' })
  }).then(assertOk);

  const project = await fetch(`${base}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Whole Foods smoke test' })
  }).then(assertJson);

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(path)], { type: 'application/pdf' }), 'electrical.pdf');
  await fetch(`${base}/projects/${project.id}/upload`, { method: 'POST', body: form }).then(assertOk);
  await fetch(`${base}/projects/${project.id}/process`, { method: 'POST' }).then(assertOk);

  const detections = await fetch(`${base}/projects/${project.id}/detections`).then(assertJson);
  await fetch(`${base}/projects/${project.id}/budget/recalculate`, { method: 'POST' }).then(assertOk);
  const budget = await fetch(`${base}/projects/${project.id}/budget`).then(assertJson);
  console.log({ projectId: project.id, detections: detections.length, total: budget.budget?.total ?? 0 });
}

async function assertOk(response) {
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response;
}

async function assertJson(response) {
  await assertOk(response);
  return response.json();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
NODE
```

Expected with default mock data:

```json
{
  "detections": 2,
  "total": 225
}
```

## Validation Commands

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm -r typecheck
COREPACK_HOME=/tmp/corepack corepack pnpm -r build
```

Detector:

```bash
cd services/detector
python3 -m pip install --target /tmp/auto-estimator-detector-deps -r requirements.txt
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
