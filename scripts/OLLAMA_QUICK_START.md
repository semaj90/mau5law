# Ollama Quick Start for WardenNet

## 1-Minute Setup

```bash
# Install Ollama
brew install ollama  # macOS
# or download from https://ollama.ai

# Start Ollama server
ollama serve

# In another terminal, pull Gemma
ollama pull gemma:7b

# Test it works
curl http://localhost:11434/api/tags
```

## Quick Tests

### Health Check
```bash
curl http://localhost:11434/api/tags | jq .
```

### Simple Query
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [{"role": "user", "content": "Hi"}],
    "stream": false
  }' | jq '.message.content'
```

### Legal Query
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {"role": "system", "content": "You are a legal assistant."},
      {"role": "user", "content": "What is evidence?"}
    ],
    "stream": false
  }' | jq '.message.content'
```

### Function-Calling Test
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {"role": "system", "content": "When asked to search, respond with: FUNCTION_CALL: search_evidence(query=\"term\")"},
      {"role": "user", "content": "Search for suspect"}
    ],
    "stream": false
  }' | jq '.message.content'
```

## Environment Variables

```bash
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="gemma:7b"
```

## Verify WardenNet Integration

```bash
# Test terminal endpoint
curl -X POST http://localhost:3000/api/terminal/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Search for evidence",
    "caseId": "case-001"
  }' | jq .
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Run `ollama serve` |
| Model not found | Run `ollama pull gemma:7b` |
| Slow responses | Enable GPU: `CUDA_VISIBLE_DEVICES=0 ollama serve` |
| Out of memory | Use smaller model: `ollama pull gemma:2b` |

## Performance Tips

- **GPU Acceleration**: CUDA (NVIDIA) or Metal (macOS)
- **Smaller Model**: `gemma:2b` for faster responses
- **Caching**: Ollama caches models in memory
- **Streaming**: Use `stream: true` for real-time responses

## Next: Database Integration

Once Ollama is working, connect to PostgreSQL:

```bash
# Create database
createdb wardennet

# Run migrations
npm run migrate

# Start WardenNet
npm run dev
```

## Useful Commands

```bash
# List models
ollama list

# Show model info
ollama show gemma:7b

# Remove model
ollama rm gemma:7b

# View logs
ollama logs

# Stop Ollama
pkill ollama
```

---

**Ready?** Run `bash scripts/test-ollama.sh` to verify everything works!
