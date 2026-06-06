// test/normalize.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRows } from '../scripts/lib/normalize.mjs';

const HEADER = ['計算対象','日付','内容','金額（円）','保有金融機関','大項目','中項目','メモ','振替','ID'];
const ROW = ['1','2026/05/29','AP/羽田 駐輪場','-400','ポケットカード','自動車','駐車場','','0','ID_A'];

test('1行を型付きレコードに変換（日付ISO・金額int・boolフラグ）', () => {
  const [r] = normalizeRows([HEADER, ROW]);
  assert.equal(r.id, 'ID_A');
  assert.equal(r.included, true);
  assert.equal(r.date, '2026-05-29');
  assert.equal(r.amount, -400);
  assert.equal(r.is_transfer, false);
  assert.equal(r.account, 'ポケットカード');
  assert.equal(r.category_major, '自動車');
  assert.equal(r.source, 'mf_cf');
});

test('ヘッダ行は出力しない / 計算対象0と振替1を反映', () => {
  const row2 = ['0','2026/05/10','振替','1000','横浜銀行','未分類','未分類','','1','ID_B'];
  const out = normalizeRows([HEADER, ROW, row2]);
  assert.equal(out.length, 2);
  assert.equal(out[1].included, false);
  assert.equal(out[1].is_transfer, true);
});
