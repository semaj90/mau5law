#!/bin/bash

# QUIC Server Authentication Test Script
# Run with: ./test-quic-auth.sh

echo "🔐 Testing QUIC Server Authentication Flow"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
QUIC_URL="https://localhost:4433"

# Test variables
TEST_EMAIL="test@legal-ai.com"
TEST_PASSWORD="securePassword123"
SESSION_ID=""

# Function to print colored output
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -k "$QUIC_URL/health")
if echo "$response" | grep -q "healthy"; then
    print_result 0 "Server is healthy"
    echo "Response: $response" | jq '.' 2>/dev/null || echo "$response"
else
    print_result 1 "Server health check failed"
    exit 1
fi

# Test 2: User Registration
echo -e "\n${YELLOW}Test 2: User Registration${NC}"
register_response=$(curl -s -k -X POST "$QUIC_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "firstName": "Test",
        "lastName": "User",
        "organization": "Legal AI Test",
        "role": "legal_professional"
    }')

if echo "$register_response" | grep -q "success.*true"; then
    print_result 0 "User registered successfully"
    USER_ID=$(echo "$register_response" | jq -r '.userId' 2>/dev/null)
    echo "User ID: $USER_ID"
else
    print_result 1 "Registration failed"
    echo "Response: $register_response"
fi

# Test 3: User Login
echo -e "\n${YELLOW}Test 3: User Login${NC}"
login_response=$(curl -s -k -X POST "$QUIC_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "ipAddress": "127.0.0.1",
        "userAgent": "test-script",
        "sessionDurationDays": 30
    }')

if echo "$login_response" | grep -q "success.*true"; then
    print_result 0 "Login successful"
    SESSION_ID=$(echo "$login_response" | jq -r '.sessionId' 2>/dev/null)
    ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken' 2>/dev/null)
    echo "Session ID: $SESSION_ID"
    echo "Access Token: $ACCESS_TOKEN"
else
    print_result 1 "Login failed"
    echo "Response: $login_response"
    exit 1
fi

# Test 4: Session Validation
echo -e "\n${YELLOW}Test 4: Session Validation${NC}"
validate_response=$(curl -s -k -X POST "$QUIC_URL/auth/validate" \
    -H "Content-Type: application/json" \
    -d '{
        "sessionId": "'$SESSION_ID'",
        "ipAddress": "127.0.0.1",
        "userAgent": "test-script"
    }')

if echo "$validate_response" | grep -q "valid.*true"; then
    print_result 0 "Session is valid"
    echo "User ID from session: $(echo "$validate_response" | jq -r '.userId' 2>/dev/null)"
else
    print_result 1 "Session validation failed"
    echo "Response: $validate_response"
fi

# Test 5: Protected Endpoint (without auth)
echo -e "\n${YELLOW}Test 5: Protected Endpoint (without auth)${NC}"
protected_response=$(curl -s -k -X POST "$QUIC_URL/legal/analyze" \
    -H "Content-Type: application/json" \
    -d '{"documentData": "test", "documentType": "contract"}' \
    -w "\nHTTP_CODE:%{http_code}")

http_code=$(echo "$protected_response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
if [ "$http_code" = "401" ]; then
    print_result 0 "Protected endpoint correctly requires auth (401)"
else
    print_result 1 "Protected endpoint not secured (expected 401, got $http_code)"
fi

# Test 6: Protected Endpoint (with auth)
echo -e "\n${YELLOW}Test 6: Protected Endpoint (with auth)${NC}"
protected_auth_response=$(curl -s -k -X POST "$QUIC_URL/legal/analyze" \
    -H "Content-Type: application/json" \
    -H "X-Session-ID: $SESSION_ID" \
    -d '{
        "document_id": "test_doc_001",
        "document_data": "VGVzdCBsZWdhbCBkb2N1bWVudA==",
        "document_type": "contract",
        "filename": "test_contract.pdf",
        "options": {
            "extract_entities": true,
            "analyze_sentiment": true,
            "classify_domain": true
        }
    }')

if echo "$protected_auth_response" | grep -q "job_id"; then
    print_result 0 "Protected endpoint accessible with auth"
    JOB_ID=$(echo "$protected_auth_response" | jq -r '.job_id' 2>/dev/null)
    echo "Job ID: $JOB_ID"
else
    print_result 1 "Protected endpoint failed with auth"
    echo "Response: $protected_auth_response"
fi

# Test 7: Logout
echo -e "\n${YELLOW}Test 7: Logout${NC}"
logout_response=$(curl -s -k -X POST "$QUIC_URL/auth/logout" \
    -H "Content-Type: application/json" \
    -d '{
        "sessionId": "'$SESSION_ID'",
        "invalidateAllSessions": false
    }')

if echo "$logout_response" | grep -q "success.*true"; then
    print_result 0 "Logout successful"
else
    print_result 1 "Logout failed"
    echo "Response: $logout_response"
fi

# Test 8: Session Validation After Logout
echo -e "\n${YELLOW}Test 8: Session Validation After Logout${NC}"
post_logout_response=$(curl -s -k -X POST "$QUIC_URL/auth/validate" \
    -H "Content-Type: application/json" \
    -d '{
        "sessionId": "'$SESSION_ID'",
        "ipAddress": "127.0.0.1",
        "userAgent": "test-script"
    }')

if echo "$post_logout_response" | grep -q "valid.*false"; then
    print_result 0 "Session correctly invalidated after logout"
else
    print_result 1 "Session still valid after logout (security issue)"
    echo "Response: $post_logout_response"
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Authentication Flow Testing Complete${NC}"