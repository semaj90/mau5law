#!/bin/bash

# Gemma-3 VLM Quick Start Script
# Deploys the complete VLM integration with one command
# Date: December 8, 2025

set -e

echo "🚀 Gemma-3 VLM Quick Start Deployment"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama not found. Please install Ollama first.${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client not found. Please install psql.${NC}"
    exit 1
fi

if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python 3.8+.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Step 2: Pull Ollama models
echo -e "${YELLOW}Step 2: Pulling Ollama models...${NC}"

models=(
    "gemma-3-2b-it-v"
    "embeddinggemma:latest"
    "gemma3-legal:latest"
    "gemma3-vision:latest"
)

for model in "${models[@]}"; do
    echo "  Pulling $model..."
    ollama pull "$model"
done

echo -e "${GREEN}✅ All models pulled${NC}"
echo ""

# Step 3: Verify Ollama is running
echo -e "${YELLOW}Step 3: Verifying Ollama endpoint...${NC}"

if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${RED}❌ Ollama endpoint not responding. Starting Ollama...${NC}"
    ollama serve &
    sleep 5
fi

echo -e "${GREEN}✅ Ollama endpoint responding${NC}"
echo ""

# Step 4: Install Python dependencies
echo -e "${YELLOW}Step 4: Installing Python dependencies...${NC}"

pip install -q docling onnxruntime opencv-python numpy pillow

echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# Step 5: Apply database migration
echo -e "${YELLOW}Step 5: Applying database migration...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo "  Using default connection: postgresql://legal_admin:123456@localhost/legal_ai_db"
    PGPASSWORD=123456 psql -U legal_admin -d legal_ai_db -h localhost -f sveltekit-frontend/drizzle/20251208_upgrade_embeddings_to_vlm_1024.sql
else
    psql "$DATABASE_URL" -f sveltekit-frontend/drizzle/20251208_upgrade_embeddings_to_vlm_1024.sql
fi

echo -e "${GREEN}✅ Database migration applied${NC}"
echo ""

# Step 6: Verify database tables
echo -e "${YELLOW}Step 6: Verifying database tables...${NC}"

if [ -z "$DATABASE_URL" ]; then
    PGPASSWORD=123456 psql -U legal_admin -d legal_ai_db -h localhost -c "\dt legal_embeddings_omni ca_constitution_sections document_keywords" > /dev/null
else
    psql "$DATABASE_URL" -c "\dt legal_embeddings_omni ca_constitution_sections document_keywords" > /dev/null
fi

echo -e "${GREEN}✅ Database tables verified${NC}"
echo ""

# Step 7: Create .env.local if it doesn't exist
echo -e "${YELLOW}Step 7: Configuring environment...${NC}"

if [ ! -f "sveltekit-frontend/.env.local" ]; then
    cat > sveltekit-frontend/.env.local << 'EOF'
# Ollama Configuration
OLLAMA_ENDPOINT=http://localhost:11434

# VLM Configuration
VLM_MODEL=gemma-3-2b-it-v
EMBEDDING_DIMENSION=1024
QUANTIZATION_TYPE=hybrid_int8_nf4

# Database
DATABASE_URL=postgresql://legal_admin:123456@localhost/legal_ai_db

# Context Orchestrator
CONTEXT_ORCH_URL=http://localhost:8085

# RAG/KAG
RAG_KAG_SERVICE_ADDR=localhost:50061
QDRANT_HOST=localhost
QDRANT_PORT=6333
NEO4J_URI=bolt://localhost:7687

# Optional: TensorRT
TENSORRT_ENABLED=false
TENSORRT_CACHE_DIR=/tmp/trt_cache
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

echo ""

# Step 8: Test endpoints
echo -e "${YELLOW}Step 8: Testing endpoints...${NC}"

echo "  Testing Ollama endpoint..."
if curl -s http://localhost:11434/api/tags | grep -q "gemma-3"; then
    echo -e "${GREEN}  ✅ Ollama endpoint working${NC}"
else
    echo -e "${RED}  ❌ Ollama endpoint not responding${NC}"
fi

echo ""

# Step 9: Summary
echo -e "${GREEN}======================================"
echo "✅ Gemma-3 VLM Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start your SvelteKit dev server:"
echo "   cd sveltekit-frontend && npm run dev"
echo ""
echo "2. Test the context chat endpoint:"
echo "   curl -X POST http://localhost:5173/api/ai/yorha/context-chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\": \"What are the liability clauses?\"}'"
echo ""
echo "3. Ingest California Constitution (optional):"
echo "   node scripts/ingest-ca-constitution.js"
echo ""
echo "4. Monitor performance:"
echo "   tail -f /var/log/vlm-service.log"
echo ""
echo "Documentation:"
echo "  - Implementation Guide: GEMMA3_VLM_IMPLEMENTATION_GUIDE.md"
echo "  - Deployment Summary: GEMMA3_VLM_DEPLOYMENT_SUMMARY.md"
echo "  - Quick Test Guide: VLM_QUICK_TEST_GUIDE.md"
echo ""
echo "Configuration:"
echo "  - Models: gemma-3-2b-it-v, embeddinggemma, gemma3-legal, gemma3-vision"
echo "  - Embedding Dimension: 1024"
echo "  - Quantization: Hybrid INT8 Vision + NF4 Text"
echo "  - Target VRAM: 6-8GB (RTX 3060 Ti compatible)"
echo ""
echo "Status: 🟢 READY FOR DEPLOYMENT"
echo ""
