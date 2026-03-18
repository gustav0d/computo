# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev              # Start all apps (web + server)
bun dev:web          # Web app only (port 3001)
bun dev:server       # Server only (port 3000)

# Database (Docker)
bun db:start         # Start MongoDB container
bun db:stop          # Stop MongoDB container
bun db:down          # Remove MongoDB container

# Quality
bun check            # Lint (oxlint) + auto-format (oxfmt)
bun check-types      # TypeScript type-check all packages
bun build            # Build all packages via Turborepo
```

To run a command scoped to a single package, use Turborepo filter:

```bash
bun turbo -F <package-name> <task>
# e.g.: bun turbo -F web build
```

## Architecture

**Turborepo monorepo** with Bun workspaces. All packages use the `@computo/*` namespace.

```
apps/web      → React 19 + Vite + TanStack Router (file-based) + TailwindCSS 4
apps/server   → Elysia server exposing tRPC on /trpc/*
packages/api  → tRPC router definitions and business logic
packages/db   → Mongoose connection + models (MongoDB via Docker)
packages/ui   → Shared shadcn/ui components (Base-UI primitives)
packages/env  → T3 env-core + Zod env validation (server & web)
packages/config → Shared tsconfig.base.json
```

### Data Flow

1. **Client** calls tRPC via `apps/web/src/utils/trpc.ts` → `httpBatchLink` → `http://localhost:3000/trpc`
2. **Server** (`apps/server`) mounts tRPC fetch handler from `@computo/api` inside Elysia
3. **API** (`packages/api`) defines procedures using `initTRPC`, reads context (auth/session), calls `@computo/db`
4. **DB** (`packages/db`) exposes a Mongoose connection; models should live here

### Key Conventions

- **E2E type safety via tRPC** — the `AppRouter` type is imported by the web client; never bypass tRPC with raw fetch for internal API calls
- **Env vars are validated at startup** — add new vars to `packages/env/src/server.ts` or `packages/env/src/web.ts` (web vars must be prefixed `VITE_`)
- **New API procedures go in `packages/api`** — keep Elysia-specific code out of the API package
- **New Mongoose models go in `packages/db`** — export them from the package index
- **UI components** use shadcn/ui — run `bunx shadcn add <component>` inside `apps/web` to add new ones; they land in `packages/ui`

### Environment

- `apps/server/.env`: `DATABASE_URL`, `CORS_ORIGIN`, `NODE_ENV`
- `apps/web/.env`: `VITE_SERVER_URL=http://localhost:3000`
- MongoDB defaults: `mongodb://root:password@localhost:27017`
