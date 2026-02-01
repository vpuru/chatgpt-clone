CREATE TYPE "message_role" AS ENUM ('system', 'user', 'assistant');
CREATE TYPE "message_status" AS ENUM ('complete', 'streaming', 'cancelled', 'error');

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_activity_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "next_seq" integer NOT NULL DEFAULT 1
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "seq" integer NOT NULL,
  "role" "message_role" NOT NULL,
  "status" "message_status" NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "client_message_id" text,
  "error_code" text,
  "error_message" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE no action ON UPDATE no action
);

CREATE TABLE "session_summaries" (
  "session_id" uuid PRIMARY KEY NOT NULL,
  "summary" text NOT NULL,
  "summarized_through_seq" integer NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "session_summaries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX "sessions_deleted_activity_idx" ON "sessions" ("deleted_at", "last_activity_at" DESC);
CREATE INDEX "messages_session_seq_idx" ON "messages" ("session_id", "seq");

CREATE UNIQUE INDEX "messages_session_seq_unique" ON "messages" ("session_id", "seq");
CREATE UNIQUE INDEX "messages_client_message_unique" ON "messages" ("session_id", "client_message_id") WHERE "client_message_id" IS NOT NULL;
