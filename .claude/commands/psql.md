# /psql Command

Run SQL migrations or queries against the Supabase PostgreSQL database.

## Instructions

When the user invokes `/psql`, execute SQL against the database using the connection string from `.claude/.env`:

```
SUPABASE_PSQL_CONNECTION_STRING=postgresql://postgres.dbcawzpzbmkpiybkppet:OhS7R4iEMcWlxgzK@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

### Usage Patterns

1. **Run a migration file**: `/psql scripts/migrations/003_example.sql`
   ```bash
   psql "postgresql://postgres.dbcawzpzbmkpiybkppet:OhS7R4iEMcWlxgzK@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -f <file>
   ```

2. **Run inline SQL**: `/psql SELECT * FROM posts LIMIT 5`
   ```bash
   psql "postgresql://postgres.dbcawzpzbmkpiybkppet:OhS7R4iEMcWlxgzK@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "<sql>"
   ```

3. **Run all pending migrations**: `/psql migrations`
   - Check `scripts/migrations/` for .sql files
   - Run them in order (by filename number prefix)

### Arguments

$ARGUMENTS - The SQL file path, inline SQL query, or "migrations" to run all pending migrations
