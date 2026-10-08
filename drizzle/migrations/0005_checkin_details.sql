ALTER TABLE public.bookings
  ADD COLUMN email text NOT NULL DEFAULT '',
  ADD COLUMN address text NOT NULL DEFAULT '',
  ADD COLUMN nationality text NOT NULL DEFAULT 'Indian',
  ADD COLUMN id_type text NOT NULL DEFAULT '',
  ADD COLUMN id_number text NOT NULL DEFAULT '',
  ADD COLUMN adults integer,
  ADD COLUMN children integer,
  ADD COLUMN coming_from text NOT NULL DEFAULT '',
  ADD COLUMN going_to text NOT NULL DEFAULT '',
  ADD COLUMN purpose text NOT NULL DEFAULT '',
  ADD COLUMN vehicle_number text NOT NULL DEFAULT '',
  ADD COLUMN visa_number text NOT NULL DEFAULT '',
  ADD COLUMN guest_photo_path text,
  ADD COLUMN id_front_path text,
  ADD COLUMN id_back_path text;

CREATE POLICY "Staff read guest docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'guest-docs' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload guest docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guest-docs' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update guest docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guest-docs' AND public.is_staff(auth.uid()));