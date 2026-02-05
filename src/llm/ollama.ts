import { Ollama } from "ollama";
import type { ChatMessage, LLMClient, StreamCompletionParams } from "./types";

type OllamaClientOptions = {
  baseUrl?: string;
  model?: string;
};

type OllamaChatMessage = {
  role: ChatMessage["role"];
  content: string;
};

const makeAbortError = (): Error => {
  try {
    return new DOMException("The operation was aborted.", "AbortError");
  } catch {
    const error = new Error("The operation was aborted.");
    (error as { name?: string }).name = "AbortError";
    return error;
  }
};

export class OllamaClient implements LLMClient {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: OllamaClientOptions = {}) {
    const baseUrl = options.baseUrl ?? process.env.OLLAMA_HOST;
    if (!baseUrl) {
      throw new Error("OLLAMA_HOST is required to initialize the Ollama client.");
    }

    const model = options.model ?? process.env.OLLAMA_MODEL;
    if (!model) {
      throw new Error("OLLAMA_MODEL is required to initialize the Ollama client.");
    }

    this.baseUrl = baseUrl;
    this.model = model;
  }

  async *streamCompletion(
    params: StreamCompletionParams,
  ): AsyncIterable<string> {
    const client = new Ollama({ host: this.baseUrl });
    const onAbort = () => client.abort();

    if (params.signal) {
      if (params.signal.aborted) {
        onAbort();
        throw makeAbortError();
      }
      params.signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const stream = await client.chat({
        model: this.model,
        stream: true,
        messages: params.messages.map(this.toOllamaMessage),
        options: {
          ...(params.temperature != null
            ? { temperature: params.temperature }
            : {}),
          ...(params.maxTokens != null ? { num_predict: params.maxTokens } : {}),
        },
      });

      for await (const chunk of stream) {
        const delta = chunk.message?.content;
        if (delta) {
          yield delta;
        }
        if (chunk.done) {
          return;
        }
      }
    } finally {
      if (params.signal) {
        params.signal.removeEventListener("abort", onAbort);
      }
    }
  }

  async summarize(params: {
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): Promise<string> {
    const prompt: ChatMessage = {
      role: "system",
      content:
        "Summarize the conversation succinctly for future context. Keep it under 150 words.",
    };
    return this.chatOnce([prompt, ...params.messages], params.signal);
  }

  async generateTitle(params: {
    firstUserMessage: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const prompt: ChatMessage[] = [
      {
        role: "system",
        content:
          "Generate a short, descriptive title (max 6 words) for the conversation.",
      },
      { role: "user", content: params.firstUserMessage },
    ];
    return this.chatOnce(prompt, params.signal);
  }

  private async chatOnce(
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<string> {
    const client = new Ollama({ host: this.baseUrl });
    const onAbort = () => client.abort();

    if (signal) {
      if (signal.aborted) {
        onAbort();
        throw makeAbortError();
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const response = await client.chat({
        model: this.model,
        stream: false,
        messages: messages.map(this.toOllamaMessage),
      });

      return response.message?.content?.trim() ?? "";
    } finally {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  }

  private toOllamaMessage(message: ChatMessage): OllamaChatMessage {
    return { role: message.role, content: message.content };
  }
}
