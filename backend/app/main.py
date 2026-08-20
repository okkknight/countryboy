import asyncio
import os
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .analyzers.base import Analyzer
from .analyzers.gemini import GeminiAnalyzer
from .analyzers.mock import MockAnalyzer
from .models import Job
from .store import InMemoryJobStore

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024

load_dotenv()


def job_payload(job: Job) -> dict[str, Any]:
    return {
        'requestId': job.request_id,
        'status': job.status.value,
        'result': job.result,
        'error': job.error,
    }


def create_app(analyzer: Analyzer | None = None, max_image_bytes: int = DEFAULT_MAX_IMAGE_BYTES) -> FastAPI:
    app = FastAPI(title='Page Lens AI Reference Backend', version='0.1.0')
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=False,
        allow_methods=['GET', 'POST'],
        allow_headers=['*'],
    )

    store = InMemoryJobStore()
    tasks: dict[str, asyncio.Task[None]] = {}
    if analyzer is not None:
        active_analyzer = analyzer
    elif api_key := os.getenv('GEMINI_API_KEY'):
        active_analyzer = GeminiAnalyzer(
            api_key=api_key,
            model=os.getenv('GEMINI_MODEL', 'gemini-flash-latest'),
        )
    else:
        active_analyzer = MockAnalyzer(
            delay_seconds=float(os.getenv('MOCK_ANALYZER_DELAY_SECONDS', '1.8'))
        )

    async def run_analysis(
        request_id: str,
        image_bytes: bytes,
        mime_type: str,
        page_url: str,
        page_title: str,
    ) -> None:
        try:
            result = await active_analyzer.analyze(
                image_bytes=image_bytes,
                mime_type=mime_type,
                page_url=page_url,
                page_title=page_title,
            )
            await store.complete(request_id, result)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await store.fail(request_id, str(exc) or exc.__class__.__name__)
        finally:
            tasks.pop(request_id, None)

    @app.get('/health')
    async def health() -> dict[str, str]:
        return {'status': 'ok'}

    @app.post('/api/v1/analyses', status_code=202)
    async def create_analysis(
        request_id: str = Form(...),
        page_url: str = Form(''),
        page_title: str = Form(''),
        image: UploadFile = File(...),
    ) -> dict[str, Any]:
        request_id = request_id.strip()
        if not request_id or len(request_id) > 128:
            raise HTTPException(status_code=400, detail='Invalid request_id')

        existing = await store.get(request_id)
        if existing is not None:
            return job_payload(existing)

        mime_type = image.content_type or ''
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail='Unsupported image type')

        image_bytes = await image.read(max_image_bytes + 1)
        if len(image_bytes) > max_image_bytes:
            raise HTTPException(status_code=413, detail='Image too large')
        if not image_bytes:
            raise HTTPException(status_code=400, detail='Image is empty')

        job, created = await store.create(request_id, page_url, page_title)
        if not created:
            return job_payload(job)

        task = asyncio.create_task(
            run_analysis(request_id, image_bytes, mime_type, page_url, page_title),
            name=f'analysis:{request_id}',
        )
        tasks[request_id] = task
        return job_payload(job)

    @app.get('/api/v1/analyses/{request_id}')
    async def get_analysis(request_id: str) -> dict[str, Any]:
        job = await store.get(request_id)
        if job is None:
            raise HTTPException(status_code=404, detail='Analysis not found')
        return job_payload(job)

    @app.post('/api/v1/analyses/{request_id}/cancel')
    async def cancel_analysis(request_id: str) -> dict[str, Any]:
        job = await store.get(request_id)
        if job is None:
            raise HTTPException(status_code=404, detail='Analysis not found')

        job = await store.cancel(request_id)
        task = tasks.get(request_id)
        if task is not None and not task.done():
            task.cancel()
        return job_payload(job)

    return app


app = create_app()
