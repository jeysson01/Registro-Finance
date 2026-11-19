-- Control de Gastos — esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default 'Usuario',
  ingreso_mensual numeric(12, 2) not null default 0 check (ingreso_mensual >= 0),
  objetivo_ahorro_pct numeric(5, 2) not null default 30 check (objetivo_ahorro_pct >= 0 and objetivo_ahorro_pct <= 100),
  created_at timestamptz not null default now()
);

create table public.gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  monto numeric(12, 2) not null check (monto >= 0),
  created_at timestamptz not null default now()
);

create table public.metas_ahorro (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  objetivo numeric(12, 2) not null check (objetivo > 0),
  actual numeric(12, 2) not null default 0 check (actual >= 0),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha date,
  hora time,
  categoria text check (categoria in ('Gastos fijos', 'Fondo emergencia', 'Caprichos')),
  detalle text,
  banco text,
  monto numeric(12, 2) check (monto is null or monto >= 0),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  numero_operacion text,
  destinatario text,
  remitente text,
  imagen_url text,
  estado_revision text not null default 'confirmado' check (estado_revision in ('confirmado', 'pendiente')),
  confianza numeric(4, 3) check (confianza is null or (confianza >= 0 and confianza <= 1)),
  tipo text not null default 'gasto' check (tipo in ('gasto', 'ingreso')),
  estado_comprobante text check (estado_comprobante in ('exitoso', 'fallido')),
  aplicado_a_ingreso boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reglas_categoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  destinatario_norm text not null,
  categoria text not null check (categoria in ('Gastos fijos', 'Fondo emergencia', 'Caprichos')),
  created_at timestamptz not null default now(),
  unique (user_id, destinatario_norm)
);

create index idx_gastos_fijos_user on public.gastos_fijos (user_id);
create index idx_metas_user on public.metas_ahorro (user_id);
create index idx_expenses_user_fecha on public.expenses (user_id, fecha desc);
create index idx_reglas_user on public.reglas_categoria (user_id);

-- Evita registrar dos veces el mismo voucher.
create unique index expenses_dedupe
  on public.expenses (user_id, banco, numero_operacion)
  where numero_operacion is not null and banco is not null;

-- ---------------------------------------------------------------------------
-- Perfil automático (función en schema privado, no expuesto)
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuario'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.gastos_fijos enable row level security;
alter table public.metas_ahorro enable row level security;
alter table public.expenses enable row level security;
alter table public.reglas_categoria enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "gastos_fijos_all_own" on public.gastos_fijos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "metas_all_own" on public.metas_ahorro
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "expenses_all_own" on public.expenses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reglas_all_own" on public.reglas_categoria
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: capturas de vouchers (carpeta = user id)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('vouchers', 'vouchers', false)
on conflict (id) do nothing;

create policy "vouchers_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vouchers_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vouchers_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vouchers_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
