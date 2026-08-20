from dataclasses import dataclass
from enum import Enum
from typing import Optional


class JobStatus(str, Enum):
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'


@dataclass(slots=True)
class Job:
    request_id: str
    page_url: str
    page_title: str
    status: JobStatus = JobStatus.PROCESSING
    result: Optional[str] = None
    error: Optional[str] = None
