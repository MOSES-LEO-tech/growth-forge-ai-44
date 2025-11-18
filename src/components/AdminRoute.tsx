import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      navigate('/');
    }
  }, [loading, navigate, user]);

  if (loading) return null;
  return <>{user && (user.role === 'school_admin' || user.role === 'super_admin') ? children : null}</>;
};

export default AdminRoute;