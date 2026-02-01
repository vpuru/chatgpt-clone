import { messages, sessionSummaries, sessions } from "./schema";

export type SessionRow = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

export type SessionSummaryRow = typeof sessionSummaries.$inferSelect;
export type SessionSummaryInsert = typeof sessionSummaries.$inferInsert;

export type MessageRole = MessageRow["role"];
export type MessageStatus = MessageRow["status"];
