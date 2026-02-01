import type { MessageRow, SessionRow } from "../db/types";

export type IsoString = string;

export type SessionListItemDTO = {
  id: string;
  title: string | null;
  createdAt: IsoString;
  lastActivityAt: IsoString;
};

export type MessageDTO = {
  id: string;
  role: MessageRow["role"];
  status: MessageRow["status"];
  content: string;
  seq: number;
  createdAt: IsoString;
  updatedAt: IsoString;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type GetSessionsResponse = { sessions: SessionListItemDTO[] };

export type GetMessagesResponse = {
  sessionId: string;
  messages: MessageDTO[];
};

export type CreateSessionRequest = { title?: string | null };

export type RenameSessionRequest = { title: string };

export type CreateMessageRequest = {
  content: string;
  clientMessageId: string;
};

export const toSessionListItemDTO = (row: SessionRow): SessionListItemDTO => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  lastActivityAt: row.lastActivityAt.toISOString(),
});

export const toMessageDTO = (row: MessageRow): MessageDTO => ({
  id: row.id,
  role: row.role,
  status: row.status,
  content: row.content,
  seq: row.seq,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  errorCode: row.errorCode ?? undefined,
  errorMessage: row.errorMessage ?? undefined,
});
