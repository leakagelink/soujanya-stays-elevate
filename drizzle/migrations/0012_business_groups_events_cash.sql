CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gstin text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  discount_pct numeric NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 50),
  credit_limit int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff companies" ON public.companies FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Finance read companies" ON public.companies FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));

CREATE TABLE public.booking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company_id uuid REFERENCES public.companies(id),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.booking_groups TO authenticated;
GRANT ALL ON public.booking_groups TO service_role;
ALTER TABLE public.booking_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff groups" ON public.booking_groups FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Finance read groups" ON public.booking_groups FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));

ALTER TABLE public.bookings ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.bookings ADD COLUMN group_id uuid REFERENCES public.booking_groups(id);
ALTER TABLE public.bookings ADD COLUMN discount_pct numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bookings_compute()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p integer; mg integer; d date; m numeric; s integer := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.check_in = OLD.check_in AND NEW.check_out = OLD.check_out
     AND NEW.guests = OLD.guests AND NEW.room_type_id = OLD.room_type_id
     AND NEW.discount_pct = OLD.discount_pct AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id THEN RETURN NEW; END IF;
  IF (TG_OP = 'INSERT' OR NEW.check_in <> OLD.check_in) AND NEW.check_in < current_date THEN RAISE EXCEPTION 'Check-in cannot be in the past'; END IF;
  -- only staff may set discounts / companies
  IF NOT public.is_staff(auth.uid()) AND auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.discount_pct := 0; NEW.company_id := NULL; NEW.group_id := NULL;
    ELSE NEW.discount_pct := OLD.discount_pct; NEW.company_id := OLD.company_id; NEW.group_id := OLD.group_id; END IF;
  END IF;
  IF NEW.company_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    SELECT discount_pct INTO NEW.discount_pct FROM public.companies WHERE id = NEW.company_id;
  END IF;
  IF NEW.discount_pct < 0 OR NEW.discount_pct > 50 THEN RAISE EXCEPTION 'Discount must be between 0 and 50%%'; END IF;
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
  s := s - round(s * NEW.discount_pct / 100);
  NEW.nights := NEW.check_out - NEW.check_in;
  NEW.subtotal := s;
  NEW.gst := round(s * 0.18);
  NEW.total := s + NEW.gst;
  RETURN NEW;
END $function$;

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'wedding',
  client_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  company_id uuid REFERENCES public.companies(id),
  event_date date NOT NULL,
  start_time text NOT NULL DEFAULT '18:00',
  end_time text NOT NULL DEFAULT '23:00',
  venue text NOT NULL DEFAULT 'Lawn',
  guests int NOT NULL DEFAULT 50,
  package text NOT NULL DEFAULT '',
  amount int NOT NULL DEFAULT 0,
  gst int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  paid int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry','tentative','confirmed','completed','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff events" ON public.events FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Finance read events" ON public.events FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE OR REPLACE FUNCTION public.events_compute() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.amount < 0 OR NEW.paid < 0 THEN RAISE EXCEPTION 'Amounts cannot be negative'; END IF;
  NEW.gst := round(NEW.amount * 0.18); NEW.total := NEW.amount + NEW.gst; RETURN NEW;
END $$;
CREATE TRIGGER events_compute_trg BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.events_compute();

CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid NOT NULL DEFAULT auth.uid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_float int NOT NULL DEFAULT 0,
  closed_at timestamptz,
  closed_by uuid,
  expected int,
  counted int,
  notes text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX one_open_cash_session ON public.cash_sessions ((true)) WHERE closed_at IS NULL;
GRANT SELECT, INSERT ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read cash" ON public.cash_sessions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.can_finance(auth.uid()));
CREATE POLICY "Staff open cash" ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND closed_at IS NULL);

CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id),
  kind text NOT NULL CHECK (kind IN ('in','out')),
  amount int NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read cash entries" ON public.cash_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.can_finance(auth.uid()));
CREATE POLICY "Staff add cash entries" ON public.cash_entries FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = session_id AND s.closed_at IS NULL));

CREATE OR REPLACE FUNCTION public.cash_expected(_session_id uuid) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.opening_float
    + coalesce((SELECT sum(CASE WHEN p.kind='refund' THEN -p.amount ELSE p.amount END) FROM public.payments p WHERE p.method='cash' AND p.created_at >= s.opened_at AND p.created_at < coalesce(s.closed_at, now())),0)
    + coalesce((SELECT sum(t.total) FROM public.table_orders t WHERE t.paid AND t.payment_method='cash' AND t.created_at >= s.opened_at AND t.created_at < coalesce(s.closed_at, now())),0)
    + coalesce((SELECT sum(CASE WHEN e.kind='in' THEN e.amount ELSE -e.amount END) FROM public.cash_entries e WHERE e.session_id = s.id),0)
  FROM public.cash_sessions s WHERE s.id = _session_id AND (public.is_staff(auth.uid()) OR public.can_finance(auth.uid()))
$$;
GRANT EXECUTE ON FUNCTION public.cash_expected(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_cash_session(_session_id uuid, _counted int, _notes text) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  e := public.cash_expected(_session_id);
  UPDATE public.cash_sessions SET closed_at = now(), closed_by = auth.uid(), expected = e, counted = _counted, notes = left(coalesce(_notes,''),300)
    WHERE id = _session_id AND closed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Drawer already closed'; END IF;
  RETURN _counted - e;
END $$;
GRANT EXECUTE ON FUNCTION public.close_cash_session(uuid, int, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cash_expected(uuid), public.close_cash_session(uuid, int, text) FROM anon;