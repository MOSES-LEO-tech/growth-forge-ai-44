import { Navigate, Outlet } from "react-router-dom";

const RequireAuth = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return <Navigate to="/auth" replace />;
  return <Outlet />;
};

export default RequireAuth;
