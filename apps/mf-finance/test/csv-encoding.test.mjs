import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeMfCsv } from '../scripts/lib/csv-encoding.mjs';

test('UTF-8 CSVをそのまま復号する', () => {
  const bytes = new TextEncoder().encode('"日付","金額"');
  assert.equal(decodeMfCsv(bytes), '"日付","金額"');
});

test('Shift_JIS CSVを日本語として復号する', () => {
  // 「計算対象」のShift_JISバイト列。
  const bytes = Uint8Array.from([0x8c, 0x76, 0x8e, 0x5a, 0x91, 0xce, 0x8f, 0xdb]);
  assert.equal(decodeMfCsv(bytes), '計算対象');
});
