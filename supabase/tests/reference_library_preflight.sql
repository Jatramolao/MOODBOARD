-- Read-only preflight for 202608120001_enable_project_asset_reuse.sql.
-- Expected result before migration: zero rows. Never repairs or deletes cards.

select
  item.board_id,
  item.asset_id,
  count(*) as active_uses,
  array_agg(item.id order by item.created_at, item.id) as item_ids
from public.board_items item
where item.asset_id is not null
  and item.deleted_at is null
group by item.board_id, item.asset_id
having count(*) > 1
order by item.board_id, item.asset_id;
