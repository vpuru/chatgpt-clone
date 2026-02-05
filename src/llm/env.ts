export type LLMEnvironment = "production" | "development";

export function getLLMEnvironment(): LLMEnvironment {
  // Check LLM_ENV first to allow overriding NODE_ENV (which is controlled by npm scripts)
  const env = process.env.LLM_ENV ?? process.env.NODE_ENV;

  if (env === "production") {
    return "production";
  }

  return "development";
}
