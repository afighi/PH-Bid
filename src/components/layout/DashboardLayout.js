import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ClientTopNav from './ClientTopNav';
import NotificationBell from '../shared/NotificationBell';
import AdminGlobalSearch from '../admin/AdminGlobalSearch';
import UserGlobalSearch from '../shared/UserGlobalSearch';
import ArchieChat from '../shared/ArchiePanel';
import { useAuthStore } from '../../stores/authStore';
import { logout } from '../../services/authService';
import { COLORS } from '../../theme';
import { Menu, X, User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const ROLE_AVATAR_COLOR = {
  client:     { from: '#7B3F00', to: '#5A2D00' },
  contractor: { from: '#059669', to: '#047857' },
  admin:      { from: '#C07838', to: '#7B3F00' },
};

export default function DashboardLayout({ children, title }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { profile } = useAuthStore();
  const { isMobile, isTablet, isSmall } = useBreakpoint();

  const hideArchie = location.pathname.includes('/messages');
  const isClient   = profile?.role === 'client';

  // On mobile the sidebar is always a drawer (0 margin); on tablet use collapsed
  const sidebarW = isClient ? 0 : isMobile ? 0 : (collapsed ? 68 : 228);
  const avatarColor = ROLE_AVATAR_COLOR[profile?.role] || { from: COLORS.primary, to: COLORS.primaryDark };
  const initials    = (profile?.full_name || profile?.company_name || 'U')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const MENU_ITEMS = [
    { label: 'My Profile',  icon: User,     onClick: () => { navigate(`/${profile?.role}/profile`);   setDropdownOpen(false); } },
    { label: 'Settings',    icon: Settings,  onClick: () => { navigate(`/${profile?.role}/settings`);  setDropdownOpen(false); } },
    { label: 'Security',    icon: Shield,    onClick: () => { navigate(`/${profile?.role}/settings`);  setDropdownOpen(false); } },
  ];

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', flexDirection: isClient ? 'column' : 'row',
      backgroundColor: COLORS.bg,
      fontFamily: "'Montserrat', system-ui, sans-serif",
    }}>
      {isClient && <ClientTopNav />}

      {!isClient && (
        <>
          {/* Mobile drawer backdrop */}
          {isMobile && mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            />
          )}
          <Sidebar
            collapsed={isMobile ? false : collapsed}
            mobileOpen={mobileOpen}
            isMobile={isMobile}
            onMobileClose={() => setMobileOpen(false)}
          />
        </>
      )}

      <div style={{ marginLeft: sidebarW, flex: 1, transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)', minWidth: 0 }}>

        {/* ── Top bar ── */}
        {!isClient && (
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #E8ECF0',
            padding: '0 32px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>

            {/* Left: toggle + page title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => isMobile ? setMobileOpen(o => !o) : setCollapsed(c => !c)}
                style={{
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, cursor: 'pointer',
                  color: COLORS.textMuted,
                  transition: 'border-color 0.15s, color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.color = COLORS.textMuted; }}
              >
                <Menu size={16} />
              </button>

              {title && (
                <h1 style={{
                  margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800,
                  color: COLORS.text, letterSpacing: '-0.02em', lineHeight: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: isMobile ? 140 : 'none',
                }}>
                  {title}
                </h1>
              )}
            </div>

            {/* Right: search + notification + user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
              {!isMobile && profile?.role === 'admin' && <AdminGlobalSearch />}
              {!isMobile && (profile?.role === 'client' || profile?.role === 'contractor') && <UserGlobalSearch />}

              <NotificationBell />

              {/* User chip + dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setDropdownOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    backgroundColor: dropdownOpen ? COLORS.gray100 : COLORS.gray50,
                    border: `1px solid ${dropdownOpen ? COLORS.borderStrong : COLORS.border}`,
                    borderRadius: 10,
                    padding: '6px 10px 6px 6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => { if (!dropdownOpen) { e.currentTarget.style.backgroundColor = COLORS.gray100; e.currentTarget.style.borderColor = COLORS.borderStrong; } }}
                  onMouseLeave={e => { if (!dropdownOpen) { e.currentTarget.style.backgroundColor = COLORS.gray50;  e.currentTarget.style.borderColor = COLORS.border; } }}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={initials} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: avatarColor.from, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                      {initials}
                    </div>
                  )}
                  {!isMobile && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>
                        {(profile?.full_name || profile?.company_name || '')?.split(' ')[0]}
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.textLight, textTransform: 'capitalize', marginTop: 2, fontWeight: 600 }}>
                        {profile?.role}
                      </div>
                    </div>
                  )}
                  <ChevronDown size={13} color={COLORS.textMuted} style={{ marginLeft: 2, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
                    backgroundColor: '#FFF', borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
                    minWidth: 200, overflow: 'hidden',
                  }}>
                    {/* Profile header */}
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.gray50 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{profile?.full_name || profile?.company_name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{profile?.email}</div>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: '6px 0' }}>
                      {MENU_ITEMS.map(({ label, icon: Icon, onClick }) => (
                        <button key={label} onClick={onClick} style={{
                          width: '100%', border: 'none', background: 'none', textAlign: 'left',
                          padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
                          fontSize: 13, fontWeight: 500, color: COLORS.text, cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.gray50}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Icon size={14} color={COLORS.textMuted} /> {label}
                        </button>
                      ))}
                    </div>

                    {/* Logout */}
                    <div style={{ padding: '6px 0', borderTop: `1px solid ${COLORS.border}` }}>
                      <button onClick={handleLogout} style={{
                        width: '100%', border: 'none', background: 'none', textAlign: 'left',
                        padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 13, fontWeight: 600, color: COLORS.danger, cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.dangerLight}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main style={{ padding: isMobile ? '16px' : isTablet ? '20px 24px' : '32px' }}>
          {children}
        </main>
      </div>

      {/* Archie floating chat — hidden on messages page */}
      {!hideArchie && (
        <ArchieChat role={profile?.role} profile={profile} />
      )}
    </div>
  );
}
