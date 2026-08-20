# 小镇做题家 — Codex 接手设计文档

## 1. 项目目标

不要把它扩展成一个复杂的浏览器 Agent。当前产品只做一件事：

> 用户主动点击 Chrome 工具栏图标，插件截取当前可见页面，服务器理解截图，插件在图标下方的轻量 popup 中展示结果。

保持交互轻、权限少、代码边界清楚。

## 2. 已确定且不要轻易改动的产品规则

1. UI 使用 Chrome `action.default_popup`，不要改成网页中央 Modal、content script 浮窗或 sidebar。
2. 截图只使用 `chrome.tabs.captureVisibleTab()`，第一版不要做长截图。
3. 每次真正的新分析都由插件生成新的 UUID `requestId`。
4. 状态按 `tabId` 隔离；同 URL 的两个 Tab 仍是两个不同请求。
5. 同一 Tab、同一 URL 已有状态时，重新点击插件只恢复这个状态，不自动重复提交。
6. `processing` 状态时 popup 每 1500ms 查询一次；popup 一关闭就停止轮询。
7. 重新打开 popup 后继续查询原来的 `requestId`。
8. processing 状态必须有“取消当前请求”。取消在客户端立即生效，服务端取消属于 best effort。
9. cancelled / failed / completed 状态提供“重新分析”。重新分析重新截图并产生新 UUID。
10. 任何服务端响应只有在 `response.requestId === currentState.requestId` 时才能更新当前 Tab，防止旧请求覆盖新请求。
11. 不把模型 Key、服务器私钥等秘密放进扩展。

## 3. Chrome 端结构

### `extension/src/request-state.js`

纯函数状态机。这里是请求隔离逻辑的核心，修改时先改测试。

关键函数：

- `makeInitialState()`
- `shouldStartNewRequest()`
- `applyRemoteStatus()`
- `markCancelled()`
- `markFailed()`

### `extension/src/background.js`

唯一负责以下副作用：

- `chrome.storage.session`
- 截图
- HTTP 提交 / 查询 / 取消
- request state 更新
- Tab 关闭清理

不要把后台请求重新搬回 popup；popup 随时可能被销毁。

### `extension/src/popup.js`

只负责 UI 生命周期：

- 获取 active tab
- `GET_OR_START`
- rendering
- popup 存活期间 `POLL_ANALYSIS`
- cancel / restart

服务端文本必须继续用 `textContent`，不要改为不受控的 `innerHTML`。

### `extension/src/server-api.js`

服务器 HTTP Client。后续增加认证 Header、API 版本或错误码映射，优先只改这里。

### `extension/src/config.js`

目前：

```js
SERVER_ORIGIN = 'http://127.0.0.1:8000'
POLL_INTERVAL_MS = 1500
CAPTURE_QUALITY = 82
```

修改服务器域名时必须同步修改 `manifest.json > host_permissions`。

## 4. 当前 HTTP 契约

### 创建分析

`POST /api/v1/analyses`

`multipart/form-data`：

```text
request_id
page_url
page_title
image
```

`request_id` 是幂等键。相同 ID 再 POST，服务器返回现有 Job，不再次调用 AI。

### 查询

`GET /api/v1/analyses/{requestId}`

```json
{
  "requestId": "...",
  "status": "processing | completed | failed | cancelled",
  "result": null,
  "error": null
}
```

### 取消

`POST /api/v1/analyses/{requestId}/cancel`

取消必须幂等。

## 5. AI Provider 接入点

接口位于：

`backend/app/analyzers/base.py`

```python
class Analyzer(Protocol):
    async def analyze(
        self,
        image_bytes: bytes,
        mime_type: str,
        page_url: str,
        page_title: str,
    ) -> str:
        ...
```

当前在未配置 `GEMINI_API_KEY` 时使用 `MockAnalyzer`；配置后使用 `GeminiAnalyzer`，模型名可由 `GEMINI_MODEL` 覆盖（默认 `gemini-flash-latest`）。密钥只允许存在于后端的本地 `.env`。

接真实 AI 时，新建类似：

```text
backend/app/analyzers/company_ai.py
```

实现同一个接口即可。**不要让具体模型 SDK 泄漏到路由、Job Store 或 Chrome 插件层。**

如果公司已有 AI HTTP 服务，Analyzer 最好只是一个薄适配器：接收图片 bytes → 调公司接口 → 返回最终文本。

## 6. 后端当前为什么只是参考实现

当前 FastAPI 使用：

```text
InMemoryJobStore
+
asyncio.Task
```

它非常适合本地开发，但以下情况必须升级：

- 多个后端实例
- 进程重启后仍需继续查询旧 requestId
- AI 任务持续数分钟
- 请求量增加
- 需要可靠取消 / 重试 / 超时

推荐升级边界：

```text
Chrome Extension
      ↓
HTTP API
      ↓
Durable Job Store (Redis/DB)
      ↓
Queue / Worker
      ↓
AI Provider
```

升级时不要改变 Chrome 端 API 契约，尽量只替换服务端内部实现。

## 7. 建议 Codex 后续工作的顺序

### 第一优先级：接入真实 AI

只新增 Analyzer，并保留 MockAnalyzer 作为本地测试实现。

验收：点击真实网页后，popup 能返回模型对截图的理解。

### 第二优先级：服务端认证

最简单可以给插件一个用户级 token，在 `server-api.js` 中加 Header；服务端验证。朋友数量少时不必一开始做账号体系。

注意：扩展里的 token 可以被本机用户读取，所以它只能用于识别/限流，不能被当作真正不可泄露的服务器 secret。

### 第三优先级：可靠 Job 基础设施

只有真实使用后确实遇到重启丢任务、多进程或排队需求，再把内存 Job 替换掉。

### 暂时不要做

- DOM 抽取
- 自动点击网页
- 长截图
- 历史会话中心
- 用户系统
- Web Store 上架适配
- “万能浏览器 Agent”能力

这些都会明显扩大 MVP 范围。

## 8. 测试要求

修改请求状态逻辑前先运行：

```bash
npm --prefix extension test
```

必须继续覆盖：

- 同页状态复用
- 换页 / force 产生新请求
- stale request response 被拒绝
- cancellation

后端：

```bash
cd backend
PYTHONPATH=. python3 -m pytest -q
```

必须继续覆盖：

- requestId 幂等
- 查询完成
- 404
- cancel
- 图片 MIME / 大小限制

总验证：

```bash
./scripts/verify.sh
```

## 9. Chrome API 依据

实现基于 Manifest V3 官方 API：

- Action popup: https://developer.chrome.com/docs/extensions/reference/api/action
- `activeTab`: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- `captureVisibleTab`: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Cross-origin requests / `host_permissions`: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests

尤其不要把长期状态改回 Service Worker 全局变量；MV3 Service Worker 会休眠，状态应继续放在 `chrome.storage.session` 或其他持久层。
