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
 * Session detail routes.
 *
 * PATCH /api/sessions/:id
 * Purpose: rename a session (and optionally restore it if undelete is supported).
 * Expected request shape:
 * { "title": "My new title" }
 * Expected response shape:
 * { "id": "uuid", "title": "My new title", "lastActivityAt": "..." }
 */
export async function PATCH() {
  return notImplementedResponse();
}

/**
 * DELETE /api/sessions/:id
 * Purpose: delete a session (prefer soft delete).
 * Expected response: 204 No Content
 * Notes: soft delete sets deletedAt while keeping messages for restore/debugging.
 */
export async function DELETE() {
  return notImplementedResponse();
}
