"""
Meme Renderer Lambda
Deterministic meme/image generation using templates.
"""

import json
import os
import uuid
from io import BytesIO
from typing import Any

import boto3
from PIL import Image, ImageDraw, ImageFont
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

s3 = boto3.client("s3")
MEDIA_BUCKET = os.environ["MEDIA_BUCKET"]


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Render meme/image for a post.

    Event:
    {
        "post_content": "...",
        "template": "quote_card" | "stat_highlight" | "meme",
        "execution_id": "..."
    }
    """
    post_content = event.get("post_content", "")
    template = event.get("template", "quote_card")
    execution_id = event["execution_id"]

    try:
        if template == "quote_card":
            image = render_quote_card(post_content)
        elif template == "stat_highlight":
            image = render_stat_highlight(post_content)
        elif template == "meme":
            image = render_meme(post_content)
        else:
            image = render_quote_card(post_content)

        # Upload to S3
        image_key = f"posts/{execution_id}/{uuid.uuid4().hex}.png"
        image_url = upload_to_s3(image, image_key)

        return {
            "urls": [image_url],
            "template": template,
            "key": image_key
        }

    except Exception as e:
        # Log error but don't fail the workflow
        print(f"Meme rendering error: {e}")
        return {
            "urls": [],
            "template": template,
            "error": str(e)
        }


def render_quote_card(text: str) -> Image.Image:
    """Render a quote card with Meroka branding."""
    # Meroka brand colors
    MEROKA_DARK = (30, 41, 59)      # Dark blue-gray
    MEROKA_ACCENT = (14, 165, 233)  # Cyan accent
    WHITE = (255, 255, 255)

    # Create image
    width, height = 1200, 630  # LinkedIn recommended
    image = Image.new("RGB", (width, height), MEROKA_DARK)
    draw = ImageDraw.Draw(image)

    # Add accent bar
    draw.rectangle([(0, 0), (8, height)], fill=MEROKA_ACCENT)

    # Extract a quote-worthy snippet (first sentence or 280 chars)
    quote = extract_quote(text)

    # Add text (using default font since custom fonts need to be bundled)
    try:
        font = ImageFont.truetype("/var/task/fonts/Inter-Medium.ttf", 36)
        font_small = ImageFont.truetype("/var/task/fonts/Inter-Regular.ttf", 24)
    except:
        font = ImageFont.load_default()
        font_small = font

    # Wrap text
    wrapped = wrap_text(quote, font, width - 120)

    # Draw quote
    y_offset = height // 2 - (len(wrapped) * 50) // 2
    for line in wrapped:
        draw.text((60, y_offset), line, fill=WHITE, font=font)
        y_offset += 50

    # Add branding
    draw.text((60, height - 60), "meroka", fill=MEROKA_ACCENT, font=font_small)

    return image


def render_stat_highlight(text: str) -> Image.Image:
    """Render a stat/number highlight card."""
    MEROKA_DARK = (30, 41, 59)
    MEROKA_ACCENT = (14, 165, 233)
    WHITE = (255, 255, 255)

    width, height = 1200, 630
    image = Image.new("RGB", (width, height), MEROKA_DARK)
    draw = ImageDraw.Draw(image)

    # Try to extract a number/stat from the text
    stat = extract_stat(text)

    try:
        font_large = ImageFont.truetype("/var/task/fonts/Inter-Bold.ttf", 120)
        font_small = ImageFont.truetype("/var/task/fonts/Inter-Regular.ttf", 28)
    except:
        font_large = ImageFont.load_default()
        font_small = font_large

    # Draw stat
    draw.text((width // 2, height // 2 - 60), stat["number"], fill=MEROKA_ACCENT,
              font=font_large, anchor="mm")
    draw.text((width // 2, height // 2 + 60), stat["label"], fill=WHITE,
              font=font_small, anchor="mm")

    # Branding
    draw.text((60, height - 60), "meroka", fill=MEROKA_ACCENT, font=font_small)

    return image


def render_meme(text: str) -> Image.Image:
    """Render a simple meme-style image."""
    # For now, just render as quote card
    # In production, you'd have actual meme templates
    return render_quote_card(text)


def extract_quote(text: str, max_length: int = 280) -> str:
    """Extract a quotable snippet from the post."""
    # Try to get the first impactful sentence
    sentences = text.replace("\n", " ").split(". ")

    if sentences:
        # Find the most impactful sentence (not too short, not too long)
        for sentence in sentences:
            if 50 < len(sentence) < max_length:
                return sentence.strip() + "."

        # Fallback to first sentence
        return sentences[0][:max_length].strip()

    return text[:max_length]


def extract_stat(text: str) -> dict:
    """Try to extract a statistic from the text."""
    import re

    # Look for patterns like "15 hours", "18%", "$5,000", etc.
    patterns = [
        (r"(\d+%)", "percentage"),
        (r"\$(\d+[,\d]*)", "dollars"),
        (r"(\d+)\s*(hours?|days?|weeks?|months?|years?)", "time"),
        (r"(\d+)\s*(patients?|doctors?|practices?|physicians?)", "count"),
    ]

    for pattern, ptype in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if ptype == "percentage":
                return {"number": match.group(1), "label": "improvement"}
            elif ptype == "dollars":
                return {"number": f"${match.group(1)}", "label": "saved"}
            elif ptype == "time":
                return {"number": match.group(1), "label": f"{match.group(2)} saved"}
            elif ptype == "count":
                return {"number": match.group(1), "label": match.group(2)}

    # Default
    return {"number": "100+", "label": "independent practices"}


def wrap_text(text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    """Wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        current_line.append(word)
        test_line = " ".join(current_line)

        # Simple width estimation (proper method needs draw.textbbox)
        if len(test_line) * 20 > max_width:  # Rough estimate
            current_line.pop()
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]

    if current_line:
        lines.append(" ".join(current_line))

    return lines


def upload_to_s3(image: Image.Image, key: str) -> str:
    """Upload image to S3 and return URL."""
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    s3.put_object(
        Bucket=MEDIA_BUCKET,
        Key=key,
        Body=buffer,
        ContentType="image/png"
    )

    return f"https://{MEDIA_BUCKET}.s3.amazonaws.com/{key}"
