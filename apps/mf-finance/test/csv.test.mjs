// test/csv.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../scripts/lib/csv.mjs';

test('引用符内のカンマを壊さない', () => {
  const text = '"a","b,c","d"\n"1","2","3"';
  assert.deepEqual(parseCsv(text), [['a','b,c','d'],['1','2','3']]);
});

test('空行を無視しヘッダ込み全行返す', () => {
  const text = '"日付","金額"\n"2026/05/29","-400"\n\n';
  assert.deepEqual(parseCsv(text), [['日付','金額'],['2026/05/29','-400']]);
});
