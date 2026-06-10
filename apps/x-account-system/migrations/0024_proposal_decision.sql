-- Stage 4 (4A): 提案レビュー accept/reject の記録 RPC。
-- 2B の set_approval_status と同型。新列は不要（optimizer_proposal は既保有）。
-- accept 時に reviewer が任意で tier-T 構造化変更 {paramId, value} を meta.apply に付与できる。

drop function if exists xad.set_proposal_decision(uuid[], boolean, text, jsonb);

create or replace function xad.set_proposal_decision(
  p_ids      uuid[],
  p_accepted boolean,
  p_reason   text  default null,
  p_apply    jsonb default null
)
returns integer language plpgsql as $$
declare
  n integer;
begin
  -- 境界ガード: p_apply は object（{paramId, value}）か null のみ
  if p_apply is not null and jsonb_typeof(p_apply) <> 'object' then
    raise exception 'p_apply must be a jsonb object';
  end if;

  with claimed as (
    update xad.optimizer_proposal pr
       set accepted        = p_accepted,
           reviewer_reason = coalesce(p_reason, pr.reviewer_reason),
           meta            = case
                               when p_apply is not null
                               then jsonb_set(coalesce(pr.meta, '{}'::jsonb), '{apply}', p_apply, true)
                               else pr.meta
                             end
     where pr.id = any(p_ids)
       and pr.implemented is not true   -- 適用済みは変更不可
    returning pr.id
  )
  select count(*) into n from claimed;
  return n;
end $$;

grant execute on function xad.set_proposal_decision(uuid[], boolean, text, jsonb) to service_role;
