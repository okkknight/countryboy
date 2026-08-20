import asyncio
from typing import Optional

from .models import Job, JobStatus


class InMemoryJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create(self, request_id: str, page_url: str, page_title: str) -> tuple[Job, bool]:
        async with self._lock:
            existing = self._jobs.get(request_id)
            if existing is not None:
                return existing, False
            job = Job(request_id=request_id, page_url=page_url, page_title=page_title)
            self._jobs[request_id] = job
            return job, True

    async def get(self, request_id: str) -> Optional[Job]:
        async with self._lock:
            return self._jobs.get(request_id)

    async def complete(self, request_id: str, result: str) -> Optional[Job]:
        async with self._lock:
            job = self._jobs.get(request_id)
            if job is not None and job.status is JobStatus.PROCESSING:
                job.status = JobStatus.COMPLETED
                job.result = result
                job.error = None
            return job

    async def fail(self, request_id: str, error: str) -> Optional[Job]:
        async with self._lock:
            job = self._jobs.get(request_id)
            if job is not None and job.status is JobStatus.PROCESSING:
                job.status = JobStatus.FAILED
                job.error = error
                job.result = None
            return job

    async def cancel(self, request_id: str) -> Optional[Job]:
        async with self._lock:
            job = self._jobs.get(request_id)
            if job is not None and job.status is JobStatus.PROCESSING:
                job.status = JobStatus.CANCELLED
                job.result = None
                job.error = None
            return job
