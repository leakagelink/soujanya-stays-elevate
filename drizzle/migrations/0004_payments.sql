CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  amount integer NOT NULL CHECK (amount > 0),
  kind text NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment','refund')),
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','upi','card','bank')),
  note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff payments all" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Guest read own payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = payments.booking_id AND b.user_id = auth.uid()));
ALTER TABLE public.bookings ADD COLUMN cancelled_at timestamptz;