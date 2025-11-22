# Ollama Endpoint Testing Guide

## Prerequisites

```bash
# Install Ollama
# macOS: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh
# Windows: Download from https://ollama.ai

# Start Ollama
ollama serve

# Pull Gemma model (in another terminal)
ollama pull gemma:7b
```

## Environment Setup

```bash
export OLLAMA_ENDPOINT="http://localhost:11434"
export MODEL="gemma:7b"
```

---

## Test 1: Health Check

**Purpose**: Verify Ollama is running and accessible

```bash
curl -s "$OLLAMA_ENDPOINT/api/tags" | jq .
```

**Expected Response**:
```json
{
  "models": [
    {
      "name": "gemma:7b",
      "modified_at": "2024-01-15T10:30:00Z",
      "size": 5000000000,
      "digest": "sha256:..."
    }
  ]
}
```

---

## Test 2: List Available Models

**Purpose**: Check which models are available

```bash
curl -s "$OLLAMA_ENDPOINT/api/tags" | jq '.models[].name'
```

**Expected Output**:
```
"gemma:7b"
"llama2:7b"
```

---

## Test 3: Simple Chat Query

**Purpose**: Test basic chat functionality

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "stream": false
  }' | jq '.message.content'
```

**Expected Response**:
```
"The capital of France is Paris."
```

---

## Test 4: Legal Analysis Query

**Purpose**: Test legal reasoning capabilities

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "system",
        "content": "You are a legal assistant. Analyze evidence and extract key findings."
      },
      {
        "role": "user",
        "content": "Analyze this witness statement: The suspect was seen at the location on the night of the incident."
      }
    ],
    "stream": false
  }' | jq '.message.content'
```

**Expected Response**:
```
"Key findings from the witness statement:
1. Suspect presence: The statement establishes that the suspect was at the location
2. Timing: The incident occurred on the night in question
3. Witness credibility: Direct observation by witness"
```

---

## Test 5: Function-Calling Query

**Purpose**: Test function-calling for terminal integration

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "system",
        "content": "You are a legal assistant. When asked to search evidence, respond with: FUNCTION_CALL: search_evidence(query=\"search term\")"
      },
      {
        "role": "user",
        "content": "Search for evidence mentioning the suspect."
      }
    ],
    "stream": false
  }' | jq '.message.content'
```

**Expected Response**:
```
"FUNCTION_CALL: search_evidence(query="suspect")
Searching for all evidence mentioning the suspect..."
```

---

## Test 6: Streaming Response

**Purpose**: Test streaming for real-time responses

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "user",
        "content": "List three legal principles."
      }
    ],
    "stream": true
  }'
```

**Expected Output** (streaming JSON objects):
```
{"model":"gemma:7b","created_at":"2024-01-15T10:30:00Z","message":{"role":"assistant","content":"1"},"done":false}
{"model":"gemma:7b","created_at":"2024-01-15T10:30:01Z","message":{"role":"assistant","content":". "},"done":false}
...
{"model":"gemma:7b","created_at":"2024-01-15T10:30:05Z","message":{"role":"assistant","content":""},"done":true}
```

---

## Test 7: Extract Holdings Query

**Purpose**: Test holdings extraction for legal analysis

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "system",
        "content": "Extract legal holdings from the following evidence. Format as: HOLDING: [holding text]"
      },
      {
        "role": "user",
        "content": "Evidence: Witness testimony establishes defendant presence at scene. Phone records confirm location data."
      }
    ],
    "stream": false
  }' | jq '.message.content'
```

**Expected Response**:
```
"HOLDING: Defendant was present at the scene of the incident
HOLDING: Phone records corroborate witness testimony regarding location"
```

---

## Test 8: Citation Finding Query

**Purpose**: Test citation extraction

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "system",
        "content": "Extract legal citations from the text. Format as: CITATION: [statute/case name]"
      },
      {
        "role": "user",
        "content": "Under USC 18-1001, fraud is defined as... In State v. Johnson (2019), the court held..."
      }
    ],
    "stream": false
  }' | jq '.message.content'
```

**Expected Response**:
```
"CITATION: USC 18-1001
CITATION: State v. Johnson (2019)"
```

---

## Test 9: Performance Benchmark

**Purpose**: Measure response time and token usage

```bash
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [
      {
        "role": "user",
        "content": "Respond with one sentence about legal evidence."
      }
    ],
    "stream": false
  }' | jq '{
    response: .message.content,
    eval_duration: .eval_duration,
    load_duration: .load_duration,
    prompt_eval_count: .prompt_eval_count,
    eval_count: .eval_count
  }'
```

**Expected Response**:
```json
{
  "response": "Legal evidence must be relevant, reliable, and properly authenticated.",
  "eval_duration": 2500000000,
  "load_duration": 1000000000,
  "prompt_eval_count": 15,
  "eval_count": 20
}
```

---

## Test 10: Error Handling

**Purpose**: Test error responses

```bash
# Test with invalid model
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "invalid-model",
    "messages": [
      {
        "role": "user",
        "content": "Test"
      }
    ],
    "stream": false
  }' | jq .
```

**Expected Response**:
```json
{
  "error": "model 'invalid-model' not found"
}
```

---

## Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
curl -s "$OLLAMA_ENDPOINT/api/tags"

# If connection refused, start Ollama
ollama serve
```

### Model Not Found
```bash
# List available models
curl -s "$OLLAMA_ENDPOINT/api/tags" | jq '.models[].name'

# Pull Gemma if not present
ollama pull gemma:7b
```

### Slow Responses
```bash
# Check model performance
curl -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [{"role": "user", "content": "Hi"}],
    "stream": false
  }' | jq '.eval_duration'

# If slow, consider:
# 1. GPU acceleration (CUDA/Metal)
# 2. Smaller model (gemma:2b)
# 3. More system RAM
```

### Connection Issues
```bash
# Test connectivity
ping localhost:11434

# Check Ollama logs
ollama logs

# Verify endpoint
echo $OLLAMA_ENDPOINT
```

---

## Integration with WardenNet

Once Ollama is working, the terminal will automatically:

1. **Query Gemma** via `/api/terminal/query`
2. **Parse function calls** from responses
3. **Execute functions** (search_evidence, extract_holdings, etc.)
4. **Format results** for display

Example terminal query:
```
USER: Search for evidence mentioning the suspect
GEMMA: FUNCTION_CALL: search_evidence(query="suspect")
SYSTEM: Found 3 results...
```

---

## Performance Optimization

### GPU Acceleration

**CUDA (NVIDIA)**:
```bash
# Install CUDA toolkit
# Then run Ollama with GPU support
CUDA_VISIBLE_DEVICES=0 ollama serve
```

**Metal (macOS)**:
```bash
# Metal acceleration is automatic on macOS
ollama serve
```

### Model Selection

```bash
# Faster but less capable
ollama pull gemma:2b

# Balanced
ollama pull gemma:7b

# More capable but slower
ollama pull gemma:13b
```

---

## Next Steps

1. ✅ Test all endpoints with curl
2. ✅ Verify Gemma model is working
3. ✅ Test function-calling format
4. ✅ Integrate with WardenNet terminal
5. ✅ Monitor performance metrics
6. ✅ Optimize for production

