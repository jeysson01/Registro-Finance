-- Ingresos extra del mes (bonos, ventas, yapes recibidos).
-- Cada usuario solo ve los suyos. Realtime para el medidor en vivo.

create table public.ingresos_adicionales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha date,
  hora time,
  monto numeric(12, 2) not null check (monto > 0),
  detalle text,
  origen text,
  created_at timestamptz not null default now()
);

create index idx_ingresos_adicionales_user_fecha
  on public.ingresos_adicionales (user_id, fecha desc);

alter table public.ingresos_adicionales enable row level security;

create policy "ingresos_adicionales_all_own"
  on public.ingresos_adicionales
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.ingresos_adicionales;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
