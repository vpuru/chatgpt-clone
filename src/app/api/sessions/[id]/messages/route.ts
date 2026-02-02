import { NextResponse } from "next/server";
import { DbChatStore } from "@/store/DbChatStore";
import { toMessageDTO, type CreateMessageRequest } from "@/api/dtos";
import { llmClient } from "@/llm/client";
import {
  createdEvent,
  deltaEvent,
  doneEvent,
  cancelledEvent,
  errorEvent,
  type StreamEvent,
} from "@/domain/stream";

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
export async function GET(request: Request, context: RouteContext) {
  const sessionId = context.params.id;
  const store = new DbChatStore();

  const messages = await store.getMessages(sessionId, {
    finalizeStaleStreaming: true,
    staleThresholdMs: 5 * 60 * 1000, // 5 minutes
  });

  return NextResponse.json({
    sessionId,
    messages: messages.map(toMessageDTO),
  });
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
export async function POST(request: Request, context: RouteContext) {
  const sessionId = context.params.id;
  const store = new DbChatStore();

  // Step 1: Parse and validate request
  let body: CreateMessageRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.content?.trim() || !body.clientMessageId) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: "content and clientMessageId are required",
      },
      { status: 400 },
    );
  }

  // Step 2: Create messages atomically
  let createResult;
  try {
    createResult = await store.createUserAndAssistantPlaceholder({
      sessionId,
      content: body.content.trim(),
      clientMessageId: body.clientMessageId,
    });
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Session not found" },
        { status: 404 },
      );
    }
    console.error("Failed to create messages:", error);
    return NextResponse.json(
      { error: "DB_WRITE_FAILED", message: "Failed to create messages" },
      { status: 500 },
    );
  }

  // Step 3: Handle idempotent retry
  if (createResult.kind === "idempotent") {
    return NextResponse.json(
      {
        error: "ALREADY_EXISTS",
        message: "Message with this clientMessageId already exists",
        userMessageId: createResult.userMessageId,
      },
      { status: 409 },
    );
  }

  // Step 4: Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const assistantMessageId = createResult.assistantMessageId;
      let accumulatedContent = "";
      let lastFlushTime = Date.now();
      const FLUSH_INTERVAL_MS = 2000; // Flush every 2 seconds

      // Helper to send SSE event
      const sendEvent = (event: StreamEvent) => {
        const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      // Helper to flush content to database
      const flushContent = async () => {
        if (accumulatedContent) {
          try {
            await store.flushAssistantContent({
              assistantMessageId,
              content: accumulatedContent,
            });
            lastFlushTime = Date.now();
          } catch (error) {
            console.error("Failed to flush content:", error);
            // Continue streaming even if flush fails
          }
        }
      };

      // Step 4a: Send message.created event
      sendEvent(
        createdEvent(
          {
            id: createResult.userMessageId,
            seq: createResult.userSeq,
          },
          {
            id: assistantMessageId,
            seq: createResult.assistantSeq,
            status: "streaming",
          },
        ),
      );

      try {
        // Step 4b: Get conversation history for LLM context
        const allMessages = await store.getMessages(sessionId);
        const conversationHistory = allMessages
          .filter((m) => m.status === "complete")
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        // Step 4c: Stream LLM response
        const llm = llmClient;
        const abortController = new AbortController();

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          abortController.abort();
        });

        try {
          for await (const token of llm.streamCompletion({
            messages: conversationHistory,
            signal: abortController.signal,
          })) {
            accumulatedContent += token;

            // Send delta event
            sendEvent(deltaEvent(assistantMessageId, token));

            // Periodic flush to database
            const now = Date.now();
            if (now - lastFlushTime >= FLUSH_INTERVAL_MS) {
              await flushContent();
            }
          }

          // Final flush and finalization
          await flushContent();
          await store.finalizeAssistant({
            assistantMessageId,
            status: "complete",
            content: accumulatedContent,
          });

          sendEvent(doneEvent(assistantMessageId));
        } catch (error: any) {
          if (error.name === "AbortError") {
            // Client aborted - finalize as cancelled
            await store.finalizeAssistant({
              assistantMessageId,
              status: "cancelled",
              content: accumulatedContent,
            });
            sendEvent(cancelledEvent(assistantMessageId));
          } else {
            // LLM error - finalize as error
            await store.finalizeAssistant({
              assistantMessageId,
              status: "error",
              content: accumulatedContent,
              errorCode: "LLM_ERROR",
              errorMessage: error.message || "LLM request failed",
            });
            sendEvent(
              errorEvent(assistantMessageId, "LLM_ERROR", error.message),
            );
          }
        }
      } catch (error: any) {
        // Database or other error
        console.error("Streaming error:", error);
        try {
          await store.finalizeAssistant({
            assistantMessageId,
            status: "error",
            content: accumulatedContent,
            errorCode: "STREAM_INTERRUPTED",
            errorMessage: error.message || "Stream failed",
          });
        } catch (finalizeError) {
          console.error("Failed to finalize on error:", finalizeError);
        }
        sendEvent(
          errorEvent(assistantMessageId, "STREAM_INTERRUPTED", error.message),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
