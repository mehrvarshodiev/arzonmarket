import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function ProtectedRoute({ children, admin = false }) {
  const { isAuthenticated, isAdmin } = useAuth(); const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
