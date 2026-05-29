import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute({ children, role }) {
  const { user, profile } = useAuthStore();

  if (!user || !profile) return <Navigate to="/login" replace />;

  // Account needs email verification — send to OTP page
  if (profile.status === 'pending_verification') {
    return <Navigate to="/verify-email" replace />;
  }

  // Contractor still awaiting admin approval — back to login
  if (profile.status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (role && profile.role !== role) {
    return <Navigate to={`/${profile.role}`} replace />;
  }

  return children;
}
