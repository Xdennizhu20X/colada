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


-- 3. HABILITAR TIEMPO REAL (REALTIME)
-- Permite que los pedidos nuevos aparezcan al instante en los celulares de todos
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.app_users;
