# ChatGPT Clone

## Live Demo

- https://chatgpt-clone-sooty-gamma.vercel.app?_vercel_share=pqL1xeabWmn0EMAPOAdfTtxAHcRg3968

## What this project does

This is a simple ChatGPT-style web app where you can:

- Start new chats
- Send prompts and receive streamed assistant responses
- See response text appear token-by-token
- Stop an in-progress response
- Reopen previous chat sessions
- Rename and delete chat sessions

## Routes (quick guide)

### App routes

- `/` — **Chat home**
- `/sessions/[id]` — **Session chat**

### API routes

- `GET /api/sessions` — **List sessions**
- `POST /api/sessions` — **Create session**
- `PATCH /api/sessions/:id` — **Rename session**
- `DELETE /api/sessions/:id` — **Delete session**
- `GET /api/sessions/:id/messages` — **Load messages**
- `POST /api/sessions/:id/messages` — **Stream reply**

## Main functionality included

- Sidebar with conversation history
- New conversation creation from the home screen
- Session-based message history
- Streaming assistant output in the chat UI
- Auto-title generation for first-message sessions
- Basic error handling for failed sends and requests

## Architecture Overview

### Frontend / backend split

- **Frontend:** Next.js App Router pages and React components render the chat shell, session sidebar, and streaming message UI (`src/app/page.tsx`, `src/app/sessions/[id]/page.tsx`, `src/app/components/*`).
- **Backend:** Next.js route handlers expose a REST-style API for sessions and messages (`src/app/api/sessions/**`).
- **Persistence + domain layer:** Drizzle/Postgres schema and a store abstraction (`src/db/schema.ts`, `src/store/dbChatStore.ts`) are used by API routes so business rules (message ordering, idempotency, stale stream finalization) are centralized.
- **LLM integration:** provider-agnostic client wrappers under `src/llm/*` currently support OpenAI and Ollama, selected by environment config.

### Streaming approach

- `POST /api/sessions/:id/messages` returns **SSE** (`text/event-stream`).
- Server emits `message.created`, repeated `message.delta`, then exactly one terminal event (`message.done`, `message.cancelled`, or `message.error`).
- Before streaming, the server atomically writes:
  1. user message (`complete`)
  2. assistant placeholder (`streaming`)
  3. session `lastActivityAt` update
- During generation, assistant content is periodically flushed to the database (currently every ~2 seconds) to reduce data loss risk on refresh/crash.
- On abort or upstream errors, assistant rows are finalized as `cancelled`/`error` with partial content preserved.

### Data model summary

- **`sessions`** stores chat metadata (`id`, `title`, `lastActivityAt`, soft-delete `deletedAt`, and `nextSeq` for deterministic message sequencing).
- **`messages`** stores all turns with strict per-session ordering (`sessionId + seq` unique), role (`system|user|assistant`), status (`complete|streaming|cancelled|error`), optional idempotency key (`clientMessageId`), and error fields.
- **`session_summaries`** is scaffolded for future history summarization/truncation support.
- Listing is optimized by indexes on session activity and `(sessionId, seq)`.

## Tradeoffs

### What I chose _not_ to build

- No auth/multi-tenant access control; this is single-user by assumption.
- No rate limiting or per-user quotas.
- No reconnect/resume protocol for in-flight streams (refresh relies on persisted partial state).
- No robust observability stack (structured logs, traces, alerts).
- No automated test suite included yet.

### What I would change with more time

- Add authentication + authorization boundaries for session ownership.
- Add background summarization/context compaction using `session_summaries` to control token growth.
- Add request-level telemetry (latency, token usage, failure categories) and dashboards.
- Add full contract + integration tests for streaming edge cases and idempotency behavior.

### Where this might break at scale

- High concurrent streams can exhaust Node.js process memory/CPU and DB connections.
- Frequent content flushes from many active streams can create write amplification on Postgres.
- Session list and message history reads may become expensive without pagination or archival.
- Single-region deployment would increase latency and create a larger blast radius.

## Production Considerations

### Bottlenecks

- LLM provider latency and availability dominate end-to-end response time.
- Postgres write pressure from streaming flushes + session activity updates.
- SSE connection fan-out and long-lived HTTP connections at high concurrency.

### Cost drivers

- LLM token usage (prompt + completion), especially as chats grow.
- Database IOPS/storage from message persistence and periodic flush updates.
- Compute/network cost from many concurrent open SSE streams.

### Security considerations

- Validate and bound message input size to reduce abuse and prompt-injection surface.
- Add authz checks on every session/message endpoint in production.
- Add server-side rate limiting and abuse detection.
- Consider encryption-at-rest, backups, and retention/deletion policies for chat data.

## Time Allocation

Roughly (for a ~6 hour take-home style build):

- **30% data model planning** (schema design, ordering guarantees, stale-stream recovery strategy)
- **45% backend implementation** (API routes, SSE flow, abort/failure handling, idempotency path)
- **10% LLM integrations** (OpenAI/Ollama adapters and environment wiring)
- **15% misc + docs** (frontend polish, deployment glue, and documentation)

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your own `.env.local` with:
   - `DATABASE_URL` pointing to your own PostgreSQL database
   - LLM provider settings for the model you want to use
     - This repo already includes integrations for **OpenAI** (`OPENAI_API_KEY`, optional `OPENAI_MODEL`) and **Ollama** (`OLLAMA_HOST`, `OLLAMA_MODEL`)
3. Run database migrations:
   ```bash
   npm run drizzle:migrate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`
