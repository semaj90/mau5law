import ENV_CONFIG, { CLIENT_ENV } from './env';

// Enhanced AI configuration derived from base environment config
export const ENHANCED_AI_CONFIG = {
    // base values
    OLLAMA_URL: ENV_CONFIG.OLLAMA_URL,
    OLLAMA_MODEL: ENV_CONFIG.OLLAMA_MODEL,
    OPENAI_API_KEY: ENV_CONFIG.OPENAI_API_KEY,
    DATABASE_URL: ENV_CONFIG.DATABASE_URL,
    PUBLIC_APP_URL: ENV_CONFIG.PUBLIC_APP_URL,

    // client-safe values
    CLIENT_OLLAMA_URL: CLIENT_ENV.OLLAMA_URL,
    CLIENT_APP_URL: CLIENT_ENV.APP_URL,

    // helper to build headers for OpenAI requests (server-side)
    getOpenAIHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (ENV_CONFIG.OPENAI_API_KEY) {
            headers.Authorization = `Bearer ${ENV_CONFIG.OPENAI_API_KEY}`;
        }
        return headers;
    }
} as const;

export type EnhancedAIConfig = typeof ENHANCED_AI_CONFIG;

export default ENHANCED_AI_CONFIG;