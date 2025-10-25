#!/bin/bash
# Test API key authentication at commit a9bb18d5d (before PR #4761)
# Run with dev server on localhost:3003
# Usage: ./test-api-key-before-pr.sh <API_KEY>

if [ -z "$1" ]; then
  echo "Usage: $0 <API_KEY>"
  exit 1
fi

API_KEY="$1"
BASE_URL="http://localhost:3003/api/generate/openai"
RANDOM_ID=$RANDOM

echo "Testing API key authentication BEFORE PR #4761"
echo ""

echo "1. Seed tier model with x-api-key (should fail - tier stays anonymous):"
curl -s -X POST "$BASE_URL" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"openai-large\", \"messages\": [{\"role\": \"user\", \"content\": \"Hi $RANDOM_ID\"}], \"max_tokens\": 5}" \
  | jq -c 'if .error then .error else "✅ Success" end'
echo ""

echo "2. Seed tier model with Authorization: Bearer (should fail - not recognized):"
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"openai-large\", \"messages\": [{\"role\": \"user\", \"content\": \"Hi $RANDOM_ID\"}], \"max_tokens\": 5}" \
  | jq -r '.error.message // "Success"'
