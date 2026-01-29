# Meroka Orchestration - AWS Infrastructure

AI post generation orchestration system using AWS Lambda, Step Functions, and EventBridge.

## Architecture

```
EventBridge Scheduler → Lambda (Orchestrator) → Step Functions (Complex) → LLM Lambdas
                                              → Lambda (Simple workflow)
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **SAM CLI** installed: `brew install aws-sam-cli`
3. **Docker** running (for local testing and building)
4. **Python 3.11+**

## Environment Variables

Add to `.claude/.env`:

```bash
# Required for deployment
ANTHROPIC_API_KEY=sk-ant-...  # Get from console.anthropic.com
```

Other keys (SUPABASE_URL, OPENAI_API_KEY, GROK_API_KEY) should already be set.

## Deployment

### First-time setup

```bash
cd aws

# Build the application
sam build

# Deploy with guided prompts (first time)
sam deploy --guided
```

### Subsequent deployments

```bash
# Deploy to dev
./scripts/deploy.sh dev

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to prod
./scripts/deploy.sh prod
```

## Creating Campaign Schedules

After deployment, create schedules for campaigns:

```bash
# Daily at 8 AM UTC
./scripts/create-schedule.sh <campaign_id> 'cron(0 8 * * ? *)' dev

# Every hour
./scripts/create-schedule.sh <campaign_id> 'rate(1 hour)' dev

# Weekdays at 9 AM EST (14:00 UTC)
./scripts/create-schedule.sh <campaign_id> 'cron(0 14 ? * MON-FRI *)' dev
```

## Manual Invocation

Trigger a campaign manually:

```bash
./scripts/invoke-campaign.sh <campaign_id> dev
```

## Local Testing

Test functions locally with SAM:

```bash
# Test the orchestrator
./scripts/test-local.sh CampaignOrchestratorFunction

# Test with custom event
./scripts/test-local.sh LLMClaudeFunction events/test-llm.json
```

## Lambda Functions

| Function | Purpose |
|----------|---------|
| `campaign-orchestrator` | Main entry point, triggered by EventBridge |
| `context-fetcher` | Fetches employee samples, campaign config |
| `llm-claude` | Claude API wrapper |
| `llm-openai` | GPT-4 API wrapper |
| `llm-grok` | Grok/xAI API wrapper |
| `llm-aggregator` | Selects best output from LLM council |
| `meme-renderer` | Generates images/memes |

## Step Functions Workflow

The complex workflow runs LLM calls in parallel:

```
FetchContext → [Claude, GPT-4, Grok] → Aggregate → RenderMedia? → Store
```

View executions in the AWS Console:
- Step Functions → State machines → meroka-complex-workflow-{env}

## Monitoring

### CloudWatch Logs

Each Lambda has a log group:
```
/aws/lambda/meroka-campaign-orchestrator-{env}
/aws/lambda/meroka-llm-claude-{env}
...
```

### Workflow Logs (Supabase)

All LLM calls are logged to `workflow_logs` table with:
- execution_id
- model
- input/output tokens
- latency
- status

Query for debugging:
```sql
SELECT * FROM workflow_logs
WHERE execution_id = 'exec_...'
ORDER BY created_at;
```

## Cost Optimization

- **Use Haiku for aggregation** - Cheaper than Sonnet/Opus for judging
- **Simple workflows for basic campaigns** - Skip Step Functions overhead
- **Batch executions** - Schedule during off-peak hours

## Troubleshooting

### Lambda timeout
- Increase timeout in template.yaml
- Check for slow Supabase queries

### Rate limit errors
- LLMs have built-in retries with backoff
- Check `workflow_logs` for RateLimitError patterns

### Step Functions failing
- Check CloudWatch logs for the specific Lambda
- View execution history in Step Functions console
