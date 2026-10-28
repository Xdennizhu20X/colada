-- ==========================================================
-- SCRIPT DE BASE DE DATOS PARA SUPABASE: VENTA DE COLADA MORADA
-- ==========================================================
-- Copia y pega TODO este contenido en el "SQL Editor" de tu proyecto de Supabase
-- y presiona el botón verde "RUN".

-- 1. CREAR TABLA DE USUARIOS Y VENDEDORES
create table if not exists public.app_users (
  id text primary key,
  username text not null unique,
  name text not null,
  role text default 'vendedor',
  pin text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_users enable row level security;

create policy "Permitir acceso completo a usuarios"
  on public.app_users for all
  using (true)
  with check (true);

-- Insertar usuario Administrador (Dennis)
insert into public.app_users (id, username, name, role, pin)
values ('usr-dennis', 'dennis', 'Dennis', 'admin', '1234')
on conflict (username) do nothing;


-- 2. CREAR TABLA DE PEDIDOS
create table if not exists public.orders (
  id text primary key,
  client_name text not null,
  client_phone text,
  half_liters integer default 0,
  liters integer default 0,
  breads integer default 0,
  combos integer default 0,
  total_liters numeric(5, 2) default 0,
  total_price numeric(10, 2) default 0,
  delivery_type text default 'local',
  delivery_address text,
  delivery_reference text,
  notes text,
  payment_status text default 'pendiente',
  payment_method text default 'efectivo',
  order_status text default 'pendiente',
  created_by_id text,
  created_by_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Permitir lectura de pedidos"
  on public.orders for select
  using (true);

create policy "Permitir insercion de pedidos"
  on public.orders for insert
  with check (true);

create policy "Permitir actualizacion de pedidos"
  on public.orders for update
  using (true);

create policy "Permitir eliminacion de pedidos"
  on public.orders for delete
  using (true);


-- 3. VENTAS POR LOTES (Primera Venta, Segunda Venta, ...)
-- Cada lote guarda una venta completa. Al cerrar un lote sus pedidos quedan
-- archivados y se inicia el siguiente lote con la lista en cero.
create table if not exists public.sales_batches (
  id text primary key,
  sale_number integer not null unique,
  name text not null,
  status text default 'activa',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone,
  total_revenue numeric(10, 2) default 0,
  total_liters numeric(10, 2) default 0,
  total_breads integer default 0,
  total_orders integer default 0
);

alter table public.sales_batches enable row level security;

drop policy if exists "Permitir acceso completo a lotes de venta" on public.sales_batches;

create policy "Permitir acceso completo a lotes de venta"
  on public.sales_batches for all
  using (true)
  with check (true);

-- Solo puede existir una venta activa a la vez
create unique index if not exists sales_batches_single_active
  on public.sales_batches (status)
  where status = 'activa';

-- Insertar la Primera Venta como activa (si el proyecto ya existe, no se duplica)
insert into public.sales_batches (id, sale_number, name, status)
values ('batch-1', 1, 'Primera Venta', 'activa')
on conflict (sale_number) do nothing;


-- 4. VINCULAR CADA PEDIDO A SU VENTA Y ACTUALIZAR COLUMNAS
alter table public.orders add column if not exists sale_number integer default 1;
alter table public.orders add column if not exists combos integer default 0;

create index if not exists orders_sale_number_idx on public.orders (sale_number);

update public.orders set sale_number = 1 where sale_number is null;


-- 5. HABILITAR TIEMPO REAL (REALTIME)
-- Permite que los pedidos nuevos aparezcan al instante en los celulares de todos
do $$
declare
  t text;
begin
  foreach t in array array['public.orders', 'public.app_users', 'public.sales_batches'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname || '.' || tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %s', t);
    end if;
  end loop;
end $$;
