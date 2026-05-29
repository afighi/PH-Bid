import { useState, useRef, useEffect } from 'react';
import { useLiveNotifications } from '../../hooks/useRealtime';
import { useAuthStore } from '../../stores/authStore';
import { formatRelative } from '../../utils/formatters';
import { COLORS } from '../../theme';
import { Bell, Inbox } from 'lucide-react';

export default function NotificationBell() {
  const { profile } = useAuthStore();
  // Admins share a single 'admin' notification node; others use their own UID
  const notifUserId = profile?.role === 'admin' ? 'admin' : profile?.id;
  const { notifications, unreadCount, markAllRead, markOneRead } = useLiveNotifications(notifUserId);
  const [open, setOpen] = useState(false);
  const ref             = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 8,
          borderRadius: 10,
          backgroundColor: open ? COLORS.gray100 : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <span><Bell size={20} color={COLORS.text} /></span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 18,
            height: 18,
            backgroundColor: COLORS.danger,
            color: '#fff',
            borderRadius: '50%',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 46,
          width: 340,
          backgroundColor: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.gray50,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>
              Notifications {unreadCount > 0 && <span style={{ color: COLORS.primary }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: COLORS.primary, fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: COLORS.textLight, fontSize: 13 }}>
                <div style={{ marginBottom: 8 }}><Inbox size={32} color={COLORS.textLight} /></div>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 25).map((n) => (
                <div
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    backgroundColor: n.is_read ? COLORS.white : `${COLORS.primary}08`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, color: COLORS.text, margin: 0, flex: 1 }}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <div style={{ width: 8, height: 8, backgroundColor: COLORS.primary, borderRadius: '50%', flexShrink: 0, marginTop: 3, marginLeft: 8 }} />
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '3px 0 4px' }}>{n.message}</p>
                  <p style={{ fontSize: 11, color: COLORS.textLight, margin: 0 }}>{formatRelative(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
