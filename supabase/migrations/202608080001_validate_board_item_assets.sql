-- Keep image cards and registered assets consistent at the database boundary.

begin;

create or replace function public.normalize_and_validate_board_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_asset public.assets%rowtype;
  target_project_id uuid;
begin
  -- JSON payloads commonly encode an absent palette as JSON null. The column
  -- constraint intentionally accepts SQL NULL or a bounded JSON array.
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
    or target_asset.board_id is distinct from new.board_id
  then
    raise exception 'VALIDATION_ERROR: asset board mismatch'
      using errcode = '22023';
  end if;

  if new.image_path is distinct from target_asset.storage_path then
    raise exception 'VALIDATION_ERROR: asset path mismatch'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.normalize_and_validate_board_item()
from public, anon, authenticated;

drop trigger if exists normalize_and_validate_board_item
on public.board_items;

create trigger normalize_and_validate_board_item
before insert or update on public.board_items
for each row execute function public.normalize_and_validate_board_item();

commit;
