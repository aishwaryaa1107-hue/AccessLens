create extension if not exists pgcrypto;

create table if not exists public.hazard_reports (
  id uuid primary key,
  client_submission_id uuid not null unique,
  category text not null check (category in ('broken_footpath','open_drain','construction','blocked_footpath','parked_vehicle','unsafe_crossing','damaged_steps','missing_ramp','other')),
  description text not null check (char_length(trim(description)) between 8 and 280),
  notes text check (notes is null or char_length(notes) <= 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_accuracy double precision check (location_accuracy is null or location_accuracy >= 0),
  status text not null default 'pending' check (status in ('pending','verified','resolved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_activity (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique,
  report_id uuid not null references public.hazard_reports(id) on delete cascade,
  action text not null default 'still_present' check (action = 'still_present'),
  created_at timestamptz not null default now()
);

create index if not exists hazard_reports_location_idx on public.hazard_reports using gist (point(longitude, latitude));
create index if not exists hazard_reports_status_created_idx on public.hazard_reports (status, created_at desc);
create index if not exists hazard_reports_category_idx on public.hazard_reports (category);
create index if not exists report_activity_report_created_idx on public.report_activity (report_id, created_at desc);

alter table public.hazard_reports enable row level security;
alter table public.report_activity enable row level security;

-- The public map omits private submission IDs and generalizes locations to
-- three decimal places. Direct table access stays closed to browser clients.
create or replace view public.community_hazard_reports with (security_barrier = true) as
select id, category, description, notes,
       round(latitude::numeric, 3)::double precision as latitude,
       round(longitude::numeric, 3)::double precision as longitude,
       status, created_at, updated_at
from public.hazard_reports where status <> 'rejected';
revoke all on public.hazard_reports from anon, authenticated;
revoke all on public.report_activity from anon, authenticated;
grant select on public.community_hazard_reports to anon;

-- Anonymous community submissions are limited to pending reports. Database
-- constraints validate every field and the unique client ID makes retries
-- idempotent. Photos are deliberately local-only in no-account mode.
create or replace function public.submit_community_report(
  report_id uuid,
  submission_id uuid,
  report_category text,
  report_description text,
  report_notes text,
  report_latitude double precision,
  report_longitude double precision,
  report_location_accuracy double precision
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare saved_id uuid;
begin
  insert into public.hazard_reports (
    id, client_submission_id, category, description, notes, latitude, longitude,
    location_accuracy, status
  ) values (
    report_id, submission_id, report_category, trim(report_description), report_notes,
    report_latitude, report_longitude, report_location_accuracy, 'pending'
  )
  on conflict (client_submission_id) do update
    set client_submission_id = excluded.client_submission_id
  returning id into saved_id;
  return saved_id;
end;
$$;
revoke all on function public.submit_community_report(uuid, uuid, text, text, text, double precision, double precision, double precision) from public;
grant execute on function public.submit_community_report(uuid, uuid, text, text, text, double precision, double precision, double precision) to anon;

create or replace function public.submit_report_feedback(target_report_id uuid, feedback_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.hazard_reports where id = target_report_id and status in ('pending','verified')) then
    raise exception 'Report not found or inactive';
  end if;
  insert into public.report_activity (feedback_id, report_id, action)
    values (feedback_id, target_report_id, 'still_present')
    on conflict (feedback_id) do nothing;
end;
$$;
revoke all on function public.submit_report_feedback(uuid, uuid) from public;
grant execute on function public.submit_report_feedback(uuid, uuid) to anon;

-- Moderation is performed by a project owner in Supabase Studio. The browser
-- app has no sign-in screen and cannot edit verification status.
