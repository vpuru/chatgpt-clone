import { OllamaClient } from "./ollama";
import type { LLMClient } from "./types";
import { getLLMEnvironment } from "./env";

let cachedClient: LLMClient | null = null;

function createLLMClient(): LLMClient {
  const env = getLLMEnvironment();

  // For both development and production, use OllamaClient for now
  // Future: Can add different implementations based on env
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
