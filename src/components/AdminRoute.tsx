// Auth disabled: allow direct access to admin routes.

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  return <>{children}</>;
};

export default AdminRoute;