import OpenAI from "openai";
import type { ChatMessage, LLMClient, StreamCompletionParams } from "./types";

type OpenAIClientOptions = {
  apiKey?: string;
  model?: string;
};

type OpenAIMessage = {
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

export class OpenAIClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenAIClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required to initialize the OpenAI client.");
    }

    const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.2";
    this.apiKey = apiKey;
    this.model = model;
  }

  async *streamCompletion(params: StreamCompletionParams): AsyncIterable<string> {
    const client = new OpenAI({ apiKey: this.apiKey });

    if (params.signal?.aborted) {
      throw makeAbortError();
    }

    const abortController = new AbortController();
    const onAbort = () => abortController.abort();

    if (params.signal) {
      params.signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const stream = await client.responses.create({
        model: this.model,
        input: params.messages.map(this.toOpenAIMessage),
        stream: true,
        ...(params.temperature != null ? { temperature: params.temperature } : {}),
        ...(params.maxTokens != null ? { max_tokens: params.maxTokens } : {}),
      });

      for await (const event of stream) {
        if (params.signal?.aborted) {
          throw makeAbortError();
        }

        if (event.type === "response.output_text.delta") {
          yield event.delta;
        } else if (event.type === "response.completed") {
          return;
        } else if (event.type === "error") {
          throw new Error(`OpenAI API error: ${JSON.stringify(event)}`);
        }
      }
    } finally {
      if (params.signal) {
        params.signal.removeEventListener("abort", onAbort);
      }
    }
  }

  async summarize(params: { messages: ChatMessage[]; signal?: AbortSignal }): Promise<string> {
    const prompt: ChatMessage = {
      role: "system",
      content: "Summarize the conversation succinctly for future context. Keep it under 150 words.",
    };
    return this.chatOnce([prompt, ...params.messages], params.signal);
  }

  async generateTitle(params: { firstUserMessage: string; signal?: AbortSignal }): Promise<string> {
    const prompt: ChatMessage[] = [
      {
        role: "system",
        content: "Generate a short, descriptive title (max 6 words) for the conversation.",
      },
      { role: "user", content: params.firstUserMessage },
    ];
    const result = await this.chatOnce(prompt, params.signal);
    return result;
  }

  private async chatOnce(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const client = new OpenAI({ apiKey: this.apiKey });

    if (signal?.aborted) {
      throw makeAbortError();
    }

    const abortController = new AbortController();
    const onAbort = () => abortController.abort();

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const stream = await client.responses.create({
        model: this.model,
        input: messages.map(this.toOpenAIMessage),
        stream: true,
      });

      let fullText = "";
      for await (const event of stream) {
        if (signal?.aborted) {
          throw makeAbortError();
        }

        if (event.type === "response.output_text.delta") {
          fullText += event.delta;
        } else if (event.type === "response.completed") {
          break;
        } else if (event.type === "error") {
          throw new Error(`OpenAI API error: ${JSON.stringify(event)}`);
        }
      }

      return fullText.trim();
    } finally {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  }

  private toOpenAIMessage(message: ChatMessage): OpenAIMessage {
    return { role: message.role, content: message.content };
  }
}
