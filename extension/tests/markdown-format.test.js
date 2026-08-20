import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMarkdownBlocks } from '../src/markdown-format.js';

test('parses headings, lists, quotes, and fenced code into display blocks', () => {
  assert.deepEqual(
    parseMarkdownBlocks('# 答案\n\n- 条件一\n- 条件二\n\n> 注意核对\n\n```\nA = B\n```'),
    [
      { type: 'heading', level: 1, text: '答案' },
      { type: 'list', ordered: false, items: ['条件一', '条件二'] },
      { type: 'quote', text: '注意核对' },
      { type: 'code', text: 'A = B' },
    ],
  );
});

test('keeps ordinary multi-line answers together as one paragraph', () => {
  assert.deepEqual(
    parseMarkdownBlocks('题型：选择题\n答案：D\n解析：集合 B 是 A 的真子集。'),
    [{ type: 'paragraph', text: '题型：选择题\n答案：D\n解析：集合 B 是 A 的真子集。' }],
  );
});
