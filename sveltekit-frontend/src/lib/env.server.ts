// Server-side Environment Variables (env.server.ts)
// These are only available on the server and not exposed to the client

// Database Secrets (server-only)
DATABASE_URL="postgresql://legal_ai_user:secure_password_2025@localhost:5432/legal_ai_db"
DIRECT_URL="postgresql://legal_ai_user:secure_password_2025@localhost:5432/legal_ai_db"

// Redis Secrets (server-only)
REDIS_URL="redis://:secure_redis_password_2025@localhost:6379"
REDIS_PASSWORD="secure_redis_password_2025"

// AI Service Secrets (server-only)
OLLAMA_URL="http://localhost:11434"
CUDA_SERVICE_URL="http://localhost:8090"
TENSORRT_SERVICE_URL="http://localhost:8099"

// External API Keys (server-only - never exposed to client)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
DEEPSEEK_API_KEY=""

// JWT and Session Secrets (server-only)
JWT_SECRET="legal_ai_jwt_secret_2025_production"
SESSION_SECRET="legal_ai_session_secret_2025"

// MinIO Secrets (server-only)
MINIO_ACCESS_KEY="legal_ai_minio_key_2025"
MINIO_SECRET_KEY="legal_ai_minio_secret_2025"

// Docker Desktop (server-only)
DOCKER_HOST="tcp://localhost:2376"
DOCKER_TLS_VERIFY="1"
DOCKER_CERT_PATH="/Users/james/.docker/machine/machines/default"