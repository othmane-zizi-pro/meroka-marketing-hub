# Scheduled Post Publisher - AWS Lambda

This Lambda function triggers the publishing of scheduled posts every minute.

## Architecture

```
EventBridge (every 1 min) → Lambda → POST /api/cron/publish-scheduled → Publishes due posts
```

## Prerequisites

1. AWS CLI installed and configured
2. Your app deployed (need the production URL)
3. A `CRON_SECRET` for authentication

## Generate CRON_SECRET

```bash
openssl rand -hex 32
```

Add this to your Vercel/hosting environment variables as `CRON_SECRET`.

## Deploy via CloudFormation

```bash
# Set your values
APP_URL="https://your-app.vercel.app"
CRON_SECRET="your-generated-secret"

# Deploy the stack
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name scheduled-post-publisher \
  --parameter-overrides \
    AppUrl=$APP_URL \
    CronSecret=$CRON_SECRET \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Manual Deploy (Alternative)

If you prefer not to use CloudFormation:

### 1. Create Lambda Function

```bash
# Zip the function
cd publish-scheduled
zip function.zip index.js

# Create the function
aws lambda create-function \
  --function-name publish-scheduled-posts \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --environment "Variables={APP_URL=$APP_URL,CRON_SECRET=$CRON_SECRET}"
```

### 2. Create EventBridge Rule

```bash
# Create the rule
aws events put-rule \
  --name publish-scheduled-posts-trigger \
  --schedule-expression "rate(1 minute)"

# Add Lambda as target
aws events put-targets \
  --rule publish-scheduled-posts-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT:function:publish-scheduled-posts"

# Grant permission
aws lambda add-permission \
  --function-name publish-scheduled-posts \
  --statement-id eventbridge-trigger \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT:rule/publish-scheduled-posts-trigger
```

## Verify Deployment

```bash
# Check Lambda logs
aws logs tail /aws/lambda/publish-scheduled-posts --follow

# Manually invoke to test
aws lambda invoke \
  --function-name publish-scheduled-posts \
  --payload '{}' \
  response.json && cat response.json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_URL` | Your production app URL (e.g., `https://app.vercel.app`) |
| `CRON_SECRET` | Secret token matching your app's `CRON_SECRET` env var |

## Monitoring

View logs in CloudWatch:
- Log group: `/aws/lambda/publish-scheduled-posts`

Set up alerts for:
- Lambda errors
- High failure rates in publish results

## Cost Estimate

- Lambda: ~$0.20/month (1 invocation/min × 60ms avg)
- EventBridge: Free (first 14M invocations/month)
- **Total: ~$0.20-0.50/month**
