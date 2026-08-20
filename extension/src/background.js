import { CAPTURE_QUALITY } from './config.js';
import { cancelAnalysis, getAnalysis, submitAnalysis } from './server-api.js';
import {
  applyRemoteStatus,
  makeInitialState,
  markCancelled,
  markFailed,
  shouldClearStateForNavigation,
  shouldStartNewRequest,
} from './request-state.js';

const keyForTab = (tabId) => `analysis:${tabId}`;

async function getState(tabId) {
  const key = keyForTab(tabId);
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
}

async function setState(tabId, state) {
  await chrome.storage.session.set({ [keyForTab(tabId)]: state });
  return state;
}

async function clearState(tabId) {
  await chrome.storage.session.remove(keyForTab(tabId));
}

async function captureTab(tabId, windowId) {
  const [activeTab] = await chrome.tabs.query({ active: true, windowId });
  if (!activeTab || activeTab.id !== tabId) {
    throw new Error('当前标签页已切换，请重新打开插件。');
  }
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: 'jpeg',
    quality: CAPTURE_QUALITY,
  });
  const response = await fetch(dataUrl);
  return response.blob();
}

async function cancelRemoteBestEffort(requestId) {
  if (!requestId) return;
  try {
    await cancelAnalysis(requestId);
  } catch {
    // Local state remains authoritative.
  }
}

async function startOrReuse(tab, force = false) {
  const existing = await getState(tab.id);
  if (!shouldStartNewRequest(existing, tab.url, force)) {
    return existing;
  }

  if (existing?.requestId) {
    await cancelRemoteBestEffort(existing.requestId);
  }

  const initial = makeInitialState({
    tabId: tab.id,
    pageUrl: tab.url,
    pageTitle: tab.title,
    requestId: crypto.randomUUID(),
  });
  await setState(tab.id, initial);

  try {
    const imageBlob = await captureTab(tab.id, tab.windowId);
    const remote = await submitAnalysis({
      requestId: initial.requestId,
      imageBlob,
      pageUrl: tab.url,
      pageTitle: tab.title,
    });
    const current = await getState(tab.id);
    const next = applyRemoteStatus(current, remote);
    if (next) await setState(tab.id, next);
    return next;
  } catch (error) {
    const current = await getState(tab.id);
    if (!current || current.requestId !== initial.requestId) return current;
    const failed = markFailed(current, error?.message || '请求失败，请重试。');
    await setState(tab.id, failed);
    return failed;
  }
}

async function poll(tabId) {
  const current = await getState(tabId);
  if (!current || current.status !== 'processing') return { state: current };

  try {
    const remote = await getAnalysis(current.requestId);
    const latest = await getState(tabId);
    const next = applyRemoteStatus(latest, remote);
    if (next) await setState(tabId, next);
    return { state: next };
  } catch (error) {
    return {
      state: current,
      transientError: error?.message || '暂时无法连接服务器，正在重试。',
    };
  }
}

async function cancel(tabId) {
  const current = await getState(tabId);
  if (!current) return null;
  const cancelled = markCancelled(current);
  await setState(tabId, cancelled);
  await cancelRemoteBestEffort(current.requestId);
  return cancelled;
}

async function handleMessage(message) {
  switch (message?.type) {
    case 'GET_OR_START':
      return { state: await startOrReuse(message.tab, false) };
    case 'RESTART_ANALYSIS':
      return { state: await startOrReuse(message.tab, true) };
    case 'POLL_ANALYSIS':
      return poll(message.tabId);
    case 'CANCEL_ANALYSIS':
      return { state: await cancel(message.tabId) };
    default:
      throw new Error('Unknown message type');
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || 'Unknown error' }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const state = await getState(tabId);
    if (state?.status === 'processing') await cancelRemoteBestEffort(state.requestId);
    await clearState(tabId);
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  void (async () => {
    const state = await getState(tabId);
    if (!shouldClearStateForNavigation(state, changeInfo.url)) return;
    if (state.status === 'processing') await cancelRemoteBestEffort(state.requestId);
    await clearState(tabId);
  })();
});
