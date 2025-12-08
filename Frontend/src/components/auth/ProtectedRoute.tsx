// FILE: Frontend/src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  // Check if the user has a token
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    // If not logged in, redirect to /signin
    // "state={{ from: location }}" allows you to redirect them back after they login
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If logged in, render the protected component (Dashboard)
  return children;
};

export default ProtectedRoute;