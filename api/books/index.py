"""
Vercel Serverless Function: List all books from COS.
"""
import os
import json
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
    if request.method != 'GET':
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }

    try:
        bucket = os.environ.get('COS_BUCKET')

        if not bucket:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "COS_BUCKET not configured"})
            }

        cos_client = get_cos_client()

        # List objects with prefix 'books/'
        response = cos_client.list_objects(
            Bucket=bucket,
            Prefix='books/',
            Delimiter='/'
        )

        books = []

        # Get common prefixes (directories)
        if 'CommonPrefixes' in response:
            for prefix in response['CommonPrefixes']:
                # Extract book ID from prefix
                book_path = prefix['Prefix']
                # Format: books/{book_id}/
                parts = book_path.rstrip('/').split('/')
                if len(parts) >= 2:
                    book_id = parts[1]

                    # Try to read the content.json for this book
                    try:
                        content_response = cos_client.get_object(
                            Bucket=bucket,
                            Key=f'books/{book_id}/content.json'
                        )
                        content_body = content_response['Body'].get_raw_stream().read()
                        book_data = json.loads(content_body.decode('utf-8'))

                        books.append({
                            'id': book_id,
                            'title': book_data.get('title', f'Book {book_id[:8]}'),
                            'cover_image': book_data.get('cover_image', ''),
                            'page_count': len(book_data.get('pages', [])),
                            'created_at': book_data.get('created_at', ''),
                            'updated_at': book_data.get('updated_at', '')
                        })
                    except Exception:
                        # If content.json doesn't exist, add basic info
                        books.append({
                            'id': book_id,
                            'title': f'Book {book_id[:8]}',
                            'cover_image': '',
                            'page_count': 0,
                            'created_at': '',
                            'updated_at': ''
                        })

        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "books": books,
                "count": len(books)
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
