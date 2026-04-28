import { describe, it, expect } from 'vitest';
import { buildProposalPrompt } from '../src/prompt-builder.js';

describe('buildProposalPrompt', () => {
  const jobBase = {
    job_id: 'LAN-20260428-001',
    title: '整体院LP',
    description: 'LPを作って欲しい',
    budget_text: '10-20万円',
    budget_min: 100000,
    budget_max: 200000,
    deadline: '2026-05-05',
    client_name: '山田',
    service_category: 'lp',
  };

  it('embeds job info into template', () => {
    const p = buildProposalPrompt(jobBase, 'L1', 'リサーチ結果なし');
    expect(p).toContain('LAN-20260428-001');
    expect(p).toContain('整体院LP');
    expect(p).toContain('推奨ライン: L1');
  });

  it('embeds rules and "AI活用" note', () => {
    const p = buildProposalPrompt(jobBase, 'L1', '');
    expect(p).toContain('AI活用');
    expect(p).toContain('工藤陸');
    expect(p).toContain('SLA');
  });

  it('handles empty research notes', () => {
    const p = buildProposalPrompt(jobBase, 'L1', '');
    expect(p).toContain('(リサーチなし)');
  });

  it('handles null description', () => {
    const p = buildProposalPrompt({ ...jobBase, description: null }, 'L1', '');
    expect(p).toContain('(本文なし)');
  });
});
