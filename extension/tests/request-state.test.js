import test from 'node:test';
import assert from 'node:assert/strict';
import * as requestState from '../src/request-state.js';

const {
  applyRemoteStatus,
  makeInitialState,
  markCancelled,
  shouldStartNewRequest,
} = requestState;

test('same tab page with existing state is reused', () => {
  const state = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-1',
    now: 100,
  });

  assert.equal(shouldStartNewRequest(state, 'https://example.com/a', false), false);
});

test('new page or explicit restart starts a fresh request', () => {
  const state = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-1',
    now: 100,
  });

  assert.equal(shouldStartNewRequest(state, 'https://example.com/b', false), true);
  assert.equal(shouldStartNewRequest(state, 'https://example.com/a', true), true);
  assert.equal(shouldStartNewRequest(null, 'https://example.com/a', false), true);
});

test('navigation to another URL invalidates the tab state immediately', () => {
  const state = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-1',
    now: 100,
  });

  assert.equal(typeof requestState.shouldClearStateForNavigation, 'function');
  assert.equal(requestState.shouldClearStateForNavigation(state, 'https://example.com/b'), true);
  assert.equal(requestState.shouldClearStateForNavigation(state, 'https://example.com/a'), false);
  assert.equal(requestState.shouldClearStateForNavigation(null, 'https://example.com/b'), false);
});

test('stale remote result cannot overwrite a newer request', () => {
  const current = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-new',
    now: 100,
  });

  const next = applyRemoteStatus(current, {
    requestId: 'req-old',
    status: 'completed',
    result: 'old result',
    error: null,
  }, 200);

  assert.deepEqual(next, current);
});

test('matching remote status updates the current request', () => {
  const current = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-1',
    now: 100,
  });

  const next = applyRemoteStatus(current, {
    requestId: 'req-1',
    status: 'completed',
    result: 'understood',
    error: null,
  }, 200);

  assert.equal(next.status, 'completed');
  assert.equal(next.result, 'understood');
  assert.equal(next.updatedAt, 200);
});

test('local cancellation is authoritative', () => {
  const current = makeInitialState({
    tabId: 7,
    pageUrl: 'https://example.com/a',
    pageTitle: 'A',
    requestId: 'req-1',
    now: 100,
  });

  const next = markCancelled(current, 150);
  assert.equal(next.status, 'cancelled');
  assert.equal(next.updatedAt, 150);
});
