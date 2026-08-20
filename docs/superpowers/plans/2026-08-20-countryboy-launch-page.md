# Countryboy Launch Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a humorous, responsive launch page that explains and distributes the unpacked “小镇做题家” Chrome extension.

**Architecture:** The page is a dependency-free static site under `launch-page/`. A shell script packages only the `extension/` directory as a ZIP and another script safely copies page assets plus the ZIP to the existing VPS location; Caddy serves it at `https://boringmax.com/countryboy/` while the API remains isolated under `api.boringmax.com/countryboy`.

**Tech Stack:** Semantic HTML, CSS custom properties, native browser JavaScript, SVG, shell, Caddy, existing VPS systemd/Caddy setup.

**Spec:** `docs/superpowers/specs/2026-08-20-countryboy-launch-page-design.md`

## Global Constraints

- Use a true white background, near-black text, paper-gray rules, red annotation accents, and rainbow only inside the “卷” glyph.
- Use the exact slogan “小镇做题家，看谁先卷死谁。” and the exact primary button text “下载插件 ZIP”.
- Do not claim or simulate one-click, automatic, Chrome Web Store, macOS, or Windows installation.
- The page must not send API calls, include tracking, expose credentials, or package `backend/`, `.env`, `.venv`, caches, or test files.
- The target public route is `https://boringmax.com/countryboy/`; the existing backend remains `https://api.boringmax.com/countryboy`.
- Preserve all existing VPS services and Caddy routes; validate Caddy before reloading.

---

### Task 1: Create the static page structure and visual system

**Files:**
- Create: `launch-page/index.html`
- Create: `launch-page/styles.css`
- Create: `launch-page/assets/juan-mark.svg`
- Create: `launch-page/assets/install-steps.svg`
- Test: `launch-page/tests/page-contract.test.mjs`
- Modify: `launch-page/package.json`

**Interfaces:**
- Consumes: the extension name, slogan, installation rules, visual constraints, and download URL from the design spec.
- Produces: a semantic `index.html` whose `#download`, `#install`, `#how-it-works`, and `#privacy` anchors are consumed by page links; CSS classes `.hero`, `.juan-mark`, `.install-steps`, and `.download-link` used by the page and visual test.

- [ ] **Step 1: Write the failing structural-contract test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('launch page preserves core copy, download link, and install guide', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /小镇做题家，看谁先卷死谁。/);
  assert.match(html, /href="downloads\/countryboy-extension\.zip"/);
  assert.match(html, /chrome:\/\/extensions/);
  assert.match(html, /加载已解压的扩展程序/);
  assert.match(html, /id="install"/);
  assert.doesNotMatch(html, /Chrome Web Store/);
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node --test launch-page/tests/page-contract.test.mjs`

Expected: FAIL because `launch-page/index.html` does not exist.

- [ ] **Step 3: Implement the page and assets**

Create `index.html` with a landmark header, one `h1`, hero download link, product behaviour section, three semantic install steps, privacy boundary section, closing download CTA, and a footer. Include the two SVG assets with ordinary `<img>` elements and `alt` text.

Create `juan-mark.svg` with a transparent canvas, a single large squared “卷” glyph using a rainbow `linearGradient`, dark offset print shadow, and no raster text. Create `install-steps.svg` as three compact black-line pictograms: ZIP + folder, browser address bar, developer-mode toggle + unpacked folder.

Create `styles.css` with explicit tokens and the following core rules:

```css
:root {
  --paper: #fff;
  --ink: #111111;
  --quiet: #6b6b6b;
  --line: #d8d8d8;
  --mark: #e3342f;
  --max: 1180px;
}

body { margin: 0; background: var(--paper); color: var(--ink); }
.page-shell { width: min(var(--max), calc(100% - 48px)); margin-inline: auto; }
.hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .9fr); }
.download-link { background: var(--ink); color: var(--paper); }
@media (max-width: 720px) { .hero { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; } }
```

Add `package.json` with a `test` script: `node --test tests/*.test.mjs`.

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `npm --prefix launch-page test`

Expected: PASS with the page contract test green.

- [ ] **Step 5: Commit**

```bash
git add launch-page/index.html launch-page/styles.css launch-page/assets launch-page/tests/page-contract.test.mjs launch-page/package.json
git commit -m "feat: add countryboy launch page"
```

If this workspace remains outside Git, record that the commit step is unavailable and continue without creating a repository.

### Task 2: Add client-side usability polish and responsive verification

**Files:**
- Create: `launch-page/script.js`
- Modify: `launch-page/index.html`
- Modify: `launch-page/styles.css`
- Test: `launch-page/tests/page-contract.test.mjs`

**Interfaces:**
- Consumes: anchors and `download-link` class from Task 1.
- Produces: a `data-copy-path` button that copies `chrome://extensions` when supported and shows an accessible status in `#copy-status`; page remains usable without JavaScript.

- [ ] **Step 1: Extend the failing test for the progressive enhancement contract**

```js
test('page has a no-JavaScript install path and optional copy helper', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /href="#install"/);
  assert.match(html, /data-copy-path/);
  assert.match(html, /id="copy-status"/);
  assert.match(html, /<noscript>/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix launch-page test`

Expected: FAIL because copy-helper markup is absent.

- [ ] **Step 3: Implement the enhancement**

Add a small button near installation step two:

```html
<button class="copy-path" type="button" data-copy-path="chrome://extensions">
  复制地址
</button>
<p id="copy-status" aria-live="polite"></p>
<noscript><p>请手动在地址栏输入 chrome://extensions。</p></noscript>
```

Implement `script.js` so it calls `navigator.clipboard.writeText(button.dataset.copyPath)`, changes `#copy-status` to “已复制，去 Chrome 地址栏粘贴。” on success, and “复制失败，请手动输入 chrome://extensions。” on failure. Load it with `defer` from `index.html`.

Add visible keyboard focus styles and mobile CSS that keeps the download button and all three steps within the viewport.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm --prefix launch-page test`

Expected: PASS.

- [ ] **Step 5: Visually verify local desktop and mobile views**

Run: `python3 -m http.server 4173 --directory launch-page`

Open: `http://127.0.0.1:4173/` at 1440px and 390px wide. Confirm no horizontal scrolling, the hero CTA appears in the first viewport, the rainbow “卷” remains large, and installation steps stay readable.

- [ ] **Step 6: Commit**

```bash
git add launch-page/index.html launch-page/styles.css launch-page/script.js launch-page/tests/page-contract.test.mjs
git commit -m "feat: polish countryboy install guidance"
```

If this workspace remains outside Git, record that the commit step is unavailable and continue without creating a repository.

### Task 3: Package a safe extension ZIP and verify its contents

**Files:**
- Create: `scripts/package-extension.sh`
- Create: `launch-page/tests/package-contract.sh`
- Create: `launch-page/downloads/.gitkeep`
- Modify: `scripts/verify.sh`

**Interfaces:**
- Consumes: `extension/` directory and `launch-page/downloads/countryboy-extension.zip` output location.
- Produces: `launch-page/downloads/countryboy-extension.zip` with `manifest.json` at the archive root; deployment Task 4 publishes this file.

- [ ] **Step 1: Write the failing package contract test**

```bash
#!/usr/bin/env bash
set -euo pipefail
archive="${1:?archive path is required}"
zipinfo -1 "$archive" | grep -qx 'manifest.json'
if zipinfo -1 "$archive" | grep -Eq '(^|/)(\.env|\.venv|backend|tests)(/|$)'; then
  echo 'archive contains an excluded development or secret path' >&2
  exit 1
fi
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bash launch-page/tests/package-contract.sh launch-page/downloads/countryboy-extension.zip`

Expected: FAIL because the archive does not exist.

- [ ] **Step 3: Implement safe deterministic packaging**

Implement `scripts/package-extension.sh` with an explicit source and output path:

```bash
#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_root/extension"
output_dir="$repo_root/launch-page/downloads"
archive="$output_dir/countryboy-extension.zip"
mkdir -p "$output_dir"
rm -f "$archive"
(cd "$source_dir" && zip -qr "$archive" . -x 'node_modules/*' 'tests/*' '.DS_Store')
bash "$repo_root/launch-page/tests/package-contract.sh" "$archive"
```

Add the packaging command and contract check to `scripts/verify.sh` after existing checks.

- [ ] **Step 4: Run package and full verification**

Run: `./scripts/package-extension.sh && PYTHON_BIN=backend/.venv/bin/python ./scripts/verify.sh`

Expected: archive contract passes; extension tests, manifest check, backend tests, compile check, and package check all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/package-extension.sh scripts/verify.sh launch-page/tests/package-contract.sh launch-page/downloads/.gitkeep
git commit -m "build: package safe extension download"
```

If this workspace remains outside Git, record that the commit step is unavailable and continue without creating a repository.

### Task 4: Deploy static site and ZIP through Caddy

**Files:**
- Create: `deploy/countryboy-launch-page.caddy`
- Create: `scripts/deploy-launch-page.sh`
- Modify: `README.md`

**Interfaces:**
- Consumes: `launch-page/` static files, `launch-page/downloads/countryboy-extension.zip`, SSH identity `/Users/linpeiwen/.ssh/tengxunyun.pem`, and Caddy import file.
- Produces: public page `https://boringmax.com/countryboy/` and public archive `https://boringmax.com/countryboy/downloads/countryboy-extension.zip`.

- [ ] **Step 1: Write the failing deployment configuration contract**

```bash
grep -Fqx 'rewrite /countryboy /countryboy/' deploy/countryboy-launch-page.caddy
grep -Fqx 'root * /opt/boringmax/countryboy/site' deploy/countryboy-launch-page.caddy
grep -Fqx 'file_server' deploy/countryboy-launch-page.caddy
grep -Fqx 'https://boringmax.com/countryboy/' README.md
```

Save this as `launch-page/tests/deploy-contract.sh` and run it before writing the Caddy snippet.

- [ ] **Step 2: Run the deployment configuration test to verify it fails**

Run: `bash launch-page/tests/deploy-contract.sh`

Expected: FAIL because the Caddy snippet and README route documentation are absent.

- [ ] **Step 3: Implement the Caddy snippet and deployment script**

Create `deploy/countryboy-launch-page.caddy`:

```caddyfile
rewrite /countryboy /countryboy/

@countryboyLaunch path /countryboy/*
handle @countryboyLaunch {
	uri strip_prefix /countryboy
	root * /opt/boringmax/countryboy/site
	file_server
}
```

Implement `scripts/deploy-launch-page.sh` to first call `scripts/package-extension.sh`, upload `launch-page/` to `/tmp/countryboy-launch-page/`, then SSH to `ubuntu@43.172.79.177` with the Tencent PEM. On the VPS: copy the existing `/etc/caddy/Caddyfile` to `/etc/caddy/Caddyfile.before-countryboy-launch-page`; install the import file; add exactly one `import /etc/caddy/countryboy-launch-page.caddy` inside the `boringmax.com` block; validate Caddy; `rsync --delete` only from `/tmp/countryboy-launch-page/` to `/opt/boringmax/countryboy/site/`; set ownership to `shipnow:shipnow`; reload Caddy only after validation; and remove the remote temporary directory.

Update `README.md` with the page URL, download URL, and truthful manual-install limitation.

- [ ] **Step 4: Run the configuration test and local verification**

Run: `bash launch-page/tests/deploy-contract.sh && ./scripts/package-extension.sh`

Expected: PASS.

- [ ] **Step 5: Deploy and verify the external paths**

Run: `./scripts/deploy-launch-page.sh`

Then run:

```bash
curl -fsS https://boringmax.com/countryboy/ | grep -F '小镇做题家'
curl -fsS -o /tmp/countryboy-extension.zip https://boringmax.com/countryboy/downloads/countryboy-extension.zip
bash launch-page/tests/package-contract.sh /tmp/countryboy-extension.zip
```

Expected: page returns 200 with the slogan, ZIP downloads, and archive contract passes.

- [ ] **Step 6: Commit**

```bash
git add deploy/countryboy-launch-page.caddy scripts/deploy-launch-page.sh launch-page/tests/deploy-contract.sh README.md
git commit -m "deploy: publish countryboy launch page"
```

If this workspace remains outside Git, record that the commit step is unavailable and continue without creating a repository.

## Plan Self-Review

- Spec coverage: Task 1 covers the layout, brand system, all page sections, title visual, and accessibility baseline. Task 2 covers enhancement and responsive UX. Task 3 guarantees a safe extension-only archive. Task 4 provides Caddy routing, protected deployment mechanics, external verification, and documentation.
- Placeholder scan: no TBD/TODO, vague test step, undefined interface, or unbounded route change remains.
- Interface consistency: every link expects `downloads/countryboy-extension.zip`; Task 3 produces it; Task 4 deploys it; Task 1 consumes it. The static root and URL are identical across tasks.
