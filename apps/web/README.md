# Web

Next.js application for project upload, status tracking, detection review, and
budget export.

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @auto-estimator/web build
NEXT_PUBLIC_API_URL=http://localhost:4000/api \
COREPACK_HOME=/tmp/corepack \
corepack pnpm --filter @auto-estimator/web start
```

Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.

In this WSL environment, `next dev` exited with `SyntaxError: Unexpected end of
JSON input`; `next build` plus `next start` is the known-good path. Rebuild if
`NEXT_PUBLIC_API_URL` changes because it is baked into the client bundle.
