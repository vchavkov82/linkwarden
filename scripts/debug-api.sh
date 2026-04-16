#!/bin/bash

# API Debug Script for Linkwarden
# Usage: ./scripts/debug-api.sh [token] [api_url]

set -e

TOKEN="${1:-}"
API_URL="${2:-http://localhost:6010}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

print_test() {
    echo -e "${YELLOW}► Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local data="$4"
    local auth="$5"
    
    print_test "$description"
    echo "  $method $API_URL$endpoint"
    
    local curl_args=("-s" "-w" "\n%{http_code}" "-X" "$method")
    
    if [ -n "$auth" ] && [ -n "$TOKEN" ]; then
        curl_args+=("-H" "Authorization: Bearer $TOKEN")
    fi
    
    curl_args+=("-H" "Content-Type: application/json")
    
    if [ -n "$data" ]; then
        curl_args+=("-d" "$data")
    fi
    
    curl_args+=("$API_URL$endpoint")
    
    local response
    response=$(curl "${curl_args[@]}" 2>&1)
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "HTTP $http_code"
    elif [ "$http_code" -ge 400 ]; then
        print_error "HTTP $http_code"
    else
        echo "  HTTP $http_code"
    fi
    
    if command -v jq &> /dev/null; then
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo "$body"
    fi
    echo ""
}

print_header "Linkwarden API Debug Tool"
echo "API URL: $API_URL"
if [ -n "$TOKEN" ]; then
    echo "Token: ${TOKEN:0:20}...[REDACTED]"
else
    echo -e "${YELLOW}No token provided - some tests will fail${NC}"
fi

# Public endpoints (no auth required)
print_header "Public Endpoints (No Auth)"

test_endpoint "GET" "/api/v1/config" "Server Configuration" "" ""

# Auth test
print_header "Authentication Tests"

test_endpoint "POST" "/api/v1/session" "Create Session (invalid creds)" \
    '{"username":"test_user","password":"wrong_password_12345"}' ""

if [ -n "$TOKEN" ]; then
    print_header "Authenticated Endpoints"
    
    test_endpoint "GET" "/api/v1/users/me" "Get Current User" "" "auth"
    
    test_endpoint "GET" "/api/v1/links?take=3" "Get Links (first 3)" "" "auth"
    
    test_endpoint "GET" "/api/v1/collections" "Get Collections" "" "auth"
    
    test_endpoint "GET" "/api/v1/tags" "Get Tags" "" "auth"
    
    test_endpoint "GET" "/api/v1/dashboard" "Get Dashboard" "" "auth"
    
    print_header "Link Creation Test"
    
    test_endpoint "POST" "/api/v1/links" "Create Link (test)" \
        '{"url":"https://example.com/test-debug","type":"url"}' "auth"
    
    print_header "Search Test"
    
    test_endpoint "GET" "/api/v1/search?query=test" "Search Links" "" "auth"
else
    print_header "Skipping Authenticated Tests"
    echo -e "${YELLOW}Provide a token to test authenticated endpoints:${NC}"
    echo "  ./scripts/debug-api.sh YOUR_ACCESS_TOKEN $API_URL"
    echo ""
    echo "Get an access token from: Settings → Access Tokens → Create New Token"
fi

print_header "Debug Complete"
echo ""
echo "Tips for browser extension debugging:"
echo "1. Run the server with: mise run dev:debug"
echo "2. Check the terminal for detailed API logs"
echo "3. Look for Authorization header issues (401 errors)"
echo "4. Check CORS headers in browser DevTools Network tab"
echo ""
