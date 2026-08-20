export const REQUEST_STATUS = Object.freeze({
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

export function makeInitialState({ tabId, pageUrl, pageTitle, requestId, now = Date.now() }) {
  return {
    tabId,
    pageUrl,
    pageTitle: pageTitle || '',
    requestId,
    status: REQUEST_STATUS.PROCESSING,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function shouldStartNewRequest(existingState, currentPageUrl, force = false) {
  if (force || !existingState) return true;
  return existingState.pageUrl !== currentPageUrl;
}

export function shouldClearStateForNavigation(existingState, nextPageUrl) {
  return Boolean(existingState && nextPageUrl && existingState.pageUrl !== nextPageUrl);
}

export function applyRemoteStatus(currentState, remoteStatus, now = Date.now()) {
  if (!currentState || !remoteStatus || remoteStatus.requestId !== currentState.requestId) {
    return currentState;
  }

  return {
    ...currentState,
    status: remoteStatus.status,
    result: remoteStatus.result ?? null,
    error: remoteStatus.error ?? null,
    updatedAt: now,
  };
}

export function markCancelled(currentState, now = Date.now()) {
  if (!currentState) return currentState;
  return {
    ...currentState,
    status: REQUEST_STATUS.CANCELLED,
    result: null,
    error: null,
    updatedAt: now,
  };
}

export function markFailed(currentState, message, now = Date.now()) {
  if (!currentState) return currentState;
  return {
    ...currentState,
    status: REQUEST_STATUS.FAILED,
    result: null,
    error: message,
    updatedAt: now,
  };
}
