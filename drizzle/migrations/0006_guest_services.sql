CREATE OR REPLACE FUNCTION public.can_kitchen(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','front_desk','kitchen'))
$$;
CREATE OR REPLACE FUNCTION public.can_housekeeping(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','front_desk','housekeeping'))
$$;

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL,
  price integer NOT NULL CHECK (price >= 0), is_veg boolean NOT NULL DEFAULT true,
  available boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu public" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Kitchen manage menu" ON public.menu_items FOR ALL TO authenticated USING (public.can_kitchen(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  user_id uuid NOT NULL,
  room_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','ready','served','cancelled')),
  subtotal integer NOT NULL, gst integer NOT NULL, total integer NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  name text NOT NULL, qty integer NOT NULL CHECK (qty > 0), price integer NOT NULL
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.orders, public.order_items TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Kitchen orders read" ON public.orders FOR SELECT TO authenticated USING (public.can_kitchen(auth.uid()));
CREATE POLICY "Kitchen orders update" ON public.orders FOR UPDATE TO authenticated USING (public.can_kitchen(auth.uid())) WITH CHECK (public.can_kitchen(auth.uid()));
CREATE POLICY "Order items read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.can_kitchen(auth.uid()))));

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'Activity',
  price integer NOT NULL CHECK (price >= 0), duration_min integer NOT NULL DEFAULT 60,
  capacity integer NOT NULL DEFAULT 4, slots text[] NOT NULL DEFAULT ARRAY['10:00','16:00'],
  active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities public" ON public.activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage activities" ON public.activities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  user_id uuid NOT NULL,
  date date NOT NULL, slot text NOT NULL, people integer NOT NULL CHECK (people > 0),
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','done','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.activity_bookings TO authenticated;
GRANT ALL ON public.activity_bookings TO service_role;
ALTER TABLE public.activity_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own activity read" ON public.activity_bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff activity read" ON public.activity_bookings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff activity update" ON public.activity_bookings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  room_number text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('housekeeping','maintenance','other')),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own requests read" ON public.service_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own requests insert" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.status = 'checked_in'));
CREATE POLICY "HK requests read" ON public.service_requests FOR SELECT TO authenticated USING (public.can_housekeeping(auth.uid()));
CREATE POLICY "HK requests update" ON public.service_requests FOR UPDATE TO authenticated USING (public.can_housekeeping(auth.uid())) WITH CHECK (public.can_housekeeping(auth.uid()));

CREATE OR REPLACE FUNCTION public.place_order(_booking_id uuid, _items jsonb, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; oid uuid; it jsonb; m record; q integer; s integer := 0; g integer;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b IS NULL OR (b.user_id <> auth.uid() AND NOT public.is_staff(auth.uid())) THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status <> 'checked_in' THEN RAISE EXCEPTION 'Food ordering is available once you are checked in'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  INSERT INTO public.orders(booking_id, user_id, room_number, subtotal, gst, total, notes)
    VALUES (b.id, b.user_id, b.room_number, 0, 0, 0, left(coalesce(_notes,''), 300)) RETURNING id INTO oid;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'qty')::int;
    IF q IS NULL OR q < 1 OR q > 20 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO m FROM public.menu_items WHERE id = (it->>'id')::uuid AND available;
    IF m IS NULL THEN RAISE EXCEPTION 'An item is no longer available'; END IF;
    INSERT INTO public.order_items(order_id, menu_item_id, name, qty, price) VALUES (oid, m.id, m.name, q, m.price);
    s := s + m.price * q;
  END LOOP;
  g := round(s * 0.05);
  UPDATE public.orders SET subtotal = s, gst = g, total = s + g WHERE id = oid;
  INSERT INTO public.folio_charges(booking_id, description, amount, created_by)
    VALUES (b.id, 'Food order #' || upper(left(oid::text, 6)) || ' (incl. 5% GST)', s + g, auth.uid());
  RETURN oid;
END $$;

CREATE OR REPLACE FUNCTION public.book_activity(_booking_id uuid, _activity_id uuid, _date date, _slot text, _people integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; a record; used integer; t integer; aid uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b IS NULL OR b.user_id <> auth.uid() THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status NOT IN ('confirmed','checked_in') THEN RAISE EXCEPTION 'Your booking must be confirmed first'; END IF;
  IF _date < b.check_in OR _date > b.check_out OR _date < current_date THEN RAISE EXCEPTION 'Pick a date during your stay'; END IF;
  SELECT * INTO a FROM public.activities WHERE id = _activity_id AND active;
  IF a IS NULL OR NOT (_slot = ANY(a.slots)) THEN RAISE EXCEPTION 'Invalid slot'; END IF;
  IF _people < 1 THEN RAISE EXCEPTION 'Invalid number of people'; END IF;
  SELECT coalesce(sum(people),0) INTO used FROM public.activity_bookings WHERE activity_id = a.id AND date = _date AND slot = _slot AND status <> 'cancelled';
  IF used + _people > a.capacity THEN RAISE EXCEPTION 'Only % spots left in this slot', a.capacity - used; END IF;
  t := round(a.price * _people * 1.18);
  INSERT INTO public.activity_bookings(activity_id, booking_id, user_id, date, slot, people, total)
    VALUES (a.id, b.id, b.user_id, _date, _slot, _people, t) RETURNING id INTO aid;
  INSERT INTO public.folio_charges(booking_id, description, amount, created_by)
    VALUES (b.id, a.name || ' · ' || _date || ' ' || _slot || ' (incl. 18% GST)', t, auth.uid());
  RETURN aid;
END $$;

CREATE OR REPLACE FUNCTION public.activity_slots_used(_activity_id uuid, _date date)
RETURNS TABLE(slot text, used integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slot, sum(people)::int FROM public.activity_bookings WHERE activity_id = _activity_id AND date = _date AND status <> 'cancelled' GROUP BY slot
$$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text), public.book_activity(uuid, uuid, date, text, integer), public.activity_slots_used(uuid, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text), public.book_activity(uuid, uuid, date, text, integer), public.activity_slots_used(uuid, date) TO authenticated;

INSERT INTO public.menu_items(name, description, category, price, is_veg, sort_order) VALUES
('Masala Chai', 'Ginger, cardamom, fresh milk', 'Beverages', 80, true, 1),
('Fresh Lime Soda', 'Sweet or salted', 'Beverages', 120, true, 2),
('Cold Coffee', 'With vanilla ice cream', 'Beverages', 180, true, 3),
('Poha & Jalebi', 'Indori-style breakfast', 'Breakfast', 220, true, 10),
('Aloo Paratha', 'Two parathas, curd, pickle, butter', 'Breakfast', 260, true, 11),
('Masala Omelette', 'Three eggs, toast', 'Breakfast', 240, false, 12),
('Paneer Tikka', 'Tandoor-roasted cottage cheese', 'Starters', 380, true, 20),
('Chicken Seekh Kebab', 'Minced chicken, mint chutney', 'Starters', 440, false, 21),
('Dal Makhani', 'Slow-cooked black lentils', 'Mains', 360, true, 30),
('Paneer Butter Masala', 'Creamy tomato gravy', 'Mains', 420, true, 31),
('Butter Chicken', 'Classic Delhi-style', 'Mains', 520, false, 32),
('Veg Thali', 'Two sabzi, dal, rice, roti, sweet', 'Mains', 480, true, 33),
('Butter Naan', 'From the tandoor', 'Breads & rice', 70, true, 40),
('Jeera Rice', 'Basmati with cumin', 'Breads & rice', 220, true, 41),
('Gulab Jamun', 'Two pieces, warm', 'Desserts', 160, true, 50),
('Kesar Kulfi', 'Saffron and pistachio', 'Desserts', 180, true, 51);

INSERT INTO public.activities(name, description, category, price, duration_min, capacity, slots, sort_order) VALUES
('Ayurvedic Abhyanga Massage', 'Warm herbal oil full-body massage', 'Spa', 3500, 60, 2, ARRAY['10:00','12:00','15:00','17:00'], 1),
('Aromatherapy Facial', 'Rejuvenating facial with essential oils', 'Spa', 2500, 45, 2, ARRAY['11:00','14:00','16:00'], 2),
('Sunrise Yoga', 'Guided session on the lawn', 'Wellness', 600, 60, 12, ARRAY['06:30'], 3),
('Nature Trail Walk', 'Guided walk with a local naturalist', 'Activity', 800, 90, 10, ARRAY['07:00','16:30'], 4),
('Bonfire & Live Music', 'Evening by the fire with snacks', 'Activity', 1200, 120, 20, ARRAY['19:30'], 5);