-- Keep SECURITY DEFINER token functions compatible with Supabase's pgcrypto
-- installation, which lives in the `extensions` schema.

begin;

alter function public.create_project_invitation(
  uuid, text, public.project_role, boolean, integer
) set search_path = pg_catalog, extensions;

alter function public.accept_project_invitation(text)
  set search_path = pg_catalog, extensions;

alter function public.create_board_share_link(
  uuid, public.share_permission, timestamptz
) set search_path = pg_catalog, extensions;

alter function public.resolve_board_share_link(text)
  set search_path = pg_catalog, extensions;

alter function public.create_shared_comment(
  text, text, uuid, uuid, numeric, numeric
) set search_path = pg_catalog, extensions;

commit;
