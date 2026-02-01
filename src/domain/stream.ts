export type StreamErrorCode =
  | "LLM_ERROR"
  | "STREAM_INTERRUPTED"
  | "DB_WRITE_FAILED"
  | "BAD_REQUEST"
  | "RATE_LIMITED";

type MessageCreatedEvent = {
  type: "message.created";
  userMessage: { id: string; seq: number };
  assistantMessage: { id: string; seq: number; status: "streaming" };
};

type MessageDeltaEvent = {
  type: "message.delta";
  assistantMessageId: string;
  delta: string;
};

type MessageDoneEvent = {
  type: "message.done";
  assistantMessageId: string;
};

type MessageCancelledEvent = {
  type: "message.cancelled";
  assistantMessageId: string;
};

type MessageErrorEvent = {
  type: "message.error";
  assistantMessageId: string;
  errorCode: StreamErrorCode;
  errorMessage: string;
};

export type StreamEvent =
  | MessageCreatedEvent
  | MessageDeltaEvent
  | MessageDoneEvent
  | MessageCancelledEvent
  | MessageErrorEvent;

export const createdEvent = (
  userMessage: MessageCreatedEvent["userMessage"],
  assistantMessage: MessageCreatedEvent["assistantMessage"],
): StreamEvent => ({
  type: "message.created",
  userMessage,
  assistantMessage,
});

export const deltaEvent = (
  assistantMessageId: string,
  delta: string,
): StreamEvent => ({
  type: "message.delta",
  assistantMessageId,
  delta,
});

export const doneEvent = (assistantMessageId: string): StreamEvent => ({
  type: "message.done",
  assistantMessageId,
});

export const cancelledEvent = (assistantMessageId: string): StreamEvent => ({
  type: "message.cancelled",
  assistantMessageId,
});

export const errorEvent = (
  assistantMessageId: string,
  errorCode: StreamErrorCode,
  errorMessage: string,
): StreamEvent => ({
  type: "message.error",
  assistantMessageId,
  errorCode,
  errorMessage,
});
