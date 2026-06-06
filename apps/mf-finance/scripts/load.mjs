// scripts/load.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
// 金庫(repo-root .env.local)は SUPABASE_SERVICE_ROLE_KEY 名。後方互換で SUPABASE_SERVICE_KEY も許容。
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定'); process.exit(1); }

const supabase = createClient(url, key, { db: { schema: 'mf_finance' } });
const records = JSON.parse(readFileSync('data/normalized.json', 'utf8'));

const CHUNK = 500;
let done = 0;
for (let i = 0; i < records.length; i += CHUNK) {
  const chunk = records.slice(i, i + CHUNK).map(r => ({
    id: r.id, included: r.included, date: r.date, description: r.description,
    amount: r.amount, account: r.account, category_major: r.category_major,
    category_middle: r.category_middle, memo: r.memo, is_transfer: r.is_transfer,
    is_internal_move: r.is_internal_move, classification: r.classification,
    source_type: r.source_type, source: r.source,
  }));
  const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
  if (error) { console.error(error); process.exit(1); }
  done += chunk.length;
  console.log(`upserted ${done}/${records.length}`);
}
console.log('done');
