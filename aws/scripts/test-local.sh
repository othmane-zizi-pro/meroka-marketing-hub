#!/bin/bash
set -e

# Test Lambda functions locally using SAM CLI

FUNCTION=$1
EVENT_FILE=$2

if [ -z "$FUNCTION" ]; then
    echo "Usage: ./test-local.sh <function_name> [event_file]"
    echo ""
    echo "Available functions:"
    echo "  - CampaignOrchestratorFunction"
    echo "  - ContextFetcherFunction"
    echo "  - LLMClaudeFunction"
    echo "  - LLMOpenAIFunction"
    echo "  - LLMGrokFunction"
    echo "  - LLMAggregatorFunction"
    echo "  - MemeRendererFunction"
    echo ""
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$AWS_DIR")"

# Load env vars
if [ -f "$PROJECT_ROOT/.claude/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.claude/.env" | xargs)
fi

cd "$AWS_DIR"

# Build if needed
if [ ! -d ".aws-sam" ]; then
    echo "🔨 Building SAM application..."
    sam build
fi

# Create default event if not provided
if [ -z "$EVENT_FILE" ]; then
    EVENT_FILE="/tmp/test-event.json"
    cat > "$EVENT_FILE" << 'EOF'
{
    "campaign_id": "test-campaign-123",
    "trigger": "manual"
}
EOF
fi

echo "🧪 Testing $FUNCTION locally..."
sam local invoke "$FUNCTION" \
    --event "$EVENT_FILE" \
    --env-vars <(cat << EOF
{
    "$FUNCTION": {
        "SUPABASE_URL": "$SUPABASE_URL",
        "SUPABASE_SERVICE_KEY": "$SUPABASE_SECRET_API_KEY",
        "OPENAI_API_KEY": "$OPENAI_API_KEY",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY:-}",
        "GROK_API_KEY": "$GROK_API_KEY",
        "ENVIRONMENT": "dev"
    }
}
EOF
)
