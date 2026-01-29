"""
Grok LLM Lambda
Wrapper for xAI Grok API calls.
"""

import json
import os
import time
from typing import Any

import httpx
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

GROK_API_URL = "https://api.x.ai/v1/chat/completions"


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Generate post content using Grok.

    Event:
    {
        "context": {...},
        "execution_id": "...",
        "model": "grok-4",
        "style": "witty" | "edgy" | "balanced"
    }
    """
    ctx = event["context"]
    execution_id = event["execution_id"]
    model = event.get("model", "grok-4")
    style = event.get("style", "witty")

    start_time = time.time()

    try:
        prompt = build_prompt(ctx, style)

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                GROK_API_URL,
                headers={
                    "Authorization": f"Bearer {os.environ['GROK_API_KEY']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 1024,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a witty, irreverent LinkedIn content writer who captures authentic voices while being engaging and slightly edgy."
                        },
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        latency_ms = int((time.time() - start_time) * 1000)

        log_llm_call(
            execution_id=execution_id,
            campaign_id=ctx["campaign"]["id"],
            employee_id=ctx["employee"]["id"],
            model=model,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            latency_ms=latency_ms,
            status="success"
        )

        return {
            "content": content,
            "model": model,
            "style": style,
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "latency_ms": latency_ms
        }

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            log_llm_call(
                execution_id=execution_id,
                campaign_id=ctx["campaign"]["id"],
                employee_id=ctx["employee"]["id"],
                model=model,
                latency_ms=int((time.time() - start_time) * 1000),
                status="error",
                error_message="RateLimitError"
            )
            raise Exception("RateLimitError") from e
        raise

    except Exception as e:
        log_llm_call(
            execution_id=execution_id,
            campaign_id=ctx["campaign"]["id"],
            employee_id=ctx["employee"]["id"],
            model=model,
            latency_ms=int((time.time() - start_time) * 1000),
            status="error",
            error_message=str(e)
        )
        raise


def build_prompt(ctx: dict, style: str) -> str:
    """Build the prompt for post generation."""
    employee = ctx["employee"]
    samples = ctx["voice_samples"]
    campaign = ctx["campaign"]
    brand = ctx["brand"]

    style_instructions = {
        "witty": "Be witty, clever, and slightly irreverent. Use humor that makes people think.",
        "edgy": "Be bold and provocative. Challenge conventional wisdom. Don't be afraid to have an opinion.",
        "balanced": "Balance professionalism with personality. Be engaging but not over the top."
    }

    prompt = f"""Write a LinkedIn post for {employee['name']} at {brand['name']}.

ABOUT THEM:
{samples['blurb'] if samples and samples.get('blurb') else 'A professional at ' + brand['name']}

THEIR VOICE (examples):

"{samples['example_post_1'] if samples and samples.get('example_post_1') else '[No example]'}"

"{samples['example_post_2'] if samples and samples.get('example_post_2') else '[No example]'}"

"{samples['example_post_3'] if samples and samples.get('example_post_3') else '[No example]'}"

CAMPAIGN: {campaign['name']}
{campaign.get('description', '')}

STYLE: {style_instructions.get(style, style_instructions['witty'])}

MISSION: Meroka = "Saving independence in medicine" - fighting PE consolidation, giving independent docs collective power.

Write ONE LinkedIn post (150-280 words) that sounds like {employee['name']}. Be authentic, not corporate. Just the post."""

    return prompt


def log_llm_call(
    execution_id: str,
    campaign_id: str,
    employee_id: str,
    model: str,
    latency_ms: int,
    status: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    error_message: str | None = None
) -> None:
    """Log LLM call to workflow_logs."""
    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "employee_id": employee_id,
        "workflow_type": "complex",
        "step_name": "llm_grok",
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": latency_ms,
        "status": status,
        "error_message": error_message
    }).execute()
