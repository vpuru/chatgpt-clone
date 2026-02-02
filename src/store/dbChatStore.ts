import { desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sessions } from "../db/schema";
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
    // TODO: implement database-backed message retrieval.
    throw new Error("DbChatStore.getMessages not implemented");
  }

  async createUserAndAssistantPlaceholder(params: {
    sessionId: string;
    content: string;
    clientMessageId: string;
  }): Promise<CreateSendResult> {
    // TODO: implement database-backed user/assistant placeholder creation.
    throw new Error(
      "DbChatStore.createUserAndAssistantPlaceholder not implemented",
    );
  }

  async flushAssistantContent(params: {
    assistantMessageId: string;
    content: string;
  }): Promise<void> {
    // TODO: implement database-backed assistant content flushing.
    throw new Error("DbChatStore.flushAssistantContent not implemented");
  }

  async finalizeAssistant(params: {
    assistantMessageId: string;
    status: Extract<MessageStatus, "complete" | "cancelled" | "error">;
    content: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    // TODO: implement database-backed assistant finalization.
    throw new Error("DbChatStore.finalizeAssistant not implemented");
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
