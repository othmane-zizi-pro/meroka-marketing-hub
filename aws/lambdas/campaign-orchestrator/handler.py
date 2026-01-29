"""
Campaign Orchestrator Lambda
Main entry point for campaign post generation, triggered by EventBridge Scheduler.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Any

import boto3
from supabase import create_client

# Initialize clients
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)
lambda_client = boto3.client("lambda")
sfn_client = boto3.client("stepfunctions")

COMPLEX_WORKFLOW_ARN = os.environ.get("COMPLEX_WORKFLOW_ARN")


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Main handler for campaign orchestration.

    Event structure:
    {
        "campaign_id": "uuid",
        "trigger": "scheduled" | "manual"
    }
    """
    campaign_id = event.get("campaign_id")
    trigger = event.get("trigger", "scheduled")
    execution_id = f"exec_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    print(f"Starting execution {execution_id} for campaign {campaign_id}")

    try:
        # 1. Fetch campaign configuration
        campaign = fetch_campaign(campaign_id)
        if not campaign:
            return {"error": f"Campaign {campaign_id} not found"}

        if campaign["status"] != "active":
            return {"error": f"Campaign {campaign_id} is not active"}

        # 2. Fetch assigned employees
        employees = fetch_campaign_employees(campaign_id)
        if not employees:
            return {"error": f"No employees assigned to campaign {campaign_id}"}

        print(f"Found {len(employees)} employees for campaign")

        # 3. Determine workflow type
        workflow_type = campaign.get("workflow_type", "simple")
        posts_per_employee = campaign.get("posts_per_employee", 3)

        # 4. Process each employee
        results = []
        for employee in employees:
            for post_num in range(posts_per_employee):
                post_execution_id = f"{execution_id}_emp{employee['user_id'][:8]}_p{post_num}"

                if workflow_type == "complex":
                    result = trigger_complex_workflow(
                        campaign_id=campaign_id,
                        employee_id=employee["user_id"],
                        execution_id=post_execution_id,
                        campaign=campaign
                    )
                else:
                    result = run_simple_workflow(
                        campaign_id=campaign_id,
                        employee_id=employee["user_id"],
                        execution_id=post_execution_id,
                        campaign=campaign
                    )

                results.append(result)

        # 5. Log execution summary
        log_execution_summary(execution_id, campaign_id, results)

        return {
            "execution_id": execution_id,
            "campaign_id": campaign_id,
            "employees_processed": len(employees),
            "posts_triggered": len(results),
            "workflow_type": workflow_type
        }

    except Exception as e:
        print(f"Error in orchestrator: {str(e)}")
        log_error(execution_id, campaign_id, str(e))
        raise


def fetch_campaign(campaign_id: str) -> dict | None:
    """Fetch campaign configuration from Supabase."""
    response = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    return response.data


def fetch_campaign_employees(campaign_id: str) -> list[dict]:
    """Fetch employees assigned to this campaign."""
    response = (
        supabase.table("campaign_employees")
        .select("user_id, users(id, email, name)")
        .eq("campaign_id", campaign_id)
        .eq("is_active", True)
        .execute()
    )
    return response.data


def trigger_complex_workflow(
    campaign_id: str,
    employee_id: str,
    execution_id: str,
    campaign: dict
) -> dict:
    """Start Step Functions execution for complex workflow."""
    response = sfn_client.start_execution(
        stateMachineArn=COMPLEX_WORKFLOW_ARN,
        name=execution_id,
        input=json.dumps({
            "campaign_id": campaign_id,
            "employee_id": employee_id,
            "execution_id": execution_id,
            "workflow_config": campaign.get("workflow_config", {})
        })
    )

    return {
        "execution_id": execution_id,
        "employee_id": employee_id,
        "workflow": "complex",
        "sfn_execution_arn": response["executionArn"]
    }


def run_simple_workflow(
    campaign_id: str,
    employee_id: str,
    execution_id: str,
    campaign: dict
) -> dict:
    """Run simple single-LLM workflow inline."""
    import time
    start_time = time.time()

    try:
        # 1. Fetch context
        context = fetch_context(campaign_id, employee_id)

        # 2. Call single LLM
        model = campaign.get("workflow_config", {}).get("model", "claude-3-sonnet-20240229")
        llm_function = get_llm_function(model)

        response = lambda_client.invoke(
            FunctionName=llm_function,
            InvocationType="RequestResponse",
            Payload=json.dumps({
                "context": context,
                "execution_id": execution_id,
                "model": model,
                "style": "balanced"
            })
        )

        result = json.loads(response["Payload"].read())

        # 3. Store post
        post = store_post(
            campaign_id=campaign_id,
            employee_id=employee_id,
            execution_id=execution_id,
            content=result["content"],
            metadata={
                "model": model,
                "workflow": "simple",
                "latency_ms": int((time.time() - start_time) * 1000)
            }
        )

        return {
            "execution_id": execution_id,
            "employee_id": employee_id,
            "workflow": "simple",
            "post_id": post["id"],
            "success": True
        }

    except Exception as e:
        log_workflow_error(execution_id, campaign_id, employee_id, str(e))
        return {
            "execution_id": execution_id,
            "employee_id": employee_id,
            "workflow": "simple",
            "success": False,
            "error": str(e)
        }


def fetch_context(campaign_id: str, employee_id: str) -> dict:
    """Fetch all context needed for post generation."""
    # Get employee info and samples
    employee = supabase.table("users").select("*").eq("id", employee_id).single().execute()

    samples = (
        supabase.table("employee_voice_samples")
        .select("*")
        .eq("email", employee.data["email"])
        .execute()
    )

    # Get campaign info
    campaign = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()

    return {
        "employee": employee.data,
        "samples": samples.data[0] if samples.data else None,
        "campaign": campaign.data
    }


def get_llm_function(model: str) -> str:
    """Map model name to Lambda function name."""
    env = os.environ.get("ENVIRONMENT", "dev")

    if "claude" in model.lower():
        return f"meroka-llm-claude-{env}"
    elif "gpt" in model.lower():
        return f"meroka-llm-openai-{env}"
    elif "grok" in model.lower():
        return f"meroka-llm-grok-{env}"
    else:
        return f"meroka-llm-claude-{env}"  # Default


def store_post(
    campaign_id: str,
    employee_id: str,
    execution_id: str,
    content: str,
    metadata: dict
) -> dict:
    """Store generated post in Supabase."""
    response = supabase.table("posts").insert({
        "campaign_id": campaign_id,
        "author_id": employee_id,
        "content": content,
        "original_content": content,
        "status": "pending_review",
        "execution_id": execution_id,
        "generation_metadata": metadata
    }).execute()

    return response.data[0]


def log_execution_summary(execution_id: str, campaign_id: str, results: list) -> None:
    """Log execution summary to workflow_logs."""
    success_count = sum(1 for r in results if r.get("success", True))

    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "workflow_type": "orchestrator",
        "step_name": "execution_summary",
        "status": "success" if success_count == len(results) else "partial",
        "metadata": {
            "total": len(results),
            "success": success_count,
            "failed": len(results) - success_count
        }
    }).execute()


def log_error(execution_id: str, campaign_id: str, error: str) -> None:
    """Log error to workflow_logs."""
    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "workflow_type": "orchestrator",
        "step_name": "error",
        "status": "error",
        "error_message": error
    }).execute()


def log_workflow_error(
    execution_id: str,
    campaign_id: str,
    employee_id: str,
    error: str
) -> None:
    """Log workflow step error."""
    supabase.table("workflow_logs").insert({
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "employee_id": employee_id,
        "workflow_type": "simple",
        "step_name": "workflow_error",
        "status": "error",
        "error_message": error
    }).execute()
