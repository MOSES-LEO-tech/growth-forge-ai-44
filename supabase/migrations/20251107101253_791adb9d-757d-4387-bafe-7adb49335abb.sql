-- Prevent admin role self-assignment during signup
-- This ensures users cannot escalate their privileges through signup

-- Drop and recreate the handle_new_user function with admin role validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block admin role signups - only allow through secure channels
  IF COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student') = 'admin' THEN
    RAISE EXCEPTION 'Admin accounts must be created through secure administrative channels';
  END IF;
  
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  RETURN NEW;
END;
$$;