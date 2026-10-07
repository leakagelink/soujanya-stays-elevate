CREATE TABLE public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price_per_night integer NOT NULL,
  max_guests integer NOT NULL DEFAULT 2,
  total_rooms integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.room_types TO anon, authenticated;
GRANT ALL ON public.room_types TO service_role;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room types are public" ON public.room_types FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.room_types (name, description, price_per_night, max_guests, total_rooms, sort_order) VALUES
('Forest Deluxe Room', 'Garden-facing room with king bed and rain shower.', 8500, 2, 10, 1),
('Valley View Suite', 'Private balcony overlooking the valley, separate lounge.', 13500, 3, 6, 2),
('Hillside Family Cottage', 'Two bedrooms, living lounge and garden sit-out.', 18500, 5, 4, 3),
('Royal Pool Villa', 'Private plunge pool, butler service and outdoor deck.', 32000, 4, 2, 4);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id),
  guest_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 2,
  nights integer NOT NULL,
  subtotal integer NOT NULL,
  gst integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (status IN ('pending','confirmed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookings read" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- server-side price calculation so guests can't tamper with totals
CREATE OR REPLACE FUNCTION public.bookings_compute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p integer; mg integer;
BEGIN
  IF NEW.check_in < current_date THEN RAISE EXCEPTION 'Check-in cannot be in the past'; END IF;
  SELECT price_per_night, max_guests INTO p, mg FROM public.room_types WHERE id = NEW.room_type_id;
  IF p IS NULL THEN RAISE EXCEPTION 'Unknown room'; END IF;
  IF NEW.guests < 1 OR NEW.guests > mg THEN RAISE EXCEPTION 'This room allows up to % guests', mg; END IF;
  NEW.nights := NEW.check_out - NEW.check_in;
  NEW.subtotal := p * NEW.nights;
  NEW.gst := round(NEW.subtotal * 0.18);
  NEW.total := NEW.subtotal + NEW.gst;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_compute_trg BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_compute();
CREATE POLICY "Own pending cancel" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id AND status = 'cancelled');