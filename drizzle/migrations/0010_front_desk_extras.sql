ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')) NOT VALID;

CREATE TABLE public.resort_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  early_checkin_fee int NOT NULL DEFAULT 1000,
  early_checkin_from text NOT NULL DEFAULT '10:00',
  late_checkout_fee int NOT NULL DEFAULT 1000,
  late_checkout_until text NOT NULL DEFAULT '15:00',
  security_deposit int NOT NULL DEFAULT 2000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.resort_settings(id) VALUES (1);
GRANT SELECT ON public.resort_settings TO anon, authenticated;
GRANT UPDATE ON public.resort_settings TO authenticated;
GRANT ALL ON public.resort_settings TO service_role;
ALTER TABLE public.resort_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.resort_settings FOR SELECT USING (true);
CREATE POLICY "Owner updates settings" ON public.resort_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  changed_by uuid,
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_history TO authenticated;
GRANT ALL ON public.booking_history TO service_role;
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read history" ON public.booking_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Guest read own history" ON public.booking_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id),
  guest_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','booked','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
GRANT SELECT, INSERT, UPDATE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own waitlist read" ON public.waitlist FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Own waitlist insert" ON public.waitlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'waiting');
CREATE POLICY "Own waitlist cancel" ON public.waitlist FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
CREATE POLICY "Staff waitlist update" ON public.waitlist FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount int NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'cash',
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','refunded')),
  deduction int NOT NULL DEFAULT 0,
  deduction_reason text NOT NULL DEFAULT '',
  refunded_amount int NOT NULL DEFAULT 0,
  refund_method text NOT NULL DEFAULT '',
  refunded_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff deposits" ON public.deposits FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Finance read deposits" ON public.deposits FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE POLICY "Guest read own deposit" ON public.deposits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

CREATE TABLE public.minibar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'minibar',
  price int NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.minibar_items(name, category, price) VALUES
 ('Mineral water 1L','water',40),('Chips','snacks',60),('Chocolate bar','snacks',80),('Soft drink','minibar',90),('Juice','minibar',120),('Toiletry kit','toiletries',150);
GRANT SELECT, INSERT, UPDATE ON public.minibar_items TO authenticated;
GRANT ALL ON public.minibar_items TO service_role;
ALTER TABLE public.minibar_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read minibar" ON public.minibar_items FOR SELECT TO authenticated USING (public.is_any_staff(auth.uid()));
CREATE POLICY "Owner manage minibar" ON public.minibar_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.night_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date date NOT NULL UNIQUE,
  run_by uuid NOT NULL,
  arrivals int NOT NULL, departures int NOT NULL, in_house int NOT NULL, no_shows int NOT NULL,
  occupied_rooms int NOT NULL, total_rooms int NOT NULL,
  room_revenue int NOT NULL, extras_revenue int NOT NULL, collected int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.night_audits TO authenticated;
GRANT ALL ON public.night_audits TO service_role;
ALTER TABLE public.night_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audits" ON public.night_audits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.can_finance(auth.uid()));

-- availability helper
CREATE OR REPLACE FUNCTION public.rooms_free(_room_type_id uuid, _in date, _out date, _exclude uuid DEFAULT NULL)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE tot int; d date; used int; m int := 1000000;
BEGIN
  SELECT total_rooms INTO tot FROM public.room_types WHERE id = _room_type_id;
  IF tot IS NULL THEN RETURN 0; END IF;
  d := _in;
  WHILE d < _out LOOP
    SELECT count(*) INTO used FROM public.bookings WHERE room_type_id = _room_type_id
      AND status IN ('pending','confirmed','checked_in') AND check_in <= d AND check_out > d
      AND (_exclude IS NULL OR id <> _exclude);
    m := least(m, tot - used);
    d := d + 1;
  END LOOP;
  RETURN greatest(m, 0);
END $$;
GRANT EXECUTE ON FUNCTION public.rooms_free(uuid, date, date, uuid) TO anon, authenticated;

-- pricing trigger now also runs on edits and blocks overbooking
CREATE OR REPLACE FUNCTION public.bookings_compute()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p integer; mg integer; d date; m numeric; s integer := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.check_in = OLD.check_in AND NEW.check_out = OLD.check_out
     AND NEW.guests = OLD.guests AND NEW.room_type_id = OLD.room_type_id THEN RETURN NEW; END IF;
  IF (TG_OP = 'INSERT' OR NEW.check_in <> OLD.check_in) AND NEW.check_in < current_date THEN RAISE EXCEPTION 'Check-in cannot be in the past'; END IF;
  SELECT price_per_night, max_guests INTO p, mg FROM public.room_types WHERE id = NEW.room_type_id;
  IF p IS NULL THEN RAISE EXCEPTION 'Unknown room'; END IF;
  IF NEW.guests < 1 OR NEW.guests > mg THEN RAISE EXCEPTION 'This room allows up to % guests', mg; END IF;
  IF NEW.status IN ('pending','confirmed','checked_in') AND public.rooms_free(NEW.room_type_id, NEW.check_in, NEW.check_out, CASE WHEN TG_OP='UPDATE' THEN OLD.id END) < 1 THEN
    RAISE EXCEPTION 'No rooms of this type are free for these dates';
  END IF;
  d := NEW.check_in;
  WHILE d < NEW.check_out LOOP
    SELECT COALESCE(max(multiplier), 1) INTO m FROM public.seasons WHERE d BETWEEN start_date AND end_date;
    s := s + round(p * m);
    d := d + 1;
  END LOOP;
  NEW.nights := NEW.check_out - NEW.check_in;
  NEW.subtotal := s;
  NEW.gst := round(s * 0.18);
  NEW.total := s + NEW.gst;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS bookings_compute_trg ON public.bookings;
CREATE TRIGGER bookings_compute_trg BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_compute();

-- modify booking (guest for own pending/confirmed, staff for any active)
CREATE OR REPLACE FUNCTION public.modify_booking(_id uuid, _check_in date, _check_out date, _guests int, _room_type_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; nb record; staff boolean := public.is_staff(auth.uid());
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _id FOR UPDATE;
  IF b IS NULL OR (b.user_id <> auth.uid() AND NOT staff) THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status NOT IN ('pending','confirmed','checked_in') THEN RAISE EXCEPTION 'This booking can no longer be changed'; END IF;
  IF NOT staff AND b.status = 'checked_in' THEN RAISE EXCEPTION 'Please ask reception to change an ongoing stay'; END IF;
  IF b.status = 'checked_in' AND (_check_in <> b.check_in OR _room_type_id <> b.room_type_id) AND NOT staff THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.bookings SET check_in = _check_in, check_out = _check_out, guests = _guests, room_type_id = _room_type_id WHERE id = _id RETURNING * INTO nb;
  INSERT INTO public.booking_history(booking_id, changed_by, action, details) VALUES (_id, auth.uid(), 'modified',
    b.check_in || '→' || b.check_out || ', ' || b.guests || ' guests, total ' || b.total || '  ⇒  ' ||
    nb.check_in || '→' || nb.check_out || ', ' || nb.guests || ' guests, total ' || nb.total);
  RETURN nb.total - b.total;
END $$;
GRANT EXECUTE ON FUNCTION public.modify_booking(uuid, date, date, int, uuid) TO authenticated;

-- log status changes
CREATE OR REPLACE FUNCTION public.log_booking_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_history(booking_id, changed_by, action, details) VALUES (NEW.id, auth.uid(), 'created', NEW.check_in || '→' || NEW.check_out || ', total ' || NEW.total);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_history(booking_id, changed_by, action, details) VALUES (NEW.id, auth.uid(), NEW.status, 'Status ' || OLD.status || ' → ' || NEW.status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_log_status AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.log_booking_status();

-- waitlist entries that now have space
CREATE OR REPLACE FUNCTION public.waitlist_available()
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id FROM public.waitlist w WHERE public.is_staff(auth.uid()) AND w.status = 'waiting'
    AND w.check_in >= current_date AND public.rooms_free(w.room_type_id, w.check_in, w.check_out) > 0
$$;
GRANT EXECUTE ON FUNCTION public.waitlist_available() TO authenticated;

-- early / late fee to folio
CREATE OR REPLACE FUNCTION public.apply_time_fee(_booking_id uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; amt int; label text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO s FROM public.resort_settings WHERE id = 1;
  IF _kind = 'early' THEN amt := s.early_checkin_fee; label := 'Early check-in (from ' || s.early_checkin_from || ')';
  ELSIF _kind = 'late' THEN amt := s.late_checkout_fee; label := 'Late checkout (until ' || s.late_checkout_until || ')';
  ELSE RAISE EXCEPTION 'Invalid fee'; END IF;
  INSERT INTO public.folio_charges(booking_id, description, amount, created_by) VALUES (_booking_id, label, amt, auth.uid());
  INSERT INTO public.booking_history(booking_id, changed_by, action, details) VALUES (_booking_id, auth.uid(), 'fee', label || ' ₹' || amt);
END $$;
GRANT EXECUTE ON FUNCTION public.apply_time_fee(uuid, text) TO authenticated;

-- night audit
CREATE OR REPLACE FUNCTION public.run_night_audit(_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid; ns int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF _date > current_date THEN RAISE EXCEPTION 'Cannot audit a future date'; END IF;
  UPDATE public.bookings SET status = 'no_show' WHERE status IN ('pending','confirmed') AND check_in <= _date AND check_out > _date AND check_in < current_date + 0 AND check_in <= _date;
  GET DIAGNOSTICS ns = ROW_COUNT;
  INSERT INTO public.night_audits(audit_date, run_by, arrivals, departures, in_house, no_shows, occupied_rooms, total_rooms, room_revenue, extras_revenue, collected)
  SELECT _date, auth.uid(),
    (SELECT count(*) FROM bookings WHERE check_in = _date AND status IN ('checked_in','checked_out')),
    (SELECT count(*) FROM bookings WHERE check_out = _date AND status = 'checked_out'),
    (SELECT count(*) FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date),
    ns,
    (SELECT count(*) FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date),
    (SELECT coalesce(sum(total_rooms),0) FROM room_types),
    (SELECT coalesce(sum(subtotal / greatest(nights,1)),0) FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date),
    (SELECT coalesce(sum(amount),0) FROM folio_charges WHERE created_at::date = _date),
    (SELECT coalesce(sum(CASE WHEN kind='refund' THEN -amount ELSE amount END),0) FROM payments WHERE created_at::date = _date)
  ON CONFLICT (audit_date) DO UPDATE SET run_by = EXCLUDED.run_by, arrivals = EXCLUDED.arrivals, departures = EXCLUDED.departures, in_house = EXCLUDED.in_house,
    no_shows = night_audits.no_shows + EXCLUDED.no_shows, occupied_rooms = EXCLUDED.occupied_rooms, total_rooms = EXCLUDED.total_rooms,
    room_revenue = EXCLUDED.room_revenue, extras_revenue = EXCLUDED.extras_revenue, collected = EXCLUDED.collected, created_at = now()
  RETURNING id INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.run_night_audit(date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.modify_booking(uuid, date, date, int, uuid), public.apply_time_fee(uuid, text), public.run_night_audit(date), public.waitlist_available() FROM anon;