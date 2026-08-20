import json

import httpx
import pytest

import app.analyzers as analyzers


@pytest.mark.asyncio
async def test_gemini_analyzer_sends_screenshot_and_returns_text():
    assert hasattr(analyzers, 'GeminiAnalyzer')
    captured: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured['url'] = str(request.url)
        captured['api_key'] = request.headers['x-goog-api-key']
        captured['payload'] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                'candidates': [
                    {'content': {'parts': [{'text': '这是页面内容的摘要。'}]}},
                ]
            },
        )

    analyzer = analyzers.GeminiAnalyzer(
        api_key='test-key',
        model='gemini-test-model',
        transport=httpx.MockTransport(handler),
    )

    result = await analyzer.analyze(
        image_bytes=b'jpeg-bytes',
        mime_type='image/jpeg',
        page_url='https://example.com/page',
        page_title='Example page',
    )

    assert result == '这是页面内容的摘要。'
    assert captured['url'] == (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        'gemini-test-model:generateContent'
    )
    assert captured['api_key'] == 'test-key'
    assert captured['payload'] == {
        'contents': [{
            'parts': [
                {
                    'inline_data': {
                        'mime_type': 'image/jpeg',
                        'data': 'anBlZy1ieXRlcw==',
                    }
                },
                {
                    'text': (
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
                        '遇到多题时逐题编号；不确定的题目按兜底提示处理，不要混入猜测。\n\n'
                        '页面标题：Example page\n页面地址：https://example.com/page'
                    )
                },
            ]
        }]
    }


@pytest.mark.asyncio
async def test_gemini_analyzer_retries_a_transient_service_unavailable_response():
    attempts = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503, json={'error': {'message': 'Service Unavailable'}})
        return httpx.Response(
            200,
            json={'candidates': [{'content': {'parts': [{'text': '重试后拿到答案'}]}}]},
        )

    analyzer = analyzers.GeminiAnalyzer(
        api_key='test-key',
        transport=httpx.MockTransport(handler),
    )

    result = await analyzer.analyze(
        image_bytes=b'jpeg-bytes',
        mime_type='image/jpeg',
        page_url='',
        page_title='',
    )

    assert result == '重试后拿到答案'
    assert attempts == 2
