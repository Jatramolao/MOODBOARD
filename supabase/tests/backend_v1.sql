-- Transactional integration checks for the collaborative backend.
-- Run after every migration through
-- 202608080001_validate_board_item_assets.sql in the Supabase SQL editor.
-- No records persist: the entire test is rolled back.

begin;

do $$
declare
  missing_relations text[];
  missing_functions text[];
begin
  select array_agg(required.name) into missing_relations
  from (values
    ('board_operation_batches'),
    ('project_invitations'),
    ('board_share_links'),
    ('assets'),
    ('activity_events'),
    ('notifications'),
    ('rate_limit_events')
  ) required(name)
  where to_regclass('public.' || required.name) is null;

  if missing_relations is not null then
    raise exception 'QA missing relations: %', missing_relations;
  end if;

  select array_agg(required.signature) into missing_functions
  from (values
    ('public.create_project_with_board(text,text)'),
    ('public.apply_board_operations(uuid,bigint,uuid,jsonb)'),
    ('public.create_project_invitation(uuid,text,public.project_role,boolean,integer)'),
    ('public.create_board_share_link(uuid,public.share_permission,timestamp with time zone)'),
    ('public.register_asset(uuid,uuid,text,text,text,bigint,integer,integer,text)'),
    ('public.normalize_and_validate_board_item()')
  ) required(signature)
  where to_regprocedure(required.signature) is null;

  if missing_functions is not null then
    raise exception 'QA missing functions: %', missing_functions;
  end if;

  if exists (
    select 1 from pg_class
    where oid in (
      'public.board_operation_batches'::regclass,
      'public.project_invitations'::regclass,
      'public.board_share_links'::regclass,
      'public.assets'::regclass,
      'public.activity_events'::regclass,
      'public.notifications'::regclass,
      'public.rate_limit_events'::regclass
    ) and not relrowsecurity
  ) then
    raise exception 'QA expected RLS on every backend relation';
  end if;
end;
$$;

create temp table qa_backend_context (
  user_id uuid not null,
  project_id uuid,
  board_id uuid,
  section_id uuid,
  board_version bigint,
  asset_id uuid,
  item_id uuid not null default gen_random_uuid(),
  foreign_project_id uuid,
  foreign_board_id uuid,
  foreign_asset_id uuid,
  foreign_item_id uuid not null default gen_random_uuid(),
  foreign_operation_id uuid not null default gen_random_uuid(),
  invitation_token text,
  share_token text,
  operation_id uuid not null default gen_random_uuid(),
  delete_operation_id uuid not null default gen_random_uuid()
) on commit drop;

insert into qa_backend_context(user_id)
select id from auth.users order by created_at limit 1;

do $$
begin
  if not exists (select 1 from qa_backend_context) then
    raise exception 'QA requires at least one Auth user';
  end if;
end;
$$;

grant select, update on qa_backend_context to authenticated;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id from qa_backend_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

with created as (
  select * from public.create_project_with_board(
    'QA backend ' || gen_random_uuid()::text,
    'Prueba transaccional'
  )
)
update qa_backend_context context
set project_id = created.project_id,
    board_id = created.board_id,
    board_version = 1
from created;

-- The project RPC runs as SECURITY DEFINER, while the surrounding test is
-- impersonating `authenticated`. Resolve the bootstrap section as postgres so
-- the test harness does not depend on RLS visibility inside the same statement.
-- All product operations below still run as the authenticated project owner.
reset role;

update qa_backend_context context
set section_id = (
  select id from public.board_sections
  where board_id = context.board_id
  order by position
  limit 1
);

set local role authenticated;

do $$
begin
  if not exists (
    select 1
    from qa_backend_context context
    join public.project_members member
      on member.project_id = context.project_id
      and member.user_id = context.user_id
      and member.role = 'owner'
    join public.boards board on board.id = context.board_id
    join public.board_sections section on section.board_id = board.id
  ) then
    raise exception 'QA project bootstrap failed';
  end if;
end;
$$;

with registered as (
  select public.register_asset(
    context.project_id,
    context.board_id,
    context.project_id::text || '/' || context.board_id::text || '/qa-first-image.png',
    'qa-first-image.png',
    'image/png',
    128
  ) as asset_id
  from qa_backend_context context
)
update qa_backend_context context
set asset_id = registered.asset_id
from registered;

with applied as (
  select result.*
  from qa_backend_context context
  cross join lateral public.apply_board_operations(
    context.board_id,
    context.board_version,
    context.operation_id,
    jsonb_build_array(jsonb_build_object(
      'type', 'item.create',
      'payload', jsonb_build_object(
        'id', context.item_id,
        'section_id', context.section_id,
        'type', 'image',
        'x', 72,
        'y', 136,
        'width', 220,
        'height', 270,
        'title', 'QA first image',
        'content', null,
        'image_path', context.project_id::text || '/' || context.board_id::text || '/qa-first-image.png',
        'source_url', null,
        'colors', 'null'::jsonb,
        'asset_id', context.asset_id
      )
    ))
  ) result
)
update qa_backend_context context
set board_version = applied.board_version
from applied
where applied.applied;

do $$
declare
  duplicate_result record;
begin
  select result.* into duplicate_result
  from qa_backend_context context
  cross join lateral public.apply_board_operations(
    context.board_id,
    1,
    context.operation_id,
    jsonb_build_array(jsonb_build_object(
      'type', 'item.create',
      'payload', jsonb_build_object(
        'id', context.item_id,
        'section_id', context.section_id,
        'type', 'image',
        'x', 72,
        'y', 136,
        'width', 220,
        'height', 270,
        'image_path', context.project_id::text || '/' || context.board_id::text || '/qa-first-image.png',
        'colors', 'null'::jsonb,
        'asset_id', context.asset_id
      )
    ))
  ) result;

  if duplicate_result.applied or duplicate_result.board_version <> 2 then
    raise exception 'QA operation idempotency failed';
  end if;
  if not exists (
    select 1
    from public.board_items item
    join qa_backend_context context on context.item_id = item.id
    where item.board_id = context.board_id
      and item.asset_id = context.asset_id
      and item.image_path = context.project_id::text || '/' || context.board_id::text || '/qa-first-image.png'
      and item.colors is null
      and item.deleted_at is null
  ) then
    raise exception 'QA first image item was not persisted consistently';
  end if;
  if (
    select count(*) from public.board_items item
    join qa_backend_context context on context.item_id = item.id
  ) <> 1 then
    raise exception 'QA idempotent retry duplicated the first image';
  end if;
  if (select version from public.boards where id = (select board_id from qa_backend_context)) <> 2 then
    raise exception 'QA board version did not advance exactly once';
  end if;
end;
$$;

with created as (
  select * from public.create_project_with_board(
    'QA foreign asset ' || gen_random_uuid()::text,
    'Prueba de aislamiento de assets'
  )
)
update qa_backend_context context
set foreign_project_id = created.project_id,
    foreign_board_id = created.board_id
from created;

with registered as (
  select public.register_asset(
    context.foreign_project_id,
    context.foreign_board_id,
    context.foreign_project_id::text || '/' || context.foreign_board_id::text || '/qa-foreign-image.png',
    'qa-foreign-image.png',
    'image/png',
    128
  ) as asset_id
  from qa_backend_context context
)
update qa_backend_context context
set foreign_asset_id = registered.asset_id
from registered;

do $$
declare
  rejection_message text;
begin
  begin
    perform 1
    from qa_backend_context context
    cross join lateral public.apply_board_operations(
      context.board_id,
      context.board_version,
      context.foreign_operation_id,
      jsonb_build_array(jsonb_build_object(
        'type', 'item.create',
        'payload', jsonb_build_object(
          'id', context.foreign_item_id,
          'section_id', context.section_id,
          'type', 'image',
          'width', 220,
          'height', 270,
          'image_path', context.foreign_project_id::text || '/' || context.foreign_board_id::text || '/qa-foreign-image.png',
          'asset_id', context.foreign_asset_id
        )
      ))
    ) result;
  exception when others then
    get stacked diagnostics rejection_message = message_text;
  end;

  if rejection_message is null
    or rejection_message not like 'VALIDATION_ERROR: asset board mismatch%'
  then
    raise exception 'QA expected foreign asset rejection, got: %', rejection_message;
  end if;
  if (select version from public.boards where id = (select board_id from qa_backend_context)) <> 2 then
    raise exception 'QA foreign asset rejection changed the board version';
  end if;
  if exists (
    select 1 from public.board_items item
    join qa_backend_context context on context.foreign_item_id = item.id
  ) then
    raise exception 'QA foreign asset rejection persisted an item';
  end if;
  if exists (
    select 1 from public.board_operation_batches batch
    join qa_backend_context context on context.foreign_operation_id = batch.operation_id
      and context.board_id = batch.board_id
  ) then
    raise exception 'QA foreign asset rejection persisted an operation batch';
  end if;
end;
$$;

do $$
declare
  rejection_message text;
begin
  begin
    perform public.mark_asset_deleted((select asset_id from qa_backend_context));
  exception when others then
    get stacked diagnostics rejection_message = message_text;
  end;

  if rejection_message is null or rejection_message not like 'ASSET_IN_USE%' then
    raise exception 'QA expected ASSET_IN_USE for an active first image';
  end if;
  if (select version from public.boards where id = (select board_id from qa_backend_context)) <> 2 then
    raise exception 'QA rejected asset deletion changed the board version';
  end if;
end;
$$;

with deleted as (
  select result.*
  from qa_backend_context context
  cross join lateral public.apply_board_operations(
    context.board_id,
    context.board_version,
    context.delete_operation_id,
    jsonb_build_array(jsonb_build_object(
      'type', 'item.delete',
      'payload', jsonb_build_object('id', context.item_id)
    ))
  ) result
)
update qa_backend_context context
set board_version = deleted.board_version
from deleted
where deleted.applied;

select public.mark_asset_deleted(asset_id)
from qa_backend_context;

do $$
begin
  if (select board_version from qa_backend_context) <> 3 then
    raise exception 'QA item deletion did not advance the board to version 3';
  end if;
  if not exists (
    select 1 from public.board_items item
    join qa_backend_context context on context.item_id = item.id
    where item.deleted_at is not null
  ) then
    raise exception 'QA item deletion was not persisted';
  end if;
  if not exists (
    select 1 from public.assets asset
    join qa_backend_context context on context.asset_id = asset.id
    where asset.status = 'deleted' and asset.deleted_at is not null
  ) then
    raise exception 'QA asset deletion after item removal failed';
  end if;
  if (
    select count(*) from public.board_operation_batches batch
    join qa_backend_context context on context.board_id = batch.board_id
  ) <> 2 then
    raise exception 'QA expected exactly two operation batches';
  end if;
end;
$$;

with invitation as (
  select created.*
  from qa_backend_context context
  cross join lateral public.create_project_invitation(
    context.project_id,
    'qa-integration@example.invalid',
    'viewer',
    false,
    1
  ) created
)
update qa_backend_context context
set invitation_token = invitation.invitation_token
from invitation;

with share_link as (
  select created.*
  from qa_backend_context context
  cross join lateral public.create_board_share_link(
    context.board_id,
    'comment',
    null
  ) created
)
update qa_backend_context context
set share_token = share_link.share_token
from share_link;

do $$
declare
  shared_payload jsonb;
  shared_comment_id uuid;
begin
  if length((select invitation_token from qa_backend_context)) <> 64 then
    raise exception 'QA invitation token generation failed';
  end if;
  if length((select share_token from qa_backend_context)) <> 64 then
    raise exception 'QA share token generation failed';
  end if;

  select public.resolve_board_share_link(context.share_token)
  into shared_payload
  from qa_backend_context context;

  if shared_payload #>> '{board,id}' <>
    (select board_id::text from qa_backend_context) then
    raise exception 'QA share token resolution failed';
  end if;

  select public.create_shared_comment(
    context.share_token,
    'QA shared comment'
  )
  into shared_comment_id
  from qa_backend_context context;

  if shared_comment_id is null then
    raise exception 'QA shared comment creation failed';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text,
  true
);

do $$
begin
  if exists (
    select 1 from public.projects
    where id = (select project_id from qa_backend_context)
  ) then
    raise exception 'QA RLS exposed a project to a non-member';
  end if;
end;
$$;

reset role;
rollback;

select 'backend_v1 QA passed' as result;
