# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates them via tool calls that manipulate a virtual file system, and a sandboxed iframe renders them in real-time.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run test         # Run Vitest
npm run lint         # ESLint (Next.js config)
npm run build        # Production build
npm run setup        # Fresh setup: install + prisma generate + migrate
npm run db:reset     # Reset SQLite database
```

Single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

Environment: set `ANTHROPIC_API_KEY` in `.env` to use real Claude. Without it, a `MockLanguageModel` is used automatically.

## Architecture

### Request Lifecycle

1. User types prompt → `ChatInterface` sends to `POST /api/chat`
2. API streams Claude's response using `streamText` (Vercel AI SDK)
3. Claude calls tools (`str_replace_editor`, `file_manager`) to create/modify files
4. Tool calls update the **VirtualFileSystem** (in-memory, not disk)
5. `FileSystemContext` propagates changes → `PreviewFrame` re-renders
6. `JsxTransformer` (Babel standalone) compiles JSX → import map + ES modules → sandboxed iframe

### VirtualFileSystem (`src/lib/file-system.ts`)

The core abstraction. Holds all project files in memory. Methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `exists`, `serialize/deserialize`. The Claude tools operate exclusively through this class. Project data is persisted as `JSON.stringify(vfs.serialize())` in `Project.data` (Prisma).

### AI Tools (`src/lib/tools/`)

- `str_replace_editor` — view, create, str_replace, insert operations on virtual files
- `file_manager` — rename, delete operations

Both are Zod-typed and passed to `streamText`. The agentic loop runs up to 40 steps (real) or 4 steps (mock).

### Preview System (`src/lib/transform/jsx-transformer.ts`)

Transforms TSX/JSX to ES modules using Babel standalone. Builds a dynamic import map pointing to `esm.sh` for external packages and to transformed virtual files for local imports. The iframe receives a full HTML document with this import map injected. Every entry point is `/App.jsx`.

### State Management

Two React contexts carry all state:
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — owns message history and streaming state

Both are provided in `main-content.tsx` which also owns the resizable panel layout (35% chat / 65% preview+editor).

### Auth & Persistence

JWT sessions via `jose` (7-day expiry, cookie-based). Registered users can save projects. Anonymous users get `localStorage`-based tracking via `anon-work-tracker.ts`. Middleware in `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes. DB = SQLite via Prisma; schema has `User` and `Project` (messages + file system stored as JSON strings).

## Database Schema

The full schema is defined in `prisma/schema.prisma`. Consult it whenever you need to understand the structure of data stored in the database. Key models:

- `User` — id (cuid), email (unique), password, timestamps
- `Project` — id (cuid), name, userId (optional, nullable for anonymous), messages (JSON string), data (JSON string with VirtualFileSystem), timestamps. Cascade delete on user removal.

## Key Conventions

- Path alias `@/*` maps to `src/*`
- All new components go under `src/components/<domain>/`
- shadcn/ui components live in `src/components/ui/` — don't modify them manually
- The AI system prompt lives in `src/lib/prompts/generation.tsx` — Claude is instructed to always create `/App.jsx` as the entry point and to style with Tailwind only
- `src/lib/provider.ts` exports `getLanguageModel()` — the single place to swap the AI model
- Model in use: `claude-haiku-4-5` (via `@ai-sdk/anthropic`)
