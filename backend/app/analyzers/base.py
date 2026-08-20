from typing import Protocol


class Analyzer(Protocol):
    async def analyze(
        self,
        image_bytes: bytes,
        mime_type: str,
        page_url: str,
        page_title: str,
    ) -> str:
        ...
