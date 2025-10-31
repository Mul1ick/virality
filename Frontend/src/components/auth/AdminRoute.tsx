// FILE: Frontend/src/components/auth/AdminRoute.tsx
import { Navigate, useLocation } from "react-router-dom";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const isAdmin = localStorage.getItem("isAdmin") === 'true';
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    // Not logged in, redirect to sign-in, saving the intended location
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  
  if (!isAdmin) {
    // Logged in, but not an admin. Redirect to home/profile.
    const userId = localStorage.getItem("user_id");
    return <Navigate to={userId ? `/?user_id=${userId}` : '/'} replace />;
  }

  // Logged in and is an admin, render the child component
  return children;
};

export default AdminRoute;