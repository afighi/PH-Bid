import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadMessages } from '../../hooks/useRealtime';
import { logout } from '../../services/authService';
import { COLORS } from '../../theme';
import {
  LayoutDashboard, Building2, PlusCircle, CircleDollarSign,
  MessageSquare, User, Search, ClipboardList, Users, LogOut,
  ScrollText, FolderOpen, Settings, Bookmark, TrendingUp, DatabaseBackup,
  AlertTriangle, UserPlus, Briefcase, FileText, X,
} from 'lucide-react';

/* ── Grouped nav config ───────────────────────────────────────── */
const CLIENT_NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { path: '/client', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    group: 'PROJECTS',
    items: [
      { path: '/client/projects',    label: 'My Projects',  icon: FolderOpen },
      { path: '/client/new-project', label: 'Post Project', icon: PlusCircle },
      { path: '/client/contracts',   label: 'Contracts',    icon: FileText },
      { path: '/client/disputes',    label: 'Disputes',     icon: AlertTriangle },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { path: '/client/transactions', label: 'Payments',  icon: CircleDollarSign },
    ],
  },
  {
    group: 'COMMUNICATION',
    items: [
      { path: '/client/messages', label: 'Messages', icon: MessageSquare, badge: true },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { path: '/client/profile',   label: 'Profile',   icon: User },
      { path: '/client/referrals', label: 'Referrals', icon: UserPlus },
      { path: '/client/settings',  label: 'Settings',  icon: Settings },
    ],
  },
];

const CONTRACTOR_NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { path: '/contractor/dashboard', label: 'Dashboard',      icon: LayoutDashboard, exact: true },
      { path: '/contractor/earnings',  label: 'Earnings',       icon: TrendingUp },
    ],
  },
  {
    group: 'BIDDING',
    items: [
      { path: '/contractor/browse',    label: 'Browse Projects', icon: Search },
      { path: '/contractor/watchlist', label: 'Project Watchlist', icon: Bookmark },
      { path: '/contractor/my-bids',   label: 'My Bids',         icon: ClipboardList },
    ],
  },
  {
    group: 'WORK',
    items: [
      { path: '/contractor/contracts', label: 'Contracts',  icon: FileText },
      { path: '/contractor/disputes',  label: 'Disputes',   icon: AlertTriangle },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { path: '/contractor/transactions', label: 'Payments', icon: CircleDollarSign },
    ],
  },
  {
    group: 'COMMUNICATION',
    items: [
      { path: '/contractor/messages', label: 'Messages', icon: MessageSquare, badge: true },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { path: '/contractor/profile',  label: 'Profile',   icon: User },
      { path: '/contractor/referrals',label: 'Referrals', icon: UserPlus },
      { path: '/contractor/settings', label: 'Settings',  icon: Settings },
    ],
  },
];

const ADMIN_NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { path: '/admin/users',    label: 'Users',    icon: Users },
      { path: '/admin/projects', label: 'Projects', icon: Building2 },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      { path: '/admin/transactions', label: 'Transactions', icon: CircleDollarSign },
    ],
  },
  {
    group: 'MODERATION',
    items: [
      { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { path: '/admin/audit',    label: 'Audit Trail',     icon: ScrollText },
      { path: '/admin/backup',   label: 'Backup & Restore', icon: DatabaseBackup },
      { path: '/admin/profile',  label: 'My Profile',       icon: User },
      { path: '/admin/settings', label: 'Settings',         icon: Settings },
    ],
  },
];

const ROLE_COLOR = {
  client:     '#38BDF8',
  contractor: '#34D399',
  admin:      '#F59E0B',
};

const ROLE_LABEL = {
  client:     'Client Portal',
  contractor: 'Contractor Portal',
  admin:      'Admin Console',
};

/* ── White sidebar constants ──────────────────────────────────── */
const SB_BG      = '#FFFFFF';
const SB_BORDER  = '#E8ECF0';
const SB_DIVIDER = '#E8ECF0';
const SB_TEXT    = '#4B5563';
const SB_ICON    = '#6B7280';
const SB_MUTED   = '#94A3B8';

export default function Sidebar({ collapsed: collapsedProp, mobileOpen = false, isMobile = false, onMobileClose, onHoverChange }) {
  const { profile }  = useAuthStore();
  const navigate     = useNavigate();
  const location     = useLocation();
  const unreadMsgs   = useUnreadMessages(profile?.id, profile?.role);

  // Hover-to-expand: desktop sidebar stays at 68px until hovered
  const [hovered, setHovered] = useState(false);
  const collapsed = isMobile ? false : (collapsedProp && !hovered);

  const handleMouseEnter = () => { if (!isMobile) { setHovered(true);  onHoverChange?.(true);  } };
  const handleMouseLeave = () => { if (!isMobile) { setHovered(false); onHoverChange?.(false); } };

  const navGroups  = profile?.role === 'client'
    ? CLIENT_NAV
    : profile?.role === 'contractor'
    ? CONTRACTOR_NAV
    : ADMIN_NAV;

  const roleColor  = ROLE_COLOR[profile?.role] || COLORS.primary;
  const roleLabel  = ROLE_LABEL[profile?.role] || '';

  const initials = (profile?.full_name || profile?.company_name || 'U')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = ({ path, exact }) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const W = isMobile ? 260 : (collapsed ? 68 : 228);

  // On mobile: hidden off-screen unless mobileOpen
  const mobileTranslate = isMobile
    ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
    : 'translateX(0)';

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: W,
        minHeight: '100vh',
        backgroundColor: SB_BG,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s',
        overflow: 'hidden',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 200,
        borderRight: `1px solid ${SB_BORDER}`,
        boxShadow: hovered && !isMobile
          ? '4px 0 24px rgba(0,0,0,0.12)'
          : isMobile && mobileOpen
          ? '4px 0 24px rgba(0,0,0,0.18)'
          : '2px 0 8px rgba(0,0,0,0.04)',
        transform: mobileTranslate,
      }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '18px 0' : '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: `1px solid ${SB_BORDER}`,
        justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 68,
        flexShrink: 0,
      }}>
        <img
          src="/buildbid_logo.png"
          alt="BuildBid"
          style={{ height: 32, objectFit: 'contain', flexShrink: 0, opacity: 0.9 }}
        />
        {!collapsed && (
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>
              Build<span style={{ color: '#C07838' }}>Bid</span>
              <span style={{ color: '#94A3B8', fontWeight: 400 }}> PH</span>
            </div>
            <div style={{ fontSize: 9, color: '#C07838', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              {roleLabel}
            </div>
          </div>
        )}
        {/* Mobile close button */}
        {isMobile && onMobileClose && (
          <button onClick={onMobileClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SB_MUTED, padding: 4, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
        {navGroups.map(({ group, items }, gi) => (
          <div key={group}>
            {/* Group separator (collapsed: thin line between groups) */}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, backgroundColor: SB_DIVIDER, margin: '4px 16px 4px' }} />
            )}

            {/* Group label */}
            {!collapsed && (
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: SB_MUTED,
                textTransform: 'uppercase',
                padding: gi === 0 ? '10px 20px 5px 28px' : '14px 20px 5px 28px',
                userSelect: 'none',
              }}>
                {group}
              </div>
            )}

            {items.map((item) => {
              const { path, label, icon: Icon, badge: hasBadge } = item;
              const active = isActive(item);
              const badgeCount = hasBadge && unreadMsgs > 0 ? unreadMsgs : 0;

              return (
                <button
                  key={path}
                  onClick={() => { navigate(path); if (isMobile && onMobileClose) onMobileClose(); }}
                  title={collapsed ? label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: collapsed ? '11px 0' : '9px 20px',
                    paddingLeft: collapsed ? 0 : (active ? '17px' : '20px'),
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: !collapsed && active ? `3px solid #7B3F00` : '3px solid transparent',
                    backgroundColor: active ? '#F5E6D3' : 'transparent',
                    color: active ? '#7B3F00' : SB_TEXT,
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s',
                    outline: 'none',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#F5F7FA';
                      e.currentTarget.style.color = '#5A2D00';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = SB_TEXT;
                    }
                  }}
                >
                  {/* Icon */}
                  <span style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Icon size={16} color={active ? '#7B3F00' : SB_ICON} />
                    {badgeCount > 0 && collapsed && (
                      <span style={{
                        position: 'absolute', top: -5, right: -7,
                        backgroundColor: '#EF4444', color: '#fff',
                        borderRadius: '50%', fontSize: 8, fontWeight: 800,
                        width: 14, height: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${SB_BG}`,
                      }}>
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  {!collapsed && (
                    <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                  )}

                  {/* Unread badge (expanded) */}
                  {!collapsed && badgeCount > 0 && (
                    <span style={{
                      backgroundColor: '#EF4444', color: '#fff',
                      borderRadius: 20, fontSize: 9, fontWeight: 800,
                      padding: '2px 7px', flexShrink: 0,
                    }}>
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User profile card + logout ── */}
      <div style={{ borderTop: `1px solid ${SB_BORDER}`, padding: collapsed ? '12px 0' : '12px 12px', flexShrink: 0 }}>

        {!collapsed && profile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 10px',
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            border: `1px solid ${SB_BORDER}`,
            marginBottom: 8,
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: `${roleColor}cc`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFF', fontSize: 13, fontWeight: 800, flexShrink: 0,
              border: `2px solid ${roleColor}55`,
              overflow: 'hidden',
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.company_name || profile.full_name}
              </div>
              <div style={{ fontSize: 10, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 1 }}>
                {profile.role}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed avatar */}
        {collapsed && profile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: `${roleColor}cc`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFF', fontSize: 13, fontWeight: 800,
              border: `2px solid ${roleColor}55`,
              overflow: 'hidden',
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 9,
            padding: collapsed ? '9px 0' : '9px 10px',
            border: 'none',
            background: 'none',
            color: '#6B7280',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 8,
            transition: 'color 0.15s, background 0.15s',
            letterSpacing: '0.02em',
            outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'none'; }}
        >
          <LogOut size={15} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
