export type LLMEnvironment = "production" | "development";

export function getLLMEnvironment(): LLMEnvironment {
  const env = process.env.NODE_ENV ?? process.env.LLM_ENV;

  if (env === "production") {
    return "production";
  }

  return "development";
}
