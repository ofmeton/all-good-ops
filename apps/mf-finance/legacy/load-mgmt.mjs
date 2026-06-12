// scripts/load-mgmt.mjs
// PostgREST 未公開でも投入できるフォールバックローダ。
// Supabase Management API の database/query で SQL を直接実行（dollar-quote + jsonb_to_recordset で冪等 upsert）。
// 通常運用は load.mjs(supabase-js) を使う。これは mf_finance 公開反映待ち等の迂回路。
// 要 env: SB_MGMT_TOKEN（sbp_ Personal Access Token）。
import { readFileSync } from 'node:fs';

const token = process.env.SB_MGMT_TOKEN;
const ref = process.env.SB_PROJECT_REF || 'hofvvcvhjslevymhbcqj';
if (!token) { console.error('SB_MGMT_TOKEN 未設定'); process.exit(1); }

const records = JSON.parse(readFileSync('data/normalized.json', 'utf8'));
const COLTYPES = [
  ['id','text'],['included','boolean'],['date','date'],['description','text'],
  ['amount','integer'],['account','text'],['category_major','text'],['category_middle','text'],
  ['memo','text'],['is_transfer','boolean'],['is_internal_move','boolean'],
  ['classification','text'],['source_type','text'],['source','text'],
];
const colNames = COLTYPES.map(([c]) => c).join(', ');
const colDefs = COLTYPES.map(([c, t]) => `${c} ${t}`).join(', ');
const updates = COLTYPES.filter(([c]) => c !== 'id').map(([c]) => `${c}=excluded.${c}`).join(', ');

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) { console.error(await res.text()); process.exit(1); }
}

const CHUNK = 500;
for (let i = 0; i < records.length; i += CHUNK) {
  const batch = records.slice(i, i + CHUNK).map(r => ({
    id: r.id, included: r.included, date: r.date, description: r.description,
    amount: r.amount, account: r.account, category_major: r.category_major,
    category_middle: r.category_middle, memo: r.memo, is_transfer: r.is_transfer,
    is_internal_move: r.is_internal_move, classification: r.classification,
    source_type: r.source_type, source: r.source,
  }));
  const json = JSON.stringify(batch); // dollar-quote で安全に埋め込み（$json$ 文字列は出現しない）
  const sql =
    `insert into mf_finance.transactions (${colNames}) ` +
    `select ${colNames} from jsonb_to_recordset($json$${json}$json$::jsonb) as x(${colDefs}) ` +
    `on conflict (id) do update set ${updates};`;
  await runQuery(sql);
  console.log(`upserted ${Math.min(i + CHUNK, records.length)}/${records.length}`);
}
console.log('done');
