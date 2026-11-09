import { openllmConfigFromEnv } from "./openllm-connect";
import type { OpenLLMConfig } from "./openllm-connect";

export const OAUTH_COOKIE = "openllm_oauth";

let cached: OpenLLMConfig | null = null;
export const openllm = (): OpenLLMConfig => (cached ??= openllmConfigFromEnv());
