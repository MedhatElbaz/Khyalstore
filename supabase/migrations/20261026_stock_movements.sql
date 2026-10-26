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


-- All stock changes must go through this function so the audit row and product
-- quantity update happen in one transaction. It requires the migration and
-- public.is_admin() from supabase/schema.sql to be installed first.
drop policy if exists "admin inserts stock movements" on public.stock_movements;
revoke insert, update, delete on public.stock_movements from anon, authenticated;

create or replace function public.set_product_stock(
  p_product_id uuid,
  p_new_stock integer,
  p_reason text default 'manual_adjustment',
  p_note text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_delta integer;
  v_movement public.stock_movements;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_new_stock is null or p_new_stock < 0 then
    raise exception 'stock must be zero or greater' using errcode = '22023';
  end if;
  if p_reason not in ('opening_balance','receipt','manual_adjustment','damage','return','sale','sale_reversal') then
    raise exception 'invalid stock movement type' using errcode = '22023';
  end if;

  select p.stock into v_before
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  v_delta := p_new_stock - v_before;
  if v_delta = 0 then
    return null;
  end if;

  update public.products
    set stock = p_new_stock, updated_at = now()
    where id = p_product_id;

  insert into public.stock_movements (
    product_id, quantity_delta, quantity_before, quantity_after,
    movement_type, reason, note, created_by
  ) values (
    p_product_id, v_delta, v_before, p_new_stock,
    p_reason, p_reason, nullif(trim(p_note), ''), auth.uid()
  ) returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on function public.set_product_stock(uuid, integer, text, text) from public, anon;
grant execute on function public.set_product_stock(uuid, integer, text, text) to authenticated;
