-- 人間キュレーション歩留まり分析（改善レバー L1/L3/L5/funnel の計測）
-- 実行: Supabase SQL editor（xad schema）

-- L1: ソース別 採用率（select / (select+reject)）
select source_ref,
       count(*) filter (where action='select')                          as selected,
       count(*) filter (where action in ('select','reject'))            as decided,
       round(count(*) filter (where action='select')::numeric
             / nullif(count(*) filter (where action in ('select','reject')),0), 2) as select_rate
from xad.curation_events group by source_ref order by decided desc;

-- L3: discovery 経路別 採用率
select discovery->>'via' as via,
       count(*) filter (where action='select')               as selected,
       count(*) filter (where action in ('select','reject')) as decided
from xad.curation_events group by 1 order by decided desc;

-- L5（最重要）: overall スコア bucket × 人間判断（高スコアreject / 低スコアselect を検出）
select width_bucket((scores->>'overall')::numeric, 0, 100, 5) * 20 as score_bucket_top,
       count(*) filter (where action='select') as selected,
       count(*) filter (where action='reject') as rejected
from xad.curation_events
where action in ('select','reject') and scores ? 'overall'
group by 1 order by 1;

-- funnel: 現在の状態別 件数
select selection_status, count(*) from xad.curation_materials group by 1;
