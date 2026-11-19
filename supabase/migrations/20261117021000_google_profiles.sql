-- Google Auth: avatar, onboarding y perfil automático desde metadatos de Google.
-- No usa user_metadata para autorizar; solo rellena el nombre y la foto visibles.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists onboarding_completo boolean not null default false;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nombre,
    avatar_url,
    ingreso_mensual,
    objetivo_ahorro_pct,
    onboarding_completo
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuario'
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    0,
    30,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

-- RLS ya está activo. Se vuelven a declarar por si la migración inicial no se aplicó completa.
alter table public.profiles enable row level security;
alter table public.gastos_fijos enable row level security;
alter table public.metas_ahorro enable row level security;
alter table public.expenses enable row level security;
alter table public.reglas_categoria enable row level security;
