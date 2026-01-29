# PRD: AI Post Generation & Publishing Orchestration

## Overview

Build a scalable, failproof orchestration system for AI-generated social media content across multiple accounts, channels, and campaigns. The system must support simple single-LLM workflows through complex multi-model council patterns with deterministic rendering.

### Goals
1. **Reliable scheduling** — Posts generate on configurable schedules per campaign
2. **Flexible workflows** — Support simple (1 LLM) to complex (multi-LLM council + DSPy + renderers)
3. **Approval flows** — Human-in-the-loop before publishing
4. **Platform publishing** — Direct API integration with LinkedIn, X, Instagram
5. **Observability** — Monitor LLM outputs for continuous tuning
6. **Failproof** — Automatic retries, dead letter handling, no lost work

### Scale
- 20 employees
- 20 campaigns
- 60-120+ posts per campaign run
- ~1,800-2,400 posts per day at peak

---

## Phase 1: Foundation (MVP)

**Goal:** Get posts generating on schedule with simple workflows. Manual publishing.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EventBridge Scheduler                         │
│         (one rule per campaign with cron expression)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Lambda: campaign-orchestrator                    │
│                                                                  │
│  1. Fetch campaign config from Supabase                         │
│  2. Fetch employees assigned to campaign                        │
│  3. For each employee:                                          │
│     - Fetch their few-shot samples                              │
│     - Call workflow (simple or complex based on campaign type)  │
│     - Store generated post in Supabase                          │
│  4. Log execution metrics                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  Simple Workflow  │  │ Complex Workflow  │
        │  (inline Lambda)  │  │ (Step Functions)  │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│                                                                  │
│  posts table:                                                    │
│    status: 'draft' | 'pending_review' | 'approved' | ...        │
│                                                                  │
│  workflow_logs table:                                            │
│    execution_id, campaign_id, employee_id, model, latency, etc  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```sql
-- Add to existing schema

-- Campaign schedule configuration
ALTER TABLE campaigns ADD COLUMN schedule_cron TEXT;
ALTER TABLE campaigns ADD COLUMN schedule_timezone TEXT DEFAULT 'UTC';
ALTER TABLE campaigns ADD COLUMN posts_per_employee INTEGER DEFAULT 3;
ALTER TABLE campaigns ADD COLUMN workflow_type TEXT DEFAULT 'simple';
ALTER TABLE campaigns ADD COLUMN workflow_config JSONB DEFAULT '{}';

-- Campaign-employee assignments
CREATE TABLE campaign_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Workflow execution logs (for monitoring/tuning)
CREATE TABLE workflow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  employee_id UUID REFERENCES users(id),
  workflow_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL, -- 'success' | 'error' | 'timeout'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_logs_execution ON workflow_logs(execution_id);
CREATE INDEX idx_workflow_logs_campaign ON workflow_logs(campaign_id);
CREATE INDEX idx_workflow_logs_created ON workflow_logs(created_at);

-- Post generation metadata (link post to its generation context)
ALTER TABLE posts ADD COLUMN execution_id TEXT;
ALTER TABLE posts ADD COLUMN generation_metadata JSONB DEFAULT '{}';
```

### Workflow Types

**Simple Workflow (inline in Lambda):**
```python
async def simple_workflow(employee, campaign, few_shots):
    prompt = build_prompt(employee, campaign, few_shots)
    response = await call_llm(
        model=campaign.workflow_config.get('model', 'claude-3-sonnet'),
        prompt=prompt
    )
    return parse_posts(response)
```

**Complex Workflow (Step Functions):**
```
StartExecution
    │
    ▼
┌─────────────────┐
│ FetchContext    │  ← Lambda: get employee samples, campaign config
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           LLM Council (Parallel)         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Claude  │  │  GPT-4  │  │  Grok   │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└────────────────────┬────────────────────┘
                     │
                     ▼
         ┌─────────────────┐
         │ Aggregate/Vote  │  ← Lambda: LLM-as-judge or scoring
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Refine (DSPy)   │  ← Lambda: optional optimization pass
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Render Media    │  ← Lambda: meme/image generation (optional)
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Store Results   │  ← Lambda: write to Supabase
         └─────────────────┘
```

### API Endpoints (Phase 1)

```
POST   /api/campaigns/:id/schedule          # Set/update campaign schedule
DELETE /api/campaigns/:id/schedule          # Remove schedule
POST   /api/campaigns/:id/run               # Manual trigger
GET    /api/campaigns/:id/executions        # List past runs
GET    /api/executions/:id                  # Execution details + logs

POST   /api/campaigns/:id/employees         # Assign employees
DELETE /api/campaigns/:id/employees/:userId # Remove employee

GET    /api/posts?status=pending_review     # Posts awaiting approval
PATCH  /api/posts/:id/approve               # Approve post
PATCH  /api/posts/:id/reject                # Reject post
PATCH  /api/posts/:id                       # Edit post content
```

### AWS Resources (Phase 1)

| Resource | Purpose |
|----------|---------|
| Lambda: `campaign-orchestrator` | Main entry point, triggered by EventBridge |
| Lambda: `llm-claude` | Claude API calls |
| Lambda: `llm-openai` | GPT-4 API calls |
| Lambda: `llm-grok` | Grok API calls |
| Lambda: `llm-aggregator` | Vote/score LLM outputs |
| Lambda: `meme-renderer` | Deterministic image generation |
| Step Functions: `complex-workflow` | Multi-step orchestration |
| EventBridge Rules | One per active campaign |
| S3: `meroka-post-media` | Generated images/memes |
| CloudWatch Log Groups | Execution logs |

### Deliverables

- [ ] Campaign scheduling API
- [ ] Simple workflow Lambda
- [ ] Complex workflow Step Functions definition
- [ ] LLM wrapper Lambdas (Claude, GPT-4, Grok)
- [ ] Aggregator Lambda
- [ ] Meme renderer Lambda
- [ ] Supabase schema migrations
- [ ] Basic CloudWatch dashboards
- [ ] Manual run trigger in UI

### Estimated Cost (Phase 1)

| Item | Monthly |
|------|---------|
| Lambda | ~$15 |
| Step Functions | ~$10 |
| EventBridge | ~$0 |
| S3 | ~$2 |
| CloudWatch | ~$5 |
| **AWS Total** | **~$32** |
| **LLM APIs** | **$1,500-4,000** (depending on workflow mix) |

---

## Phase 2: Approval & Publishing

**Goal:** Add human approval workflow and direct platform publishing.

### Architecture Additions

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 1 (Generation)                          │
│                         ... as before ...                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase posts table                           │
│                 status: 'pending_review'                         │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │   Approve   │ │   Reject    │ │    Edit     │
      │  (via API)  │ │  (via API)  │ │  (via API)  │
      └──────┬──────┘ └─────────────┘ └──────┬──────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Supabase posts table                             │
│               status: 'approved'                                 │
│               scheduled_for: timestamp (optional)                │
└─────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          ▼                                     ▼
┌───────────────────┐               ┌───────────────────┐
│   Publish Now     │               │ Scheduled Publish │
│   (manual API)    │               │ (EventBridge)     │
└─────────┬─────────┘               └─────────┬─────────┘
          │                                   │
          └──────────────────┬────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lambda: platform-publisher                          │
│                                                                  │
│  1. Get OAuth tokens from secure storage                        │
│  2. Upload media to platform (if any)                           │
│  3. Create post via platform API                                │
│  4. Store external_post_id                                      │
│  5. Update status to 'published'                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Platform APIs                                  │
│    LinkedIn    │      X (Twitter)     │     Instagram           │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```sql
-- OAuth tokens for platform publishing
CREATE TABLE platform_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT NOT NULL,  -- Encrypt at rest
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Publishing history
CREATE TABLE publish_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  platform_post_id TEXT,
  platform_post_url TEXT,
  status TEXT NOT NULL,  -- 'success' | 'failed' | 'rate_limited'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-approval rules (optional)
CREATE TABLE approval_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,  -- 'auto_approve' | 'require_approval' | 'time_based'
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints (Phase 2)

```
# Approval
PATCH  /api/posts/:id/approve              # Approve post
PATCH  /api/posts/:id/reject               # Reject with reason
POST   /api/posts/:id/request-changes      # Request edits from author

# Publishing
POST   /api/posts/:id/publish              # Publish now
POST   /api/posts/:id/schedule             # Schedule for later
DELETE /api/posts/:id/schedule             # Cancel scheduled publish
GET    /api/posts/:id/publish-status       # Check publish status

# Platform connections
GET    /api/users/:id/connections          # List connected platforms
POST   /api/users/:id/connections/:platform/connect    # OAuth flow start
POST   /api/users/:id/connections/:platform/callback   # OAuth callback
DELETE /api/users/:id/connections/:platform            # Disconnect
```

### Platform API Integration

**LinkedIn:**
- OAuth 2.0 with `w_member_social` scope
- POST to `/ugcPosts` for content
- Rate limit: 100 posts/day per member

**X (Twitter):**
- OAuth 2.0 with `tweet.write` scope
- POST to `/2/tweets`
- Rate limit: 200 tweets/15 min (app), 50/15 min (user)

**Instagram:**
- Facebook Graph API (Business accounts only)
- Requires Facebook Page connection
- Rate limit: 25 posts/24 hours

### Deliverables

- [ ] OAuth flow for LinkedIn, X, Instagram
- [ ] Secure token storage (AWS Secrets Manager or encrypted in Supabase)
- [ ] Platform publisher Lambda
- [ ] Scheduled publishing via EventBridge
- [ ] Rate limit tracking and backoff
- [ ] Publishing status in UI
- [ ] Approval workflow in UI

### Estimated Cost (Phase 2)

| Item | Monthly |
|------|---------|
| Phase 1 costs | ~$32 |
| Lambda (publisher) | ~$5 |
| Secrets Manager | ~$2 |
| EventBridge (publish schedules) | ~$0 |
| **AWS Total** | **~$39** |
| **LLM APIs** | **$1,500-4,000** |

---

## Phase 3: Reliability & Scale

**Goal:** Add queuing, retry logic, and dead letter handling for production reliability.

### Architecture Additions

```
┌─────────────────────────────────────────────────────────────────┐
│                    EventBridge Scheduler                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SQS: generation-queue                         │
│           (decouples scheduling from execution)                  │
│                                                                  │
│   Message: { campaign_id, employee_id, execution_id }           │
│   Visibility timeout: 5 minutes                                 │
│   Max receives: 3 (then → DLQ)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lambda: generation-worker                           │
│         (triggered by SQS, processes one post at a time)        │
│                                                                  │
│   - Idempotent (checks if post already exists for execution_id) │
│   - Retries automatically via SQS visibility timeout            │
│   - Logs all steps to workflow_logs                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌───────────────────────┐         ┌───────────────────────┐
│ SQS: generation-dlq   │         │ SQS: publishing-queue │
│                       │         │                       │
│ Failed after 3 tries  │         │ Approved posts ready  │
│ → Alert via SNS       │         │ to publish            │
│ → Manual retry UI     │         │                       │
└───────────────────────┘         └───────────────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │ Lambda: publish-worker│
                                  │                       │
                                  │ - Rate limit aware    │
                                  │ - Retries with backoff│
                                  │ - Platform-specific   │
                                  └───────────────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │ SQS: publishing-dlq   │
                                  │                       │
                                  │ Failed publishes      │
                                  │ → Alert + manual retry│
                                  └───────────────────────┘
```

### Rate Limiting Strategy

```python
# DynamoDB table: rate_limits
# Key: {platform}#{user_id}
# Attributes: request_count, window_start, limit

async def check_rate_limit(platform: str, user_id: str) -> bool:
    """Returns True if under limit, False if should wait."""
    limits = {
        'linkedin': {'requests': 100, 'window_seconds': 86400},
        'x': {'requests': 50, 'window_seconds': 900},
        'instagram': {'requests': 25, 'window_seconds': 86400},
    }

    current = await get_rate_limit_state(platform, user_id)
    limit = limits[platform]

    if current['request_count'] >= limit['requests']:
        wait_seconds = limit['window_seconds'] - (now - current['window_start'])
        raise RateLimitExceeded(retry_after=wait_seconds)

    await increment_rate_limit(platform, user_id)
    return True
```

### Database Schema Additions

```sql
-- DynamoDB table for rate limiting (or use Supabase)
-- If Supabase:
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,  -- format: {platform}#{user_id}
  platform TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed jobs tracking
CREATE TABLE failed_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'failed',  -- 'failed' | 'retried' | 'resolved'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### API Endpoints (Phase 3)

```
# Failed jobs management
GET    /api/admin/failed-jobs              # List failed jobs
POST   /api/admin/failed-jobs/:id/retry    # Retry a failed job
POST   /api/admin/failed-jobs/:id/resolve  # Mark as resolved
POST   /api/admin/failed-jobs/retry-all    # Retry all failed

# Rate limits
GET    /api/admin/rate-limits              # View current rate limit state
POST   /api/admin/rate-limits/reset        # Reset for testing
```

### Alerting

```yaml
# SNS Topics
- generation-failures:
    subscribers:
      - email: team@meroka.com
      - slack: #marketing-alerts

- publishing-failures:
    subscribers:
      - email: team@meroka.com
      - slack: #marketing-alerts

# CloudWatch Alarms
- DLQ message count > 0 → SNS alert
- Lambda error rate > 5% → SNS alert
- Step Functions execution failed → SNS alert
```

### Deliverables

- [ ] SQS queues (generation, publishing, DLQs)
- [ ] Queue-triggered Lambdas
- [ ] Idempotent job processing
- [ ] Rate limit tracking
- [ ] DLQ monitoring + alerts
- [ ] Admin UI for failed jobs
- [ ] SNS alerting setup

### Estimated Cost (Phase 3)

| Item | Monthly |
|------|---------|
| Phase 2 costs | ~$39 |
| SQS (4 queues) | ~$1 |
| DynamoDB (rate limits) | ~$2 |
| SNS (alerts) | ~$1 |
| **AWS Total** | **~$43** |
| **LLM APIs** | **$1,500-4,000** |

---

## Phase 4: Observability & Tuning

**Goal:** Full observability for LLM output quality and continuous improvement.

### Architecture Additions

```
┌─────────────────────────────────────────────────────────────────┐
│                    All LLM Calls                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 workflow_logs table                              │
│                                                                  │
│  Every LLM call logs:                                           │
│  - execution_id, step_name, model                               │
│  - prompt_version (for A/B testing)                             │
│  - input_tokens, output_tokens                                  │
│  - latency_ms                                                   │
│  - raw_output (for debugging)                                   │
│  - was_selected (for council workflows)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Post Lifecycle Tracking                       │
│                                                                  │
│  posts table tracks:                                            │
│  - original_content (as generated)                              │
│  - content (current, after edits)                               │
│  - edit_distance (how much user changed it)                     │
│  - time_to_approve                                              │
│  - engagement_metrics (after publishing)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Analytics Dashboard                            │
│                                                                  │
│  Metrics:                                                        │
│  - Generation success rate by campaign/model                    │
│  - Approval rate (how many posts get approved vs rejected)      │
│  - Edit rate (how often users modify generated content)         │
│  - Average edit distance (quality proxy)                        │
│  - Time to approval                                             │
│  - Cost per post by workflow type                               │
│  - Engagement correlation (which model → best engagement)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```sql
-- Enhanced posts table for tracking
ALTER TABLE posts ADD COLUMN original_content TEXT;
ALTER TABLE posts ADD COLUMN edit_distance INTEGER;
ALTER TABLE posts ADD COLUMN time_to_approve_seconds INTEGER;

-- Engagement metrics (fetched after publishing)
CREATE TABLE post_engagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt versions for A/B testing
CREATE TABLE prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  version TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test results
CREATE TABLE prompt_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  version_a TEXT NOT NULL,
  version_b TEXT NOT NULL,
  metrics JSONB DEFAULT '{}',
  winner TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### Engagement Fetching

```
┌─────────────────────────────────────────────────────────────────┐
│            EventBridge: fetch-engagement-metrics                 │
│                    (runs daily)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lambda: engagement-fetcher                          │
│                                                                  │
│  1. Get all published posts from last 7 days                    │
│  2. For each post with external_post_id:                        │
│     - Call platform API for engagement stats                    │
│     - Store in post_engagement table                            │
│  3. Update aggregate metrics                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Metrics

| Metric | Query | Purpose |
|--------|-------|---------|
| Generation success rate | `success / total` by campaign | Identify failing workflows |
| Approval rate | `approved / generated` | Quality signal |
| Edit rate | `posts_with_edits / approved` | Are we generating usable content? |
| Avg edit distance | `avg(edit_distance)` by model | Which model needs least editing? |
| Cost per post | `sum(tokens * price)` by workflow | Optimize spend |
| Engagement by model | `avg(likes)` by model used | Which model performs best? |
| Time to approve | `avg(time_to_approve)` | Workflow efficiency |

### API Endpoints (Phase 4)

```
# Analytics
GET /api/analytics/generation          # Generation metrics
GET /api/analytics/approval            # Approval funnel
GET /api/analytics/engagement          # Engagement stats
GET /api/analytics/cost                # Cost breakdown
GET /api/analytics/models              # Model comparison

# Prompt management
GET    /api/campaigns/:id/prompts              # List prompt versions
POST   /api/campaigns/:id/prompts              # Create new version
PATCH  /api/campaigns/:id/prompts/:version     # Update
POST   /api/campaigns/:id/prompts/experiment   # Start A/B test
GET    /api/campaigns/:id/prompts/experiment   # Get results
```

### Deliverables

- [ ] Enhanced logging in all LLM Lambdas
- [ ] Edit distance calculation on post update
- [ ] Engagement fetcher Lambda
- [ ] Analytics API endpoints
- [ ] Analytics dashboard in UI
- [ ] Prompt version management
- [ ] A/B testing framework

### Estimated Cost (Phase 4)

| Item | Monthly |
|------|---------|
| Phase 3 costs | ~$43 |
| Lambda (engagement fetcher) | ~$2 |
| Additional CloudWatch | ~$3 |
| **AWS Total** | **~$48** |
| **LLM APIs** | **$1,500-4,000** |

---

## Phase 5: Advanced Orchestration (Future)

**Goal:** Handle 100+ campaigns, multi-region, advanced workflows.

### When to Implement
- Campaign count > 50
- Multi-account/multi-region requirements
- Need for complex approval chains
- Real-time collaboration on posts

### Additions
- SQS FIFO queues for ordering guarantees
- DynamoDB for hot workflow state
- Step Functions nested workflows
- Multi-region deployment
- WebSocket for real-time UI updates
- Temporal.io for ultra-complex workflows (if needed)

### Estimated Cost (Phase 5)
| Item | Monthly |
|------|---------|
| Phase 4 costs | ~$48 |
| DynamoDB | ~$20 |
| Additional Lambda | ~$20 |
| Multi-region overhead | ~$30 |
| **AWS Total** | **~$118** |
| **LLM APIs** | **$3,000-8,000** |

---

## Implementation Timeline

| Phase | Focus | Prerequisite |
|-------|-------|--------------|
| **Phase 1** | Generation + Simple Workflows | Supabase schema ready |
| **Phase 2** | Approval + Publishing | Platform OAuth setup |
| **Phase 3** | Reliability + Queues | Phase 2 stable |
| **Phase 4** | Observability + Tuning | Enough data to analyze |
| **Phase 5** | Scale + Advanced | When you hit limits |

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Scheduling | AWS EventBridge Scheduler |
| Queuing | AWS SQS |
| Orchestration | AWS Step Functions |
| Compute | AWS Lambda (Python) |
| Database | Supabase (Postgres) |
| Blob Storage | AWS S3 |
| Secrets | AWS Secrets Manager |
| Monitoring | CloudWatch + custom dashboard |
| Alerting | SNS → Slack/Email |
| LLM APIs | Claude, GPT-4, Grok (via httpx) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM API downtime | Multi-provider fallback (if Claude down, use GPT-4) |
| Rate limits | Queue-based throttling, backoff, DLQ |
| Lost jobs | Idempotent processing, checkpointing, DLQ |
| Bad outputs | Human approval required, edit tracking |
| Cost overrun | Budget alerts, token monitoring |
| Platform API changes | Abstraction layer, version pinning |

---

## Next Steps

1. **Immediate:** Run Phase 1 schema migrations
2. **Next:** Set up AWS infrastructure (Lambda, EventBridge, Step Functions)
3. **Then:** Implement simple workflow for Employee Voices campaign
4. **Validate:** Run for 1 week, monitor, iterate
5. **Expand:** Add complex workflows, then Phase 2
