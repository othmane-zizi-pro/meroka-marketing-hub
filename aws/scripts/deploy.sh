#!/bin/bash
set -e

# Meroka Orchestration - AWS Deployment Script

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$AWS_DIR")"

echo "🚀 Deploying Meroka Orchestration to $ENVIRONMENT"

# Load environment variables from .claude/.env (excluding AWS credentials to preserve SSO)
if [ -f "$PROJECT_ROOT/.claude/.env" ]; then
    echo "📦 Loading environment variables..."
    export $(grep -v '^#' "$PROJECT_ROOT/.claude/.env" | grep -v '^AWS_' | xargs)
fi

# Validate required env vars
required_vars=("SUPABASE_URL" "SUPABASE_SECRET_API_KEY" "OPENAI_API_KEY" "GROK_API_KEY" "GEMINI_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

cd "$AWS_DIR"

# Build the SAM application
echo "🔨 Building SAM application..."
sam build

# Deploy
echo "🚀 Deploying to AWS..."
sam deploy \
    --config-env "$ENVIRONMENT" \
    --parameter-overrides \
        "Environment=$ENVIRONMENT" \
        "SupabaseUrl=$SUPABASE_URL" \
        "SupabaseServiceKey=$SUPABASE_SECRET_API_KEY" \
        "OpenAIApiKey=$OPENAI_API_KEY" \
        "GrokApiKey=$GROK_API_KEY" \
        "GeminiApiKey=$GEMINI_API_KEY" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

echo "✅ Deployment complete!"

# Get outputs
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name "meroka-orchestration-$ENVIRONMENT" \
    --query 'Stacks[0].Outputs' \
    --output table
