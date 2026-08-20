import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('popup speaks in the launch page’s 卷王做题 voice', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../popup.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/popup.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /先不卷了/);
  assert.match(html, /再做一题/);
  assert.match(source, /卷王正在做题/);
  assert.match(source, /这题卷完了/);
  assert.doesNotMatch(html, /取消当前请求|重新分析/);
  assert.doesNotMatch(source, /正在理解当前页面|理解完成|分析失败|重新分析/);
});
