"""
Vercel Serverless Function: Analyze ONE picture book page using MiniMax vision API.
Accepts a single image per call to stay within Vercel's 10s function timeout.
"""
import os
import sys
import json
import httpx
from http.server import BaseHTTPRequestHandler


def analyze_page_sync(image_b64: str, page_num: int, media_type: str = "image/jpeg") -> dict:
    api_key = os.environ.get('MINIMAX_API_KEY', '')
    base_url = os.environ.get('MINIMAX_BASE_URL', 'https://api.minimaxi.com/anthropic')
    model = os.environ.get('MINIMAX_MODEL', 'MiniMax-M2.5')

    prompt = f"""请分析这张绘本图片（第{page_num + 1}页），用中文返回以下JSON格式：
{{
    "narrator": "旁白文字（描述场景的主要故事文字，如果没有文字则根据画面编写）",
    "dialogues": [
        {{
            "character": "角色名称",
            "text": "角色说的话",
            "emotion": "情感（开心、悲伤、兴奋、惊讶、愤怒等）"
        }}
    ],
    "scene_description": "场景简要描述"
}}
只返回JSON，不要其他文字。"""

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_b64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ]

    with httpx.Client(timeout=25.0) as client:
        response = client.post(
            f"{base_url}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "max_tokens": 1000,
                "messages": messages
            }
        )

    print(f"[analyze] page {page_num}: status={response.status_code}", file=sys.stderr)

    if response.status_code != 200:
        err_text = response.text[:300]
        print(f"[analyze] error: {err_text}", file=sys.stderr)
        return {
            "narrator": f"第{page_num+1}页（分析失败）",
            "dialogues": [],
            "scene_description": f"API错误: {response.status_code} - {err_text[:100]}"
        }

    result = response.json()
    content = result['content'][0]['text']

    try:
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except Exception as e:
        print(f"[analyze] JSON parse error: {e}, raw: {content[:200]}", file=sys.stderr)

    return {
        "narrator": content[:500] if content else f"第{page_num+1}页",
        "dialogues": [],
        "scene_description": "解析完成"
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)

            # Accept single image (new) or array (legacy)
            image_data = data.get('image') or (data.get('images') or [None])[0]
            page_num = data.get('page_num', 0)

            if not image_data:
                self._send_json(400, {"error": "No image provided", "success": False})
                return

            # Detect media type from data URL
            media_type = "image/jpeg"
            if image_data.startswith('data:'):
                header, image_data = image_data.split(',', 1)
                if 'png' in header:
                    media_type = "image/png"
                elif 'webp' in header:
                    media_type = "image/webp"
            elif ',' in image_data:
                image_data = image_data.split(',', 1)[1]

            page = analyze_page_sync(image_data, page_num, media_type)

            self._send_json(200, {
                "success": True,
                "page": page,
                "page_num": page_num
            })

        except Exception as e:
            print(f"[analyze] handler error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self._send_json(500, {"error": str(e), "success": False})

    def _send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"[analyze] {format % args}", file=sys.stderr)
