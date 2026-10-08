CREATE OR REPLACE FUNCTION public.is_any_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id),
  hk_status text NOT NULL DEFAULT 'clean' CHECK (hk_status IN ('dirty','cleaning','clean','inspected','out_of_order')),
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read rooms" ON public.rooms FOR SELECT TO authenticated USING (public.is_any_staff(auth.uid()));
CREATE POLICY "HK update rooms" ON public.rooms FOR UPDATE TO authenticated USING (public.can_housekeeping(auth.uid())) WITH CHECK (public.can_housekeeping(auth.uid()));
CREATE POLICY "Admin insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete rooms" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.rooms(number, room_type_id)
SELECT (t.sort_order + 1)::text || lpad(g::text, 2, '0'), t.id
FROM public.room_types t, generate_series(1, t.total_rooms) g
ON CONFLICT (number) DO NOTHING;

CREATE TABLE public.hk_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  kind text NOT NULL DEFAULT 'turnaround' CHECK (kind IN ('turnaround','daily_clean','inspection','maintenance','deep_clean')),
  assigned_to uuid,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz, completed_at timestamptz, completed_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hk_tasks TO authenticated;
GRANT ALL ON public.hk_tasks TO service_role;
ALTER TABLE public.hk_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HK tasks all" ON public.hk_tasks FOR ALL TO authenticated USING (public.can_housekeeping(auth.uid())) WITH CHECK (public.can_housekeeping(auth.uid()));

CREATE OR REPLACE FUNCTION public.on_checkout_turnaround() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid;
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status IS DISTINCT FROM 'checked_out' AND NEW.room_number <> '' THEN
    SELECT id INTO r FROM public.rooms WHERE number = NEW.room_number;
    IF r IS NOT NULL THEN
      UPDATE public.rooms SET hk_status = 'dirty', updated_at = now() WHERE id = r;
      INSERT INTO public.hk_tasks(room_id, kind, notes) VALUES (r, 'turnaround', 'After checkout of ' || NEW.guest_name);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_checkout_turnaround AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.on_checkout_turnaround();

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, date date NOT NULL,
  start_time time NOT NULL, end_time time NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz
);
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  from_date date NOT NULL, to_date date NOT NULL CHECK (to_date >= from_date),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts, public.attendance, public.leave_requests TO authenticated;
GRANT ALL ON public.shifts, public.attendance, public.leave_requests TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shifts read" ON public.shifts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin shifts all" ON public.shifts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own attendance read" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own clock in" ON public.attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_any_staff(auth.uid()) AND clock_out IS NULL);
CREATE POLICY "Own clock out" ON public.attendance FOR UPDATE TO authenticated USING (user_id = auth.uid() AND clock_out IS NULL) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin attendance all" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own leave read" ON public.leave_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own leave insert" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND public.is_any_staff(auth.uid()));
CREATE POLICY "Admin leave all" ON public.leave_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.staff_directory() RETURNS TABLE(user_id uuid, email text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_any_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  RETURN QUERY SELECT r.user_id, u.email::text, array_agg(r.role::text) FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id GROUP BY r.user_id, u.email ORDER BY u.email;
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_directory() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.staff_directory() TO authenticated;