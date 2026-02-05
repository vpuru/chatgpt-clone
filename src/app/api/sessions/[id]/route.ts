import { NextResponse } from "next/server";
import { DbChatStore } from "@/store/DbChatStore";

const notImplementedResponse = () =>
  NextResponse.json(
    {
      error: "not_implemented",
      message:
        "This endpoint is specified but not implemented yet. Refer to SPEC.md for the contract.",
    },
    { status: 501 }
  );

type RouteContext = {
  params: { id: string };
};

/**
 * Session detail routes.
 *
 * PATCH /api/sessions/:id
 * Purpose: rename a session (and optionally restore it if undelete is supported).
 * Expected request shape:
 * { "title": "My new title" }
 * Expected response shape:
 * { "id": "uuid", "title": "My new title", "lastActivityAt": "..." }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const sessionId = context.params.id;
  const store = new DbChatStore();

  // Parse and validate request
  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "title is required" },
      { status: 400 }
    );
  }

  // Update session title
  try {
    await store.renameSession(sessionId, body.title);

    // Fetch updated session to return
    const sessions = await store.listSessions();
    const updatedSession = sessions.find((s) => s.id === sessionId);

    if (!updatedSession) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedSession.id,
      title: updatedSession.title,
      lastActivityAt: updatedSession.lastActivityAt,
    });
  } catch (error: any) {
    console.error("Failed to rename session:", error);
    return NextResponse.json(
      { error: "DB_WRITE_FAILED", message: "Failed to rename session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/:id
 * Purpose: delete a session (prefer soft delete).
 * Expected response: 204 No Content
 * Notes: soft delete sets deletedAt while keeping messages for restore/debugging.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const sessionId = context.params.id;
  const store = new DbChatStore();

  try {
    await store.deleteSession(sessionId);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "DB_WRITE_FAILED", message: "Failed to delete session" },
      { status: 500 }
    );
  }
}
