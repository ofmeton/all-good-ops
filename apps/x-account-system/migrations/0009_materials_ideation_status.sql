alter table xad.materials_store add column if not exists ideation_status text;
-- dedup hardening (FIX 5): prevent duplicate x_inspirations by tweet_id
create unique index if not exists materials_store_x_tweet_id_uniq
  on xad.materials_store ((meta->>'tweet_id')) where source_type = 'x_inspirations';
