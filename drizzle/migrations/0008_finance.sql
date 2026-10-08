CREATE OR REPLACE FUNCTION public.can_finance(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','finance'))
$$;

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  category text NOT NULL,
  vendor text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount integer NOT NULL CHECK (amount > 0),
  gst integer NOT NULL DEFAULT 0 CHECK (gst >= 0),
  bill_no text NOT NULL DEFAULT '',
  paid boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance all expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.can_finance(auth.uid())) WITH CHECK (public.can_finance(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "finance reads bookings" ON public.bookings FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE POLICY "finance reads payments" ON public.payments FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE POLICY "finance reads folio" ON public.folio_charges FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE POLICY "finance reads orders" ON public.orders FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));
CREATE POLICY "finance reads rooms" ON public.rooms FOR SELECT TO authenticated USING (public.can_finance(auth.uid()));