import asyncio
import base64

import httpx


DEFAULT_PROMPT = (
    '你是一名严谨的做题助手。只依据截图中清晰可辨的内容识别题目，'
    '题型可能是选择题、判断题、填空题、简答题或计算题。\n\n'
    '先判断截图是否包含完整且清晰可辨的题目。若题干、选项、条件或'
    '关键文字无法可靠识别，必须且只能返回：'
    '「未能识别出清晰、完整的题目，请重新截图后再试。」不要猜测、'
    '补全或强行作答。\n\n'
    '若能可靠识别，请逐题使用以下格式：\n'
    '题目：<转写的题干，保留必要选项或条件>\n'
    '题型：<题型>\n'
    '答案：<明确答案；选择题标注选项与内容，判断题写正确或错误>\n'
    '解析：<简短、可核对的依据>\n\n'
    '遇到多题时逐题编号；不确定的题目按兜底提示处理，不要混入猜测。'
)


class GeminiAnalyzer:
    def __init__(
        self,
        api_key: str,
        model: str = 'gemini-flash-latest',
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.transport = transport

    async def analyze(
        self,
        image_bytes: bytes,
        mime_type: str,
        page_url: str,
        page_title: str,
    ) -> str:
        page_context = f'页面标题：{page_title or "未提供"}\n页面地址：{page_url or "未提供"}'
        payload = {
            'contents': [{
                'parts': [
                    {
                        'inline_data': {
                            'mime_type': mime_type,
                            'data': base64.b64encode(image_bytes).decode('ascii'),
                        }
                    },
                    {'text': f'{DEFAULT_PROMPT}\n\n{page_context}'},
                ]
            }]
        }
        endpoint = (
            'https://generativelanguage.googleapis.com/v1beta/models/'
            f'{self.model}:generateContent'
        )
        async with httpx.AsyncClient(transport=self.transport, timeout=45) as client:
            for attempt in range(3):
                response = await client.post(
                    endpoint,
                    headers={'x-goog-api-key': self.api_key},
                    json=payload,
                )
                if response.status_code != 503 or attempt == 2:
                    response.raise_for_status()
                    break
                await asyncio.sleep(0.5 * (attempt + 1))

        data = response.json()
        parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
        text = ''.join(part.get('text', '') for part in parts).strip()
        if not text:
            raise RuntimeError('Gemini did not return analysis text')
        return text
