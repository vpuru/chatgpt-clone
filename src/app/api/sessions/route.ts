import { NextResponse } from "next/server";
import { DbChatStore } from "../../../store/dbChatStore";

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
 * Sessions collection routes.
 *
 * GET /api/sessions
 * Purpose: list sessions for the sidebar, sorted by most recent activity.
 * Expected response shape:
 * {
 *   "sessions": [
 *     {
 *       "id": "uuid",
 *       "title": "Truncated title here",
 *       "lastActivityAt": "2026-01-31T12:34:56.000Z",
 *       "createdAt": "2026-01-31T12:00:00.000Z",
 *       "isDeleted": false
 *     }
 *   ]
 * }
 * Notes: sort by lastActivityAt DESC; exclude soft-deleted sessions by default.
 */
export async function GET() {
  return notImplementedResponse();
}

/**
 * POST /api/sessions
 * Purpose: create a new empty session so the UI can navigate immediately.
 * Expected request shape:
 * { "title": null }
 * Expected response shape:
 * { "id": "uuid", "title": "New chat", "createdAt": "...", "lastActivityAt": "..." }
 * Notes: title can remain "New chat" until first message triggers auto-title.
 */
export async function POST(request: Request) {
  let payload: { title?: string | null } = {};
  try {
    const body = await request.json();
    if (body && typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body", message: "Expected JSON object payload." },
        { status: 400 },
      );
    }
    payload = body ?? {};
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const store = new DbChatStore();
  const session = await store.createSession(payload);
  return NextResponse.json(session, { status: 201 });
}
