-- KHYAL inventory foundation (additive migration; does not alter existing product quantities)
-- Back up the Supabase project before running this migration.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  movement_type text not null check (movement_type in ('opening_balance','receipt','manual_adjustment','damage','return','sale','sale_reversal')),
  reason text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movement_math check (quantity_after = quantity_before + quantity_delta)
);

create index if not exists stock_movements_product_created_idx
  on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_created_idx
  on public.stock_movements (created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists "admin reads stock movements" on public.stock_movements;
create policy "admin reads stock movements" on public.stock_movements
  for select to authenticated using (public.is_admin());

drop policy if exists "admin inserts stock movements" on public.stock_movements;
create policy "admin inserts stock movements" on public.stock_movements
  for insert to authenticated with check (public.is_admin() and created_by = (select auth.uid()));

-- Deliberately no public policies, no automatic stock deduction, and no trigger.
-- The application must call a reviewed admin-only adjustment flow before writing
-- movements and updating products.stock. Do not seed guessed historical sales.
