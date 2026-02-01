export type StaleStreamPolicy = { thresholdMs: number };

export type StaleFinalizationResult =
  | { action: "none" }
  | {
      action: "finalized";
      messageId: string;
      newStatus: "error";
      errorCode: "STREAM_INTERRUPTED";
    };
