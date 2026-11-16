-- ============================================
-- Notification center + profile preferences
-- ============================================

-- Profile visibility preference (store-only today; enforced by the app layer
-- when public profile surfaces exist).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'connections', 'private'));

-- IANA timezone identifier used for locale-aware date display.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- ============================================
-- Notify the student when a school connection request is approved
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_school_connection_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_name TEXT;
BEGIN
  SELECT name INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
  INSERT INTO public.notifications (user_id, type, title, message, resource_type, resource_id)
  VALUES (
    NEW.user_id,
    'school_connection_approved',
    'School connection approved',
    CASE WHEN v_school_name IS NULL
         THEN 'Your school connection request was approved.'
         ELSE 'Your connection to ' || v_school_name || ' was approved.'
    END,
    'school',
    NEW.school_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_connection_approved ON public.school_connection_requests;
CREATE TRIGGER trg_school_connection_approved
AFTER UPDATE ON public.school_connection_requests
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.notify_school_connection_approved();
