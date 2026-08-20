# 小镇做题家 · 项目上下文

> 本文件是项目当前状态的事实源。续接工作前先读这里；变更完成后同步更新，并在 `docs/handoff/CHANGELOG.md` 追加记录。

## 产品定位

“小镇做题家”是一个 Chrome 扩展：用户主动点击浏览器工具栏图标后，扩展截取当前可见题目并交给后端做题，返回题目转写、题型、参考答案与简短解析。产品文案和交互保持“卷王做题”式戏谑风格，但不虚构识别结果；题目或选项不完整时应明确提示用户补全截图。

它不是网页自动答题器，不读取后台页面，也不代替用户判断答案。

## 当前状态（2026-08-20）

- 扩展：Chrome MV3，当前工作版本 `0.1.1`。
- 后端：FastAPI 服务已部署，接口地址为 `https://api.boringmax.com/countryboy`。
- 官网：落地页及隐私页已上线：`https://boringmax.com/countryboy/`、`https://boringmax.com/countryboy/privacy.html`。
- 商店：Chrome Web Store 首次版本已提交审核；选择了审核通过后不自动发布，审核通过后需在 30 天内手动发布。
- 当前本地分支：`feat/launch-page-and-math-rendering`。工作区仍有未提交的扩展、落地页、商店素材及文档变更；不要在未核对 diff 前直接提交或覆盖。

## 架构与数据路径

`工具栏点击` → `activeTab` 截取可见区域 → `POST /analyze` → 内存任务队列 → Gemini `generateContent` → 前端轮询任务状态 → Popup 渲染 Markdown 与 KaTeX 数学公式。

- 扩展仅申请 `activeTab`、`storage` 与后端 API host 权限。
- 后端在环境变量存在 `GEMINI_API_KEY` 时启用 Gemini；默认模型别名为 `gemini-flash-latest`，缺失密钥时才使用 Mock。
- 图片、当前页面标题与 URL 会在用户发起做题时经 HTTPS 发送至后端，再由后端发送到 Gemini；任务只存内存，不落业务数据库。
- 当前后端对可重试的上游/传输错误有退避重试；单次上游请求超时为 45 秒。

## 关键入口

| 范围 | 入口 |
| --- | --- |
| Popup 与做题流程 | `extension/src/popup.js`、`extension/popup.css` |
| Markdown/公式渲染 | `extension/src/markdown-format.js`、`extension/src/math-format.js` |
| 扩展权限与版本 | `extension/manifest.json` |
| API 与任务编排 | `backend/app/main.py` |
| Gemini 提示词与重试 | `backend/app/analyzers/gemini.py` |
| 打包与全量检查 | `scripts/package-extension.sh`、`scripts/verify.sh` |
| 官网与隐私页 | `launch-page/index.html`、`launch-page/privacy.html`、`launch-page/styles.css` |
| 商店提交说明 | `docs/CHROME_WEB_STORE_SUBMISSION.md` |

## 已验证边界

- `extension`: `npm test` 通过（11 项）。
- `backend`: `PYTHONPATH=. ./.venv/bin/python -m pytest -q` 通过（9 项）。
- `launch-page`: `npm test` 通过（7 项）。
- 最新下载包由 `scripts/package-extension.sh` 生成并已在线校验可下载。
- 上述验证证明代码、打包和静态页面边界；不替代真实用户在不同网页、网络与题型下的体验验收。

## 运行与部署

- VPS：腾讯云，服务由 `countryboy.service` 运行；对外入口由 Caddy 提供。
- 发布官网前先审计目标目录和差异。`scripts/deploy-launch-page.sh` 会清理临时目录并使用 `rsync --delete`，仅可在确认目标范围后使用。
- 后端密钥只保存在服务器与本地的 `backend/.env` 中，变量名为 `GEMINI_API_KEY`；不得提交、打包、截图或写入交接文档。
- 上游模型使用浮动别名，实际可用版本和延迟可能随供应商变动。排查线上性能时先查服务日志和实际模型响应，而不是只看本地配置。

## 未决事项与风险

1. Chrome Web Store 正在审核中；通过后由用户决定何时手动发布。
2. 答题速度优化尚未实施。后续应先采样端到端耗时，再评估轮询间隔、图片尺寸、默认回答长度、HTTP 连接复用及固定/替换模型的影响。
3. 后端任务在内存中，进程重启会丢失进行中的任务；当前 CORS 为宽松配置且接口未加用户鉴权。若开放规模扩大，应单独设计队列、限流、鉴权与审计，不要在小改动中悄悄引入。
4. `README.md` 与 `docs/CODEX_HANDOFF.md` 含早期 MVP 描述和过时运行信息；将其视为历史背景，本文件优先。
5. 任何涉及截图内容、存储、第三方传输或权限的改动，必须同时复核隐私页和 Chrome Web Store 数据披露。

## 续接规则

- 先阅读本文件、检查 `git status -sb` 与当前 diff，再决定是否修改。
- 只在用户主动触发时截图；保持“题不全不强答”的产品边界。
- 修改扩展后运行对应测试并重新打包；若将新包公开下载，再核验线上 ZIP。
- 提交或推送前确认分支、远端、ahead/behind 与待提交文件范围；保留无关本地改动。
