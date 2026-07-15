-- ============================================================
-- CastConnect — Application guards (Casting/Jobs edge cases)
--  * reject applying to a closed / past-deadline call (server-side)
--  * decrement applicant_count when an application is withdrawn
--  * allow a user to delete (withdraw) only their own application
-- Idempotent; already applied to the live project via MCP.
-- ============================================================

create or replace function public.check_application_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_deadline date;
begin
  select status, deadline into v_status, v_deadline
  from public.casting_calls where id = new.casting_call_id;

  if v_status is null then
    raise exception 'This casting call no longer exists.' using errcode = 'P0001';
  end if;
  if v_status <> 'open' then
    raise exception 'This casting call is closed.' using errcode = 'P0001';
  end if;
  if v_deadline is not null and v_deadline < current_date then
    raise exception 'The application deadline has passed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_application_open on public.applications;
create trigger trg_check_application_open
  before insert on public.applications
  for each row execute function public.check_application_open();

create or replace function public.decrement_applicant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.casting_calls
    set applicant_count = greatest(applicant_count - 1, 0)
  where id = old.casting_call_id;
  return old;
end;
$$;

drop trigger if exists on_application_deleted on public.applications;
create trigger on_application_deleted
  after delete on public.applications
  for each row execute function public.decrement_applicant_count();

drop policy if exists "applications_delete" on public.applications;
create policy "applications_delete" on public.applications
  for delete using (auth.uid() = applicant_id);
