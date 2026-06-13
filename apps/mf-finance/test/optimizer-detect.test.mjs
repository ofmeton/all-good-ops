// test/optimizer-detect.test.mjs — lib/optimizer/detect.mjs（純関数シグナル検出）のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairTransfers, ruleConflicts, labelInconsistencies } from '../lib/optimizer/detect.mjs';

// ===== pairTransfers =====

test('pairTransfers: 同日・反対符号・同額・別口座を振替ペアに', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -50000, account: '三菱UFJ', classification: 'variable' },
    { id: 'b', date: '2026-03-10', amount: 50000, account: '楽天銀行', classification: 'income' },
  ];
  const pairs = pairTransfers(rows);
  assert.equal(pairs.length, 1);
  assert.deepEqual(pairs[0], { a_id: 'a', b_id: 'b', amount: 50000, date: '2026-03-10' });
});

test('pairTransfers: ±1日も検出する', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -30000, account: 'A銀行', classification: 'variable' },
    { id: 'b', date: '2026-03-11', amount: 30000, account: 'B銀行', classification: 'income' },
  ];
  assert.equal(pairTransfers(rows).length, 1);
});

test('pairTransfers: 2日離れていれば除外', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -30000, account: 'A銀行', classification: 'variable' },
    { id: 'b', date: '2026-03-12', amount: 30000, account: 'B銀行', classification: 'income' },
  ];
  assert.equal(pairTransfers(rows).length, 0);
});

test('pairTransfers: 同一口座は除外', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -50000, account: '同じ銀行', classification: 'variable' },
    { id: 'b', date: '2026-03-10', amount: 50000, account: '同じ銀行', classification: 'income' },
  ];
  assert.equal(pairTransfers(rows).length, 0);
});

test('pairTransfers: 同符号は除外', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: 50000, account: 'A銀行', classification: 'income' },
    { id: 'b', date: '2026-03-10', amount: 50000, account: 'B銀行', classification: 'income' },
  ];
  assert.equal(pairTransfers(rows).length, 0);
});

test('pairTransfers: 既に transfer のものは除外', () => {
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -50000, account: 'A銀行', classification: 'transfer' },
    { id: 'b', date: '2026-03-10', amount: 50000, account: 'B銀行', classification: 'income' },
  ];
  assert.equal(pairTransfers(rows).length, 0);
});

test('pairTransfers: 1取引は1ペアまで（貪欲）', () => {
  // a(-100) と b(+100), c(+100) が候補だが a は 1 つのペアにしか入らない。
  const rows = [
    { id: 'a', date: '2026-03-10', amount: -100, account: 'A', classification: 'variable' },
    { id: 'b', date: '2026-03-10', amount: 100, account: 'B', classification: 'income' },
    { id: 'c', date: '2026-03-10', amount: 100, account: 'C', classification: 'income' },
  ];
  const pairs = pairTransfers(rows);
  assert.equal(pairs.length, 1);
  // a と最初の相手（id 昇順で b）が確定し、c は余る。
  assert.equal(pairs[0].a_id, 'a');
  assert.equal(pairs[0].b_id, 'b');
});

// ===== ruleConflicts =====

test('ruleConflicts: 実分類の多数決がルールと食い違うものを検出', () => {
  const rules = [{ id: 7, pattern: 'スターバックス', match_type: 'contains', classification: 'fixed' }];
  const rows = [
    { description: 'スターバックス 渋谷', classification: 'variable' },
    { description: 'スターバックス 横浜', classification: 'variable' },
    { description: 'スターバックス 元町', classification: 'fixed' },
  ];
  const conflicts = ruleConflicts(rules, rows);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0], {
    rule_id: 7,
    expected: 'fixed',
    actual_majority: 'variable',
    sample_count: 3,
  });
});

test('ruleConflicts: 多数決がルールと一致すれば出さない', () => {
  const rules = [{ id: 1, pattern: 'ザバス', match_type: 'contains', classification: 'variable' }];
  const rows = [
    { description: 'ザバス プロテイン', classification: 'variable' },
    { description: 'ザバス ミルク', classification: 'variable' },
    { description: 'ザバス バー', classification: 'fixed' }, // 少数派
  ];
  assert.equal(ruleConflicts(rules, rows).length, 0);
});

test('ruleConflicts: 一致取引が無い / 有効票が無いルールは出さない', () => {
  const rules = [
    { id: 2, pattern: '存在しない', match_type: 'contains', classification: 'variable' },
    { id: 3, pattern: 'みずほ', match_type: 'contains', classification: 'internal' },
  ];
  const rows = [
    { description: 'セブン', classification: 'variable' },
    { description: 'みずほ銀行', classification: null }, // 有効票なし
  ];
  assert.equal(ruleConflicts(rules, rows).length, 0);
});

// ===== labelInconsistencies =====

test('labelInconsistencies: 同一 description が複数分類に跨るものを検出', () => {
  const rows = [
    { description: 'Amazon', classification: 'variable' },
    { description: 'Amazon', classification: 'variable' },
    { description: 'Amazon', classification: 'fixed' },
  ];
  const out = labelInconsistencies(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].description, 'Amazon');
  assert.deepEqual(out[0].classifications, ['fixed', 'variable']);
  assert.deepEqual(out[0].counts, { fixed: 1, variable: 2 });
});

test('labelInconsistencies: 単一分類のみ・空票は出さない', () => {
  const rows = [
    { description: 'NETFLIX', classification: 'fixed' },
    { description: 'NETFLIX', classification: 'fixed' },
    { description: 'メモのみ', classification: null },
    { description: '   ', classification: 'variable' }, // 空 description
  ];
  assert.equal(labelInconsistencies(rows).length, 0);
});

test('labelInconsistencies: description は trim して同一視', () => {
  const rows = [
    { description: ' ローソン ', classification: 'variable' },
    { description: 'ローソン', classification: 'internal' },
  ];
  const out = labelInconsistencies(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].description, 'ローソン');
  assert.deepEqual(out[0].classifications, ['internal', 'variable']);
});
