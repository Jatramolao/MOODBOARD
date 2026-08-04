-- Transactional integration checks for the collaborative backend.
-- Run after 202608030001_backend_v1.sql in the Supabase SQL editor.
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
    ('public.register_asset(uuid,uuid,text,text,text,bigint,integer,integer,text)')
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
  board_version bigint,
  invitation_token text,
  share_token text,
  operation_id uuid not null default gen_random_uuid()
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

with applied as (
  select result.*
  from qa_backend_context context
  cross join lateral public.apply_board_operations(
    context.board_id,
    context.board_version,
    context.operation_id,
    '[{"type":"board.update","payload":{"zoom":1}}]'::jsonb
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
    '[{"type":"board.update","payload":{"zoom":1}}]'::jsonb
  ) result;

  if duplicate_result.applied or duplicate_result.board_version <> 2 then
    raise exception 'QA operation idempotency failed';
  end if;
  if (select version from public.boards where id = (select board_id from qa_backend_context)) <> 2 then
    raise exception 'QA board version did not advance exactly once';
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
