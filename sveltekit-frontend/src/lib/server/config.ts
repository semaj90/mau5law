export const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  // Add other Redis specific configurations if needed, e.g., password, db
};

// Placeholder for other configurations if they were to be centralized
export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
};

export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
};
