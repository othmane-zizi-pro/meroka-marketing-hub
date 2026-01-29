# Agentic Marketing App - ER Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      ACCOUNTS                                        │
│  (Top-level: Meroka, co-branded partners)                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 1:N
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      CHANNELS                                        │
│  (LinkedIn, X, Instagram, etc.)                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 1:N
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                     CAMPAIGNS                                        │
│  (Employee Voices, Continuous Marketing, etc.)                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 1:N
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                       POSTS                                          │
│  (AI-generated content for approval)                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 1:N
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   POST_REACTIONS                                     │
│  (Upvotes, comments from team members)                                               │
└─────────────────────────────────────────────────────────────────────────────────────┘


## Detailed Schema

┌────────────────────────┐       ┌────────────────────────┐
│       accounts         │       │         users          │
├────────────────────────┤       ├────────────────────────┤
│ id (PK, UUID)          │──┐    │ id (PK, UUID)          │
│ name                   │  │    │ email                  │
│ slug                   │  │    │ name                   │
│ logo_url               │  │    │ avatar_url             │
│ settings (JSONB)       │  │    │ role                   │
│ created_at             │  └───▶│ account_id (FK)        │
│ updated_at             │       │ created_at             │
└────────────────────────┘       │ updated_at             │
         │                       └────────────────────────┘
         │ 1:N                            │
         ▼                                │
┌────────────────────────┐                │
│       channels         │                │
├────────────────────────┤                │
│ id (PK, UUID)          │                │
│ account_id (FK)        │◀───────────────┘ (users belong to accounts)
│ platform               │                │
│ name                   │                │
│ settings (JSONB)       │                │
│ is_active              │                │
│ created_at             │                │
│ updated_at             │                │
└────────────────────────┘                │
         │                                │
         │ 1:N                            │
         ▼                                │
┌────────────────────────┐                │
│      campaigns         │                │
├────────────────────────┤                │
│ id (PK, UUID)          │                │
│ channel_id (FK)        │                │
│ name                   │                │
│ type                   │                │
│ description            │                │
│ settings (JSONB)       │                │
│ status                 │                │
│ created_at             │                │
│ updated_at             │                │
└────────────────────────┘                │
         │                                │
         │ 1:N                            │
         ▼                                │
┌────────────────────────┐                │
│        posts           │                │
├────────────────────────┤                │
│ id (PK, UUID)          │                │
│ campaign_id (FK)       │                │
│ author_id (FK)         │◀───────────────┤ (user the post is FOR)
│ content                │                │
│ media_urls (JSONB)     │                │
│ status                 │                │
│ approved_by (FK)       │◀───────────────┤ (user who approved)
│ approved_at            │                │
│ scheduled_for          │                │
│ created_at             │                │
│ updated_at             │                │
└────────────────────────┘                │
         │                                │
         │ 1:N                            │
         ▼                                │
┌────────────────────────┐                │
│    post_reactions      │                │
├────────────────────────┤                │
│ id (PK, UUID)          │                │
│ post_id (FK)           │                │
│ user_id (FK)           │◀───────────────┘
│ type (upvote/comment)  │
│ content (for comments) │
│ created_at             │
└────────────────────────┘


## Supporting Tables

┌────────────────────────┐       ┌────────────────────────┐
│ employee_voice_samples │       │   watched_accounts     │
├────────────────────────┤       ├────────────────────────┤
│ id (PK, UUID)          │       │ id (PK, UUID)          │
│ email                  │       │ channel_id (FK)        │
│ example_post_1         │       │ platform_handle        │
│ example_post_2         │       │ platform_user_id       │
│ example_post_3         │       │ name                   │
│ blurb                  │       │ is_active              │
│ is_sample              │       │ last_fetched_at        │
│ created_at             │       │ created_at             │
│ updated_at             │       └────────────────────────┘
└────────────────────────┘                │
         │                                │ 1:N
         │                                ▼
         │                       ┌────────────────────────┐
         │                       │   external_posts       │
         │                       ├────────────────────────┤
         │                       │ id (PK, UUID)          │
         │                       │ watched_account_id(FK) │
         │                       │ platform_post_id       │
         │                       │ content                │
         │                       │ posted_at              │
         │                       │ engagement_metrics     │
         │                       │ created_at             │
         └──────────────────────▶└────────────────────────┘
              (used for few-shot
               prompting when
               generating posts)


## Enums

platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'threads'
campaign_type: 'employee_voices' | 'continuous_engagement' | 'product_launch' | 'event' | 'custom'
campaign_status: 'draft' | 'active' | 'paused' | 'completed'
post_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published'
user_role: 'admin' | 'editor' | 'contributor' | 'viewer'
reaction_type: 'upvote' | 'comment'
```

## Key Relationships

1. **Account → Channels**: One account can have multiple channels (LinkedIn, X, etc.)
2. **Account → Users**: Users belong to one account
3. **Channel → Campaigns**: Each channel can have multiple campaigns
4. **Campaign → Posts**: Campaigns contain AI-generated posts
5. **Post → Author (User)**: Each post is created FOR a specific user (employee voice)
6. **Post → Reactions**: Team members can upvote/comment on posts
7. **Channel → Watched Accounts**: For continuous engagement, track external accounts to respond to
8. **Employee Voice Samples**: Few-shot examples linked by email to users
