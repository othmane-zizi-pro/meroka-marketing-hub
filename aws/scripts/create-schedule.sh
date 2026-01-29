#!/bin/bash
set -e

# Create an EventBridge Schedule for a campaign

CAMPAIGN_ID=$1
CRON_EXPRESSION=$2
ENVIRONMENT=${3:-dev}

if [ -z "$CAMPAIGN_ID" ] || [ -z "$CRON_EXPRESSION" ]; then
    echo "Usage: ./create-schedule.sh <campaign_id> '<cron_expression>' [environment]"
    echo ""
    echo "Examples:"
    echo "  ./create-schedule.sh abc123 'cron(0 8 * * ? *)' dev      # Daily at 8 AM UTC"
    echo "  ./create-schedule.sh abc123 'rate(1 hour)' dev           # Every hour"
    echo ""
    exit 1
fi

STACK_NAME="meroka-orchestration-$ENVIRONMENT"
SCHEDULE_NAME="meroka-campaign-$CAMPAIGN_ID-$ENVIRONMENT"

# Get the Lambda ARN and Scheduler Role from CloudFormation outputs
LAMBDA_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='CampaignOrchestratorArn'].OutputValue" \
    --output text)

SCHEDULER_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='SchedulerRoleArn'].OutputValue" \
    --output text)

if [ -z "$LAMBDA_ARN" ] || [ -z "$SCHEDULER_ROLE_ARN" ]; then
    echo "❌ Could not find stack outputs. Make sure the stack is deployed."
    exit 1
fi

echo "🗓️  Creating schedule for campaign $CAMPAIGN_ID"
echo "   Cron: $CRON_EXPRESSION"
echo "   Lambda: $LAMBDA_ARN"

# Create the schedule
aws scheduler create-schedule \
    --name "$SCHEDULE_NAME" \
    --schedule-expression "$CRON_EXPRESSION" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
        \"Arn\": \"$LAMBDA_ARN\",
        \"RoleArn\": \"$SCHEDULER_ROLE_ARN\",
        \"Input\": \"{\\\"campaign_id\\\": \\\"$CAMPAIGN_ID\\\", \\\"trigger\\\": \\\"scheduled\\\"}\"
    }" \
    --state ENABLED

echo "✅ Schedule created: $SCHEDULE_NAME"
