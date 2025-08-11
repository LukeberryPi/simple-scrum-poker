# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install dependencies**: `bun install`
- **Start all applications**: `bun dev` (web on :3001, server on :8080)
- **Start individual apps**:
  - `bun dev:web` (frontend only)
  - `bun dev:server` (backend only)
- **Build all**: `bun build`
- **Type checking**: `bun check-types`
- **Lint and format**: `bun check` (uses Biome)

## Architecture Overview

This is a TypeScript monorepo using Turborepo with two main applications:

### Frontend (`apps/web/`)
- **Framework**: React 19 with Vite
- **Routing**: TanStack Router with file-based routing
- **Styling**: TailwindCSS v4 with shadcn/ui components
- **State Management**: TanStack Query for server state
- **API Client**: ORPC client with full type safety

### Backend (`apps/server/`)
- **Runtime**: Bun
- **Framework**: Hono for HTTP server
- **API**: ORPC for end-to-end type-safe RPC
- **Build Tool**: tsdown for TypeScript compilation

### Key Architecture Patterns

1. **Type-Safe API Communication**: Uses ORPC for fully typed client-server communication
   - Server defines procedures in `apps/server/src/routers/`
   - Client imports server types directly for type safety
   - API calls use TanStack Query through ORPC utilities

2. **Monorepo Structure**:
   - Shared TypeScript configuration
   - Independent build and dev processes
   - Cross-workspace type imports (server types used in web)

3. **Development Workflow**:
   - Server changes automatically reflect in client types
   - Hot reloading in both applications
   - Integrated error handling with toast notifications

## Important Files

- `apps/server/src/routers/index.ts` - Main API router definition
- `apps/web/src/utils/orpc.ts` - Client-side API setup
- `apps/server/src/lib/orpc.ts` - Server-side ORPC configuration
- `apps/web/src/routes/` - File-based routing structure
- `turbo.json` - Monorepo task configuration
- `biome.json` - Linting and formatting configuration

## Environment Variables

- `CORS_ORIGIN` - CORS configuration for the server
- `VITE_SERVER_URL` - Server URL for client API calls (defaults to development server)