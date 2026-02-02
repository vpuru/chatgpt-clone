import { NextResponse } from "next/server";
import { DbChatStore } from "@/store/dbChatStore";

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
  const store = new DbChatStore();
  const sessions = await store.listSessions();

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      ...session,
      isDeleted: false,
    })),
  });
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
  const payload = (await request.json().catch(() => ({}))) as {
    title?: string | null;
  };
  const store = new DbChatStore();
  const session = await store.createSession({ title: payload.title });

  return NextResponse.json(session);
}
