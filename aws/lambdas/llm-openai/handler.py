"""
OpenAI LLM Lambda
Wrapper for OpenAI GPT-4 API calls.
"""

import json
import os
import time
from typing import Any

import openai
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Generate post content using GPT-4.

    Event:
    {
        "context": {...},
        "execution_id": "...",
        "model": "gpt-4-turbo-preview",
        "style": "professional" | "thoughtful" | "witty"
    }
    """
    ctx = event["context"]
    execution_id = event["execution_id"]
    model = event.get("model", "gpt-4-turbo-preview")
    style = event.get("style", "professional")

    start_time = time.time()

    try:
        prompt = build_prompt(ctx, style)

        response = client.chat.completions.create(
            model=model,
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert LinkedIn content writer who captures authentic voices."
                },
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content
        latency_ms = int((time.time() - start_time) * 1000)

        log_llm_call(
            execution_id=execution_id,
            campaign_id=ctx["campaign"]["id"],
            employee_id=ctx["employee"]["id"],
            model=model,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
            latency_ms=latency_ms,
            status="success"
        )

        return {
            "content": content,
            "model": model,
            "style": style,
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "latency_ms": latency_ms
        }

    except openai.RateLimitError as e:
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
        "thoughtful": "Write in a thoughtful, insightful tone. Focus on depth and nuance.",
        "witty": "Write with wit and humor. Be clever but not forced.",
        "professional": "Write in a professional, polished tone. Be authoritative but approachable.",
        "balanced": "Write in a balanced tone that's both professional and personable."
    }

    prompt = f"""Write a LinkedIn post for {employee['name']} at {brand['name']}.

ABOUT THE PERSON:
{samples['blurb'] if samples and samples.get('blurb') else 'A professional at ' + brand['name']}

EXAMPLE POSTS IN THEIR VOICE:

1) {samples['example_post_1'] if samples and samples.get('example_post_1') else '[No example]'}

2) {samples['example_post_2'] if samples and samples.get('example_post_2') else '[No example]'}

3) {samples['example_post_3'] if samples and samples.get('example_post_3') else '[No example]'}

CAMPAIGN: {campaign['name']}
{campaign.get('description', '')}

STYLE: {style_instructions.get(style, style_instructions['professional'])}

BRAND MISSION: "Saving independence in medicine" - Meroka builds collective power for independent physician practices.

Write ONE LinkedIn post (150-280 words) that sounds authentically like {employee['name']} based on the examples. Post content only."""

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
        "step_name": "llm_openai",
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": latency_ms,
        "status": status,
        "error_message": error_message
    }).execute()
