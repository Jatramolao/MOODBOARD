-- Moodboard Editorial — collaborative backend v1
-- Incremental migration over 202607310001_initial_workspace.sql.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core versioning and lifecycle
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists archived_at timestamptz,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.project_members
  add column if not exists can_comment boolean not null default true;

alter table public.boards
  add column if not exists version bigint not null default 1 check (version > 0),
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.boards
set created_by = projects.owner_id
from public.projects
where boards.project_id = projects.id
  and boards.created_by is null;

alter table public.board_items
  add column if not exists version bigint not null default 1 check (version > 0),
  add column if not exists deleted_at timestamptz;

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists position_x numeric(9, 2),
  add column if not exists position_y numeric(9, 2),
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

do $$ begin
  create type public.share_permission as enum ('view', 'comment');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.asset_status as enum ('uploading', 'ready', 'failed', 'deleted');
exception when duplicate_object then null;
end $$;

create table public.board_operation_batches (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  base_version bigint not null,
  resulting_version bigint not null,
  operations jsonb not null check (jsonb_typeof(operations) = 'array'),
  created_at timestamptz not null default now(),
  unique (board_id, operation_id)
);

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role public.project_role not null default 'viewer',
  can_comment boolean not null default true,
  token_hash bytea not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index project_invitations_pending_email_idx
on public.project_invitations (project_id, lower(email))
where status = 'pending';

create table public.board_share_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  token_hash bytea not null unique,
  permission public.share_permission not null default 'view',
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 52428800),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  checksum text,
  status public.asset_status not null default 'uploading',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.board_items
  add column if not exists asset_id uuid references public.assets(id) on delete set null;

create table public.activity_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  type text not null check (char_length(type) between 1 and 100),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  actor_key text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index board_operation_batches_board_version_idx
  on public.board_operation_batches(board_id, resulting_version);
create index project_invitations_project_idx
  on public.project_invitations(project_id, created_at desc);
create index board_share_links_board_idx
  on public.board_share_links(board_id, created_at desc);
create index assets_project_idx on public.assets(project_id, created_at desc);
create index assets_board_idx on public.assets(board_id, created_at desc);
create index assets_status_idx on public.assets(status, created_at);
create index activity_events_project_idx
  on public.activity_events(project_id, created_at desc);
create index activity_events_board_idx
  on public.activity_events(board_id, created_at desc);
create index notifications_user_idx
  on public.notifications(user_id, read_at, created_at desc);
create index rate_limit_events_lookup_idx
  on public.rate_limit_events(actor_key, action, created_at desc);
create index comments_parent_idx on public.comments(parent_id, created_at);

create trigger project_invitations_updated_at
before update on public.project_invitations
for each row execute function public.set_updated_at();

create trigger board_share_links_updated_at
before update on public.board_share_links
for each row execute function public.set_updated_at();

create trigger assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shared internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.write_activity(
  target_project_id uuid,
  target_board_id uuid,
  target_event_type text,
  target_entity_type text,
  target_entity_id text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (
    project_id, board_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    target_project_id,
    target_board_id,
    (select auth.uid()),
    target_event_type,
    target_entity_type,
    target_entity_id,
    coalesce(target_metadata, '{}'::jsonb)
  );
$$;

create or replace function public.enforce_rate_limit(
  target_action text,
  max_events integer,
  window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  key_value text;
  recent_count integer;
begin
  key_value := coalesce((select auth.uid())::text, 'anon');
  delete from public.rate_limit_events
  where created_at < now() - interval '24 hours';

  select count(*) into recent_count
  from public.rate_limit_events
  where actor_key = key_value
    and action = target_action
    and created_at >= now() - make_interval(secs => window_seconds);

  if recent_count >= max_events then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.rate_limit_events(actor_key, action)
  values (key_value, target_action);
end;
$$;

revoke execute on function public.write_activity(uuid, uuid, text, text, text, jsonb)
from public, anon, authenticated;
revoke execute on function public.enforce_rate_limit(text, integer, integer)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Projects and boards
-- ---------------------------------------------------------------------------

create or replace function public.create_project_with_board(
  p_name text,
  p_client_name text default null
)
returns table (project_id uuid, board_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := (select auth.uid());
  created_project_id uuid;
  created_board_id uuid;
begin
  if requesting_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'VALIDATION_ERROR: project name' using errcode = '22023';
  end if;
  perform public.enforce_rate_limit('project_create', 20, 3600);
  if (
    select count(*) from public.projects
    where owner_id = requesting_user_id and archived_at is null
  ) >= 50 then
    raise exception 'QUOTA_EXCEEDED: active projects' using errcode = 'P0001';
  end if;

  insert into public.projects (owner_id, name, client_name, updated_by)
  values (
    requesting_user_id,
    left(trim(p_name), 90),
    nullif(left(trim(coalesce(p_client_name, '')), 90), ''),
    requesting_user_id
  ) returning id into created_project_id;

  insert into public.boards (
    project_id, name, position, created_by, updated_by
  ) values (
    created_project_id, 'Tablero general', 0,
    requesting_user_id, requesting_user_id
  ) returning id into created_board_id;

  insert into public.board_sections (board_id, name, position, width)
  values (created_board_id, 'Tablero principal', 0, 1040);

  perform public.write_activity(
    created_project_id, created_board_id, 'project.created', 'project',
    created_project_id::text,
    jsonb_build_object('board_id', created_board_id)
  );
  return query select created_project_id, created_board_id;
end;
$$;

create or replace function public.create_board(
  p_project_id uuid,
  p_name text default 'Nuevo tablero'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_board_id uuid;
  requesting_user_id uuid := (select auth.uid());
begin
  if requesting_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if not public.can_edit_project(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if (
    select count(*) from public.boards
    where project_id = p_project_id and archived_at is null
  ) >= 100 then
    raise exception 'QUOTA_EXCEEDED: active boards' using errcode = 'P0001';
  end if;

  insert into public.boards (
    project_id, name, position, created_by, updated_by
  ) values (
    p_project_id,
    left(coalesce(nullif(trim(p_name), ''), 'Nuevo tablero'), 90),
    coalesce((select max(position) + 1 from public.boards where project_id = p_project_id), 0),
    requesting_user_id,
    requesting_user_id
  ) returning id into created_board_id;

  insert into public.board_sections(board_id, name, position, width)
  values (created_board_id, 'Tablero principal', 0, 1040);

  perform public.write_activity(
    p_project_id, created_board_id, 'board.created', 'board',
    created_board_id::text, jsonb_build_object('name', p_name)
  );
  return created_board_id;
end;
$$;

create or replace function public.duplicate_board(
  p_board_id uuid,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_board public.boards%rowtype;
  created_board_id uuid;
  section_row record;
  section_map jsonb := '{}'::jsonb;
  new_section_id uuid;
begin
  select * into source_board from public.boards where id = p_board_id;
  if source_board.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_edit_project(source_board.project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if (
    select count(*) from public.boards
    where project_id = source_board.project_id and archived_at is null
  ) >= 100 then
    raise exception 'QUOTA_EXCEEDED: active boards' using errcode = 'P0001';
  end if;

  insert into public.boards (
    project_id, name, position, zoom, created_by, updated_by
  ) values (
    source_board.project_id,
    left(coalesce(nullif(trim(p_name), ''), source_board.name || ' copia'), 90),
    coalesce((select max(position) + 1 from public.boards where project_id = source_board.project_id), 0),
    source_board.zoom,
    (select auth.uid()),
    (select auth.uid())
  ) returning id into created_board_id;

  for section_row in
    select * from public.board_sections
    where board_id = p_board_id order by position
  loop
    new_section_id := gen_random_uuid();
    section_map := section_map || jsonb_build_object(section_row.id::text, new_section_id::text);
    insert into public.board_sections(id, board_id, name, position, width)
    values (new_section_id, created_board_id, section_row.name, section_row.position, section_row.width);
  end loop;

  insert into public.board_items (
    id, board_id, section_id, type, x, y, width, height, title, content,
    image_path, source_url, colors, created_by, asset_id
  )
  select
    gen_random_uuid(), created_board_id,
    (section_map ->> item.section_id::text)::uuid,
    item.type, item.x, item.y, item.width, item.height, item.title, item.content,
    item.image_path, item.source_url, item.colors, (select auth.uid()), item.asset_id
  from public.board_items item
  where item.board_id = p_board_id and item.deleted_at is null;

  perform public.write_activity(
    source_board.project_id, created_board_id, 'board.duplicated', 'board',
    created_board_id::text, jsonb_build_object('source_board_id', p_board_id)
  );
  return created_board_id;
end;
$$;

create or replace function public.set_board_archived(
  p_board_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid := public.board_project_id(p_board_id);
begin
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.boards
  set archived_at = case when p_archived then now() else null end,
      updated_by = (select auth.uid())
  where id = p_board_id;
  perform public.write_activity(
    target_project_id, p_board_id,
    case when p_archived then 'board.archived' else 'board.restored' end,
    'board', p_board_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.update_project(
  p_project_id uuid,
  p_name text,
  p_client_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_edit_project(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'VALIDATION_ERROR: project name' using errcode = '22023';
  end if;
  update public.projects
  set name = left(trim(p_name), 90),
      client_name = nullif(left(trim(coalesce(p_client_name, '')), 90), ''),
      updated_by = (select auth.uid())
  where id = p_project_id;
  perform public.write_activity(
    p_project_id, null, 'project.updated', 'project', p_project_id::text,
    jsonb_build_object('name', left(trim(p_name), 90))
  );
end;
$$;

create or replace function public.update_board(
  p_board_id uuid,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid := public.board_project_id(p_board_id);
begin
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'VALIDATION_ERROR: board name' using errcode = '22023';
  end if;
  update public.boards
  set name = left(trim(p_name), 90), updated_by = (select auth.uid())
  where id = p_board_id;
  perform public.write_activity(
    target_project_id, p_board_id, 'board.updated', 'board', p_board_id::text,
    jsonb_build_object('name', left(trim(p_name), 90))
  );
end;
$$;

create or replace function public.reorder_boards(
  p_project_id uuid,
  p_board_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
begin
  if not public.can_edit_project(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_board_ids is null or cardinality(p_board_ids) = 0 then
    raise exception 'VALIDATION_ERROR: board ids' using errcode = '22023';
  end if;
  if cardinality(p_board_ids) <> (
    select count(distinct value) from unnest(p_board_ids) as value
  ) then
    raise exception 'VALIDATION_ERROR: duplicate board ids' using errcode = '22023';
  end if;
  select count(*) into expected_count
  from public.boards
  where project_id = p_project_id and archived_at is null;
  if expected_count <> cardinality(p_board_ids) or exists (
    select 1 from unnest(p_board_ids) as requested(id)
    left join public.boards board
      on board.id = requested.id
      and board.project_id = p_project_id
      and board.archived_at is null
    where board.id is null
  ) then
    raise exception 'VALIDATION_ERROR: all active project boards are required'
      using errcode = '22023';
  end if;
  update public.boards board
  set position = requested.ordinality - 1,
      updated_by = (select auth.uid())
  from unnest(p_board_ids) with ordinality as requested(id, ordinality)
  where board.id = requested.id;
  perform public.write_activity(
    p_project_id, null, 'boards.reordered', 'project', p_project_id::text,
    jsonb_build_object('board_ids', to_jsonb(p_board_ids))
  );
end;
$$;

create or replace function public.set_project_archived(
  p_project_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.projects
  set archived_at = case when p_archived then now() else null end,
      status = case when p_archived then 'archived' else 'active' end,
      updated_by = (select auth.uid())
  where id = p_project_id;
  perform public.write_activity(
    p_project_id, null,
    case when p_archived then 'project.archived' else 'project.restored' end,
    'project', p_project_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.change_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_role,
  p_can_comment boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id = public.project_owner_id(p_project_id) and p_role <> 'owner' then
    raise exception 'OWNER_ROLE_IMMUTABLE' using errcode = 'P0001';
  end if;
  if p_role = 'owner' and p_user_id <> public.project_owner_id(p_project_id) then
    raise exception 'OWNER_ROLE_IMMUTABLE' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  ) and (
    select count(*) from public.project_members where project_id = p_project_id
  ) >= 100 then
    raise exception 'QUOTA_EXCEEDED: project members' using errcode = 'P0001';
  end if;
  insert into public.project_members(project_id, user_id, role, can_comment)
  values (p_project_id, p_user_id, p_role, p_can_comment)
  on conflict (project_id, user_id) do update
  set role = excluded.role, can_comment = excluded.can_comment;
  perform public.write_activity(
    p_project_id, null, 'member.updated', 'member', p_user_id::text,
    jsonb_build_object('role', p_role, 'can_comment', p_can_comment)
  );
  if p_user_id <> (select auth.uid()) then
    insert into public.notifications(user_id, project_id, type, payload)
    values (
      p_user_id, p_project_id, 'member.role_changed',
      jsonb_build_object('role', p_role, 'can_comment', p_can_comment)
    );
  end if;
end;
$$;

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id = public.project_owner_id(p_project_id) then
    raise exception 'OWNER_CANNOT_BE_REMOVED' using errcode = 'P0001';
  end if;
  delete from public.project_members
  where project_id = p_project_id and user_id = p_user_id;
  perform public.write_activity(
    p_project_id, null, 'member.removed', 'member', p_user_id::text, '{}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic collaborative operations
-- ---------------------------------------------------------------------------

create or replace function public.apply_board_operations(
  p_board_id uuid,
  p_base_version bigint,
  p_operation_id uuid,
  p_operations jsonb
)
returns table (board_version bigint, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := (select auth.uid());
  target_project_id uuid;
  current_version bigint;
  existing_version bigint;
  operation jsonb;
  operation_type text;
  payload jsonb;
  target_section_id uuid;
  target_item_id uuid;
  section_count integer;
begin
  if requesting_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_operations) <> 'array' or jsonb_array_length(p_operations) = 0 then
    raise exception 'VALIDATION_ERROR: operations must be a non-empty array'
      using errcode = '22023';
  end if;
  if jsonb_array_length(p_operations) > 100 then
    raise exception 'VALIDATION_ERROR: maximum 100 operations'
      using errcode = '22023';
  end if;

  select project_id, version into target_project_id, current_version
  from public.boards
  where id = p_board_id and archived_at is null
  for update;

  if target_project_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select resulting_version into existing_version
  from public.board_operation_batches
  where board_id = p_board_id and operation_id = p_operation_id;
  if existing_version is not null then
    return query select existing_version, false;
    return;
  end if;

  if current_version <> p_base_version then
    raise exception 'VERSION_CONFLICT:%', current_version using errcode = 'P0001';
  end if;

  for operation in select value from jsonb_array_elements(p_operations)
  loop
    operation_type := operation ->> 'type';
    payload := coalesce(operation -> 'payload', '{}'::jsonb);

    case operation_type
      when 'board.update' then
        update public.boards set
          name = case when payload ? 'name'
            then left(coalesce(nullif(trim(payload ->> 'name'), ''), name), 90)
            else name end,
          zoom = case when payload ? 'zoom'
            then greatest(0.5, least((payload ->> 'zoom')::numeric, 1.25))
            else zoom end,
          updated_by = requesting_user_id
        where id = p_board_id;

      when 'section.create' then
        target_section_id := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
        insert into public.board_sections(id, board_id, name, position, width)
        values (
          target_section_id,
          p_board_id,
          left(coalesce(nullif(trim(payload ->> 'name'), ''), 'Nueva sección'), 90),
          greatest(0, coalesce((payload ->> 'position')::integer, 0)),
          greatest(420, least(coalesce((payload ->> 'width')::numeric, 620), 2400))
        );

      when 'section.update' then
        target_section_id := (payload ->> 'id')::uuid;
        update public.board_sections set
          name = case when payload ? 'name'
            then left(coalesce(nullif(trim(payload ->> 'name'), ''), name), 90)
            else name end,
          position = case when payload ? 'position'
            then greatest(0, (payload ->> 'position')::integer)
            else position end,
          width = case when payload ? 'width'
            then greatest(420, least((payload ->> 'width')::numeric, 2400))
            else width end
        where id = target_section_id and board_id = p_board_id;
        if not found then raise exception 'SECTION_NOT_FOUND' using errcode = 'P0002'; end if;

      when 'section.delete' then
        target_section_id := (payload ->> 'id')::uuid;
        select count(*) into section_count from public.board_sections where board_id = p_board_id;
        if section_count <= 1 then
          raise exception 'LAST_SECTION_CANNOT_BE_DELETED' using errcode = 'P0001';
        end if;
        delete from public.board_sections where id = target_section_id and board_id = p_board_id;
        if not found then raise exception 'SECTION_NOT_FOUND' using errcode = 'P0002'; end if;

      when 'item.create' then
        target_item_id := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
        target_section_id := (payload ->> 'section_id')::uuid;
        if not exists (
          select 1 from public.board_sections
          where id = target_section_id and board_id = p_board_id
        ) then
          raise exception 'SECTION_NOT_FOUND' using errcode = 'P0002';
        end if;
        insert into public.board_items (
          id, board_id, section_id, type, x, y, width, height,
          title, content, image_path, source_url, colors, created_by, asset_id
        ) values (
          target_item_id, p_board_id, target_section_id,
          (payload ->> 'type')::public.board_item_type,
          coalesce((payload ->> 'x')::numeric, 0),
          coalesce((payload ->> 'y')::numeric, 0),
          greatest(80, least(coalesce((payload ->> 'width')::numeric, 220), 2400)),
          greatest(60, least(coalesce((payload ->> 'height')::numeric, 270), 2400)),
          left(payload ->> 'title', 240),
          left(payload ->> 'content', 10000),
          payload ->> 'image_path',
          payload ->> 'source_url',
          payload -> 'colors',
          requesting_user_id,
          nullif(payload ->> 'asset_id', '')::uuid
        );

      when 'item.update' then
        target_item_id := (payload ->> 'id')::uuid;
        if payload ? 'section_id' and not exists (
          select 1 from public.board_sections
          where id = (payload ->> 'section_id')::uuid and board_id = p_board_id
        ) then
          raise exception 'SECTION_NOT_FOUND' using errcode = 'P0002';
        end if;
        update public.board_items set
          section_id = case when payload ? 'section_id' then (payload ->> 'section_id')::uuid else section_id end,
          x = case when payload ? 'x' then (payload ->> 'x')::numeric else x end,
          y = case when payload ? 'y' then (payload ->> 'y')::numeric else y end,
          width = case when payload ? 'width' then greatest(80, least((payload ->> 'width')::numeric, 2400)) else width end,
          height = case when payload ? 'height' then greatest(60, least((payload ->> 'height')::numeric, 2400)) else height end,
          title = case when payload ? 'title' then left(payload ->> 'title', 240) else title end,
          content = case when payload ? 'content' then left(payload ->> 'content', 10000) else content end,
          image_path = case when payload ? 'image_path' then payload ->> 'image_path' else image_path end,
          source_url = case when payload ? 'source_url' then payload ->> 'source_url' else source_url end,
          colors = case when payload ? 'colors' then payload -> 'colors' else colors end,
          asset_id = case when payload ? 'asset_id' then nullif(payload ->> 'asset_id', '')::uuid else asset_id end,
          version = version + 1,
          deleted_at = null
        where id = target_item_id and board_id = p_board_id;
        if not found then raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002'; end if;

      when 'item.delete' then
        target_item_id := (payload ->> 'id')::uuid;
        update public.board_items
        set deleted_at = now(), version = version + 1
        where id = target_item_id and board_id = p_board_id and deleted_at is null;
        if not found then raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002'; end if;

      else
        raise exception 'UNKNOWN_OPERATION:%', operation_type using errcode = '22023';
    end case;
  end loop;

  current_version := current_version + 1;
  update public.boards
  set version = current_version, updated_by = requesting_user_id
  where id = p_board_id;

  insert into public.board_operation_batches(
    board_id, actor_id, operation_id, base_version, resulting_version, operations
  ) values (
    p_board_id, requesting_user_id, p_operation_id,
    p_base_version, current_version, p_operations
  );

  perform public.write_activity(
    target_project_id, p_board_id, 'board.operations_applied', 'board',
    p_board_id::text,
    jsonb_build_object(
      'operation_id', p_operation_id,
      'base_version', p_base_version,
      'resulting_version', current_version,
      'operation_count', jsonb_array_length(p_operations)
    )
  );

  return query select current_version, true;
end;
$$;

create or replace function public.get_board_operations_since(
  p_board_id uuid,
  p_after_version bigint,
  p_limit integer default 100
)
returns table (
  operation_id uuid,
  actor_id uuid,
  base_version bigint,
  resulting_version bigint,
  operations jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    batch.operation_id,
    batch.actor_id,
    batch.base_version,
    batch.resulting_version,
    batch.operations,
    batch.created_at
  from public.board_operation_batches batch
  where batch.board_id = p_board_id
    and batch.resulting_version > p_after_version
    and public.is_project_member(public.board_project_id(p_board_id))
  order by batch.resulting_version
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

-- ---------------------------------------------------------------------------
-- Invitations and sharing
-- ---------------------------------------------------------------------------

create or replace function public.create_project_invitation(
  p_project_id uuid,
  p_email text,
  p_role public.project_role default 'viewer',
  p_can_comment boolean default true,
  p_expires_hours integer default 168
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := encode(gen_random_bytes(32), 'hex');
  created_id uuid;
  expiry timestamptz;
  normalized_email text := lower(trim(p_email));
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'VALIDATION_ERROR: email' using errcode = '22023';
  end if;
  if p_role = 'owner' then
    raise exception 'VALIDATION_ERROR: owner invitations are not allowed' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.project_members member
    join auth.users account on account.id = member.user_id
    where member.project_id = p_project_id
      and lower(account.email) = normalized_email
  ) then
    raise exception 'MEMBER_ALREADY_EXISTS' using errcode = '23505';
  end if;
  perform public.enforce_rate_limit('project_invitation', 30, 3600);
  expiry := now() + make_interval(hours => greatest(1, least(p_expires_hours, 720)));

  update public.project_invitations
  set status = 'revoked', revoked_at = now()
  where project_id = p_project_id
    and lower(email) = normalized_email
    and status = 'pending';

  insert into public.project_invitations(
    project_id, email, role, can_comment, token_hash,
    invited_by, expires_at
  ) values (
    p_project_id, normalized_email, p_role, p_can_comment,
    digest(raw_token, 'sha256'), (select auth.uid()), expiry
  ) returning id into created_id;

  perform public.write_activity(
    p_project_id, null, 'invitation.created', 'invitation', created_id::text,
    jsonb_build_object('role', p_role, 'can_comment', p_can_comment)
  );
  return query select created_id, raw_token, expiry;
end;
$$;

create or replace function public.accept_project_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.project_invitations%rowtype;
  requesting_user_id uuid := (select auth.uid());
  requesting_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if requesting_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  select * into invitation
  from public.project_invitations
  where token_hash = digest(p_token, 'sha256')
  for update;

  if invitation.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if invitation.status <> 'pending' then raise exception 'INVITATION_NOT_PENDING' using errcode = 'P0001'; end if;
  if invitation.expires_at <= now() then
    update public.project_invitations set status = 'expired' where id = invitation.id;
    raise exception 'INVITATION_EXPIRED' using errcode = 'P0001';
  end if;
  if requesting_email = '' or requesting_email <> lower(invitation.email) then
    raise exception 'INVITATION_EMAIL_MISMATCH' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.project_members
    where project_id = invitation.project_id and user_id = requesting_user_id
  ) then
    raise exception 'MEMBER_ALREADY_EXISTS' using errcode = '23505';
  end if;
  if (
    select count(*) from public.project_members where project_id = invitation.project_id
  ) >= 100 then
    raise exception 'QUOTA_EXCEEDED: project members' using errcode = 'P0001';
  end if;

  insert into public.project_members(project_id, user_id, role, can_comment)
  values (invitation.project_id, requesting_user_id, invitation.role, invitation.can_comment)
  on conflict (project_id, user_id) do update
  set role = excluded.role, can_comment = excluded.can_comment;

  update public.project_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  perform public.write_activity(
    invitation.project_id, null, 'invitation.accepted', 'invitation',
    invitation.id::text, '{}'::jsonb
  );
  if invitation.invited_by <> requesting_user_id then
    insert into public.notifications(user_id, project_id, type, payload)
    values (
      invitation.invited_by,
      invitation.project_id,
      'invitation.accepted',
      jsonb_build_object('invitation_id', invitation.id, 'user_id', requesting_user_id)
    );
  end if;
  return invitation.project_id;
end;
$$;

create or replace function public.revoke_project_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid;
begin
  select project_id into target_project_id
  from public.project_invitations where id = p_invitation_id;
  if not public.is_project_owner(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.project_invitations
  set status = 'revoked', revoked_at = now()
  where id = p_invitation_id and status = 'pending';
  perform public.write_activity(
    target_project_id, null, 'invitation.revoked', 'invitation',
    p_invitation_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.create_board_share_link(
  p_board_id uuid,
  p_permission public.share_permission default 'view',
  p_expires_at timestamptz default null
)
returns table (share_id uuid, share_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid := public.board_project_id(p_board_id);
  raw_token text := encode(gen_random_bytes(32), 'hex');
  created_id uuid;
begin
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'VALIDATION_ERROR: expiration' using errcode = '22023';
  end if;
  perform public.enforce_rate_limit('share_link', 30, 3600);
  insert into public.board_share_links(
    board_id, token_hash, permission, created_by, expires_at
  ) values (
    p_board_id, digest(raw_token, 'sha256'), p_permission,
    (select auth.uid()), p_expires_at
  ) returning id into created_id;
  perform public.write_activity(
    target_project_id, p_board_id, 'share_link.created', 'share_link',
    created_id::text, jsonb_build_object('permission', p_permission)
  );
  return query select created_id, raw_token;
end;
$$;

create or replace function public.revoke_board_share_link(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_board_id uuid;
  target_project_id uuid;
begin
  select board_id into target_board_id
  from public.board_share_links where id = p_share_id;
  target_project_id := public.board_project_id(target_board_id);
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.board_share_links set revoked_at = now() where id = p_share_id;
  perform public.write_activity(
    target_project_id, target_board_id, 'share_link.revoked', 'share_link',
    p_share_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.resolve_board_share_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  share_row public.board_share_links%rowtype;
  result jsonb;
begin
  select * into share_row
  from public.board_share_links
  where token_hash = digest(p_token, 'sha256')
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if share_row.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  update public.board_share_links
  set last_accessed_at = now()
  where id = share_row.id;

  select jsonb_build_object(
    'share_id', share_row.id,
    'permission', share_row.permission,
    'project', jsonb_build_object('id', project.id, 'name', project.name),
    'board', jsonb_build_object(
      'id', board.id,
      'name', board.name,
      'version', board.version,
      'zoom', board.zoom
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id, 'name', section.name,
        'position', section.position, 'width', section.width
      ) order by section.position)
      from public.board_sections section where section.board_id = board.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'section_id', item.section_id, 'type', item.type,
        'x', item.x, 'y', item.y, 'width', item.width, 'height', item.height,
        'title', item.title, 'content', item.content,
        'image_path', item.image_path, 'source_url', item.source_url,
        'colors', item.colors, 'asset_id', item.asset_id
      ) order by item.created_at)
      from public.board_items item
      where item.board_id = board.id and item.deleted_at is null
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', comment.id,
        'item_id', comment.item_id,
        'parent_id', comment.parent_id,
        'body', comment.body,
        'position_x', comment.position_x,
        'position_y', comment.position_y,
        'resolved_at', comment.resolved_at,
        'created_at', comment.created_at,
        'author', jsonb_build_object(
          'id', profile.id,
          'display_name', profile.display_name,
          'avatar_url', profile.avatar_url
        )
      ) order by comment.created_at)
      from public.comments comment
      left join public.profiles profile on profile.id = comment.user_id
      where comment.board_id = board.id and comment.deleted_at is null
    ), '[]'::jsonb)
  ) into result
  from public.boards board
  join public.projects project on project.id = board.project_id
  where board.id = share_row.board_id
    and board.archived_at is null
    and project.archived_at is null;
  return result;
end;
$$;

create or replace function public.create_shared_comment(
  p_token text,
  p_body text,
  p_item_id uuid default null,
  p_parent_id uuid default null,
  p_position_x numeric default null,
  p_position_y numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  share_row public.board_share_links%rowtype;
  requesting_user_id uuid := (select auth.uid());
  target_project_id uuid;
  created_id uuid;
begin
  if requesting_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  select * into share_row
  from public.board_share_links
  where token_hash = digest(p_token, 'sha256')
    and permission = 'comment'
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if share_row.id is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if char_length(trim(p_body)) < 1 or char_length(p_body) > 4000 then
    raise exception 'VALIDATION_ERROR: comment body' using errcode = '22023';
  end if;
  if p_item_id is not null and not exists (
    select 1 from public.board_items
    where id = p_item_id and board_id = share_row.board_id and deleted_at is null
  ) then raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_parent_id is not null and not exists (
    select 1 from public.comments
    where id = p_parent_id and board_id = share_row.board_id and deleted_at is null
  ) then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.enforce_rate_limit('shared_comment', 30, 60);
  insert into public.comments(
    board_id, item_id, parent_id, user_id, body, position_x, position_y
  ) values (
    share_row.board_id, p_item_id, p_parent_id, requesting_user_id,
    trim(p_body), p_position_x, p_position_y
  ) returning id into created_id;
  target_project_id := public.board_project_id(share_row.board_id);
  perform public.write_activity(
    target_project_id, share_row.board_id, 'shared_comment.created', 'comment',
    created_id::text, jsonb_build_object('share_id', share_row.id)
  );
  insert into public.notifications(user_id, project_id, type, payload)
  select member.user_id, target_project_id, 'comment.created',
    jsonb_build_object(
      'comment_id', created_id,
      'board_id', share_row.board_id,
      'author_id', requesting_user_id,
      'shared', true
    )
  from public.project_members member
  where member.project_id = target_project_id
    and member.user_id <> requesting_user_id
    and member.role in ('owner', 'editor');
  return created_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments, assets and notifications
-- ---------------------------------------------------------------------------

create or replace function public.can_comment_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
      and can_comment
  );
$$;

create or replace function public.create_board_comment(
  p_board_id uuid,
  p_body text,
  p_item_id uuid default null,
  p_parent_id uuid default null,
  p_position_x numeric default null,
  p_position_y numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid := public.board_project_id(p_board_id);
  created_id uuid;
begin
  if not public.can_comment_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(p_body) > 4000 then
    raise exception 'VALIDATION_ERROR: comment body' using errcode = '22023';
  end if;
  if p_item_id is not null and not exists (
    select 1 from public.board_items
    where id = p_item_id and board_id = p_board_id and deleted_at is null
  ) then raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_parent_id is not null and not exists (
    select 1 from public.comments
    where id = p_parent_id and board_id = p_board_id and deleted_at is null
  ) then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.enforce_rate_limit('comment', 60, 60);
  insert into public.comments(
    board_id, item_id, parent_id, user_id, body, position_x, position_y
  ) values (
    p_board_id, p_item_id, p_parent_id, (select auth.uid()), trim(p_body),
    p_position_x, p_position_y
  ) returning id into created_id;
  perform public.write_activity(
    target_project_id, p_board_id, 'comment.created', 'comment',
    created_id::text, jsonb_build_object('item_id', p_item_id, 'parent_id', p_parent_id)
  );
  insert into public.notifications(user_id, project_id, type, payload)
  select
    member.user_id,
    target_project_id,
    'comment.created',
    jsonb_build_object(
      'comment_id', created_id,
      'board_id', p_board_id,
      'item_id', p_item_id,
      'author_id', (select auth.uid())
    )
  from public.project_members member
  where member.project_id = target_project_id
    and member.user_id <> (select auth.uid())
    and member.role in ('owner', 'editor');
  return created_id;
end;
$$;

create or replace function public.update_board_comment(
  p_comment_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_board_id uuid;
  author_id uuid;
begin
  select board_id, user_id into target_board_id, author_id
  from public.comments where id = p_comment_id and deleted_at is null;
  if author_id <> (select auth.uid()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(p_body) > 4000 then
    raise exception 'VALIDATION_ERROR: comment body' using errcode = '22023';
  end if;
  update public.comments set body = trim(p_body), edited_at = now()
  where id = p_comment_id;
end;
$$;

create or replace function public.set_comment_resolved(
  p_comment_id uuid,
  p_resolved boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_board_id uuid;
  target_project_id uuid;
begin
  select board_id into target_board_id
  from public.comments where id = p_comment_id and deleted_at is null;
  target_project_id := public.board_project_id(target_board_id);
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.comments set
    resolved_at = case when p_resolved then now() else null end,
    resolved_by = case when p_resolved then (select auth.uid()) else null end
  where id = p_comment_id;
  perform public.write_activity(
    target_project_id, target_board_id,
    case when p_resolved then 'comment.resolved' else 'comment.reopened' end,
    'comment', p_comment_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.delete_board_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_board_id uuid;
  author_id uuid;
  target_project_id uuid;
begin
  select board_id, user_id into target_board_id, author_id
  from public.comments where id = p_comment_id and deleted_at is null;
  target_project_id := public.board_project_id(target_board_id);
  if author_id <> (select auth.uid()) and not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.comments set deleted_at = now(), body = '[Comentario eliminado]'
  where id = p_comment_id;
end;
$$;

create or replace function public.register_asset(
  p_project_id uuid,
  p_board_id uuid,
  p_storage_path text,
  p_original_name text,
  p_mime_type text,
  p_byte_size bigint,
  p_width integer default null,
  p_height integer default null,
  p_checksum text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if not public.can_edit_project(p_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.board_project_id(p_board_id) <> p_project_id then
    raise exception 'BOARD_PROJECT_MISMATCH' using errcode = '22023';
  end if;
  if split_part(p_storage_path, '/', 1) <> p_project_id::text then
    raise exception 'ASSET_PATH_MISMATCH' using errcode = '22023';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','image/gif','image/avif') then
    raise exception 'UNSUPPORTED_ASSET_TYPE' using errcode = '22023';
  end if;
  if p_byte_size < 0 or p_byte_size > 52428800 then
    raise exception 'ASSET_SIZE_INVALID' using errcode = '22023';
  end if;
  if (
    select coalesce(sum(byte_size), 0)
    from public.assets
    where project_id = p_project_id and status = 'ready' and deleted_at is null
  ) + p_byte_size > 21474836480 then
    raise exception 'QUOTA_EXCEEDED: project storage' using errcode = 'P0001';
  end if;
  insert into public.assets(
    project_id, board_id, uploaded_by, storage_path, original_name,
    mime_type, byte_size, width, height, checksum, status
  ) values (
    p_project_id, p_board_id, (select auth.uid()), p_storage_path,
    left(p_original_name, 255), p_mime_type, p_byte_size,
    p_width, p_height, p_checksum, 'ready'
  )
  on conflict (storage_path) do update set
    status = 'ready', deleted_at = null,
    width = coalesce(excluded.width, assets.width),
    height = coalesce(excluded.height, assets.height),
    checksum = coalesce(excluded.checksum, assets.checksum)
  returning id into created_id;
  perform public.write_activity(
    p_project_id, p_board_id, 'asset.ready', 'asset', created_id::text,
    jsonb_build_object('mime_type', p_mime_type, 'byte_size', p_byte_size)
  );
  return created_id;
end;
$$;

create or replace function public.mark_asset_deleted(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid;
  target_board_id uuid;
begin
  select project_id, board_id into target_project_id, target_board_id
  from public.assets where id = p_asset_id and deleted_at is null;
  if target_project_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_edit_project(target_project_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.board_items
    where asset_id = p_asset_id and deleted_at is null
  ) then
    raise exception 'ASSET_IN_USE' using errcode = 'P0001';
  end if;
  update public.assets
  set status = 'deleted', deleted_at = now()
  where id = p_asset_id;
  perform public.write_activity(
    target_project_id, target_board_id, 'asset.deleted', 'asset', p_asset_id::text,
    '{}'::jsonb
  );
end;
$$;

create or replace function public.get_project_usage(p_project_id uuid)
returns table (
  active_boards bigint,
  project_members bigint,
  ready_assets bigint,
  storage_bytes numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.boards where project_id = p_project_id and archived_at is null),
    (select count(*) from public.project_members where project_id = p_project_id),
    (select count(*) from public.assets where project_id = p_project_id and status = 'ready' and deleted_at is null),
    (select coalesce(sum(byte_size), 0) from public.assets where project_id = p_project_id and status = 'ready' and deleted_at is null)
  where public.is_project_member(p_project_id);
$$;

create or replace function public.mark_notification_read(p_notification_id bigint)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where id = p_notification_id and user_id = (select auth.uid());
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Backfill assets already uploaded by the first implementation
-- ---------------------------------------------------------------------------

insert into public.assets(
  project_id, board_id, uploaded_by, storage_path, original_name,
  mime_type, byte_size, status, created_at
)
select
  board.project_id,
  item.board_id,
  coalesce(item.created_by, board.created_by, project.owner_id),
  item.image_path,
  regexp_replace(item.image_path, '^.*/', ''),
  coalesce(object.metadata ->> 'mimetype', 'image/jpeg'),
  coalesce((object.metadata ->> 'size')::bigint, 0),
  'ready',
  coalesce(object.created_at, item.created_at)
from public.board_items item
join public.boards board on board.id = item.board_id
join public.projects project on project.id = board.project_id
join storage.objects object
  on object.bucket_id = 'board-assets' and object.name = item.image_path
where item.image_path is not null
on conflict (storage_path) do nothing;

update public.board_items item
set asset_id = asset.id
from public.assets asset
where item.image_path = asset.storage_path and item.asset_id is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.board_operation_batches enable row level security;
alter table public.project_invitations enable row level security;
alter table public.board_share_links enable row level security;
alter table public.assets enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limit_events enable row level security;

create policy "operations_select_members"
on public.board_operation_batches for select to authenticated
using (public.is_project_member(public.board_project_id(board_id)));

create policy "invitations_select_owners"
on public.project_invitations for select to authenticated
using (public.is_project_owner(project_id));

create policy "shares_select_editors"
on public.board_share_links for select to authenticated
using (public.can_edit_project(public.board_project_id(board_id)));

create policy "assets_select_members"
on public.assets for select to authenticated
using (public.is_project_member(project_id));

create policy "assets_insert_editors"
on public.assets for insert to authenticated
with check (public.can_edit_project(project_id) and uploaded_by = (select auth.uid()));

create policy "assets_update_editors"
on public.assets for update to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

create policy "activity_select_members"
on public.activity_events for select to authenticated
using (public.is_project_member(project_id));

create policy "notifications_select_own"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "notifications_update_own"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Restrict profile discovery to people sharing at least one project.
drop policy if exists "profiles_visible_to_authenticated" on public.profiles;
create policy "profiles_visible_to_project_peers"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.project_members mine
    join public.project_members peer on peer.project_id = mine.project_id
    where mine.user_id = (select auth.uid()) and peer.user_id = profiles.id
  )
);

-- Comments now honor the explicit can_comment capability and soft deletion.
drop policy if exists "comments_insert_members" on public.comments;
create policy "comments_insert_allowed"
on public.comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.can_comment_project(public.board_project_id(board_id))
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.create_board(uuid, text) from public, anon;
revoke execute on function public.duplicate_board(uuid, text) from public, anon;
revoke execute on function public.update_project(uuid, text, text) from public, anon;
revoke execute on function public.update_board(uuid, text) from public, anon;
revoke execute on function public.reorder_boards(uuid, uuid[]) from public, anon;
revoke execute on function public.set_board_archived(uuid, boolean) from public, anon;
revoke execute on function public.set_project_archived(uuid, boolean) from public, anon;
revoke execute on function public.change_project_member(uuid, uuid, public.project_role, boolean) from public, anon;
revoke execute on function public.remove_project_member(uuid, uuid) from public, anon;
revoke execute on function public.apply_board_operations(uuid, bigint, uuid, jsonb) from public, anon;
revoke execute on function public.get_board_operations_since(uuid, bigint, integer) from public, anon;
revoke execute on function public.create_project_invitation(uuid, text, public.project_role, boolean, integer) from public, anon;
revoke execute on function public.accept_project_invitation(text) from public, anon;
revoke execute on function public.revoke_project_invitation(uuid) from public, anon;
revoke execute on function public.create_board_share_link(uuid, public.share_permission, timestamptz) from public, anon;
revoke execute on function public.revoke_board_share_link(uuid) from public, anon;
revoke execute on function public.resolve_board_share_link(text) from public;
revoke execute on function public.create_board_comment(uuid, text, uuid, uuid, numeric, numeric) from public, anon;
revoke execute on function public.create_shared_comment(text, text, uuid, uuid, numeric, numeric) from public, anon;
revoke execute on function public.update_board_comment(uuid, text) from public, anon;
revoke execute on function public.set_comment_resolved(uuid, boolean) from public, anon;
revoke execute on function public.delete_board_comment(uuid) from public, anon;
revoke execute on function public.register_asset(uuid, uuid, text, text, text, bigint, integer, integer, text) from public, anon;
revoke execute on function public.mark_asset_deleted(uuid) from public, anon;
revoke execute on function public.get_project_usage(uuid) from public, anon;
revoke execute on function public.mark_notification_read(bigint) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
revoke execute on function public.can_comment_project(uuid) from public, anon;

grant execute on function public.create_board(uuid, text) to authenticated;
grant execute on function public.duplicate_board(uuid, text) to authenticated;
grant execute on function public.update_project(uuid, text, text) to authenticated;
grant execute on function public.update_board(uuid, text) to authenticated;
grant execute on function public.reorder_boards(uuid, uuid[]) to authenticated;
grant execute on function public.set_board_archived(uuid, boolean) to authenticated;
grant execute on function public.set_project_archived(uuid, boolean) to authenticated;
grant execute on function public.change_project_member(uuid, uuid, public.project_role, boolean) to authenticated;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
grant execute on function public.apply_board_operations(uuid, bigint, uuid, jsonb) to authenticated;
grant execute on function public.get_board_operations_since(uuid, bigint, integer) to authenticated;
grant execute on function public.create_project_invitation(uuid, text, public.project_role, boolean, integer) to authenticated;
grant execute on function public.accept_project_invitation(text) to authenticated;
grant execute on function public.revoke_project_invitation(uuid) to authenticated;
grant execute on function public.create_board_share_link(uuid, public.share_permission, timestamptz) to authenticated;
grant execute on function public.revoke_board_share_link(uuid) to authenticated;
grant execute on function public.resolve_board_share_link(text) to anon, authenticated;
grant execute on function public.create_board_comment(uuid, text, uuid, uuid, numeric, numeric) to authenticated;
grant execute on function public.create_shared_comment(text, text, uuid, uuid, numeric, numeric) to authenticated;
grant execute on function public.update_board_comment(uuid, text) to authenticated;
grant execute on function public.set_comment_resolved(uuid, boolean) to authenticated;
grant execute on function public.delete_board_comment(uuid) to authenticated;
grant execute on function public.register_asset(uuid, uuid, text, text, text, bigint, integer, integer, text) to authenticated;
grant execute on function public.mark_asset_deleted(uuid) to authenticated;
grant execute on function public.get_project_usage(uuid) to authenticated;
grant execute on function public.mark_notification_read(bigint) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.can_comment_project(uuid) to authenticated;

-- Keep direct table writes unavailable for workflow tables; mutations go via RPC.
revoke insert, update, delete on public.board_operation_batches from authenticated, anon;
revoke insert, update, delete on public.project_invitations from authenticated, anon;
revoke insert, update, delete on public.board_share_links from authenticated, anon;
revoke insert, update, delete on public.activity_events from authenticated, anon;
revoke insert, update, delete on public.rate_limit_events from authenticated, anon;
revoke insert, update, delete on public.assets from authenticated, anon;
revoke insert, update, delete on public.comments from authenticated, anon;
revoke update, delete on public.notifications from authenticated, anon;
revoke insert, update, delete on public.projects from authenticated, anon;
revoke insert, update, delete on public.project_members from authenticated, anon;
revoke insert, update, delete on public.boards from authenticated, anon;
revoke insert, update, delete on public.board_sections from authenticated, anon;
revoke insert, update, delete on public.board_items from authenticated, anon;
revoke execute on function public.save_board_snapshot(uuid, numeric, jsonb, jsonb)
from authenticated;

-- Realtime broadcasts now expose the board version through normal board reloads.
create trigger broadcast_operation_changes
after insert on public.board_operation_batches
for each row execute function public.broadcast_board_change();

commit;
