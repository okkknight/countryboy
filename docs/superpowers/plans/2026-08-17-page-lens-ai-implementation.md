# Page Lens AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Produce a runnable local Chrome extension and a runnable FastAPI reference backend implementing per-tab request IDs, polling, cancellation, and reanalysis for 小镇做题家.

**Architecture:** The Manifest V3 extension keeps durable per-tab request metadata in `chrome.storage.session`, while the popup only polls during the time it is visible. A FastAPI reference server accepts client-generated UUIDs as idempotency keys and runs a replaceable analyzer asynchronously in a single process.

**Tech Stack:** Chrome Extensions Manifest V3, vanilla HTML/CSS/JavaScript, Node 20 built-in test runner, Python 3.11+, FastAPI, pytest.

## Global Constraints

- Capture only the visible tab viewport.
- No content script and no DOM extraction.
- Same tab + same URL reuses the current request unless the user explicitly chooses reanalysis.
- Different tabs/pages use independent request IDs.
- Old request results must never overwrite a newer request.
- Popup polling exists only while the popup is open.
- Cancellation is locally authoritative and server cancellation is best effort.
- Backend AI provider remains pluggable; the package must run without a model key via a mock analyzer.

---

### Task 1: Extension request-state core

**Files:**
- Create: `extension/src/request-state.js`
- Create: `extension/tests/request-state.test.js`
- Create: `extension/package.json`

**Interfaces:**
- Produces: `makeInitialState`, `shouldStartNewRequest`, `applyRemoteStatus`, `markCancelled`.

- [x] Write failing Node tests covering same-page reuse, forced/new-page restart, stale-response rejection, and cancellation.
- [x] Run `npm test` from `extension/` and confirm failure because the module does not exist.
- [x] Implement the minimum pure state helpers.
- [x] Run `npm test` and confirm all state tests pass.

### Task 2: Extension service worker and API client

**Files:**
- Create: `extension/src/config.js`
- Create: `extension/src/server-api.js`
- Create: `extension/src/background.js`
- Create: `extension/manifest.json`

**Interfaces:**
- Consumes: request-state helpers from Task 1.
- Produces runtime messages: `GET_OR_START`, `POLL_ANALYSIS`, `CANCEL_ANALYSIS`, `RESTART_ANALYSIS`.

- [x] Implement per-tab `chrome.storage.session` state helpers.
- [x] Implement active-tab verification and JPEG `captureVisibleTab` capture.
- [x] Implement multipart job submission, GET polling, and cancel API calls.
- [x] Reject stale remote responses whose request IDs do not match current tab state.
- [x] Best-effort cancel and clear tab state on URL navigation or tab close.
- [x] Run JavaScript syntax checks and manifest JSON parse verification.

### Task 3: Popup UI

**Files:**
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Create: `extension/src/popup.js`
- Create: `extension/icons/*.png`

**Interfaces:**
- Consumes background runtime messages from Task 2.

- [x] Render compact loading, completed, failed, and cancelled states.
- [x] Automatically invoke `GET_OR_START` on popup open.
- [x] Poll every configured interval only while status is `processing` and popup remains open.
- [x] Wire cancel and reanalysis actions.
- [x] Use `textContent` for all server-returned content.
- [x] Run syntax checks and validate icon files exist.

### Task 4: Backend job model and analyzer contract

**Files:**
- Create: `backend/app/models.py`
- Create: `backend/app/store.py`
- Create: `backend/app/analyzers/base.py`
- Create: `backend/app/analyzers/mock.py`
- Create: `backend/tests/test_store.py`

**Interfaces:**
- Produces `Job`, `JobStatus`, `InMemoryJobStore`, and async `Analyzer.analyze(...)`.

- [x] Write failing pytest tests for creating, retrieving, updating, and idempotently cancelling jobs.
- [x] Run the tests and confirm they fail because implementation modules are missing.
- [x] Implement the smallest in-memory job/store model and analyzer protocol.
- [x] Run store tests and confirm pass.

### Task 5: FastAPI HTTP contract

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/tests/test_api.py`
- Create: `backend/requirements.txt`

**Interfaces:**
- Produces `POST /api/v1/analyses`, `GET /api/v1/analyses/{id}`, `POST /api/v1/analyses/{id}/cancel`, and `GET /health`.

- [x] Write failing API tests for create, idempotent duplicate create, polling to completion, missing ID, and cancellation.
- [x] Run tests and confirm expected failures.
- [x] Implement the API using a single-process async task registry and configurable analyzer.
- [x] Validate image MIME type and enforce an 8 MiB upload limit.
- [x] Run all backend tests.

### Task 6: Handoff documentation and package verification

**Files:**
- Create: `README.md`
- Create: `docs/CODEX_HANDOFF.md`
- Create: `backend/.env.example`

**Interfaces:**
- Documents how to run, load, configure, and extend the package.

- [x] Document local backend setup and Chrome `Load unpacked` flow.
- [x] Document the exact API contract and the intended AI-provider extension point for Codex.
- [x] Document production gaps: durable job store, queue, auth, HTTPS, request limits, observability.
- [x] Run extension tests, backend tests, syntax checks, and JSON validation from a clean shell.
- [x] Create a ZIP archive excluding `.git`, caches, and virtual environments.
