import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { messages, sessions } from "../db/schema";
import type { MessageRow, MessageStatus, SessionRow } from "../db/types";
import type { ChatStore, CreateSendResult } from "./chatStore";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

export class DbChatStore implements ChatStore {
  async listSessions(): Promise<
    Array<Pick<SessionRow, "id" | "title" | "createdAt" | "lastActivityAt">>
  > {
    return db
      .select({
        id: sessions.id,
        title: sessions.title,
        createdAt: sessions.createdAt,
        lastActivityAt: sessions.lastActivityAt,
      })
      .from(sessions)
      .where(isNull(sessions.deletedAt))
      .orderBy(desc(sessions.lastActivityAt));
  }

  async createSession(input?: {
    title?: string | null;
  }): Promise<Pick<SessionRow, "id" | "title" | "createdAt" | "lastActivityAt">> {
    const rawTitle = input?.title;
    const normalizedTitle = rawTitle?.trim();
    const title = normalizedTitle ? normalizedTitle : "New chat";

    const [session] = await db
      .insert(sessions)
      .values({ title })
      .returning({
        id: sessions.id,
        title: sessions.title,
        createdAt: sessions.createdAt,
        lastActivityAt: sessions.lastActivityAt,
      });

    return session;
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    // TODO: implement database-backed session rename.
    throw new Error("DbChatStore.renameSession not implemented");
  }

  async deleteSession(sessionId: string): Promise<void> {
    // TODO: implement database-backed session deletion.
    throw new Error("DbChatStore.deleteSession not implemented");
  }

  async getMessages(
    sessionId: string,
    opts?: { finalizeStaleStreaming?: boolean; staleThresholdMs?: number },
  ): Promise<MessageRow[]> {
    const thresholdMs = opts?.staleThresholdMs ?? 5 * 60 * 1000; // 5 minutes default
    const staleThreshold = new Date(Date.now() - thresholdMs);

    // First, optionally finalize stale streaming messages
    if (opts?.finalizeStaleStreaming) {
      await db
        .update(messages)
        .set({
          status: "error",
          errorCode: "STREAM_INTERRUPTED",
          errorMessage: "Stream was interrupted and not finalized",
          updatedAt: sql`NOW()`,
        })
        .where(
          and(
            eq(messages.sessionId, sessionId),
            eq(messages.status, "streaming"),
            sql`${messages.updatedAt} < ${staleThreshold}`,
          ),
        );
    }

    // Then retrieve all messages
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.seq);
  }

  async createUserAndAssistantPlaceholder(params: {
    sessionId: string;
    content: string;
    clientMessageId: string;
  }): Promise<CreateSendResult> {
    return await db.transaction(async (tx) => {
      // Step 1: Check for existing user message with this clientMessageId (idempotency)
      const [existingUserMessage] = await tx
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.sessionId, params.sessionId),
            eq(messages.clientMessageId, params.clientMessageId),
          ),
        )
        .limit(1);

      if (existingUserMessage) {
        // Idempotent case: message already exists
        // Find the corresponding assistant message (if any)
        const [assistantMessage] = await tx
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.sessionId, params.sessionId),
              eq(messages.seq, existingUserMessage.seq + 1),
              eq(messages.role, "assistant"),
            ),
          )
          .limit(1);

        return {
          kind: "idempotent",
          userMessageId: existingUserMessage.id,
          userSeq: existingUserMessage.seq,
          assistantMessageId: assistantMessage?.id ?? null,
          assistantSeq: assistantMessage?.seq ?? null,
        };
      }

      // Step 2: Lock the session row and get next_seq using SELECT FOR UPDATE
      const [sessionLock] = await tx
        .select({ nextSeq: sessions.nextSeq })
        .from(sessions)
        .where(eq(sessions.id, params.sessionId))
        .for("update");

      if (!sessionLock) {
        throw new Error(`Session ${params.sessionId} not found`);
      }

      const userSeq = sessionLock.nextSeq;
      const assistantSeq = userSeq + 1;
      const newNextSeq = assistantSeq + 1;

      // Step 3: Insert user message with status='complete'
      const [userMessage] = await tx
        .insert(messages)
        .values({
          sessionId: params.sessionId,
          seq: userSeq,
          role: "user",
          status: "complete",
          content: params.content,
          clientMessageId: params.clientMessageId,
        })
        .returning({ id: messages.id });

      // Step 4: Insert assistant placeholder with status='streaming', content=''
      const [assistantMessage] = await tx
        .insert(messages)
        .values({
          sessionId: params.sessionId,
          seq: assistantSeq,
          role: "assistant",
          status: "streaming",
          content: "",
        })
        .returning({ id: messages.id });

      // Step 5: Update session's next_seq and last_activity_at
      await tx
        .update(sessions)
        .set({
          nextSeq: newNextSeq,
          lastActivityAt: sql`NOW()`,
        })
        .where(eq(sessions.id, params.sessionId));

      return {
        kind: "created",
        userMessageId: userMessage.id,
        userSeq,
        assistantMessageId: assistantMessage.id,
        assistantSeq,
      };
    });
  }

  async flushAssistantContent(params: {
    assistantMessageId: string;
    content: string;
  }): Promise<void> {
    await db
      .update(messages)
      .set({
        content: params.content,
        updatedAt: sql`NOW()`,
      })
      .where(eq(messages.id, params.assistantMessageId));
  }

  async finalizeAssistant(params: {
    assistantMessageId: string;
    status: Extract<MessageStatus, "complete" | "cancelled" | "error">;
    content: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    await db
      .update(messages)
      .set({
        status: params.status,
        content: params.content,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        updatedAt: sql`NOW()`,
      })
      .where(eq(messages.id, params.assistantMessageId));
  }

  async bumpSessionActivity(sessionId: string): Promise<void> {
    // TODO: implement database-backed session activity bump.
    throw new Error("DbChatStore.bumpSessionActivity not implemented");
  }

  async getSummary(
    sessionId: string,
  ): Promise<{ summary: string; summarizedThroughSeq: number } | null> {
    // TODO: implement database-backed summary retrieval.
    throw new Error("DbChatStore.getSummary not implemented");
  }

  async upsertSummary(params: {
    sessionId: string;
    summary: string;
    summarizedThroughSeq: number;
  }): Promise<void> {
    // TODO: implement database-backed summary upsert.
    throw new Error("DbChatStore.upsertSummary not implemented");
  }
}
