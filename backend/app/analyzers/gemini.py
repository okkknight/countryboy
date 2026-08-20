import asyncio
import base64

import httpx


RETRIABLE_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 5

DEFAULT_PROMPT = (
    '你是一名严谨的做题助手。只依据截图中清晰可辨的内容识别题目，'
    '题型可能是选择题、判断题、填空题、简答题或计算题。\n\n'
    '先判断截图是否包含完整且清晰可辨的题目，以及作答所需信息是否齐全。'
    '题干、选项、图表、公式、条件、单位、问法或答案要求只要有一项被截断、'
    '模糊或缺失，就不要作答、不要猜测、不要补全。此时必须且只能按以下格式返回：\n'
    '无法作答：<简短说明缺失或看不清的关键内容>\n'
    '建议：<明确说明需要补截或拍清的区域，例如“请补全题干下半部分和全部选项”>\n\n'
    '只有题目完整、作答条件充分且答案可可靠核对时，才作答。\n\n'
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
            for attempt in range(MAX_ATTEMPTS):
                try:
                    response = await client.post(
                        endpoint,
                        headers={'x-goog-api-key': self.api_key},
                        json=payload,
                    )
                except httpx.TransportError:
                    if attempt == MAX_ATTEMPTS - 1:
                        raise
                    await asyncio.sleep(min(2 ** attempt, 8))
                    continue

                if response.status_code not in RETRIABLE_STATUS_CODES or attempt == MAX_ATTEMPTS - 1:
                    response.raise_for_status()
                    break
                await asyncio.sleep(min(2 ** attempt, 8))

        data = response.json()
        parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
        text = ''.join(part.get('text', '') for part in parts).strip()
        if not text:
            raise RuntimeError('Gemini did not return analysis text')
        return text
