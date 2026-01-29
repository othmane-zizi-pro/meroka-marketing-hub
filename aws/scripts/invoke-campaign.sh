#!/bin/bash
set -e

# Manually invoke a campaign generation

CAMPAIGN_ID=$1
ENVIRONMENT=${2:-dev}

if [ -z "$CAMPAIGN_ID" ]; then
    echo "Usage: ./invoke-campaign.sh <campaign_id> [environment]"
    exit 1
fi

FUNCTION_NAME="meroka-campaign-orchestrator-$ENVIRONMENT"

echo "🚀 Invoking campaign $CAMPAIGN_ID..."

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload "$(echo -n "{\"campaign_id\": \"$CAMPAIGN_ID\", \"trigger\": \"manual\"}" | base64)" \
    --cli-binary-format raw-in-base64-out \
    /tmp/response.json

echo "📋 Response:"
cat /tmp/response.json | jq .
