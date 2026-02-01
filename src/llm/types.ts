import type { MessageRole } from "../db/types";

export type ChatMessage = {
  role: MessageRole;
  content: string;
};

export type StreamCompletionParams = {
  messages: ChatMessage[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
};

export interface LLMClient {
  streamCompletion(params: StreamCompletionParams): AsyncIterable<string>;
  summarize?(params: {
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): Promise<string>;
  generateTitle?(params: {
    firstUserMessage: string;
    signal?: AbortSignal;
  }): Promise<string>;
}
