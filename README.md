# 小镇做题家

应用代码和自制图标采用 [MIT 许可证](LICENSE)。扩展内打包的 KaTeX 及其字体保留 [上游 MIT 许可证](extension/vendor/katex/LICENSE)。其他第三方依赖遵循各自的许可证。

一个本地加载的 Chrome Manifest V3 扩展 MVP：点击工具栏图标后，截取当前页面**可见区域**，上传到服务器，通过 `requestId` 查询 AI 分析结果，并在插件图标下方的小 popup 中展示。

扩展会把当前可见页面的截图发送至配置的后端。请在使用前确认页面内容适合上传，并检查 `extension/src/config.js` 中的服务地址。

## 已实现

- Chrome 原生 action popup，不向网页注入 UI。
- 点击后自动截图并提交。
- 客户端生成唯一 `requestId`。
- 请求按 Chrome Tab 隔离。
- 同一 Tab + 同一 URL 重复打开 popup 时复用未完成请求，不重复截图/提交。
- popup 打开期间按 `requestId` 轮询；关闭后停止轮询，重新打开后继续。
- “取消当前请求”和“重新分析”。
- 旧请求响应无法覆盖新请求。
- FastAPI 参考后端，支持提交、查询、取消和幂等 `requestId`。
- 默认 Mock AI，不需要任何模型 Key 就能跑完整流程。

## 目录

```text
page-lens-ai/
├── extension/                  # 可直接 Load unpacked 的 Chrome 扩展
├── backend/                    # FastAPI 参考服务
├── docs/CODEX_HANDOFF.md       # 给 Codex 的后续开发说明
├── docs/superpowers/specs/     # 完整设计规格
├── docs/superpowers/plans/     # 实现计划
└── scripts/verify.sh           # 一键验证
```

## 1. 启动参考后端

要求 Python 3.11+。

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python3 -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

浏览器访问 `http://127.0.0.1:8000/health` 应返回：

```json
{"status":"ok"}
```

未配置 Gemini 时，`MockAnalyzer` 会稍等片刻后返回模拟结果，目的是先验证完整插件链路。

## 2. 加载 Chrome 扩展

1. 打开 `chrome://extensions`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序 / Load unpacked”
4. 选择本工程中的 `extension/` 目录
5. 将“小镇做题家”固定到浏览器工具栏
6. 打开任意网页并点击插件图标

正常流程：

```text
点击插件
→ popup 显示“正在理解当前页面…”
→ 截取当前可见区域
→ POST /api/v1/analyses
→ popup 按 requestId 轮询
→ 原地显示结果
```

## 下载与安装页面

公开介绍、下载和安装引导位于：

https://boringmax.com/countryboy/

也可以从 [Chrome 网上应用店](https://chromewebstore.google.com/detail/oaklibljpcpnkbhoegfjingcdebjkkjp)安装。

上述介绍页面还提供 ZIP 下载和三步“加载已解压的扩展程序”说明。选择 ZIP 安装时，需在 `chrome://extensions` 手动开启开发者模式并选择解压后的文件夹。

## 3. 换成你的服务器

需要同时修改两处：

- `extension/src/config.js` 中的 `SERVER_ORIGIN`
- `extension/manifest.json` 中的 `host_permissions`

当前部署地址为 `https://api.boringmax.com/countryboy`。更换服务器时，需要同时修改两处为新的 HTTPS 地址，然后在 `chrome://extensions` 点击扩展的刷新按钮。

生产环境应使用 HTTPS，并增加服务端认证。不要把 AI 模型 API Key 写进扩展代码。

## 4. 使用 Gemini

复制 `backend/.env.example` 为 `backend/.env`，并设置：

```dotenv
GEMINI_API_KEY=你的密钥
GEMINI_MODEL=gemini-flash-latest
```

服务启动时会自动选择 Gemini。密钥仅保存在后端的本地 `.env`；不要写入扩展代码、前端配置或提交到 Git。

## 5. 接入其他真实 AI

后端 HTTP 契约已经和 AI Provider 解耦。实现：

```python
async def analyze(image_bytes, mime_type, page_url, page_title) -> str:
    ...
```

然后在 `backend/app/main.py` 的 `create_app()` 中注入新的 Analyzer 即可。插件无需修改。

具体接手说明见 [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md)。

## 6. 验证

```bash
./scripts/verify.sh
```

分别也可以运行：

```bash
npm --prefix extension test
cd backend && PYTHONPATH=. python3 -m pytest -q
```

## 当前刻意保留的限制

这是 MVP，不是生产后端：

- 只截当前可见区域，不做整页长截图。
- 不读取 DOM。
- 后端 Job 只存在内存，重启即丢失。
- 后端参考实现只适合单进程运行。
- 没有账号、鉴权、历史记录和队列。
- MockAnalyzer 不真正理解图片。
