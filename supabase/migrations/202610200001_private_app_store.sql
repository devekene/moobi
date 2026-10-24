-- Run once in the Moobi Supabase project. No public discovery or client writes.
create table public.private_apps (
  id text primary key check (id ~ '^[a-z][a-z0-9.-]{2,63}$'),
  owner_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 60),
  description text not null default '' check (length(description) <= 1000),
  created_at timestamptz not null default now()
);
create table public.private_app_members (
  app_id text not null references public.private_apps(id),
  user_id uuid not null references auth.users(id),
  primary key (app_id, user_id)
);
create table public.private_releases (
  id uuid primary key default gen_random_uuid(),
  app_id text not null references public.private_apps(id),
  version text not null check (version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'),
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  byte_size integer not null check (byte_size between 1 and 262144),
  package_path text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  unique (app_id, version)
);
create table public.private_library (
  user_id uuid not null references auth.users(id),
  app_id text not null references public.private_apps(id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

create function public.can_read_private_app(target_app text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.private_apps a where a.id = target_app
    and (a.owner_id = auth.uid() or exists (
      select 1 from public.private_app_members m where m.app_id = a.id and m.user_id = auth.uid()
    )));
$$;
revoke all on function public.can_read_private_app(text) from public;
grant execute on function public.can_read_private_app(text) to authenticated;

alter table public.private_apps enable row level security;
alter table public.private_app_members enable row level security;
alter table public.private_releases enable row level security;
alter table public.private_library enable row level security;
revoke all on public.private_apps, public.private_app_members, public.private_releases, public.private_library from anon, authenticated;
grant select on public.private_apps, public.private_app_members, public.private_releases, public.private_library to authenticated;
grant all on public.private_apps, public.private_app_members, public.private_releases, public.private_library to service_role;
create policy private_app_read on public.private_apps for select to authenticated
  using (public.can_read_private_app(id));
create policy private_member_read on public.private_app_members for select to authenticated
  using (user_id = auth.uid());
create policy private_release_read on public.private_releases for select to authenticated
  using (public.can_read_private_app(app_id) and (status = 'published' or exists (
    select 1 from public.private_apps a where a.id = app_id and a.owner_id = auth.uid()
  )));
create policy private_library_read on public.private_library for select to authenticated
  using (user_id = auth.uid() and public.can_read_private_app(app_id));

-- Membership is granted server-side after the route verifies the owner. A
-- service-only function resolves a verified account email without exposing auth.users.
create function public.grant_private_app(target_app text, member_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare member_id uuid;
begin
  select id into member_id from auth.users where lower(email) = lower(trim(member_email)) and email_confirmed_at is not null;
  if member_id is null then raise exception 'The recipient needs a confirmed Moobi account first.'; end if;
  insert into public.private_app_members(app_id, user_id) values(target_app, member_id) on conflict do nothing;
end;
$$;
revoke all on function public.grant_private_app(text, text) from public, anon, authenticated;
grant execute on function public.grant_private_app(text, text) to service_role;

create function public.protect_private_release() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Released version identity cannot be deleted.'; end if;
  if (new.id, new.app_id, new.version, new.digest, new.byte_size, new.package_path, new.created_at)
    is distinct from (old.id, old.app_id, old.version, old.digest, old.byte_size, old.package_path, old.created_at)
    or (old.status = 'published' and new.status <> 'published') then
    raise exception 'Release files and identity are immutable.';
  end if;
  return new;
end;
$$;
create trigger private_release_immutable before update or delete on public.private_releases
  for each row execute function public.protect_private_release();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('private-app-releases', 'private-app-releases', false, 262144, array['application/json'])
  on conflict (id) do update set public = false, file_size_limit = 262144, allowed_mime_types = array['application/json'];
-- No storage.objects policies are granted to anon/authenticated for this bucket.
-- Only validated server routes use the service role; packages never become public URLs.
