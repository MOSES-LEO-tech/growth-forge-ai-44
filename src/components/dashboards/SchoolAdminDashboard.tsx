import type { Profile } from "@/integrations/supabase/types";
import { Navigate } from "react-router-dom";

/**
 * The school admin experience now lives in the dedicated workspace
 * (/admin/overview). /dashboard redirects admins there so the app keeps a
 * single hub for the admin role.
 */
const SchoolAdminDashboard = ({ profile }: { profile: Profile }) => {
  void profile;
  return <Navigate to="/admin/overview" replace />;
};

export default SchoolAdminDashboard;
