CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE(user_id uuid, email text, role public.app_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the owner can view staff'; END IF;
  RETURN QUERY SELECT r.user_id, u.email::text, r.role FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id ORDER BY u.email, r.role;
END $$;

CREATE OR REPLACE FUNCTION public.grant_staff_role(_email text, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the owner can assign roles'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF uid IS NULL THEN RAISE EXCEPTION 'No account with this email. Ask them to sign up first.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = _role) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, _role);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_staff_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the owner can remove roles'; END IF;
  IF _user_id = auth.uid() AND _role = 'admin' THEN RAISE EXCEPTION 'You cannot remove your own owner access'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
END $$;

REVOKE EXECUTE ON FUNCTION public.list_staff(), public.grant_staff_role(text, public.app_role), public.revoke_staff_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_staff(), public.grant_staff_role(text, public.app_role), public.revoke_staff_role(uuid, public.app_role) TO authenticated;