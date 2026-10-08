-- documents
ALTER TABLE public.bookings ADD COLUMN id_verification text NOT NULL DEFAULT 'pending' CHECK (id_verification IN ('pending','verified','rejected'));
CREATE TABLE public.document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  path text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_access_log TO authenticated;
GRANT ALL ON public.document_access_log TO service_role;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads doc log" ON public.document_access_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.log_doc_access(_booking_id uuid, _path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  INSERT INTO public.document_access_log(booking_id, path, user_id) VALUES (_booking_id, left(_path, 300), auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.log_doc_access(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.log_doc_access(uuid, text) FROM anon;

-- consent
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  policy text NOT NULL CHECK (policy IN ('terms','privacy','cancellation','resort_rules','guest_declaration','payment')),
  version text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own consents read" ON public.consents FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Own consents insert" ON public.consents FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid() AND (auth.uid() = user_id OR public.is_staff(auth.uid())));

-- night audit: fuller figures + finalize lock
ALTER TABLE public.night_audits ADD COLUMN food_revenue int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN activity_revenue int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN other_revenue int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN taxes int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN payments int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN refunds int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN outstanding int NOT NULL DEFAULT 0;
ALTER TABLE public.night_audits ADD COLUMN discrepancies text NOT NULL DEFAULT '';
ALTER TABLE public.night_audits ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','closed'));
ALTER TABLE public.night_audits ADD COLUMN closed_at timestamptz;
ALTER TABLE public.night_audits ADD COLUMN closed_by uuid;
COMMENT ON COLUMN public.night_audits.extras_revenue IS 'All folio extras for the day; see food/activity/other split columns';
COMMENT ON COLUMN public.night_audits.collected IS 'Net collected (payments - refunds)';

CREATE OR REPLACE FUNCTION public.run_night_audit(_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid; ns int; disc text := ''; fd int; act int; oth int; rr int; pay int; ref int; outst int; tbl int; c int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF _date > current_date THEN RAISE EXCEPTION 'Cannot audit a future date'; END IF;
  IF EXISTS (SELECT 1 FROM night_audits WHERE audit_date = _date AND status = 'closed') THEN RAISE EXCEPTION 'This day is already closed'; END IF;
  UPDATE bookings SET status = 'no_show' WHERE status IN ('pending','confirmed') AND check_in <= _date AND check_out > _date;
  GET DIAGNOSTICS ns = ROW_COUNT;
  SELECT coalesce(sum(amount) FILTER (WHERE description LIKE 'Food order%'),0),
         coalesce(sum(amount) FILTER (WHERE description LIKE '%(incl. 18% GST)' AND description NOT LIKE 'Food order%'),0),
         coalesce(sum(amount) FILTER (WHERE description NOT LIKE 'Food order%' AND description NOT LIKE '%(incl. 18% GST)'),0)
    INTO fd, act, oth FROM folio_charges WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = _date;
  SELECT coalesce(sum(total),0) INTO tbl FROM table_orders WHERE paid AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = _date;
  fd := fd + tbl;
  SELECT coalesce(sum(subtotal / greatest(nights,1)),0) INTO rr FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date;
  SELECT coalesce(sum(amount) FILTER (WHERE kind='payment'),0), coalesce(sum(amount) FILTER (WHERE kind='refund'),0) INTO pay, ref FROM payments WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = _date;
  SELECT coalesce(sum(b.total + coalesce((SELECT sum(amount) FROM folio_charges f WHERE f.booking_id=b.id),0)
     - coalesce((SELECT sum(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM payments p WHERE p.booking_id=b.id),0)),0)
    INTO outst FROM bookings b WHERE b.status = 'checked_in' OR (b.status = 'checked_out' AND b.check_out = _date);
  SELECT count(*) INTO c FROM bookings WHERE status = 'checked_in' AND check_out < _date;
  IF c > 0 THEN disc := disc || c || ' guest(s) past checkout date still checked in. '; END IF;
  SELECT count(*) INTO c FROM bookings b WHERE b.status='checked_out' AND b.check_out = _date AND (b.total + coalesce((SELECT sum(amount) FROM folio_charges f WHERE f.booking_id=b.id),0)) > coalesce((SELECT sum(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM payments p WHERE p.booking_id=b.id),0);
  IF c > 0 THEN disc := disc || c || ' checked-out guest(s) left with unpaid balance. '; END IF;
  SELECT count(*) INTO c FROM table_orders WHERE NOT paid AND status <> 'cancelled' AND (created_at AT TIME ZONE 'Asia/Kolkata')::date <= _date;
  IF c > 0 THEN disc := disc || c || ' unpaid restaurant bill(s). '; END IF;
  SELECT count(*) INTO c FROM deposits d JOIN bookings b ON b.id=d.booking_id WHERE d.status='held' AND b.status='checked_out';
  IF c > 0 THEN disc := disc || c || ' security deposit(s) not returned after checkout. '; END IF;
  INSERT INTO night_audits(audit_date, run_by, arrivals, departures, in_house, no_shows, occupied_rooms, total_rooms, room_revenue, extras_revenue, collected,
    food_revenue, activity_revenue, other_revenue, taxes, payments, refunds, outstanding, discrepancies)
  SELECT _date, auth.uid(),
    (SELECT count(*) FROM bookings WHERE check_in = _date AND status IN ('checked_in','checked_out')),
    (SELECT count(*) FROM bookings WHERE check_out = _date AND status = 'checked_out'),
    (SELECT count(*) FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date),
    ns,
    (SELECT count(*) FROM bookings WHERE status IN ('checked_in','checked_out') AND check_in <= _date AND check_out > _date),
    (SELECT coalesce(sum(total_rooms),0) FROM room_types),
    rr, fd + act + oth, pay - ref, fd, act, oth,
    round(rr * 0.18) + round(fd - fd / 1.05) + round(act - act / 1.18),
    pay, ref, outst, disc
  ON CONFLICT (audit_date) DO UPDATE SET run_by = EXCLUDED.run_by, arrivals = EXCLUDED.arrivals, departures = EXCLUDED.departures, in_house = EXCLUDED.in_house,
    no_shows = night_audits.no_shows + EXCLUDED.no_shows, occupied_rooms = EXCLUDED.occupied_rooms, total_rooms = EXCLUDED.total_rooms,
    room_revenue = EXCLUDED.room_revenue, extras_revenue = EXCLUDED.extras_revenue, collected = EXCLUDED.collected,
    food_revenue = EXCLUDED.food_revenue, activity_revenue = EXCLUDED.activity_revenue, other_revenue = EXCLUDED.other_revenue, taxes = EXCLUDED.taxes,
    payments = EXCLUDED.payments, refunds = EXCLUDED.refunds, outstanding = EXCLUDED.outstanding, discrepancies = EXCLUDED.discrepancies, created_at = now()
  RETURNING id INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.close_night_audit(_date date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_finance(auth.uid())) THEN RAISE EXCEPTION 'Only the owner or finance can close the day'; END IF;
  UPDATE night_audits SET status = 'closed', closed_at = now(), closed_by = auth.uid() WHERE audit_date = _date AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Run the audit for this date first'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.close_night_audit(date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.close_night_audit(date) FROM anon;

-- protect money records of closed days
CREATE OR REPLACE FUNCTION public.protect_closed_day() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := ((CASE WHEN TG_OP = 'INSERT' THEN NEW.created_at ELSE OLD.created_at END) AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF EXISTS (SELECT 1 FROM night_audits WHERE audit_date = d AND status = 'closed') THEN
    RAISE EXCEPTION 'The day % is closed by night audit; add a correction today instead', d;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER folio_protect_closed BEFORE UPDATE OR DELETE ON public.folio_charges FOR EACH ROW EXECUTE FUNCTION public.protect_closed_day();
CREATE TRIGGER payments_protect_closed BEFORE UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.protect_closed_day();
CREATE TRIGGER expenses_protect_closed BEFORE UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.protect_closed_day();

-- channel manager readiness: every external reservation maps to one central booking
CREATE TABLE public.channel_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  external_id text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','imported','rejected','cancelled')),
  error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);
GRANT SELECT ON public.channel_reservations TO authenticated;
GRANT ALL ON public.channel_reservations TO service_role;
ALTER TABLE public.channel_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read channel reservations" ON public.channel_reservations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));