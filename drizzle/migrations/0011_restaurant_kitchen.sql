CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  seats int NOT NULL DEFAULT 4 CHECK (seats > 0),
  area text NOT NULL DEFAULT 'Restaurant',
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','reserved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.restaurant_tables(number, seats, area) VALUES ('T1',2,'Restaurant'),('T2',4,'Restaurant'),('T3',4,'Restaurant'),('T4',6,'Restaurant'),('P1',4,'Poolside'),('P2',4,'Poolside');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen staff tables" ON public.restaurant_tables FOR ALL TO authenticated USING (public.can_kitchen(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()));

CREATE TABLE public.table_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id),
  items jsonb NOT NULL,
  notes text NOT NULL DEFAULT '',
  subtotal int NOT NULL, gst int NOT NULL, total int NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','ready','served','cancelled')),
  paid boolean NOT NULL DEFAULT false,
  payment_method text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.table_orders TO authenticated;
GRANT ALL ON public.table_orders TO service_role;
ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen read table orders" ON public.table_orders FOR SELECT TO authenticated USING (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));
CREATE POLICY "Kitchen update table orders" ON public.table_orders FOR UPDATE TO authenticated USING (public.can_kitchen(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_orders;

CREATE OR REPLACE FUNCTION public.place_table_order(_table_id uuid, _items jsonb, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; m record; q int; s int := 0; lines jsonb := '[]'::jsonb; oid uuid;
BEGIN
  IF NOT public.can_kitchen(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Order is empty'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'qty')::int;
    IF q IS NULL OR q < 1 OR q > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO m FROM public.menu_items WHERE id = (it->>'id')::uuid AND available;
    IF m IS NULL THEN RAISE EXCEPTION 'An item is no longer available'; END IF;
    lines := lines || jsonb_build_object('id', m.id, 'name', m.name, 'qty', q, 'price', m.price);
    s := s + m.price * q;
  END LOOP;
  INSERT INTO public.table_orders(table_id, items, notes, subtotal, gst, total, created_by)
    VALUES (_table_id, lines, left(coalesce(_notes,''),300), s, round(s*0.05), s + round(s*0.05), auth.uid()) RETURNING id INTO oid;
  UPDATE public.restaurant_tables SET status = 'occupied' WHERE id = _table_id;
  RETURN oid;
END $$;
GRANT EXECUTE ON FUNCTION public.place_table_order(uuid, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.place_table_order(uuid, jsonb, text) FROM anon;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen/finance suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));

CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL DEFAULT 'kg',
  stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen/finance ingredients" ON public.ingredients FOR ALL TO authenticated USING (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));

CREATE TABLE public.stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','use','waste','adjust')),
  qty numeric NOT NULL,
  cost int NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id),
  note text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_moves TO authenticated;
GRANT ALL ON public.stock_moves TO service_role;
ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen/finance read moves" ON public.stock_moves FOR SELECT TO authenticated USING (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));
CREATE POLICY "Kitchen add moves" ON public.stock_moves FOR INSERT TO authenticated WITH CHECK (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_stock_move() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ingredients SET stock = stock + CASE WHEN NEW.kind IN ('purchase','adjust') THEN NEW.qty ELSE -abs(NEW.qty) END,
    cost_per_unit = CASE WHEN NEW.kind = 'purchase' AND NEW.qty > 0 AND NEW.cost > 0 THEN round(NEW.cost / NEW.qty, 2) ELSE cost_per_unit END
  WHERE id = NEW.ingredient_id;
  RETURN NEW;
END $$;
CREATE TRIGGER stock_moves_apply AFTER INSERT ON public.stock_moves FOR EACH ROW EXECUTE FUNCTION public.apply_stock_move();

CREATE TABLE public.recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty numeric NOT NULL CHECK (qty > 0),
  UNIQUE (menu_item_id, ingredient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_items TO authenticated;
GRANT ALL ON public.recipe_items TO service_role;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kitchen/finance recipes" ON public.recipe_items FOR ALL TO authenticated USING (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()) OR public.can_finance(auth.uid()));

-- auto-deduct ingredients when cooking starts
CREATE OR REPLACE FUNCTION public.deduct_recipe_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ln record;
BEGIN
  IF NEW.status = 'preparing' AND OLD.status = 'new' THEN
    IF TG_TABLE_NAME = 'orders' THEN
      FOR ln IN SELECT ri.ingredient_id, sum(ri.qty * oi.qty) q FROM public.order_items oi JOIN public.recipe_items ri ON ri.menu_item_id = oi.menu_item_id WHERE oi.order_id = NEW.id GROUP BY ri.ingredient_id LOOP
        INSERT INTO public.stock_moves(ingredient_id, kind, qty, note, created_by) VALUES (ln.ingredient_id, 'use', ln.q, 'Room order #' || upper(left(NEW.id::text,6)), auth.uid());
      END LOOP;
    ELSE
      FOR ln IN SELECT ri.ingredient_id, sum(ri.qty * (e->>'qty')::int) q FROM jsonb_array_elements(NEW.items) e JOIN public.recipe_items ri ON ri.menu_item_id = (e->>'id')::uuid GROUP BY ri.ingredient_id LOOP
        INSERT INTO public.stock_moves(ingredient_id, kind, qty, note, created_by) VALUES (ln.ingredient_id, 'use', ln.q, 'Table order #' || upper(left(NEW.id::text,6)), auth.uid());
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_deduct_stock AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.deduct_recipe_stock();
CREATE TRIGGER table_orders_deduct_stock AFTER UPDATE ON public.table_orders FOR EACH ROW EXECUTE FUNCTION public.deduct_recipe_stock();