"""
Vercel Serverless Function: Analyze picture book images using MiniMax vision API.
"""
import os
import json
import base64
import httpx
from typing import Any


def decode_base64_image(encoded: str) -> bytes:
    """Decode base64 string to bytes, removing data URL prefix if present."""
    if ',' in encoded:
        encoded = encoded.split(',', 1)[1]
    return base64.b64decode(encoded)


def encode_image_to_base64(image_data: bytes) -> str:
    """Encode image bytes to base64 data URL."""
    return f"data:image/jpeg;base64,{base64.b64encode(image_data).decode('utf-8')}"


async def analyze_page(image_base64: str, page_num: int, client: httpx.AsyncClient) -> dict:
    """Analyze a single page using MiniMax vision API."""
    api_key = os.environ.get('MINIMAX_API_KEY')
    base_url = os.environ.get('MINIMAX_BASE_URL', 'https://api.minimaxi.com/anthropic')
    model = os.environ.get('MINIMAX_MODEL', 'MiniMax-M2.5')

    prompt = f"""Analyze this picture book page (page {page_num + 1}).

Provide a JSON response with the following structure:
{{
    "narrator": "Narrator text (the main story text that describes the scene)",
    "dialogues": [
        {{
            "character": "Character name or role",
            "text": "What the character says",
            "emotion": "Emotional tone (happy, sad, excited, surprised, angry, etc.)"
        }}
    ],
    "scene_description": "Brief description of what's happening in this scene"
}}

Focus on:
- Extract any dialogue/speech from characters
- Describe the overall scene
- Identify characters and their emotions
- Keep the narrator text as the main storytelling content

Return ONLY valid JSON, no other text."""

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ]

    response = await client.post(
        f"{base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 2000
        },
        timeout=120.0
    )

    if response.status_code != 200:
        raise Exception(f"MiniMax API error: {response.status_code} - {response.text}")

    result = response.json()
    content = result['choices'][0]['message']['content']

    # Try to parse JSON from the response
    try:
        # Find JSON in the response
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            parsed = json.loads(json_str)
            return parsed
        else:
            raise ValueError("No JSON found in response")
    except (json.JSONDecodeError, ValueError) as e:
        # Return a fallback structure if parsing fails
        return {
            "narrator": content[:500],
            "dialogues": [],
            "scene_description": "Analysis failed to parse"
        }


async def handler(request):
    """Main handler for Vercel serverless function."""
    if request.method != 'POST':
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }

    try:
        # Parse multipart form data
        content_type = request.headers.get('content-type', '')

        if 'multipart/form-data' in content_type:
            # Read the request body
            body = request.get_body()

            # Parse boundary from content-type
            boundary_match = content_type.split('boundary=')
            if len(boundary_match) > 1:
                boundary = boundary_match[1].split(';')[0]
            else:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "No boundary found in content-type"})
                }

            # Parse multipart data manually
            import re
            parts = re.split(f'--{boundary}', body.decode('utf-8') if isinstance(body, bytes) else str(body))

            images = []
            for part in parts:
                if 'Content-Type: image' in part or 'Content-Type: application/octet-stream' in part:
                    # Extract filename to check if it's an image
                    if 'filename=' in part:
                        # Extract the binary data
                        data_start = part.find('\r\n\r\n')
                        if data_start >= 0:
                            data = part[data_start + 4:]
                            # Remove trailing boundary markers
                            data = data.strip()
                            if data:
                                try:
                                    # Try to decode as base64
                                    decoded = base64.b64decode(data)
                                    images.append(encode_image_to_base64(decoded))
                                except:
                                    pass

            if not images:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "No images found in request"})
                }

        elif 'application/json' in content_type:
            body = await request.json()
            images = body.get('images', [])

            if not images:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "No images provided"})
                }

        else:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Unsupported content type"})
            }

        # Analyze each page
        async with httpx.AsyncClient() as client:
            pages = []
            for i, image_data in enumerate(images):
                # Ensure image is base64 encoded
                if not image_data.startswith('data:'):
                    image_data = encode_image_to_base64(image_data)

                # Extract base64 data for API
                if ',' in image_data:
                    b64_data = image_data.split(',', 1)[1]
                else:
                    b64_data = image_data

                analysis = await analyze_page(b64_data, i, client)
                pages.append(analysis)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "pages": pages,
                "page_count": len(pages)
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e),
                "success": False
            })
        }
