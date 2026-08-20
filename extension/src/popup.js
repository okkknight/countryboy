import { POLL_INTERVAL_MS } from './config.js';
import katex from '../vendor/katex/katex.mjs';
import { splitMathSegments } from './math-format.js';

const spinner = document.querySelector('#spinner');
const headline = document.querySelector('#headline');
const subtext = document.querySelector('#subtext');
const result = document.querySelector('#result');
const cancelButton = document.querySelector('#cancelButton');
const restartButton = document.querySelector('#restartButton');

let activeTab = null;
let pollTimer = null;
let currentState = null;

function renderResultText(text) {
  result.replaceChildren();
  const lines = String(text).split('\n');

  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'result-line';

    for (const segment of splitMathSegments(line)) {
      if (segment.type === 'text') {
        row.append(document.createTextNode(segment.value));
        continue;
      }

      const formula = document.createElement('span');
      formula.className = 'math-formula';
      try {
        katex.render(segment.value, formula, { throwOnError: false, strict: 'ignore' });
      } catch {
        formula.textContent = `$${segment.value}$`;
      }
      row.append(formula);
    }
    result.append(row);
  }
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}

function render(state, transientError = null) {
  currentState = state;
  result.hidden = true;
  result.replaceChildren();
  restartButton.hidden = true;
  cancelButton.hidden = true;
  spinner.classList.remove('done');

  if (!state) {
    spinner.classList.add('done');
    headline.textContent = '卷王暂时没接上题';
    subtext.textContent = '关掉再打开，卷王马上到位。';
    return;
  }

  if (state.status === 'processing') {
    headline.textContent = '卷王正在做题…';
    subtext.textContent = transientError ? '卷王打了个盹，正在回来…' : '题目已送达，稍等它开卷';
    cancelButton.hidden = false;
    return;
  }

  spinner.classList.add('done');
  restartButton.hidden = false;

  if (state.status === 'completed') {
    headline.textContent = '这题卷完了';
    subtext.textContent = '';
    result.hidden = false;
    renderResultText(state.result || '卷王写了半天，答题纸却没交上来。');
  } else if (state.status === 'cancelled') {
    headline.textContent = '这题先不卷了';
    subtext.textContent = '缓口气，随时再开一题。';
  } else {
    headline.textContent = '这题卷卡住了';
    subtext.textContent = '卷王正在挠头，点“再做一题”试试。';
  }
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || '插件后台请求失败');
  return response;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || tab.windowId == null) throw new Error('无法获取当前标签页');
  return { id: tab.id, windowId: tab.windowId, url: tab.url || '', title: tab.title || '' };
}

function schedulePoll() {
  stopPolling();
  if (currentState?.status !== 'processing' || !activeTab) return;
  pollTimer = setTimeout(async () => {
    try {
      const response = await send({ type: 'POLL_ANALYSIS', tabId: activeTab.id });
      render(response.state, response.transientError || null);
    } catch (error) {
      render(currentState, error.message);
    }
    schedulePoll();
  }, POLL_INTERVAL_MS);
}

async function boot() {
  try {
    activeTab = await getActiveTab();
    const response = await send({ type: 'GET_OR_START', tab: activeTab });
    render(response.state);
    schedulePoll();
  } catch (error) {
    render(null, error.message);
  }
}

cancelButton.addEventListener('click', async () => {
  if (!activeTab || !currentState) return;
  stopPolling();
  render({ ...currentState, status: 'cancelled', result: null, error: null });
  try {
    const response = await send({ type: 'CANCEL_ANALYSIS', tabId: activeTab.id });
    render(response.state);
  } catch {}
});

restartButton.addEventListener('click', async () => {
  if (!activeTab) return;
  spinner.classList.remove('done');
  headline.textContent = '卷王又坐回来了…';
  subtext.textContent = '再把这题端上来一次';
  restartButton.hidden = true;
  try {
    activeTab = await getActiveTab();
    const response = await send({ type: 'RESTART_ANALYSIS', tab: activeTab });
    render(response.state);
    schedulePoll();
  } catch (error) {
    render(null, error.message);
  }
});

window.addEventListener('unload', stopPolling);
void boot();
