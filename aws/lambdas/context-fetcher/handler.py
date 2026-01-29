"""
Context Fetcher Lambda
Fetches context for post generation and handles post storage.
Used by both simple and complex workflows.
"""

import json
import os
from datetime import datetime
from typing import Any

from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Multi-purpose handler for context fetching and result storage.

    Actions:
    - fetch_context (default): Get employee samples, campaign config
    - store_post: Store generated post
    - log_error: Log workflow error
    """
    action = event.get("action", "fetch_context")

    if action == "fetch_context":
        return fetch_context(event)
    elif action == "store_post":
        return store_post(event)
    elif action == "log_error":
        return log_error(event)
    else:
        return {"error": f"Unknown action: {action}"}


def fetch_context(event: dict) -> dict:
    """Fetch all context needed for post generation."""
    campaign_id = event["campaign_id"]
    employee_id = event["employee_id"]
    execution_id = event["execution_id"]

    # Get employee info
    employee_response = (
        supabase.table("users")
        .select("id, email, name, settings")
        .eq("id", employee_id)
        .single()
        .execute()
    )
    employee = employee_response.data

    # Get employee voice samples
    samples_response = (
        supabase.table("employee_voice_samples")
        .select("*")
        .eq("email", employee["email"])
        .execute()
    )
    samples = samples_response.data[0] if samples_response.data else None

    # Get campaign config
    campaign_response = (
        supabase.table("campaigns")
        .select("*, channels(platform, account_id, accounts(name, settings))")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    campaign = campaign_response.data

    # Get account/brand context
    account = campaign.get("channels", {}).get("accounts", {})

    # Build the context object
    context = {
        "employee": {
            "id": employee["id"],
            "name": employee["name"],
            "email": employee["email"],
            "settings": employee.get("settings", {})
        },
        "voice_samples": {
            "example_post_1": samples["example_post_1"] if samples else None,
            "example_post_2": samples["example_post_2"] if samples else None,
            "example_post_3": samples["example_post_3"] if samples else None,
            "blurb": samples["blurb"] if samples else None
        },
        "campaign": {
            "id": campaign["id"],
            "name": campaign["name"],
            "type": campaign["type"],
            "description": campaign.get("description"),
            "workflow_config": campaign.get("workflow_config", {}),
            "platform": campaign.get("channels", {}).get("platform", "linkedin")
        },
        "brand": {
            "name": account.get("name", "Meroka"),
            "settings": account.get("settings", {})
        },
        "execution_id": execution_id
    }

    # Log context fetch
    log_step(
        execution_id=execution_id,
        campaign_id=campaign_id,
        employee_id=employee_id,
        step_name="fetch_context",
        status="success"
    )

    return context


def store_post(event: dict) -> dict:
    """Store generated post in Supabase."""
    campaign_id = event["campaign_id"]
    employee_id = event["employee_id"]
    execution_id = event["execution_id"]
    post_content = event["post_content"]
    media_urls = event.get("media_urls", [])
    generation_metadata = event.get("generation_metadata", {})

    # Insert post
    response = supabase.table("posts").insert({
        "campaign_id": campaign_id,
        "author_id": employee_id,
        "content": post_content,
        "original_content": post_content,
        "media_urls": media_urls,
        "status": "pending_review",
        "execution_id": execution_id,
        "generation_metadata": generation_metadata
    }).execute()

    post = response.data[0]

    # Log post creation
    log_step(
        execution_id=execution_id,
        campaign_id=campaign_id,
        employee_id=employee_id,
        step_name="store_post",
        status="success",
        metadata={"post_id": post["id"]}
    )

    return {
        "post_id": post["id"],
        "status": "pending_review"
    }


def log_error(event: dict) -> dict:
    """Log workflow error to database."""
    execution_id = event["execution_id"]
    campaign_id = event.get("campaign_id")
    employee_id = event.get("employee_id")
    error = event.get("error", {})

    error_message = error.get("Cause", str(error)) if isinstance(error, dict) else str(error)

    log_step(
        execution_id=execution_id,
        campaign_id=campaign_id,
        employee_id=employee_id,
        step_name="workflow_error",
        status="error",
        error_message=error_message
    )

    return {"logged": True}


def log_step(
    execution_id: str,
    campaign_id: str | None,
    employee_id: str | None,
    step_name: str,
    status: str,
    error_message: str | None = None,
    metadata: dict | None = None
) -> None:
    """Log a workflow step to the database."""
    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "employee_id": employee_id,
        "workflow_type": "complex",
        "step_name": step_name,
        "status": status,
        "error_message": error_message,
        "metadata": metadata or {}
    }).execute()
