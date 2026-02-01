# Database Schema Brainstorm (Chat Sessions + Streaming)

This doc captures the proposed database schema for a chat app with:
- sessions (create/rename/delete)
- message persistence (user + assistant)
- deterministic reload (stable ordering)
- token streaming into a single assistant message
- cancel/disconnect handling
- resilience to server crash mid-stream
- optional summarization/truncation support

The database is the source of truth: on reload, the UI rehydrates from `GET /api/sessions/:id/messages`.

---

## Feature → Data Requirements

### Sessions sidebar (sorted by most recent activity)
- Need a `last_activity_at` field on sessions.
- Update `last_activity_at` when an assistant placeholder is created (stream starts), and optionally when the stream terminates.

### Deterministic message ordering (no timestamp reliance)
- Need a per-session monotonic integer `seq` on messages.
- Messages are rendered ordered by `seq ASC`.

### Streaming assistant response (partial persistence)
- Need an assistant placeholder message with `status='streaming'` and `content=''`.
- Update `content` periodically during streaming (buffer + flush).
- Use `updated_at` to detect stale streams after server crashes.

### Cancel / disconnect / refresh
- Need terminal status `cancelled`.
- Preserve partial `content` for display and for regenerate UX.

### Server crash mid-stream
- Streams may be left stuck in `status='streaming'`.
- On next read, finalize stale streaming messages to `status='error'` using an `updated_at` + threshold rule.

### Duplicate message submissions (idempotency)
- Need `client_message_id` unique per session so retry/double-submit does not create duplicates.
- Enforce uniqueness on `(session_id, client_message_id)` where `client_message_id IS NOT NULL`.

### Summarization / truncation (optional, recommended)
- Need a place to store a session summary + cursor (`summarized_through_seq`) indicating which messages are covered.

---

## Proposed Tables

### 1) `sessions`

Fields:
- `id` UUID PRIMARY KEY
- `title` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `last_activity_at` TIMESTAMP NOT NULL
- `deleted_at` TIMESTAMP NULL  (soft delete)
- `next_seq` INT NOT NULL DEFAULT 1  (for concurrency-safe seq assignment)

Indexes:
- Index on `(deleted_at, last_activity_at DESC)` for sidebar queries

Notes:
- `next_seq` supports concurrency-safe allocation of `messages.seq`.
- Soft delete keeps messages for safety/debugging while removing sessions from list.

---

### 2) `messages`

Fields:
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id)
- `seq` INT NOT NULL
- `role` TEXT NOT NULL  (allowed: `system`, `user`, `assistant`)
- `status` TEXT NOT NULL (allowed: `complete`, `streaming`, `cancelled`, `error`)
- `content` TEXT NOT NULL DEFAULT ''
- `client_message_id` TEXT NULL  (idempotency key)
- `error_code` TEXT NULL
- `error_message` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Constraints:
- UNIQUE `(session_id, seq)`  (ensures deterministic ordering without duplicates)
- UNIQUE `(session_id, client_message_id)` WHERE `client_message_id IS NOT NULL`
- CHECK `role IN ('system','user','assistant')`
- CHECK `status IN ('complete','streaming','cancelled','error')`

Indexes:
- Index `(session_id, seq)` for fast ordered fetch
- Optional index `(status, updated_at)` if you later want to scan for stale streaming messages

Notes:
- User messages are inserted as `status='complete'`.
- Assistant placeholder is inserted as `status='streaming'`, `content=''`.
- During streaming, periodically flush `content` and `updated_at`.
- Terminal states:
  - `complete` (normal success)
  - `cancelled` (client abort/disconnect)
  - `error` (LLM failure, server crash finalization, DB persistence failures)
- Regenerate should insert a *new* assistant message (new `seq`) rather than overwriting old assistant messages.

---

### 3) `session_summaries` (optional but recommended)

Fields:
- `session_id` UUID PRIMARY KEY REFERENCES sessions(id)
- `summary` TEXT NOT NULL
- `summarized_through_seq` INT NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Notes:
- When building LLM context:
  - include the summary as a `system` message
  - then include messages with `seq > summarized_through_seq`
- This avoids re-sending the entire long history every time.

---

## Deterministic Ordering: Assigning `seq` Correctly

Goal: `seq` must be monotonic per session even with concurrent requests.

Recommended approach: use `sessions.next_seq` with row-level locking.

Transactional algorithm for `POST /api/sessions/:id/messages`:
1. `SELECT next_seq FROM sessions WHERE id=? FOR UPDATE`
2. Assign:
   - `user.seq = next_seq`
   - `assistant.seq = next_seq + 1`
3. Insert user message (idempotent by `client_message_id`)
4. Insert assistant placeholder message
5. Update session:
   - `next_seq = next_seq + 2`
   - `last_activity_at = now()`

If the request is a retry with the same `client_message_id`, the server should return the existing user message and (if already created) the associated assistant placeholder, without incrementing `next_seq` again.

---

## Session Activity Updates (Sidebar Behavior)

Update `sessions.last_activity_at`:
- immediately after creating assistant placeholder (stream start) so the session bubbles to top while streaming
- optionally again on terminal completion (done/cancel/error)

This supports “session list updates live while streaming”.

---

## Handling Streaming Failure Modes (Schema Support)

### 1) Client aborts / disconnects
- Persist assistant message with:
  - `status='cancelled'`
  - `content=<partial>`
  - keep `seq` and message row intact

### 2) Server crashes mid-stream
- Assistant message may remain `status='streaming'` with last flushed `content`.
- On next read, finalize stale streaming messages:
  - if `now - updated_at > threshold`, set:
    - `status='error'`
    - `error_code='STREAM_INTERRUPTED'`
    - preserve `content`

### 3) DB writes start failing
- If initial inserts fail: request fails, no rows created.
- If partial flush fails:
  - attempt retries
  - if persistence cannot continue, finalize assistant as `status='error'` with `error_code='DB_WRITE_FAILED'` if possible.
- If terminal write fails: the row may remain `streaming`; stale finalization converts it to `error` later.

---

## Optional “Nice-to-Haves” (if time)
These are not required, but helpful for debugging/observability:
- `messages.model` TEXT NULL
- `messages.prompt_tokens` INT NULL
- `messages.completion_tokens` INT NULL
- `messages.latency_ms` INT NULL

---

## Summary

Minimal tables to ship:
- `sessions`
- `messages`

Recommended to include:
- `session_summaries` (for truncation/summarization)

Core correctness hinges on:
- `messages.seq` + unique `(session_id, seq)`
- `client_message_id` uniqueness for idempotency
- `status` field for streaming lifecycle
- `sessions.last_activity_at` for sidebar ordering
- `sessions.next_seq` for concurrency-safe seq assignment

