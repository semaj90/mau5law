#!/bin/bash
# Phase 10: Complete Pipeline Quickstart
# Ollama + CH-ROM97 + Image Topology + Vector Storage

set -e

echo "🚀 Phase 10: Ollama + CH-ROM97 Pipeline Quickstart"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start Services
echo -e "\n${BLUE}1. Starting backend services...${NC}"

echo "   Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 2

echo "   Starting Qdrant..."
docker run -d -p 6333:6333 qdrant/qdrant > /dev/null 2>&1 || true
sleep 2

echo "   Starting PostgreSQL..."
docker run -d \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine > /dev/null 2>&1 || true
sleep 2

echo "   Starting MinIO..."
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data > /dev/null 2>&1 || true
sleep 2

echo -e "${GREEN}✅ Services started${NC}"

# 2. Pull Ollama Models
echo -e "\n${BLUE}2. Pulling Ollama embedding models...${NC}"

echo "   Pulling embeddinggemma:latest..."
ollama pull embeddinggemma:latest

echo "   (Optional) Pulling gemma3-legal:latest..."
ollama pull gemma3-legal:latest || echo "   ⚠️  gemma3-legal not available, using embeddinggemma"

echo -e "${GREEN}✅ Models ready${NC}"

# 3. Install Python Dependencies
echo -e "\n${BLUE}3. Installing Python dependencies...${NC}"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate || . venv/Scripts/activate

pip install -q -r backend/requirements-phase10.txt

echo -e "${GREEN}✅ Dependencies installed${NC}"

# 4. Set Environment Variables
echo -e "\n${BLUE}4. Setting environment variables...${NC}"

export OLLAMA_URL=http://localhost:11434
export OLLAMA_EMBED_MODEL=embeddinggemma:latest
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

echo "   OLLAMA_URL=$OLLAMA_URL"
echo "   OLLAMA_EMBED_MODEL=$OLLAMA_EMBED_MODEL"
echo -e "${GREEN}✅ Environment ready${NC}"

# 5. Process Image (if provided)
echo -e "\n${BLUE}5. Processing legal document image...${NC}"

if [ -f "sample_legal_document.jpg" ]; then
  echo "   Found sample_legal_document.jpg"
  python backend/services/chr97_image_processor.py
  echo -e "${GREEN}✅ Image processed${NC}"
else
  echo "   ⚠️  No sample_legal_document.jpg found"
  echo "   To process an image, place it in the workspace root and re-run"
fi

# 6. Build Manifold Topology
echo -e "\n${BLUE}6. Building manifold topology...${NC}"

if [ -f "manifold_demo.py" ]; then
  python manifold_demo.py
  echo -e "${GREEN}✅ Manifold topology created${NC}"
else
  echo "   ⚠️  manifold_demo.py not found"
fi

# 7. Build CH-ROM97 Cartridge
echo -e "\n${BLUE}7. Building CH-ROM97 cartridge...${NC}"

if [ -f "chr97.mjs" ]; then
  node chr97.mjs build
  echo -e "${GREEN}✅ Cartridge built${NC}"
else
  echo "   ⚠️  chr97.mjs not found"
fi

# 8. Inspect Cartridge
echo -e "\n${BLUE}8. Inspecting cartridge...${NC}"

if [ -f "demo.chr97" ] && [ -f "chr97.mjs" ]; then
  node chr97.mjs inspect demo.chr97
  echo -e "${GREEN}✅ Cartridge inspection complete${NC}"
else
  echo "   ⚠️  demo.chr97 not found"
fi

# 9. Summary
echo -e "\n${GREEN}=================================================="
echo "✅ Phase 10 Pipeline Complete!"
echo "==================================================${NC}"

echo -e "\n${YELLOW}Output Files:${NC}"
echo "  • image_topology.json     (Image-derived topology)"
echo "  • manifold_export.json    (Manifold topology)"
echo "  • demo.chr97              (CH-ROM97 cartridge)"

echo -e "\n${YELLOW}Storage:${NC}"
echo "  • Qdrant:     http://localhost:6333"
echo "  • PostgreSQL: localhost:5432"
echo "  • MinIO:      http://localhost:9000"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Start frontend: npm run dev (in frontend/phase-10-memory-palace)"
echo "  2. Query embeddings: python backend/services/rag_demo.py"
echo "  3. Visualize: Open http://localhost:5173"

echo -e "\n${YELLOW}Cleanup:${NC}"
echo "  kill $OLLAMA_PID"
echo "  docker stop \$(docker ps -q)"

echo ""
