# Streaming + Persistence Contract

This document defines the backend ↔ client contract for a chat app with token streaming, persistence, cancellation, and deterministic reload.

---

## Principles

### Server/DB are the source of truth
- The **database is the authoritative record** of sessions and messages.
- The client may optimistically render UI, but on refresh/reload it must reconcile to `GET /api/sessions/:id/messages`.
- All state transitions that matter (e.g., `streaming → complete`) are **persisted**.
- Message ordering is **deterministic** and based on a monotonic per-session `seq` integer (not timestamps).

### Message state machine
Assistant messages always end in a terminal status; only one terminal status is allowed.

- `streaming` → `complete`
- `streaming` → `cancelled`
- `streaming` → `error`

User messages are always `complete` on insert.

### Idempotency
- `POST /api/sessions/:id/messages` accepts a `clientMessageId` UUID.
- The server enforces uniqueness `(sessionId, clientMessageId)` to prevent duplicate user messages and duplicate assistant placeholders on retries / double-submit.

---

## Data Model Requirements (conceptual)

### Session
- `id`: UUID
- `title`: string | null
- `createdAt`: timestamp
- `lastActivityAt`: timestamp (used for sidebar ordering)
- `deletedAt`: timestamp | null (soft delete)

### Message
- `id`: UUID
- `sessionId`: UUID (FK)
- `role`: `system | user | assistant`
- `content`: string
- `status`: `complete | streaming | cancelled | error`
- `seq`: integer (monotonic per session; deterministic ordering)
- `clientMessageId`: string | null (unique per session when present)
- `createdAt`, `updatedAt`: timestamps
- optional: `errorCode`, `errorMessage` (short)

### Ordering rule
- `seq` is assigned at insert time.
- Clients must render messages sorted by `seq ASC`.

---

## Routes

### `GET /api/sessions`
Returns sessions sorted by `lastActivityAt DESC`.

### `POST /api/sessions`
Creates a new session (title may be `"New chat"` until auto-titled).

### `PATCH /api/sessions/:id`
Renames a session.

### `DELETE /api/sessions/:id`
Soft deletes a session.

### `GET /api/sessions/:id/messages`
Returns all messages for a session in deterministic order (by `seq ASC`).

This endpoint is also responsible for *finalizing stale streaming messages* (see “Stale streaming finalization”).

### `POST /api/sessions/:id/messages` (Streaming)
Creates the user message + assistant placeholder, then streams assistant deltas.

---

## Streaming Protocol

### Request
`POST /api/sessions/:id/messages`

Body (JSON):
~~~json
{
  "content": "User prompt text",
  "clientMessageId": "uuid"
}
~~~

### Server actions (atomic + ordered)
1. **Insert user message** (`role="user"`, `status="complete"`), idempotently via `clientMessageId`.
2. **Insert assistant placeholder** (`role="assistant"`, `status="streaming"`, `content=""`).
3. Update `session.lastActivityAt` immediately (so sidebar reorders while streaming).
4. Start streaming deltas to the client.
5. Periodically **flush partial assistant content** to the DB (do not write every token).
6. On terminal outcome, persist final assistant `status` and final `content`.
7. Update `session.lastActivityAt` again on terminal completion (optional but recommended).

### Response format (SSE)
The response is `Content-Type: text/event-stream`.

Event types:

#### `message.created` (sent once)
Includes IDs and seq numbers so the client can bind deltas to a single assistant message.
~~~json
{
  "userMessage": { "id": "uuid", "seq": 10 },
  "assistantMessage": { "id": "uuid", "seq": 11, "status": "streaming" }
}
~~~

#### `message.delta` (sent many times)
~~~json
{
  "assistantMessageId": "uuid",
  "delta": "next chunk of text"
}
~~~

#### Terminal events (exactly one)
- `message.done` → assistant becomes `complete`
- `message.cancelled` → assistant becomes `cancelled`
- `message.error` → assistant becomes `error`

Examples:

`message.done`
~~~json
{ "assistantMessageId": "uuid" }
~~~

`message.cancelled`
~~~json
{ "assistantMessageId": "uuid" }
~~~

`message.error`
~~~json
{
  "assistantMessageId": "uuid",
  "errorCode": "LLM_ERROR",
  "errorMessage": "Upstream provider error"
}
~~~

### DB flushing strategy (partial persistence)
- Maintain an in-memory buffer of generated text.
- Flush buffered content to DB every ~250–500ms OR every N characters (e.g., 200–500 chars), whichever comes first.
- Always flush on terminal outcome (done/cancel/error).
- This ensures refreshes and crashes still show useful partial content on reload.

---

## Deterministic Reload Behavior

The client reload flow is:
1. `GET /api/sessions/:id/messages`
2. Render the returned messages as the canonical state.

The client must **not** assume the UI’s local streaming state is correct after reload. It must display what the server persisted.

If the last assistant message is `status="streaming"`, the client may show a “typing…” affordance briefly, but it should expect the server to finalize stale streams (below).

---

## Stale Streaming Finalization (Server Crash / Shutdown)

### Why
If the server process dies mid-stream, the assistant message may be left as `status="streaming"` indefinitely.

### Rule
On reads (typically in `GET /api/sessions/:id/messages`), the server finalizes any streaming messages that appear abandoned:

- If `message.status == "streaming"` and `now - message.updatedAt > STALE_THRESHOLD` (e.g., 30–60 seconds),
  - Set `message.status = "error"`
  - Set `errorCode = "STREAM_INTERRUPTED"`
  - Set `errorMessage = "Streaming interrupted (server shutdown or disconnect)."`
  - Preserve whatever `content` was last flushed.

This guarantees deterministic reload: the UI does not show “typing…” forever.

---

## Error Cases for Streaming

This section defines required behavior under three key failure modes.

### 1) Client aborts / disconnects
Examples:
- User clicks “Cancel”
- Browser tab closes
- Page refresh during streaming
- Network disconnect

**Server behavior**
- Detect request close/abort.
- Stop reading from the upstream LLM stream as soon as possible.
- Persist assistant message:
  - `status = "cancelled"`
  - `content = <partial content flushed/buffered>`
  - `updatedAt = now`
- (Optional) Emit `message.cancelled` if the connection is still open; if not, persistence is the primary outcome.

**Client behavior**
- If the client aborted intentionally, it should treat the streamed request as ended.
- On reload, client rehydrates from `GET /messages` and displays the cancelled partial assistant message.
- Provide a “Regenerate” action that creates a new assistant message (do not overwrite the cancelled one).

**Notes**
- For take-home simplicity, page refresh/disconnect is treated the same as cancel.
- This ensures correctness without implementing reattachment/resume streaming.

---

### 2) Server shutdowns midway through the LLM response
Examples:
- Process crash
- Deployment / restart
- Host termination

**Server behavior (prevention + recovery)**
- Prevention: periodic DB flush while streaming (see “DB flushing strategy”).
- Recovery: stale streaming finalization on `GET /messages` using `STALE_THRESHOLD`.

**Persisted outcome**
- Assistant message is finalized as:
  - `status = "error"`
  - `errorCode = "STREAM_INTERRUPTED"`
  - `content` preserved up to last successful flush

**Client behavior**
- On reload:
  - render the partial assistant message (from DB)
  - show it as “Interrupted” / error state
  - allow “Regenerate”

---

### 3) Database writes start failing (during streaming)
Examples:
- DB is down
- Transaction errors
- Connection pool exhaustion
- Permission / schema issue

This is the most critical because the DB is the source of truth.

#### A) Failure to create the initial records
If the server cannot insert the user message and assistant placeholder:
- Fail fast.
- Return a non-streaming error response (e.g., `500` or `503`).
- No streaming begins.
- Client should show an error and allow retry.

#### B) Failure during periodic flush of partial assistant content
If the server cannot persist partial content while streaming:
- The server may continue streaming to the client briefly, but should treat the system as degraded because persistence is required.
- Attempt a small number of retries with backoff.
- If writes still fail:
  - Stop streaming to avoid presenting output that cannot be reconciled on reload.
  - Finalize the assistant message as:
    - `status = "error"`
    - `errorCode = "DB_WRITE_FAILED"`
    - `errorMessage = "Failed to persist response."`
    - `content` should be the last successfully flushed content (or empty if none)
  - If the finalization write also fails, log the incident and terminate the connection with a stream error.

#### C) Failure to write terminal status (done/cancel/error)
If the server generated a completion but cannot persist the terminal status:
- Treat this as an error (since the DB cannot reflect the true final state).
- Prefer to stop the stream and report error to client.
- On next `GET /messages`, stale streaming finalization will resolve any lingering `streaming` status into `error` once `STALE_THRESHOLD` is exceeded.

**Client behavior**
- If the streaming connection ends unexpectedly, the client should:
  - show an error state in the UI
  - prompt the user to reload / retry
- On reload, the canonical state comes from `GET /messages`.

---

## Session Ordering Rules (Sidebar)
- `session.lastActivityAt` must update:
  - at start of streaming (immediately after assistant placeholder creation) so the session bubbles to the top during generation
  - optionally at terminal completion (done/cancel/error)

---

## Implementation Notes (Non-binding)
- SSE is recommended for simplicity.
- Avoid DB writes per token; use buffered flushes.
- Logging should include: requestId, sessionId, assistantMessageId, terminal status, duration, and errorCode when applicable.
- In production, a background reconciler could finalize stale streams; for take-home, finalizing on `GET /messages` is acceptable and deterministic.

