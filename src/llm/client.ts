import { OllamaClient } from "./ollama";
import { OpenAIClient } from "./openai";
import type { LLMClient } from "./types";
import { getLLMEnvironment } from "./env";

let cachedClient: LLMClient | null = null;

function createLLMClient(): LLMClient {
  const env = getLLMEnvironment();

  if (env === "production") {
    return new OpenAIClient();
  }

  return new OllamaClient();
}

export function getLLMClient(): LLMClient {
  if (!cachedClient) {
    cachedClient = createLLMClient();
  }
  return cachedClient;
}

// Export singleton instance initialized at module load time
export const llmClient = getLLMClient();
