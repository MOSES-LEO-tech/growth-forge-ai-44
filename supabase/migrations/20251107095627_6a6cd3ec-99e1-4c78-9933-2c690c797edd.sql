-- Prevent users from updating their own role in the profiles table
-- This prevents privilege escalation attacks

-- Drop the existing update policy that allows unrestricted updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new restricted update policy that prevents role changes
CREATE POLICY "Users can update their own profile (except role)"
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Add a comment explaining the security constraint
COMMENT ON POLICY "Users can update their own profile (except role)" ON public.profiles IS 
  'Users can update their profile fields but cannot change their role. Role changes must be managed through the user_roles table by administrators only.';