"""
LLM Aggregator Lambda
Aggregates results from LLM council and selects the best output.
Uses OpenAI GPT-4 as the judge.
"""

import json
import os
import time
from typing import Any

from openai import OpenAI
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Aggregate LLM council results and select the best post.

    Event:
    {
        "council_results": [...],  # Array of results from parallel LLM calls
        "context": {...},
        "execution_id": "...",
        "selection_method": "llm_judge" | "random" | "first"
    }
    """
    council_results = event["council_results"]
    ctx = event["context"]
    execution_id = event["execution_id"]
    selection_method = event.get("selection_method", "llm_judge")

    start_time = time.time()

    # Extract posts from council results
    # Each result is a dict with model output
    posts = []
    for i, result in enumerate(council_results):
        # Handle nested structure from Step Functions parallel execution
        if isinstance(result, dict):
            for key in ["gemini_result", "openai_result", "grok_result"]:
                if key in result:
                    posts.append({
                        "source": key.replace("_result", ""),
                        "content": result[key].get("content", ""),
                        "model": result[key].get("model", "unknown"),
                        "style": result[key].get("style", "unknown")
                    })

    if not posts:
        raise ValueError("No valid posts from council")

    # Select best post
    if selection_method == "llm_judge":
        selected, reasoning = select_with_llm_judge(posts, ctx)
    elif selection_method == "random":
        import random
        selected = random.choice(posts)
        reasoning = "Randomly selected"
    else:  # first
        selected = posts[0]
        reasoning = "Selected first available"

    latency_ms = int((time.time() - start_time) * 1000)

    # Log aggregation
    log_aggregation(
        execution_id=execution_id,
        campaign_id=ctx["campaign"]["id"],
        employee_id=ctx["employee"]["id"],
        posts_count=len(posts),
        selected_source=selected["source"],
        selection_method=selection_method,
        latency_ms=latency_ms
    )

    return {
        "selected_post": selected["content"],
        "selected_source": selected["source"],
        "selected_model": selected["model"],
        "reasoning": reasoning,
        "metadata": {
            "council_size": len(posts),
            "selection_method": selection_method,
            "sources": [p["source"] for p in posts],
            "latency_ms": latency_ms
        }
    }


def select_with_llm_judge(posts: list[dict], ctx: dict) -> tuple[dict, str]:
    """Use GPT-4o-mini as a judge to select the best post."""
    employee = ctx["employee"]
    samples = ctx["voice_samples"]

    # Build comparison prompt
    posts_text = "\n\n".join([
        f"=== POST {i+1} (from {p['source']}, style: {p['style']}) ===\n{p['content']}"
        for i, p in enumerate(posts)
    ])

    prompt = f"""You are evaluating LinkedIn posts written for {employee['name']}.

ABOUT THE PERSON:
{samples['blurb'] if samples and samples.get('blurb') else 'A professional'}

EXAMPLE OF THEIR AUTHENTIC VOICE:
"{samples['example_post_1'] if samples and samples.get('example_post_1') else '[No example]'}"

CANDIDATE POSTS:
{posts_text}

EVALUATION CRITERIA:
1. Voice authenticity - Does it sound like the person based on their examples?
2. Engagement potential - Will it generate likes, comments, shares?
3. Brand alignment - Does it subtly reinforce the mission without being preachy?
4. Originality - Is it fresh and interesting?
5. LinkedIn appropriateness - Right length, tone, format for the platform?

Select the BEST post. Respond in this exact format:
SELECTED: [number 1-{len(posts)}]
REASONING: [2-3 sentences explaining why]"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Fast and cost-effective for judging
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = response.choices[0].message.content

    # Parse response
    try:
        lines = response_text.strip().split("\n")
        selected_line = [l for l in lines if l.startswith("SELECTED:")][0]
        selected_num = int(selected_line.replace("SELECTED:", "").strip()) - 1
        reasoning_line = [l for l in lines if l.startswith("REASONING:")][0]
        reasoning = reasoning_line.replace("REASONING:", "").strip()

        if 0 <= selected_num < len(posts):
            return posts[selected_num], reasoning
    except (ValueError, IndexError):
        pass

    # Fallback to first post if parsing fails
    return posts[0], "Fallback selection (parsing failed)"


def log_aggregation(
    execution_id: str,
    campaign_id: str,
    employee_id: str,
    posts_count: int,
    selected_source: str,
    selection_method: str,
    latency_ms: int
) -> None:
    """Log aggregation step."""
    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "employee_id": employee_id,
        "workflow_type": "complex",
        "step_name": "llm_aggregator",
        "model": "gpt-4o-mini",
        "latency_ms": latency_ms,
        "status": "success",
        "metadata": {
            "posts_count": posts_count,
            "selected_source": selected_source,
            "selection_method": selection_method
        }
    }).execute()
