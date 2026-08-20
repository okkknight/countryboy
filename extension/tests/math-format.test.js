import assert from 'node:assert/strict';
import test from 'node:test';

import { splitMathSegments } from '../src/math-format.js';

test('splits inline LaTeX from ordinary Chinese question text', () => {
  assert.deepEqual(
    splitMathSegments('已知集合 $A=\\{1,2,3\\}$，则 $B\\subsetneq A$。'),
    [
      { type: 'text', value: '已知集合 ' },
      { type: 'math', value: 'A=\\{1,2,3\\}', display: false },
      { type: 'text', value: '，则 ' },
      { type: 'math', value: 'B\\subsetneq A', display: false },
      { type: 'text', value: '。' },
    ],
  );
});

test('keeps non-formula dollar signs as normal text', () => {
  assert.deepEqual(splitMathSegments('今天花了 $5'), [{ type: 'text', value: '今天花了 $5' }]);
});
