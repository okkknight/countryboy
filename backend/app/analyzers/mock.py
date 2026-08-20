import asyncio


class MockAnalyzer:
    def __init__(self, delay_seconds: float = 1.8) -> None:
        self.delay_seconds = delay_seconds

    async def analyze(
        self,
        image_bytes: bytes,
        mime_type: str,
        page_url: str,
        page_title: str,
    ) -> str:
        await asyncio.sleep(self.delay_seconds)
        target = page_title or page_url or '当前页面'
        return (
            f'【Mock AI】已收到并处理“{target}”的截图。\n\n'
            '当前后端使用的是示例分析器，用于验证截图上传、requestId、轮询、取消和结果展示链路。'
            '接入真实视觉模型时，只需要替换 Analyzer 实现，Chrome 插件端不需要修改。'
        )
