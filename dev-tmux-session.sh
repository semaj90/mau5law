#!/bin/bash

# Development tmux session for Legal AI QUIC + Auth + Tensor System
# Usage: ./dev-tmux-session.sh

SESSION_NAME="legal-ai-dev"

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null

# Create new session with first window for QUIC server
tmux new-session -d -s $SESSION_NAME -n "quic-server"

# Window 1: QUIC Server with Auth
tmux send-keys -t $SESSION_NAME:0 "cd $(pwd)" C-m
tmux send-keys -t $SESSION_NAME:0 "echo '🚀 Building QUIC Server with Authentication...'" C-m
tmux send-keys -t $SESSION_NAME:0 "go build -o legal-ai-quic-auth legal-ai-quic-server-fixed.go auth-handler.go" C-m
tmux send-keys -t $SESSION_NAME:0 "REDIS_PASSWORD=redis QUIC_PORT=4433 ./legal-ai-quic-auth" C-m

# Window 2: SvelteKit Frontend
tmux new-window -t $SESSION_NAME:1 -n "sveltekit"
tmux send-keys -t $SESSION_NAME:1 "cd sveltekit-frontend" C-m
tmux send-keys -t $SESSION_NAME:1 "echo '🎨 Starting SvelteKit with Lucia Auth...'" C-m
tmux send-keys -t $SESSION_NAME:1 "REDIS_PASSWORD=redis npm run dev -- --port 5173" C-m

# Window 3: Redis Monitor
tmux new-window -t $SESSION_NAME:2 -n "redis"
tmux split-window -h -t $SESSION_NAME:2

# Left pane: Redis server
tmux send-keys -t $SESSION_NAME:2.0 "echo '📦 Starting Redis Server...'" C-m
tmux send-keys -t $SESSION_NAME:2.0 "redis-server --requirepass redis" C-m

# Right pane: Redis CLI monitor
tmux send-keys -t $SESSION_NAME:2.1 "sleep 3" C-m
tmux send-keys -t $SESSION_NAME:2.1 "echo '👁️ Redis Monitor...'" C-m
tmux send-keys -t $SESSION_NAME:2.1 "redis-cli -a redis monitor" C-m

# Window 4: PostgreSQL + pgvector
tmux new-window -t $SESSION_NAME:3 -n "postgres"
tmux send-keys -t $SESSION_NAME:3 "echo '🐘 PostgreSQL Status...'" C-m
tmux send-keys -t $SESSION_NAME:3 "PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -c '\dt'" C-m

# Window 5: Testing & Monitoring
tmux new-window -t $SESSION_NAME:4 -n "testing"
tmux split-window -h -t $SESSION_NAME:4
tmux split-window -v -t $SESSION_NAME:4.0
tmux split-window -v -t $SESSION_NAME:4.2

# Top-left: Auth testing
tmux send-keys -t $SESSION_NAME:4.0 "echo '🔐 Auth Testing Ready'" C-m
tmux send-keys -t $SESSION_NAME:4.0 "echo 'Run: ./test-quic-auth.sh'" C-m

# Bottom-left: Logs tail
tmux send-keys -t $SESSION_NAME:4.1 "echo '📝 Logs Monitoring'" C-m
tmux send-keys -t $SESSION_NAME:4.1 "tail -f *.log 2>/dev/null || echo 'No logs yet'" C-m

# Top-right: GPU monitoring (if available)
tmux send-keys -t $SESSION_NAME:4.2 "echo '🎮 GPU Status'" C-m
tmux send-keys -t $SESSION_NAME:4.2 "watch -n 2 'nvidia-smi 2>/dev/null || echo \"No GPU detected\"'" C-m

# Bottom-right: System resources
tmux send-keys -t $SESSION_NAME:4.3 "echo '📊 System Resources'" C-m
tmux send-keys -t $SESSION_NAME:4.3 "htop || top" C-m

# Window 6: Tensor/Embedding Worker
tmux new-window -t $SESSION_NAME:5 -n "tensor-worker"
tmux send-keys -t $SESSION_NAME:5 "echo '🧮 Tensor Cache Worker'" C-m
tmux send-keys -t $SESSION_NAME:5 "echo 'Ready for tensor operations...'" C-m
tmux send-keys -t $SESSION_NAME:5 "# python tensor_cache_worker.py" C-m

# Window 7: Dataset Generation
tmux new-window -t $SESSION_NAME:6 -n "dataset"
tmux split-window -h -t $SESSION_NAME:6

# Left: Dataset generator
tmux send-keys -t $SESSION_NAME:6.0 "echo '📊 Dataset Generator'" C-m
tmux send-keys -t $SESSION_NAME:6.0 "echo 'Commands:'" C-m
tmux send-keys -t $SESSION_NAME:6.0 "echo '  python generate_embeddings.py'" C-m
tmux send-keys -t $SESSION_NAME:6.0 "echo '  node scripts/generate-legal-embeddings.mjs'" C-m

# Right: Ollama/LLM monitor
tmux send-keys -t $SESSION_NAME:6.1 "echo '🤖 Ollama Status'" C-m
tmux send-keys -t $SESSION_NAME:6.1 "ollama list" C-m

# Window 8: Development Shell
tmux new-window -t $SESSION_NAME:7 -n "dev-shell"
tmux send-keys -t $SESSION_NAME:7 "echo '💻 Development Shell'" C-m
tmux send-keys -t $SESSION_NAME:7 "echo 'Available commands:'" C-m
tmux send-keys -t $SESSION_NAME:7 "echo '  go build ...        # Build Go services'" C-m
tmux send-keys -t $SESSION_NAME:7 "echo '  npm run ...         # Run Node scripts'" C-m
tmux send-keys -t $SESSION_NAME:7 "echo '  ./test-quic-auth.sh # Test authentication'" C-m
tmux send-keys -t $SESSION_NAME:7 "echo '  curl -k https://localhost:4433/health'" C-m

# Select the first window
tmux select-window -t $SESSION_NAME:0

# Attach to session
echo "==========================================="
echo "🚀 Legal AI Development Environment Ready!"
echo "==========================================="
echo ""
echo "Windows:"
echo "  0: quic-server  - QUIC server with auth"
echo "  1: sveltekit    - Frontend development"
echo "  2: redis        - Redis server & monitor"
echo "  3: postgres     - PostgreSQL console"
echo "  4: testing      - Testing & monitoring"
echo "  5: tensor-worker- Tensor cache operations"
echo "  6: dataset      - Dataset generation"
echo "  7: dev-shell    - Development commands"
echo ""
echo "Navigation:"
echo "  Ctrl+B, [0-7]  - Switch windows"
echo "  Ctrl+B, arrows - Switch panes"
echo "  Ctrl+B, d      - Detach session"
echo "  Ctrl+B, x      - Kill pane"
echo ""
echo "Attaching to session..."
echo ""

tmux attach-session -t $SESSION_NAME