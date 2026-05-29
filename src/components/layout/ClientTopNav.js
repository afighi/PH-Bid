import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadMessages } from '../../hooks/useRealtime';
import { logout } from '../../services/authService';
import { COLORS } from '../../theme';
import NotificationBell from '../shared/NotificationBell';
import UserGlobalSearch from '../shared/UserGlobalSearch';
import {
  LayoutDashboard, FolderOpen, PlusCircle,
  CircleDollarSign, MessageSquare,
  User, Settings, Shield, LogOut, ChevronDown,
} from 'lucide-react';

const CLIENT_NAV = [
  { path: '/client',              label: 'OVERVIEW',  icon: LayoutDashboard },
  { path: '/client/projects',     label: 'PROJECTS',  icon: FolderOpen },
  { path: '/client/new-project',  label: 'POST BID',  icon: PlusCircle },
  { path: '/client/transactions', label: 'PAYMENTS',  icon: CircleDollarSign },
  { path: '/client/messages',     label: 'MESSAGES',  icon: MessageSquare },
];

const MENU_ITEMS = [
  { label: 'My Profile', icon: User,     path: '/client/profile'  },
  { label: 'Settings',   icon: Settings, path: '/client/settings' },
  { label: 'Security',   icon: Shield,   path: '/client/settings' },
];

export default function ClientTopNav() {
  const { profile }  = useAuthStore();
  const navigate     = useNavigate();
  const location     = useLocation();
  const unreadMsgs   = useUnreadMessages(profile?.id, profile?.role);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const isActive = (path) => {
    if (path === '/client') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  const avatarColors = ['#7B3F00', '#7C3AED', '#059669', '#D97706', '#DC2626'];
  const avatarBg = avatarColors[(profile?.full_name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100, width: '100%', height: 72,
      backgroundColor: '#FFF', borderBottom: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'stretch',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>

      {/* LOGO */}
      <div style={{
        width: 240, borderRight: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        flexShrink: 0, cursor: 'pointer',
      }} onClick={() => navigate('/client')}>
        <img src="/buildbid_logo.png" alt="BuildBid" style={{ height: 28, objectFit: 'contain' }} />
        <div style={{ fontWeight: 900, fontSize: 16, color: COLORS.text, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          BuildBid <span style={{ color: COLORS.primary }}>PH</span>
        </div>
      </div>

      {/* NAV LINKS */}
      <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
        {CLIENT_NAV.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          const isMsg  = label === 'MESSAGES';
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              border: 'none',
              borderRight: '1px solid rgba(0,0,0,0.06)',
              borderBottom: active ? '3px solid #7B3F00' : '3px solid transparent',
              backgroundColor: active ? '#F5E6D3' : '#FFF',
              color: active ? '#7B3F00' : '#374151',
              padding: '0 20px', fontSize: 12, fontWeight: 700,
              letterSpacing: 0.5, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.15s', outline: 'none', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.color = '#111827'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = '#FFF';    e.currentTarget.style.color = '#374151'; } }}
            >
              <Icon size={14} />
              {label}
              {isMsg && unreadMsgs > 0 && (
                <span style={{ backgroundColor: '#EF4444', color: '#FFF', padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 900, lineHeight: 1 }}>
                  {unreadMsgs}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
          <UserGlobalSearch />
        </div>

        {/* Notifications */}
        <div style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56 }}>
          <NotificationBell />
        </div>

        {/* Profile dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center' }}>
          <div
            onClick={() => setDropdownOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 20px', height: '100%', cursor: 'pointer',
              backgroundColor: dropdownOpen ? '#F5E6D3' : 'transparent',
              transition: 'background 0.15s', userSelect: 'none',
            }}
            onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
            onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              backgroundColor: profile?.avatar_url ? 'transparent' : avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#FFF',
              border: '2px solid rgba(0,0,0,0.06)',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: COLORS.text, textTransform: 'uppercase' }}>
              {profile?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={13} color={COLORS.textMuted} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 999,
              backgroundColor: '#FFF', borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
              minWidth: 210, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.gray50 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{profile?.full_name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{profile?.email}</div>
              </div>

              {/* Items */}
              <div style={{ padding: '6px 0' }}>
                {MENU_ITEMS.map(({ label, icon: Icon, path }) => (
                  <button key={label} onClick={() => { navigate(path); setDropdownOpen(false); }} style={{
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
              <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '6px 0' }}>
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
    </nav>
  );
}
