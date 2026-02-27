"""
Vercel Serverless Function: Save book metadata and audio URLs to COS.
"""
import os
import json
from datetime import datetime
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client


def get_cos_client():
    """Initialize and return COS client."""
    secret_id = os.environ.get('COS_SECRET_ID')
    secret_key = os.environ.get('COS_SECRET_KEY')
    region = os.environ.get('COS_REGION', 'ap-guangzhou')

    if not secret_id or not secret_key:
        raise ValueError("COS credentials not configured")

    config = CosConfig(
        SecretId=secret_id,
        SecretKey=secret_key,
        Region=region
    )
    return CosS3Client(config)


async def handler(request):
    """Main handler for Vercel serverless function."""
    if request.method != 'POST':
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }

    try:
        body = await request.json()

        book_id = body.get('book_id')
        title = body.get('title', 'Untitled')
        pages = body.get('pages', [])
        audio_urls = body.get('audio_urls', [])
        cover_image = body.get('cover_image', '')

        if not book_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Book ID is required"})
            }

        if not pages:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Pages are required"})
            }

        bucket = os.environ.get('COS_BUCKET')

        if not bucket:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "COS_BUCKET not configured"})
            }

        cos_client = get_cos_client()

        # Build book data
        book_data = {
            'id': book_id,
            'title': title,
            'cover_image': cover_image,
            'pages': pages,
            'audio_urls': audio_urls,
            'page_count': len(pages),
            'created_at': body.get('created_at', datetime.now().isoformat()),
            'updated_at': datetime.now().isoformat()
        }

        # Convert to JSON
        content_json = json.dumps(book_data, ensure_ascii=False, indent=2)

        # Upload to COS
        cos_client.put_object(
            Bucket=bucket,
            Body=content_json.encode('utf-8'),
            Key=f'books/{book_id}/content.json',
            ContentType='application/json'
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "book_id": book_id,
                "message": "Book saved successfully"
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
