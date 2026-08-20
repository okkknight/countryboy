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

test('page has a no-JavaScript install path and optional copy helper', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /href="#install"/);
  assert.match(html, /data-copy-path/);
  assert.match(html, /id="copy-status"/);
  assert.match(html, /<noscript>/);
});

test('page uses playful product copy instead of deployment jargon', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /不设冠军 · 因为都挺累/);
  assert.match(html, /题目截进来，答案和解析给你端上来。/);
  assert.match(html, /这题我熟/);
  assert.doesNotMatch(html, /模型密钥留在服务端/);
  assert.doesNotMatch(html, /不会塞进插件/);
});

test('page keeps the radical mock-exam hierarchy', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /class="hero-chaos"/);
  assert.match(html, /第一题 · 送分题/);
  assert.match(html, /看到题，先截为敬/);
  assert.doesNotMatch(html, /score-strip/);
  assert.doesNotMatch(html, /king-stamp/);
  assert.doesNotMatch(html, /word-note/);
});

test('page describes only the actual screenshot question-solving workflow', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /题目截进来，答案和解析给你端上来/);
  assert.match(html, /选择、判断、填空、简答和计算题/);
  assert.doesNotMatch(html, /题目不清晰时/);
  assert.doesNotMatch(html, /刷题计时/);
  assert.doesNotMatch(html, /错题本/);
  assert.doesNotMatch(html, /同龄人进度对比/);
  assert.doesNotMatch(html, /自愿内卷免责声明/);
});
