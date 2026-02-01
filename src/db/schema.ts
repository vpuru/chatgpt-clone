import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const messageRoleEnum = pgEnum("message_role", [
  "system",
  "user",
  "assistant",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "complete",
  "streaming",
  "cancelled",
  "error",
]);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    nextSeq: integer("next_seq").notNull().default(1),
  },
  (table) => ({
    deletedActivityIdx: index("sessions_deleted_activity_idx").on(
      table.deletedAt,
      table.lastActivityAt.desc(),
    ),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    seq: integer("seq").notNull(),
    role: messageRoleEnum("role").notNull(),
    status: messageStatusEnum("status").notNull(),
    content: text("content").notNull().default(""),
    clientMessageId: text("client_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionSeqIdx: index("messages_session_seq_idx").on(
      table.sessionId,
      table.seq,
    ),
    sessionSeqUnique: uniqueIndex("messages_session_seq_unique").on(
      table.sessionId,
      table.seq,
    ),
    clientMessageUnique: uniqueIndex("messages_client_message_unique")
      .on(table.sessionId, table.clientMessageId)
      .where(sql`${table.clientMessageId} is not null`),
  }),
);

export const sessionSummaries = pgTable("session_summaries", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessions.id),
  summary: text("summary").notNull(),
  summarizedThroughSeq: integer("summarized_through_seq").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
