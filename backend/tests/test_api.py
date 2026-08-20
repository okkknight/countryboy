import asyncio

import httpx
import pytest

from app.main import create_app


class CountingAnalyzer:
    def __init__(self, delay=0.03):
        self.calls = 0
        self.delay = delay

    async def analyze(self, image_bytes, mime_type, page_url, page_title):
        self.calls += 1
        await asyncio.sleep(self.delay)
        return f'AI understood: {page_title or page_url or "page"}'


@pytest.mark.asyncio
async def test_create_is_idempotent_and_polls_to_completion():
    analyzer = CountingAnalyzer()
    app = create_app(analyzer=analyzer)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        files = {'image': ('screenshot.jpg', b'jpeg-bytes', 'image/jpeg')}
        data = {'request_id': 'req-1', 'page_url': 'https://example.com', 'page_title': 'Example'}
        first = await client.post('/api/v1/analyses', files=files, data=data)
        second = await client.post('/api/v1/analyses', files=files, data=data)
        assert first.status_code == 202
        assert second.status_code == 202
        assert first.json()['requestId'] == 'req-1'
        assert second.json()['requestId'] == 'req-1'

        for _ in range(20):
            polled = await client.get('/api/v1/analyses/req-1')
            if polled.json()['status'] == 'completed':
                break
            await asyncio.sleep(0.01)

        body = polled.json()
        assert body['status'] == 'completed'
        assert body['result'] == 'AI understood: Example'
        assert analyzer.calls == 1


@pytest.mark.asyncio
async def test_missing_job_returns_404():
    app = create_app(analyzer=CountingAnalyzer())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        response = await client.get('/api/v1/analyses/missing')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cancel_marks_processing_job_cancelled():
    app = create_app(analyzer=CountingAnalyzer(delay=1))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        files = {'image': ('screenshot.jpg', b'jpeg-bytes', 'image/jpeg')}
        data = {'request_id': 'req-cancel', 'page_url': '', 'page_title': ''}
        await client.post('/api/v1/analyses', files=files, data=data)
        cancelled = await client.post('/api/v1/analyses/req-cancel/cancel')
        assert cancelled.status_code == 200
        assert cancelled.json()['status'] == 'cancelled'


@pytest.mark.asyncio
async def test_rejects_invalid_image_type_and_large_upload():
    app = create_app(analyzer=CountingAnalyzer(), max_image_bytes=4)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        invalid = await client.post('/api/v1/analyses', files={'image': ('x.txt', b'abc', 'text/plain')}, data={'request_id':'a','page_url':'','page_title':''})
        too_large = await client.post('/api/v1/analyses', files={'image': ('x.jpg', b'12345', 'image/jpeg')}, data={'request_id':'b','page_url':'','page_title':''})
    assert invalid.status_code == 415
    assert too_large.status_code == 413
