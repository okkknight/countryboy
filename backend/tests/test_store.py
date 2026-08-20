import pytest

from app.models import JobStatus
from app.store import InMemoryJobStore


@pytest.mark.asyncio
async def test_store_create_is_idempotent():
    store = InMemoryJobStore()
    first, created_first = await store.create('req-1', 'https://example.com', 'Example')
    second, created_second = await store.create('req-1', 'https://other.example', 'Other')

    assert created_first is True
    assert created_second is False
    assert second is first
    assert second.page_url == 'https://example.com'


@pytest.mark.asyncio
async def test_store_complete_and_cancel_are_terminal():
    store = InMemoryJobStore()
    job, _ = await store.create('req-2', '', '')
    await store.complete('req-2', 'done')
    assert job.status is JobStatus.COMPLETED
    assert job.result == 'done'

    same = await store.cancel('req-2')
    assert same.status is JobStatus.COMPLETED
