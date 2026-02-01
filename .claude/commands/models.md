# /models

Reference for the latest, most performant AI models from major labs (as of January 2026).

## Quick Reference

| Provider | Best Model | API Model ID | Context | Best For |
|----------|------------|--------------|---------|----------|
| OpenAI | GPT-5.2 | `gpt-5.2` | 400K | General tasks, broad knowledge |
| OpenAI | GPT-5.2 Pro | `gpt-5.2-pro` | 400K | Complex reasoning, harder problems |
| OpenAI | GPT-5.2 Codex | `gpt-5.2-codex` | 400K | Coding, agentic workflows |
| Anthropic | Claude Opus 4.5 | `claude-opus-4-5-20251101` | 200K | Coding, agentic tasks |
| Anthropic | Claude Sonnet 4.5 | `claude-sonnet-4-5-20241022` | 200K (1M beta) | Balanced performance/cost |
| Anthropic | Claude Opus 4 | `claude-opus-4-20250514` | 200K | Best coding (SWE-bench 72.5%) |
| Google | Gemini 3 Pro | `gemini-3-pro-preview` | 1M | Math (95% AIME), reasoning |
| Google | Gemini 3 Flash | `gemini-3-flash` | 1M | Speed + Pro-level intelligence |
| Meta | Llama 4 Maverick | `llama-4-maverick` | 1M | Open-source, multilingual |
| Meta | Llama 4 Scout | `llama-4-scout` | 10M | Massive context research |
| DeepSeek | V3.2 | `deepseek-chat` | 128K | Budget-friendly, frontier-level |
| DeepSeek | V3.2 Reasoner | `deepseek-reasoner` | 128K | Deep reasoning mode |
| xAI | Grok 4.1 Fast | `grok-4-1-fast-reasoning` | 2M | Real-time knowledge, reasoning |

## Recommendations by Use Case

### AI-Generated Social Media Posts (Townhall App)
Use these models for the LLM council that generates marketing posts:
1. **GPT-5.2** - `gpt-5.2`
2. **Gemini 3 Pro** - `gemini-3-pro-preview`
3. **Grok 4.1 Fast** - `grok-4-1-fast-reasoning`
4. **Claude Opus 4.5** - `claude-opus-4-5-20251101`

### Coding & Development
1. **Claude Opus 4** - Best on SWE-bench (72.5%), Terminal-bench (43.2%)
2. **GPT-5.2 Codex** - Optimized for agentic coding workflows
3. **Claude Sonnet 4.5** - Good balance of performance and cost

### Complex Reasoning & Math
1. **Gemini 3 Pro** - 95% on AIME 2025 (best math score)
2. **GPT-5.2 Pro** - Uses more compute for harder problems
3. **DeepSeek V3.2 Reasoner** - Budget option with strong reasoning

### Long Context / Research
1. **Llama 4 Scout** - 10M tokens (unmatched)
2. **Gemini 3 Pro** - 1M tokens
3. **Claude Sonnet 4.5** - 1M token beta available

### Budget-Conscious
1. **DeepSeek V3.2** - Frontier capabilities at fraction of cost
2. **Gemini 3 Flash** - Pro-level at Flash pricing
3. **GPT-5-mini** - Smaller, cheaper OpenAI option

### Open Source / Self-Hosting
1. **Llama 4 Maverick** - Best open-weight model
2. **DeepSeek V3.2** - Available on Hugging Face

## API Endpoints

```bash
# OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "gpt-5.2", "messages": [...]}'

# Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{"model": "claude-opus-4-5-20251101", "messages": [...]}'

# Google (Vertex AI)
curl https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-preview:generateContent \
  -H "x-goog-api-key: $GOOGLE_API_KEY"

# DeepSeek
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{"model": "deepseek-chat", "messages": [...]}'
```

## Notes

- GPT-5.2 has 6.2% hallucination rate (40% reduction from earlier versions)
- Claude models excel at following complex instructions
- Gemini 3 has native `thinking_level` parameter for reasoning depth
- DeepSeek V3.2 performs comparably to GPT-5 at much lower cost
- Llama 4 is open-source with some commercial conditions

Last updated: January 2026
