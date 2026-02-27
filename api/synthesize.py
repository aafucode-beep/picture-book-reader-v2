"""
Vercel Serverless Function: Synthesize text to speech using Edge TTS and upload to COS.
"""
import os
import json
import asyncio
import edge_tts
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
import uuid
import io


# Voice mappings
VOICE_MAP = {
    'narrator': 'zh-CN-XiaoxiaoNeural',
    'child': 'zh-CN-XiaoyiNeural',
    'male': 'zh-CN-YunxiNeural',
    'female': 'zh-CN-XiaochenNeural'
}

# Default voice
DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural'


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


def determine_voice(character: str, emotion: str = '') -> str:
    """Determine the appropriate voice based on character name and emotion."""
    character_lower = character.lower() if character else ''

    # Check for specific character types
    if 'child' in character_lower or 'kid' in character_lower or 'boy' in character_lower or 'girl' in character_lower:
        return VOICE_MAP['child']

    if 'father' in character_lower or 'dad' in character_lower or '爸爸' in character:
        return VOICE_MAP['male']

    if 'mother' in character_lower or 'mom' in character_lower or '妈妈' in character:
        return VOICE_MAP['female']

    # Default to narrator voice
    return DEFAULT_VOICE


async def synthesize_text(text: str, voice: str) -> bytes:
    """Synthesize text to speech using Edge TTS."""
    communicate = edge_tts.Communicate(text, voice)

    audio_buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio_buffer.write(chunk['data'])

    return audio_buffer.getvalue()


def upload_to_cos(audio_data: bytes, book_id: str, page_num: int, segment_type: str = 'narrator') -> str:
    """Upload audio file to COS and return public URL."""
    bucket = os.environ.get('COS_BUCKET')

    if not bucket:
        raise ValueError("COS_BUCKET not configured")

    # Generate unique filename
    filename = f"{book_id}/audio/page_{page_num}_{segment_type}.mp3"

    cos_client = get_cos_client()

    # Upload the audio file
    cos_client.put_object(
        Bucket=bucket,
        Body=audio_data,
        Key=filename,
        ContentType='audio/mpeg'
    )

    # Generate public URL
    # For public buckets, the URL format is:
    # https://{bucket}.cos.{region}.myqcloud.com/{key}
    region = os.environ.get('COS_REGION', 'ap-guangzhou')
    public_url = f"https://{bucket}.cos.{region}.myqcloud.com/{filename}"

    return public_url


async def handler(request):
    """Main handler for Vercel serverless function."""
    if request.method != 'POST':
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }

    try:
        # Parse request body
        body = await request.json()

        pages = body.get('pages', [])
        characters = body.get('characters', {})
        book_id = body.get('book_id', str(uuid.uuid4()))

        if not pages:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No pages provided"})
            }

        # Process each page
        audio_urls = []

        for page_num, page in enumerate(pages):
            page_audios = {}

            # Synthesize narrator text
            narrator_text = page.get('narrator', '')
            if narrator_text:
                narrator_audio = await synthesize_text(narrator_text, VOICE_MAP['narrator'])
                narrator_url = upload_to_cos(narrator_audio, book_id, page_num, 'narrator')
                page_audios['narrator'] = narrator_url

            # Synthesize dialogues
            dialogues = page.get('dialogues', [])
            dialogue_urls = []

            for dialogue_num, dialogue in enumerate(dialogues):
                text = dialogue.get('text', '')
                character = dialogue.get('character', '')

                if text:
                    voice = determine_voice(character, dialogue.get('emotion', ''))
                    dialogue_audio = await synthesize_text(text, voice)
                    dialogue_url = upload_to_cos(dialogue_audio, book_id, page_num, f'dialogue_{dialogue_num}')

                    dialogue_urls.append({
                        'character': character,
                        'text': text,
                        'url': dialogue_url,
                        'emotion': dialogue.get('emotion', '')
                    })

            page_audios['dialogues'] = dialogue_urls
            audio_urls.append(page_audios)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "book_id": book_id,
                "audio_urls": audio_urls
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
