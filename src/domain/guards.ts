import type { MessageRow, MessageStatus } from "../db/types";

export type TerminalStatus = Exclude<MessageStatus, "streaming">;

export const isTerminalStatus = (status: MessageStatus): status is TerminalStatus =>
  status !== "streaming";

export const isAssistantMessage = (
  message: MessageRow,
): message is MessageRow & { role: "assistant" } => message.role === "assistant";
