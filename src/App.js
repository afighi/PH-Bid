import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthChange } from './services/authService';
import { useAuthStore } from './stores/authStore';

// Auth
import ProtectedRoute  from './components/auth/ProtectedRoute';
import LoginPage       from './components/auth/LoginPage';
import SignupPage      from './components/auth/SignupPage';
import ForgotPassword  from './components/auth/ForgotPassword';

// Landing
import LandingPage from './components/landing/LandingPage';

// Client pages
import ClientDashboard    from './components/client/ClientDashboard';
import MyProjects         from './components/client/MyProjects';
import PostProject        from './components/client/PostProject';
import BidsList           from './components/client/BidsList';
import ClientProjectDetail from './components/client/ClientProjectDetail';
import ClientTransactions from './components/client/ClientTransactions';

// Contractor pages
import ContractorDashboard        from './components/contractor/ContractorDashboard';
import ContractorProjectDetail    from './components/contractor/ContractorProjectDetail';
import BrowseProjects         from './components/contractor/BrowseProjects';
import SubmitBid              from './components/contractor/SubmitBid';
import MyBids                 from './components/contractor/MyBids';
import ContractorTransactions from './components/contractor/ContractorTransactions';

// Admin
import AdminDashboard from './components/admin/AdminDashboard';

// Auth flow
import OTPVerification from './components/auth/OTPVerification';

// Shared
import ProfilePage         from './components/shared/ProfilePage';
import MessagesPage        from './components/shared/MessagesPage';
import SettingsPage        from './components/shared/SettingsPage';
import DisputePage         from './components/shared/DisputePage';
import ReferralPage        from './components/shared/ReferralPage';

// Contractor new
import EarningsDashboard   from './components/contractor/EarningsDashboard';
import Watchlist           from './components/contractor/Watchlist';

// Public
import ContractorDirectory from './components/public/ContractorDirectory';

// Lazy contract page (inline for both roles)
import ContractListPage    from './components/shared/ContractListPage';

import { COLORS } from './theme';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontWeight: 800, fontSize: 24 }}>B</div>
        <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Loading BuildBid PH...</p>
      </div>
    </div>
  );
}

function DashboardRedirect() {
  const { user, profile } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={`/${profile.role}`} replace />;
}

export default function App() {
  const { loading, setAuth, clearAuth } = useAuthStore();

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((authData) => {
      if (authData) {
        setAuth(authData.user, authData.profile);
      } else {
        clearAuth();
      }
    });
    return () => unsubscribe();
  }, []);

  // Inject global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background-color: #FFFFFC; }
      select, input, textarea, button { font-family: 'Segoe UI', system-ui, sans-serif; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #F3F4F6; }
      ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

      /* ── Responsive overrides ── */
      @media (max-width: 639px) {
        /* Stack any inline two-column grid */
        .bb-grid-2 { grid-template-columns: 1fr !important; }
        .bb-grid-3 { grid-template-columns: 1fr !important; }

        /* Full-width inputs on mobile */
        input, select, textarea { max-width: 100%; }

        /* Reduce card padding */
        .bb-card-pad { padding: 16px !important; }

        /* Modals full screen */
        .bb-modal {
          max-width: 100% !important; width: 100% !important;
          max-height: 100vh !important; border-radius: 0 !important;
          margin: 0 !important; top: 0 !important;
        }

        /* Hide desktop-only elements */
        .bb-desktop-only { display: none !important; }

        /* Archie slide-in panel full width */
        .archie-panel { width: 100% !important; }
      }

      @media (max-width: 1023px) {
        .bb-hide-tablet { display: none !important; }
      }

      /* Touch targets */
      @media (hover: none) {
        button { min-height: 40px; }
      }

      /* Smooth font rendering */
      body { -webkit-font-smoothing: antialiased; }
    `;
    document.head.appendChild(style);
    document.title = 'BuildBid PH — Construction Bidding Platform';
    return () => document.head.removeChild(style);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"                  element={<LandingPage />} />
        <Route path="/login"             element={<LoginPage />} />
        <Route path="/signup"            element={<SignupPage />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/verify-email"      element={<OTPVerification />} />
        <Route path="/dashboard"         element={<DashboardRedirect />} />
        <Route path="/contractors"       element={<ContractorDirectory />} />

        {/* ── Client ── */}
        <Route path="/client"
          element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
        <Route path="/client/projects"
          element={<ProtectedRoute role="client"><MyProjects /></ProtectedRoute>} />
        <Route path="/client/new-project"
          element={<ProtectedRoute role="client"><PostProject /></ProtectedRoute>} />
        <Route path="/client/projects/:projectId"
          element={<ProtectedRoute role="client"><ClientProjectDetail /></ProtectedRoute>} />
        <Route path="/client/projects/:projectId/bids"
          element={<ProtectedRoute role="client"><BidsList /></ProtectedRoute>} />
        <Route path="/client/transactions"
          element={<ProtectedRoute role="client"><ClientTransactions /></ProtectedRoute>} />
        <Route path="/client/messages"
          element={<ProtectedRoute role="client"><MessagesPage /></ProtectedRoute>} />
        <Route path="/client/profile"
          element={<ProtectedRoute role="client"><ProfilePage /></ProtectedRoute>} />
        <Route path="/client/settings"
          element={<ProtectedRoute role="client"><SettingsPage /></ProtectedRoute>} />
        <Route path="/client/contracts"
          element={<ProtectedRoute role="client"><ContractListPage /></ProtectedRoute>} />
        <Route path="/client/disputes"
          element={<ProtectedRoute role="client"><DisputePage /></ProtectedRoute>} />
        <Route path="/client/referrals"
          element={<ProtectedRoute role="client"><ReferralPage /></ProtectedRoute>} />

        {/* ── Contractor ── */}
        <Route path="/contractor"
          element={<ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>} />
        <Route path="/contractor/browse"
          element={<ProtectedRoute role="contractor"><BrowseProjects /></ProtectedRoute>} />
        <Route path="/contractor/projects/:projectId"
          element={<ProtectedRoute role="contractor"><ContractorProjectDetail /></ProtectedRoute>} />
        <Route path="/contractor/projects/:projectId/bid"
          element={<ProtectedRoute role="contractor"><SubmitBid /></ProtectedRoute>} />
        <Route path="/contractor/my-bids"
          element={<ProtectedRoute role="contractor"><MyBids /></ProtectedRoute>} />
        <Route path="/contractor/transactions"
          element={<ProtectedRoute role="contractor"><ContractorTransactions /></ProtectedRoute>} />
        <Route path="/contractor/messages"
          element={<ProtectedRoute role="contractor"><MessagesPage /></ProtectedRoute>} />
        <Route path="/contractor/profile"
          element={<ProtectedRoute role="contractor"><ProfilePage /></ProtectedRoute>} />
        <Route path="/contractor/settings"
          element={<ProtectedRoute role="contractor"><SettingsPage /></ProtectedRoute>} />
        <Route path="/contractor/earnings"
          element={<ProtectedRoute role="contractor"><EarningsDashboard /></ProtectedRoute>} />
        <Route path="/contractor/watchlist"
          element={<ProtectedRoute role="contractor"><Watchlist /></ProtectedRoute>} />
        <Route path="/contractor/contracts"
          element={<ProtectedRoute role="contractor"><ContractListPage /></ProtectedRoute>} />
        <Route path="/contractor/disputes"
          element={<ProtectedRoute role="contractor"><DisputePage /></ProtectedRoute>} />
        <Route path="/contractor/referrals"
          element={<ProtectedRoute role="contractor"><ReferralPage /></ProtectedRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin"
          element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/profile"
          element={<ProtectedRoute role="admin"><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/settings"
          element={<ProtectedRoute role="admin"><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin/*"
          element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
