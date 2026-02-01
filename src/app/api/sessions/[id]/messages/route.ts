import { NextResponse } from "next/server";

const notImplementedResponse = () =>
  NextResponse.json(
    {
      error: "not_implemented",
      message:
        "This endpoint is specified but not implemented yet. Refer to SPEC.md for the contract.",
    },
    { status: 501 }
  );

/**
 * Session messages routes.
 *
 * GET /api/sessions/:id/messages
 * Purpose: deterministic reload + resume view for a session's message history.
 * Expected response shape:
 * {
 *   "sessionId": "uuid",
 *   "messages": [
 *     {
 *       "id": "uuid",
 *       "role": "user",
 *       "content": "Hi",
 *       "status": "complete",
 *       "seq": 12,
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     }
 *   ]
 * }
 * Notes: order by seq ASC (not timestamps); consider cleaning up stale streaming.
 */
export async function GET() {
  return notImplementedResponse();
}

/**
 * POST /api/sessions/:id/messages (streaming)
 * Purpose: create a user message and stream assistant response token-by-token.
 * Expected request shape:
 * {
 *   "content": "User prompt text",
 *   "clientMessageId": "uuid"
 * }
 * Expected response: SSE (text/event-stream) or NDJSON stream.
 * Events: message.created, message.delta, and a terminal message.done/cancelled/error.
 * Notes: client abort should cancel the stream and finalize assistant status.
 */
export async function POST() {
  return notImplementedResponse();
}
