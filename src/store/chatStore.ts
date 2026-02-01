import type {
  MessageRole,
  MessageRow,
  MessageStatus,
  SessionRow,
} from "../db/types";

export type CreateSendResult =
  | {
      kind: "created";
      userMessageId: string;
      userSeq: number;
      assistantMessageId: string;
      assistantSeq: number;
    }
  | {
      kind: "idempotent";
      userMessageId: string;
      userSeq: number;
      assistantMessageId: string | null;
      assistantSeq: number | null;
    };

export interface ChatStore {
  listSessions(): Promise<
    Array<Pick<SessionRow, "id" | "title" | "createdAt" | "lastActivityAt">>
  >;
  createSession(input?: {
    title?: string | null;
  }): Promise<Pick<SessionRow, "id" | "title" | "createdAt" | "lastActivityAt">>;
  renameSession(sessionId: string, title: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;

  getMessages(
    sessionId: string,
    opts?: { finalizeStaleStreaming?: boolean; staleThresholdMs?: number },
  ): Promise<MessageRow[]>;

  createUserAndAssistantPlaceholder(params: {
    sessionId: string;
    content: string;
    clientMessageId: string;
  }): Promise<CreateSendResult>;

  flushAssistantContent(params: {
    assistantMessageId: string;
    content: string;
  }): Promise<void>;

  finalizeAssistant(params: {
    assistantMessageId: string;
    status: Extract<MessageStatus, "complete" | "cancelled" | "error">;
    content: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void>;

  bumpSessionActivity(sessionId: string): Promise<void>;

  getSummary(
    sessionId: string,
  ): Promise<{ summary: string; summarizedThroughSeq: number } | null>;
  upsertSummary(params: {
    sessionId: string;
    summary: string;
    summarizedThroughSeq: number;
  }): Promise<void>;
}

export type { MessageRole };
