# 小镇做题家 · Chrome Web Store 上架包

发布版本：`0.1.1`

上传文件：`launch-page/downloads/countryboy-extension.zip`

## Store Listing

- 名称：小镇做题家
- 简短说明：截图识题，给出解题思路和参考答案。
- 分类：Education
- 语言：中文（简体）
- 首页：https://boringmax.com/countryboy/
- 隐私政策：https://boringmax.com/countryboy/privacy.html
- 支持页：https://boringmax.com/countryboy/

详细说明：

> 把题目截进来，参考答案和解析端上来。
>
> 小镇做题家是一个截图做题的小工具：点一下浏览器工具栏图标，把当前题目交给卷王。
>
> 支持选择题、判断题、填空题、简答题和计算题，给出题目转写、题型、参考答案与简短解析。
>
> 支持常见数学公式展示。结果仅供学习和核对，请自行判断与使用。

## Privacy tab

单一用途：

> 在用户主动点击扩展后，截取当前网页可见区域，识别其中的题目并返回参考答案、解析或补截图建议。

权限说明：

- `activeTab`：只在用户点击扩展图标时，获取当前标签页的可见截图以及该页面的标题、地址，完成本次题目识别。
- `storage`：在当前浏览器会话内保存本次请求的状态与结果，保证关闭再打开弹窗时不会重复提交同一题目。
- `https://api.boringmax.com/countryboy/*`：把用户主动提交的截图、标题和地址发送到题目识别服务，并轮询本次解题结果。

远程代码：选择“否，不使用远程代码”。KaTeX 与所有扩展脚本都随 ZIP 提交；扩展仅调用 API，不下载或执行远程 JavaScript。

数据披露：如控制台字段可选，请如实勾选“网站内容”和“网页浏览活动”。说明为：

> 仅在用户点击扩展后处理当前可见截图、页面标题和地址，用于生成该题目的参考答案、解析或补截图建议。数据通过 HTTPS 发送至我们的服务，并为提供题目识别功能传给 Google Gemini API。不会出售数据、投放广告、建立用户画像或安排人工查看。

同时完成 Limited Use 认证；公开隐私政策必须填写为上方 URL。

## Review instructions

> 1. 安装扩展后，打开任意包含清晰、完整题目的网页或图片。
> 2. 点击工具栏中的“小镇做题家”图标。
> 3. 扩展只会截图当前可见区域，并在弹窗中显示题目转写、题型、参考答案和解析；若题目被截断或看不清，会返回补截图建议。
> 4. 不需要账号、密码或测试凭据。

## Dashboard checklist

- [ ] Chrome Web Store 开发者账号已登记，发布者名称和联系邮箱已验证。
- [ ] 上传本仓库生成的 ZIP，而不是 `extension/` 文件夹。
- [ ] 填入本文件的 Store Listing 和 Privacy 内容。
- [ ] 上传 128×128 店铺图标：`store-assets/store-icon-128.png`。
- [ ] 上传产品截图：`store-assets/store-screenshot-1280x800.png`（1280×800，使用示例题目，不含真实个人信息）。
- [ ] 上传 440×280 小推广图：`store-assets/promo-small-440x280.png`。
- [ ] 如需 marquee 图，使用 `store-assets/marquee-1400x560.png`（1400×560）。
- [ ] Distribution 选择 Public 或先选 Private / trusted testers 进行小范围测试。
- [ ] 提交 Review 时选择 Deferred publishing，审核通过后再手动公开。

## 当前不可替代的人工步骤

开发者账号的注册、身份/邮箱验证、任何一次性注册费用支付、上传到 Dashboard 和最终“Submit for review”均需要由账号所有者在 Google 页面完成。
