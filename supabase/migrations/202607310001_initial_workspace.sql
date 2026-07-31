-- Moodboard Editorial — first production schema
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create type public.project_role as enum ('owner', 'editor', 'viewer');
create type public.project_status as enum ('active', 'archived');
create type public.board_item_type as enum ('image', 'note', 'palette');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 90),
  client_name text check (client_name is null or char_length(client_name) <= 90),
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 90),
  position integer not null default 0 check (position >= 0),
  zoom numeric(4, 2) not null default 0.82 check (zoom between 0.5 and 1.25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_sections (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 90),
  position integer not null default 0 check (position >= 0),
  width numeric(8, 2) not null default 620 check (width between 420 and 2400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  section_id uuid not null references public.board_sections(id) on delete cascade,
  type public.board_item_type not null,
  x numeric(9, 2) not null default 0,
  y numeric(9, 2) not null default 0,
  width numeric(8, 2) not null check (width between 80 and 2400),
  height numeric(8, 2) not null check (height between 60 and 2400),
  title text check (title is null or char_length(title) <= 240),
  content text check (content is null or char_length(content) <= 10000),
  image_path text,
  source_url text,
  colors jsonb check (
    colors is null or
    (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 24)
  ),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (image_path is null or source_url is null)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  item_id uuid references public.board_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 4000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_members_user_idx on public.project_members(user_id);
create index boards_project_idx on public.boards(project_id, position);
create index board_sections_board_idx on public.board_sections(board_id, position);
create index board_items_board_idx on public.board_items(board_id);
create index board_items_section_idx on public.board_items(section_id);
create index comments_board_idx on public.comments(board_id, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger boards_updated_at before update on public.boards
for each row execute function public.set_updated_at();
create trigger board_sections_updated_at before update on public.board_sections
for each row execute function public.set_updated_at();
create trigger board_items_updated_at before update on public.board_items
for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Projects can already contain Auth users when this migration is introduced.
insert into public.profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

create function public.add_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_project_created
after insert on public.projects
for each row execute function public.add_project_owner();

create function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
  );
$$;

create function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
      and role in ('owner', 'editor')
  );
$$;

create function public.is_project_owner(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

create function public.board_project_id(target_board_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select project_id from public.boards where id = target_board_id;
$$;

create function public.project_owner_id(target_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select owner_id from public.projects where id = target_project_id;
$$;

create function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.can_edit_project(uuid) from public, anon;
revoke execute on function public.is_project_owner(uuid) from public, anon;
revoke execute on function public.board_project_id(uuid) from public, anon;
revoke execute on function public.project_owner_id(uuid) from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.board_project_id(uuid) to authenticated;
grant execute on function public.project_owner_id(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.boards enable row level security;
alter table public.board_sections enable row level security;
alter table public.board_items enable row level security;
alter table public.comments enable row level security;

create policy "profiles_visible_to_authenticated"
on public.profiles for select to authenticated
using (true);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "projects_select_members"
on public.projects for select to authenticated
using (public.is_project_member(id));

create policy "projects_insert_owner"
on public.projects for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "projects_update_editors"
on public.projects for update to authenticated
using (public.can_edit_project(id))
with check (
  public.can_edit_project(id)
  and owner_id = public.project_owner_id(id)
);

create policy "projects_delete_owner"
on public.projects for delete to authenticated
using (public.is_project_owner(id));

create policy "members_select_project"
on public.project_members for select to authenticated
using (public.is_project_member(project_id));

create policy "members_insert_owner"
on public.project_members for insert to authenticated
with check (public.is_project_owner(project_id));

create policy "members_update_owner"
on public.project_members for update to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "members_delete_owner"
on public.project_members for delete to authenticated
using (
  public.is_project_owner(project_id)
  and not (user_id = (select auth.uid()) and role = 'owner')
);

create policy "boards_select_members"
on public.boards for select to authenticated
using (public.is_project_member(project_id));

create policy "boards_insert_editors"
on public.boards for insert to authenticated
with check (public.can_edit_project(project_id));

create policy "boards_update_editors"
on public.boards for update to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

create policy "boards_delete_editors"
on public.boards for delete to authenticated
using (public.can_edit_project(project_id));

create policy "sections_select_members"
on public.board_sections for select to authenticated
using (public.is_project_member(public.board_project_id(board_id)));

create policy "sections_insert_editors"
on public.board_sections for insert to authenticated
with check (public.can_edit_project(public.board_project_id(board_id)));

create policy "sections_update_editors"
on public.board_sections for update to authenticated
using (public.can_edit_project(public.board_project_id(board_id)))
with check (public.can_edit_project(public.board_project_id(board_id)));

create policy "sections_delete_editors"
on public.board_sections for delete to authenticated
using (public.can_edit_project(public.board_project_id(board_id)));

create policy "items_select_members"
on public.board_items for select to authenticated
using (public.is_project_member(public.board_project_id(board_id)));

create policy "items_insert_editors"
on public.board_items for insert to authenticated
with check (public.can_edit_project(public.board_project_id(board_id)));

create policy "items_update_editors"
on public.board_items for update to authenticated
using (public.can_edit_project(public.board_project_id(board_id)))
with check (public.can_edit_project(public.board_project_id(board_id)));

create policy "items_delete_editors"
on public.board_items for delete to authenticated
using (public.can_edit_project(public.board_project_id(board_id)));

create policy "comments_select_members"
on public.comments for select to authenticated
using (public.is_project_member(public.board_project_id(board_id)));

create policy "comments_insert_members"
on public.comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_project_member(public.board_project_id(board_id))
);

create policy "comments_update_author_or_editor"
on public.comments for update to authenticated
using (
  user_id = (select auth.uid())
  or public.can_edit_project(public.board_project_id(board_id))
)
with check (
  user_id = (select auth.uid())
  or public.can_edit_project(public.board_project_id(board_id))
);

create policy "comments_delete_author_or_editor"
on public.comments for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.can_edit_project(public.board_project_id(board_id))
);

create function public.create_project_with_board(
  p_name text,
  p_client_name text default null
)
returns table (project_id uuid, board_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid;
  created_project_id uuid;
  created_board_id uuid;
begin
  requesting_user_id := (select auth.uid());
  if requesting_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.projects (owner_id, name, client_name)
  values (requesting_user_id, trim(p_name), nullif(trim(p_client_name), ''))
  returning id into created_project_id;

  insert into public.boards (project_id, name)
  values (created_project_id, 'Tablero general')
  returning id into created_board_id;

  insert into public.board_sections (board_id, name, position, width)
  values (created_board_id, 'Tablero principal', 0, 1040);

  return query select created_project_id, created_board_id;
end;
$$;

revoke execute on function public.create_project_with_board(text, text)
from public, anon;
grant execute on function public.create_project_with_board(text, text) to authenticated;

create function public.save_board_snapshot(
  p_board_id uuid,
  p_zoom numeric,
  p_sections jsonb,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.can_edit_project(public.board_project_id(p_board_id)) then
    raise exception 'No tienes permiso para editar este tablero';
  end if;

  update public.boards
  set zoom = greatest(0.5, least(p_zoom, 1.25))
  where id = p_board_id;

  insert into public.board_sections (id, board_id, name, position, width)
  select
    section.id,
    p_board_id,
    left(section.name, 90),
    section.position,
    greatest(420, least(section.width, 2400))
  from jsonb_to_recordset(coalesce(p_sections, '[]'::jsonb))
    as section(id uuid, name text, position integer, width numeric)
  on conflict (id) do update set
    name = excluded.name,
    position = excluded.position,
    width = excluded.width
  where board_sections.board_id = p_board_id;

  insert into public.board_items (
    id, board_id, section_id, type, x, y, width, height,
    title, content, image_path, source_url, colors
  )
  select
    item.id,
    p_board_id,
    item.section_id,
    item.type::public.board_item_type,
    item.x,
    item.y,
    item.width,
    item.height,
    item.title,
    item.content,
    item.image_path,
    item.source_url,
    item.colors
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
    id uuid,
    section_id uuid,
    type text,
    x numeric,
    y numeric,
    width numeric,
    height numeric,
    title text,
    content text,
    image_path text,
    source_url text,
    colors jsonb
  )
  inner join public.board_sections section
    on section.id = item.section_id and section.board_id = p_board_id
  on conflict (id) do update set
    section_id = excluded.section_id,
    type = excluded.type,
    x = excluded.x,
    y = excluded.y,
    width = excluded.width,
    height = excluded.height,
    title = excluded.title,
    content = excluded.content,
    image_path = excluded.image_path,
    source_url = excluded.source_url,
    colors = excluded.colors
  where board_items.board_id = p_board_id;

  delete from public.board_items
  where board_id = p_board_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
      where public.try_uuid(item ->> 'id') = board_items.id
    );

  delete from public.board_sections
  where board_id = p_board_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) section
      where public.try_uuid(section ->> 'id') = board_sections.id
    );
end;
$$;

revoke execute on function public.save_board_snapshot(uuid, numeric, jsonb, jsonb)
from public, anon;
grant execute on function public.save_board_snapshot(uuid, numeric, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-assets',
  'board-assets',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "assets_select_project_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'board-assets'
  and public.is_project_member(
    public.try_uuid((storage.foldername(name))[1])
  )
);

create policy "assets_insert_project_editors"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'board-assets'
  and public.can_edit_project(
    public.try_uuid((storage.foldername(name))[1])
  )
);

create policy "assets_update_project_editors"
on storage.objects for update to authenticated
using (
  bucket_id = 'board-assets'
  and public.can_edit_project(
    public.try_uuid((storage.foldername(name))[1])
  )
)
with check (
  bucket_id = 'board-assets'
  and public.can_edit_project(
    public.try_uuid((storage.foldername(name))[1])
  )
);

create policy "assets_delete_project_editors"
on storage.objects for delete to authenticated
using (
  bucket_id = 'board-assets'
  and public.can_edit_project(
    public.try_uuid((storage.foldername(name))[1])
  )
);

create function public.broadcast_board_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_board_id uuid;
begin
  changed_board_id := coalesce(new.board_id, old.board_id);
  perform realtime.broadcast_changes(
    'board:' || changed_board_id::text,
    'board_changed',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger broadcast_section_changes
after insert or update or delete on public.board_sections
for each row execute function public.broadcast_board_change();

create trigger broadcast_item_changes
after insert or update or delete on public.board_items
for each row execute function public.broadcast_board_change();

create trigger broadcast_comment_changes
after insert or update or delete on public.comments
for each row execute function public.broadcast_board_change();

create policy "members_receive_board_realtime"
on realtime.messages for select to authenticated
using (
  realtime.topic() like 'board:%'
  and public.is_project_member(
    public.board_project_id(
      public.try_uuid(split_part(realtime.topic(), ':', 2))
    )
  )
);

create policy "members_send_board_presence"
on realtime.messages for insert to authenticated
with check (
  realtime.topic() like 'board:%'
  and public.is_project_member(
    public.board_project_id(
      public.try_uuid(split_part(realtime.topic(), ':', 2))
    )
  )
);
