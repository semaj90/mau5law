#!/bin/bash
# Deploy TensorRT-LLM Legal AI Package to Ubuntu Server
# FlashAttention + TensorRT-optimized INT4 kernels

set -e

echo "🚀 Deploying TensorRT-LLM Legal AI to Ubuntu Server..."

# Configuration
UBUNTU_SERVER="${UBUNTU_SERVER:-user@ubuntu-server}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/legal-ai}"

echo "📋 Deployment Configuration:"
echo "  Server: $UBUNTU_SERVER"
echo "  Path: $DEPLOY_PATH"
echo ""

# Step 1: Create deployment directory on server
echo "📁 Creating deployment directory structure..."
ssh $UBUNTU_SERVER "sudo mkdir -p $DEPLOY_PATH/{models,engines,logs,configs,ssl}"
ssh $UBUNTU_SERVER "sudo chown -R \$USER:\$USER $DEPLOY_PATH"

# Step 2: Transfer TensorRT-LLM environment (~8GB)
echo "📦 Transferring TensorRT-LLM Python 3.12 environment..."
scp -r TensorRT-LLM/tensorrt_env $UBUNTU_SERVER:$DEPLOY_PATH/

# Step 3: Transfer Gemma3-Legal models (~7GB)
echo "📋 Transferring Gemma3-Legal models..."
if [ -d "models" ]; then
    scp -r models/* $UBUNTU_SERVER:$DEPLOY_PATH/models/
else
    echo "⚠️ Models directory not found - will create placeholder"
    ssh $UBUNTU_SERVER "mkdir -p $DEPLOY_PATH/models"
fi

# Step 4: Transfer TensorRT optimized engines (~2GB)
echo "🔧 Transferring TensorRT optimized engines..."
if [ -d "engines" ]; then
    scp -r engines/* $UBUNTU_SERVER:$DEPLOY_PATH/engines/
else
    echo "⚠️ Engines directory not found - will create placeholder"
    ssh $UBUNTU_SERVER "mkdir -p $DEPLOY_PATH/engines"
fi

# Step 5: Transfer service scripts
echo "📋 Transferring Python service scripts..."
scp legal-ai-tensorrt-service.py $UBUNTU_SERVER:$DEPLOY_PATH/
scp tensorrt-llm-legal-production.py $UBUNTU_SERVER:$DEPLOY_PATH/
scp build-production-tensorrt-llm.py $UBUNTU_SERVER:$DEPLOY_PATH/

# Step 6: Transfer Docker configuration
echo "🐳 Transferring Docker orchestration files..."
scp docker-compose-pgvector-gpu.yml $UBUNTU_SERVER:$DEPLOY_PATH/
scp docker-compose-tensorrt-llm-production.yml $UBUNTU_SERVER:$DEPLOY_PATH/
scp legal-ai-tensorrt.dockerfile $UBUNTU_SERVER:$DEPLOY_PATH/

# Step 7: Transfer configuration files
echo "⚙️ Transferring configuration files..."
scp -r configs/* $UBUNTU_SERVER:$DEPLOY_PATH/configs/ 2>/dev/null || echo "ℹ️ No configs directory found"

# Step 8: Transfer documentation
echo "📚 Transferring documentation..."
scp PRODUCTION-DEPLOYMENT-COMPLETE.md $UBUNTU_SERVER:$DEPLOY_PATH/
scp deploy-production-stack.sh $UBUNTU_SERVER:$DEPLOY_PATH/

echo ""
echo "✅ Transfer Complete!"
echo ""
echo "📋 Next Steps on Ubuntu Server:"
echo ""
echo "1. SSH to server:"
echo "   ssh $UBUNTU_SERVER"
echo ""
echo "2. Navigate to deployment directory:"
echo "   cd $DEPLOY_PATH"
echo ""
echo "3. Activate TensorRT-LLM environment:"
echo "   source tensorrt_env/bin/activate"
echo ""
echo "4. Start infrastructure services:"
echo "   docker-compose -f docker-compose-pgvector-gpu.yml up -d"
echo ""
echo "5. Start TensorRT-LLM service (FlashAttention + INT4):"
echo "   python legal-ai-tensorrt-service.py"
echo ""
echo "6. Test health endpoint:"
echo "   curl http://localhost:8096/health"
echo ""
echo "7. Test inference with FlashAttention + TensorRT:"
echo "   curl -X POST http://localhost:8096/api/legal/query \\\\"
echo "     -H 'Content-Type: application/json' \\\\"
echo "     -d '{\"query\": \"Summarize the Sherman Antitrust Act\", \"options\": {\"flash_attention\": true, \"quantization\": \"q4_k_m\"}}'"
echo ""
echo "8. Check metrics:"
echo "   curl http://localhost:8096/metrics"
echo ""
echo "🎯 Expected Performance:"
echo "   - Inference latency: <100ms"
echo "   - GPU: RTX 3060 Ti optimization"
echo "   - Engine: TensorRT Q4_K_M + FlashAttention"
echo "   - Memory: Pinned memory usage optimized"