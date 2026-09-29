create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.alert_hook_config (
  id int primary key default 1 check (id = 1),
  hook_url text not null,
  secret text not null
);
revoke all on private.alert_hook_config from public, anon, authenticated;

insert into private.alert_hook_config (id, hook_url, secret)
values (1,
  'https://project--d09c71dc-a064-463b-865f-7cb42297a13b-dev.lovable.app/api/public/hooks/alert-sms',
  encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create or replace function public.verify_alert_hook_secret(_secret text)
returns boolean language sql stable security definer set search_path = private, public as $$
  select exists (select 1 from private.alert_hook_config where secret = _secret)
$$;
revoke execute on function public.verify_alert_hook_secret(text) from public, anon, authenticated;
grant execute on function public.verify_alert_hook_secret(text) to service_role;

create or replace function public.notify_alert_sms()
returns trigger language plpgsql security definer set search_path = private, public, extensions as $$
declare cfg record;
begin
  select hook_url, secret into cfg from private.alert_hook_config where id = 1;
  if cfg is null then return new; end if;
  perform net.http_post(
    url := cfg.hook_url,
    body := jsonb_build_object('alert_id', new.id),
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret', cfg.secret)
  );
  return new;
exception when others then
  raise warning 'notify_alert_sms failed: %', sqlerrm;
  return new;
end $$;
revoke execute on function public.notify_alert_sms() from public, anon, authenticated;

drop trigger if exists alerts_send_sms on public.alerts;
create trigger alerts_send_sms after insert on public.alerts
for each row execute function public.notify_alert_sms();