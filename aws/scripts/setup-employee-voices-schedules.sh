#!/bin/bash
set -e

# Set up EventBridge Schedules for Employee Voices campaign
# Creates two schedules: 7 AM and 12 PM Eastern Time

ENVIRONMENT=${1:-dev}
CAMPAIGN_ID="e0000000-0000-0000-0000-000000000001"  # Employee Voices campaign ID
REGION="us-west-2"

STACK_NAME="meroka-orchestration-$ENVIRONMENT"

echo "🗓️  Setting up Employee Voices schedules..."

# Get the Lambda ARN and Scheduler Role from CloudFormation outputs
LAMBDA_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='CampaignOrchestratorArn'].OutputValue" \
    --output text)

SCHEDULER_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='SchedulerRoleArn'].OutputValue" \
    --output text)

if [ -z "$LAMBDA_ARN" ] || [ -z "$SCHEDULER_ROLE_ARN" ] || [ "$LAMBDA_ARN" = "None" ]; then
    echo "❌ Could not find stack outputs. Make sure the stack is deployed first."
    echo "   Run: ./deploy.sh $ENVIRONMENT"
    exit 1
fi

echo "   Lambda: $LAMBDA_ARN"
echo "   Role: $SCHEDULER_ROLE_ARN"

# Schedule 1: 7 AM Eastern
echo ""
echo "📅 Creating 7 AM schedule..."
aws scheduler create-schedule \
    --name "meroka-employee-voices-7am-$ENVIRONMENT" \
    --schedule-expression "cron(0 7 * * ? *)" \
    --schedule-expression-timezone "America/New_York" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
        \"Arn\": \"$LAMBDA_ARN\",
        \"RoleArn\": \"$SCHEDULER_ROLE_ARN\",
        \"Input\": \"{\\\"campaign_id\\\": \\\"$CAMPAIGN_ID\\\", \\\"trigger\\\": \\\"scheduled\\\", \\\"schedule\\\": \\\"7am\\\"}\"
    }" \
    --state ENABLED \
    --region "$REGION" \
    2>/dev/null || aws scheduler update-schedule \
    --name "meroka-employee-voices-7am-$ENVIRONMENT" \
    --schedule-expression "cron(0 7 * * ? *)" \
    --schedule-expression-timezone "America/New_York" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
        \"Arn\": \"$LAMBDA_ARN\",
        \"RoleArn\": \"$SCHEDULER_ROLE_ARN\",
        \"Input\": \"{\\\"campaign_id\\\": \\\"$CAMPAIGN_ID\\\", \\\"trigger\\\": \\\"scheduled\\\", \\\"schedule\\\": \\\"7am\\\"}\"
    }" \
    --state ENABLED \
    --region "$REGION"

echo "✅ 7 AM schedule created"

# Schedule 2: 12 PM Eastern
echo ""
echo "📅 Creating 12 PM schedule..."
aws scheduler create-schedule \
    --name "meroka-employee-voices-12pm-$ENVIRONMENT" \
    --schedule-expression "cron(0 12 * * ? *)" \
    --schedule-expression-timezone "America/New_York" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
        \"Arn\": \"$LAMBDA_ARN\",
        \"RoleArn\": \"$SCHEDULER_ROLE_ARN\",
        \"Input\": \"{\\\"campaign_id\\\": \\\"$CAMPAIGN_ID\\\", \\\"trigger\\\": \\\"scheduled\\\", \\\"schedule\\\": \\\"12pm\\\"}\"
    }" \
    --state ENABLED \
    --region "$REGION" \
    2>/dev/null || aws scheduler update-schedule \
    --name "meroka-employee-voices-12pm-$ENVIRONMENT" \
    --schedule-expression "cron(0 12 * * ? *)" \
    --schedule-expression-timezone "America/New_York" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
        \"Arn\": \"$LAMBDA_ARN\",
        \"RoleArn\": \"$SCHEDULER_ROLE_ARN\",
        \"Input\": \"{\\\"campaign_id\\\": \\\"$CAMPAIGN_ID\\\", \\\"trigger\\\": \\\"scheduled\\\", \\\"schedule\\\": \\\"12pm\\\"}\"
    }" \
    --state ENABLED \
    --region "$REGION"

echo "✅ 12 PM schedule created"

echo ""
echo "🎉 Employee Voices schedules are set up!"
echo ""
echo "   Campaign: Employee Voices ($CAMPAIGN_ID)"
echo "   Schedules:"
echo "     - 7 AM Eastern daily"
echo "     - 12 PM Eastern daily"
echo ""
echo "   Each run generates 1 post per employee (10 employees = 10 posts)"
echo "   Total: 20 posts per day"
echo ""
echo "   View schedules: aws scheduler list-schedules --region $REGION"
