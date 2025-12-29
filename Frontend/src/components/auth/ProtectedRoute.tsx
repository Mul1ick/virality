// FILE: Frontend/src/components/auth/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");

  // If no token or userId, redirect to signup (landing page)
  if (!token || !userId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
