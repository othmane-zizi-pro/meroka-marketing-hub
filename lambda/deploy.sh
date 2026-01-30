#!/bin/bash

# Deploy Scheduled Post Publisher to AWS
# Usage: ./deploy.sh <APP_URL> <CRON_SECRET>

set -e

APP_URL="${1:-}"
CRON_SECRET="${2:-}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="scheduled-post-publisher"

if [ -z "$APP_URL" ] || [ -z "$CRON_SECRET" ]; then
  echo "Usage: ./deploy.sh <APP_URL> <CRON_SECRET>"
  echo ""
  echo "Example:"
  echo "  ./deploy.sh https://your-app.vercel.app your-secret-token"
  echo ""
  echo "To generate a CRON_SECRET:"
  echo "  openssl rand -hex 32"
  exit 1
fi

echo "Deploying to AWS..."
echo "  Region: $REGION"
echo "  App URL: $APP_URL"
echo "  Stack: $STACK_NAME"
echo ""

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    AppUrl="$APP_URL" \
    CronSecret="$CRON_SECRET" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add CRON_SECRET to your Vercel environment variables"
echo "2. Redeploy your app"
echo "3. Check CloudWatch logs: /aws/lambda/publish-scheduled-posts"
echo ""
echo "To test manually:"
echo "  aws lambda invoke --function-name publish-scheduled-posts --payload '{}' response.json && cat response.json"
