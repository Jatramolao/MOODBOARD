-- Expand project assets into a reusable library shared by every project board.

begin;

-- Fail closed before adding the uniqueness guard. Existing cards are never
-- deleted or merged automatically; the operator must resolve every reported
-- duplicate and rerun the migration.
do $$
declare
  duplicate_groups jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'board_id', duplicate.board_id,
      'asset_id', duplicate.asset_id,
      'item_ids', duplicate.item_ids
    )
  )
  into duplicate_groups
  from (
    select
      item.board_id,
      item.asset_id,
      array_agg(item.id order by item.created_at, item.id) as item_ids
    from public.board_items item
    where item.asset_id is not null
      and item.deleted_at is null
    group by item.board_id, item.asset_id
    having count(*) > 1
    order by item.board_id, item.asset_id
    limit 20
  ) duplicate;

  if duplicate_groups is not null then
    raise exception 'ASSET_REUSE_DUPLICATES:%', duplicate_groups
      using errcode = 'P0001',
        hint = 'Resolve active duplicate board_items manually; this migration never deletes cards.';
  end if;
end;
$$;

alter table public.assets
  drop constraint if exists assets_board_id_fkey;

alter table public.assets
  add constraint assets_board_id_fkey
  foreign key (board_id) references public.boards(id) on delete set null;

create unique index board_items_active_asset_per_board_idx
on public.board_items(board_id, asset_id)
where asset_id is not null and deleted_at is null;

create or replace function public.normalize_and_validate_board_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_asset public.assets%rowtype;
  target_project_id uuid;
  existing_item_id uuid;
begin
  if new.colors = 'null'::jsonb then
    new.colors := null;
  end if;

  if new.asset_id is null then
    return new;
  end if;

  select * into target_asset
  from public.assets
  where id = new.asset_id;

  if target_asset.id is null
    or target_asset.status <> 'ready'
    or target_asset.deleted_at is not null
  then
    raise exception 'VALIDATION_ERROR: asset is not ready'
      using errcode = '22023';
  end if;

  select project_id into target_project_id
  from public.boards
  where id = new.board_id;

  if target_project_id is null
    or target_asset.project_id <> target_project_id
  then
    raise exception 'VALIDATION_ERROR: asset project mismatch'
      using errcode = '22023';
  end if;

  if new.image_path is distinct from target_asset.storage_path then
    raise exception 'VALIDATION_ERROR: asset path mismatch'
      using errcode = '22023';
  end if;

  if new.deleted_at is null then
    -- Serialize identical placements so concurrent sessions receive the same
    -- stable domain error instead of a raw unique-index violation.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.board_id::text || ':' || new.asset_id::text, 0)
    );

    select item.id into existing_item_id
    from public.board_items item
    where item.board_id = new.board_id
      and item.asset_id = new.asset_id
      and item.deleted_at is null
      and item.id <> new.id
    limit 1;

    if existing_item_id is not null then
      raise exception 'ASSET_ALREADY_ON_BOARD:%', existing_item_id
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.normalize_and_validate_board_item()
from public, anon, authenticated;

create or replace function public.list_asset_usages(
  p_project_id uuid,
  p_asset_ids uuid[] default null
)
returns table (
  asset_id uuid,
  board_id uuid,
  board_name text,
  item_id uuid,
  item_title text,
  item_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if not public.is_project_member(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_asset_ids is not null and cardinality(p_asset_ids) > 500 then
    raise exception 'VALIDATION_ERROR: maximum 500 asset ids'
      using errcode = '22023';
  end if;

  return query
  select
    asset.id,
    board.id,
    board.name,
    item.id,
    item.title,
    item.created_at
  from public.assets asset
  join public.board_items item on item.asset_id = asset.id
  join public.boards board on board.id = item.board_id
  where asset.project_id = p_project_id
    and asset.status = 'ready'
    and asset.deleted_at is null
    and item.deleted_at is null
    and (p_asset_ids is null or asset.id = any(p_asset_ids))
  order by asset.id, board.position, item.created_at, item.id;
end;
$$;

revoke execute on function public.list_asset_usages(uuid, uuid[])
from public, anon;
grant execute on function public.list_asset_usages(uuid, uuid[])
to authenticated;

commit;
