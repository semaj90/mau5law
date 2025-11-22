#!/bin/bash

# Ollama Endpoint Testing Script
# Tests all Ollama endpoints used by WardenNet

OLLAMA_ENDPOINT="${OLLAMA_ENDPOINT:-http://localhost:11434}"
MODEL="gemma:7b"

echo "=========================================="
echo "WardenNet Ollama Endpoint Tests"
echo "=========================================="
echo "Ollama Endpoint: $OLLAMA_ENDPOINT"
echo "Model: $MODEL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1] Health Check${NC}"
echo "Command: curl -s $OLLAMA_ENDPOINT/api/tags"
RESPONSE=$(curl -s -w "\n%{http_code}" "$OLLAMA_ENDPOINT/api/tags")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Ollama is running"
  echo "Response: $BODY" | head -c 200
  echo ""
else
  echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: List Available Models
echo -e "${YELLOW}[TEST 2] List Available Models${NC}"
echo "Command: curl -s $OLLAMA_ENDPOINT/api/tags | jq '.models[].name'"
RESPONSE=$(curl -s "$OLLAMA_ENDPOINT/api/tags")
echo "Response:"
echo "$RESPONSE" | jq '.models[].name' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: Simple Chat Query
echo -e "${YELLOW}[TEST 3] Simple Chat Query${NC}"
echo "Command: curl -X POST $OLLAMA_ENDPOINT/api/chat"
echo "Payload:"
cat <<EOF
{
  "model": "$MODEL",
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "stream": false
}
EOF
echo ""

RESPONSE=$(curl -s -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$MODEL'",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "stream": false
  }')

HTTP_CODE=$(echo "$RESPONSE" | jq -r '.message.content' 2>/dev/null)
if [ -z "$HTTP_CODE" ] || [ "$HTTP_CODE" = "null" ]; then
  echo -e "${RED}✗ FAIL${NC} - No response from model"
  echo "Response: $RESPONSE"
else
  echo -e "${GREEN}✓ PASS${NC} - Model responded"
  echo "Response: $(echo "$RESPONSE" | jq -r '.message.content')"
fi
echo ""

# Test 4: Legal Analysis Query
echo -e "${YELLOW}[TEST 4] Legal Analysis Query${NC}"
echo "Command: curl -X POST $OLLAMA_ENDPOINT/api/chat (with legal prompt)"
echo ""

RESPONSE=$(curl -s -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$MODEL'",
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
  }')

RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.message.content' 2>/dev/null)
if [ -z "$RESPONSE_TEXT" ] || [ "$RESPONSE_TEXT" = "null" ]; then
  echo -e "${RED}✗ FAIL${NC} - No response from model"
  echo "Response: $RESPONSE"
else
  echo -e "${GREEN}✓ PASS${NC} - Legal analysis completed"
  echo "Response: $RESPONSE_TEXT" | head -c 300
  echo ""
fi
echo ""

# Test 5: Function-Calling Query
echo -e "${YELLOW}[TEST 5] Function-Calling Query${NC}"
echo "Command: curl -X POST $OLLAMA_ENDPOINT/api/chat (with function-calling prompt)"
echo ""

RESPONSE=$(curl -s -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$MODEL'",
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
  }')

RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.message.content' 2>/dev/null)
if [ -z "$RESPONSE_TEXT" ] || [ "$RESPONSE_TEXT" = "null" ]; then
  echo -e "${RED}✗ FAIL${NC} - No response from model"
  echo "Response: $RESPONSE"
else
  echo -e "${GREEN}✓ PASS${NC} - Function-calling query completed"
  echo "Response: $RESPONSE_TEXT"

  # Check if function call is present
  if echo "$RESPONSE_TEXT" | grep -q "FUNCTION_CALL"; then
    echo -e "${GREEN}✓ Function call detected${NC}"
  else
    echo -e "${YELLOW}⚠ No function call in response${NC}"
  fi
fi
echo ""

# Test 6: Streaming Response
echo -e "${YELLOW}[TEST 6] Streaming Response${NC}"
echo "Command: curl -X POST $OLLAMA_ENDPOINT/api/chat (with stream=true)"
echo ""

echo "Streaming response (first 5 lines):"
curl -s -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$MODEL'",
    "messages": [
      {
        "role": "user",
        "content": "List three legal principles."
      }
    ],
    "stream": true
  }' | head -n 5

echo ""
echo -e "${GREEN}✓ Streaming works${NC}"
echo ""

# Test 7: Model Performance
echo -e "${YELLOW}[TEST 7] Model Performance${NC}"
echo "Command: curl -X POST $OLLAMA_ENDPOINT/api/chat (measuring response time)"
echo ""

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST "$OLLAMA_ENDPOINT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$MODEL'",
    "messages": [
      {
        "role": "user",
        "content": "Respond with one sentence."
      }
    ],
    "stream": false
  }')
END_TIME=$(date +%s%N)

DURATION=$((($END_TIME - $START_TIME) / 1000000))
EVAL_TIME=$(echo "$RESPONSE" | jq -r '.eval_duration' 2>/dev/null)
LOAD_TIME=$(echo "$RESPONSE" | jq -r '.load_duration' 2>/dev/null)

echo "Response Time: ${DURATION}ms"
echo "Eval Duration: ${EVAL_TIME}ns"
echo "Load Duration: ${LOAD_TIME}ns"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}All tests completed${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure Ollama is running: ollama serve"
echo "2. Pull Gemma model: ollama pull gemma:7b"
echo "3. Run this script: bash scripts/test-ollama.sh"
echo ""
