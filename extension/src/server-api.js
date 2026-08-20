import { SERVER_ORIGIN } from './config.js';

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        detail = body.detail || body.error || detail;
      } catch {}
      throw new Error(detail);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function submitAnalysis({ requestId, imageBlob, pageUrl, pageTitle }) {
  const form = new FormData();
  form.append('request_id', requestId);
  form.append('page_url', pageUrl || '');
  form.append('page_title', pageTitle || '');
  form.append('image', imageBlob, 'screenshot.jpg');

  return fetchWithTimeout(`${SERVER_ORIGIN}/api/v1/analyses`, {
    method: 'POST',
    body: form,
  }, 15000);
}

export function getAnalysis(requestId) {
  return fetchWithTimeout(`${SERVER_ORIGIN}/api/v1/analyses/${encodeURIComponent(requestId)}`, {}, 8000);
}

export function cancelAnalysis(requestId) {
  return fetchWithTimeout(`${SERVER_ORIGIN}/api/v1/analyses/${encodeURIComponent(requestId)}/cancel`, {
    method: 'POST',
  }, 3000);
}
