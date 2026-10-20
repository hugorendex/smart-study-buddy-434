create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'trial',
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '10 days'),
  premium_until timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.user_plans to authenticated;
grant all on public.user_plans to service_role;
alter table public.user_plans enable row level security;
create policy "Users read own plan" on public.user_plans for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all plans" on public.user_plans for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update plans" on public.user_plans for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_plans (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created_plan after insert on auth.users
  for each row execute function public.handle_new_user_plan();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users can view own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all subscriptions" on public.subscriptions for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.has_premium_access(_user_id uuid, _env text default 'sandbox')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id and environment = _env
      and ((status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
           or (status = 'canceled' and current_period_end > now()))
  ) or exists (
    select 1 from public.user_plans
    where user_id = _user_id and (trial_ends_at > now() or (premium_until is not null and premium_until > now()))
  )
$$;