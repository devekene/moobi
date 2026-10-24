-- Additive slice 3 migration. Apply after 202610200001_private_app_store.sql.
-- Package objects remain private; public visibility grants metadata, never object URLs.
create table public.store_publications (
  release_id uuid primary key references public.private_releases(id),
  status text not null check (status in ('pending','approved','rejected','revoked')),
  notes text not null default '' check (length(notes) <= 1000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);
create table public.store_app_controls (
  app_id text primary key references public.private_apps(id),
  suspended boolean not null default false,
  reason text not null default '' check (length(reason) <= 1000)
);
create index store_publications_status on public.store_publications(status);
create index private_releases_app on public.private_releases(app_id);
create index private_library_app on public.private_library(app_id);
alter table public.store_publications enable row level security;
alter table public.store_app_controls enable row level security;
revoke all on public.store_publications, public.store_app_controls from anon, authenticated;
grant select on public.store_publications, public.store_app_controls to anon, authenticated;
grant all on public.store_publications, public.store_app_controls to service_role;

create function public.is_public_release(target_release uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_releases r
   join public.store_publications p on p.release_id=r.id
   where r.id=target_release and r.status='published' and p.status='approved'
   and not exists(select 1 from public.store_app_controls c where c.app_id=r.app_id and c.suspended));
$$;
create function public.is_public_app(target_app text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_releases r where r.app_id=target_app and public.is_public_release(r.id));
$$;
create or replace function public.can_read_private_app(target_app text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_apps a where a.id=target_app and
  (a.owner_id=auth.uid() or exists(select 1 from public.private_app_members m where m.app_id=a.id and m.user_id=auth.uid())
   or exists(select 1 from public.private_library l where l.app_id=a.id and l.user_id=auth.uid())));
$$;
-- Availability is separate from metadata access: libraries retain removal notices.
create function public.store_release_available(target_release uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_releases r join public.private_apps a on a.id=r.app_id
 where r.id=target_release and r.status='published'
 and not exists(select 1 from public.store_app_controls c where c.app_id=r.app_id and c.suspended)
 and not exists(select 1 from public.store_publications p where p.release_id=r.id and p.status='revoked')
 and (public.is_public_release(r.id) or a.owner_id=auth.uid()
   or exists(select 1 from public.private_app_members m where m.app_id=r.app_id and m.user_id=auth.uid())));
$$;
revoke all on function public.is_public_release(uuid), public.is_public_app(text), public.store_release_available(uuid) from public;
grant execute on function public.is_public_release(uuid), public.is_public_app(text), public.store_release_available(uuid) to anon, authenticated;
grant select on public.private_apps, public.private_releases to anon;
create policy public_app_read on public.private_apps for select to anon, authenticated using (public.is_public_app(id));
create policy public_release_read on public.private_releases for select to anon, authenticated using (public.is_public_release(id));
create policy publication_read on public.store_publications for select to authenticated using (
 public.is_public_release(release_id) or exists(select 1 from public.private_releases r where r.id=release_id and public.can_read_private_app(r.app_id))
);
create policy public_publication_read on public.store_publications for select to anon using (public.is_public_release(release_id));
create policy public_app_control_read on public.store_app_controls for select to anon using (public.is_public_app(app_id));
create policy app_control_read on public.store_app_controls for select to authenticated using (public.is_public_app(app_id) or public.can_read_private_app(app_id));

-- Server-only atomic submission/review transitions. Reviewer authority comes from
-- server configuration, never user metadata or a browser-supplied role.
create function public.submit_store_release(target_release uuid, actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.private_releases r join public.private_apps a on a.id=r.app_id
   where r.id=target_release and a.owner_id=actor and r.status='published' for update of r;
 if not found then raise exception 'Only the owner can submit a published release.'; end if;
 if exists(select 1 from public.store_app_controls c join public.private_releases r on r.app_id=c.app_id where r.id=target_release and c.suspended) then
  raise exception 'This app is suspended.'; end if;
 insert into public.store_publications(release_id,status) values(target_release,'pending')
 on conflict(release_id) do nothing;
 -- Rejected/revoked bytes cannot be silently resubmitted. Upload a new version.
 if not exists(select 1 from public.store_publications where release_id=target_release and status='pending') then
  raise exception 'This release already has a review decision. Submit a new version.'; end if;
end;
$$;
create function public.review_store_release(target_release uuid, actor uuid, decision text, review_notes text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if decision not in ('approved','rejected','revoked') or length(trim(review_notes)) not between 1 and 1000 then
  raise exception 'Choose a decision and provide review notes.'; end if;
 perform 1 from public.private_releases r join public.private_apps a on a.id=r.app_id
  where r.id=target_release and a.owner_id<>actor and r.status='published' for update of r;
 if not found then raise exception 'Reviewers cannot review their own releases.'; end if;
 update public.store_publications set status=decision, notes=trim(review_notes),reviewer_id=actor,reviewed_at=now()
 where release_id=target_release and ((status='pending' and decision in ('approved','rejected')) or (status='approved' and decision='revoked'));
 if not found then raise exception 'The review state changed. Refresh before deciding.'; end if;
end;
$$;
revoke all on function public.submit_store_release(uuid,uuid), public.review_store_release(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.submit_store_release(uuid,uuid), public.review_store_release(uuid,uuid,text,text) to service_role;

-- Acquiring a public app must not expose its future private-only releases.
create function public.can_read_store_release(target_release uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_releases r join public.private_apps a on a.id=r.app_id
 where r.id=target_release and (a.owner_id=auth.uid() or (r.status='published' and
  (exists(select 1 from public.private_app_members m where m.app_id=r.app_id and m.user_id=auth.uid())
   or (exists(select 1 from public.private_library l where l.app_id=r.app_id and l.user_id=auth.uid())
       and exists(select 1 from public.store_publications p where p.release_id=r.id and p.status in ('approved','revoked')))))));
$$;
revoke all on function public.can_read_store_release(uuid) from public;
grant execute on function public.can_read_store_release(uuid) to authenticated;
drop policy private_release_read on public.private_releases;
create policy private_release_read on public.private_releases for select to authenticated using(public.can_read_store_release(id));
