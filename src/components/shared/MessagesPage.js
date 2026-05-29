import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { subscribeToUserRooms, markAsRead } from '../../services/chatService';
import { useAuthStore } from '../../stores/authStore';
import DashboardLayout from '../layout/DashboardLayout';
import ChatWindow from './ChatWindow';
import { COLORS } from '../../theme';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesPage() {
  const { profile } = useAuthStore();
  const location    = useLocation();
  const [rooms,        setRooms]        = useState([]);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [otherProfiles, setOtherProfiles] = useState({});

  // Read ?room=xxx from URL to pre-select
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomId = params.get('room');
    if (roomId) setActiveRoom(roomId);
  }, [location.search]);

  // Subscribe to this user's rooms
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToUserRooms(profile.id, profile.role, setRooms);
    return unsub;
  }, [profile]);

  // Fetch display names for the other party in each room
  useEffect(() => {
    if (!rooms.length) return;
    const ids = rooms.map((r) =>
      profile.role === 'client' ? r.contractor_id : r.client_id
    ).filter(Boolean);
    if (!ids.length) return;

    supabase.from('profiles')
      .select('id, full_name, company_name')
      .in('id', ids)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach((p) => { map[p.id] = p.company_name || p.full_name; });
        setOtherProfiles(map);
      });
  }, [rooms, profile.role]);

  const handleSelectRoom = (roomId) => {
    setActiveRoom(roomId);
    markAsRead(roomId, profile.role);
  };

  const activeRoomData  = rooms.find((r) => r.id === activeRoom);
  const unreadKey       = profile?.role === 'client' ? 'unread_client' : 'unread_contractor';
  const otherIdKey      = profile?.role === 'client' ? 'contractor_id' : 'client_id';
  const otherName       = activeRoomData
    ? otherProfiles[activeRoomData[otherIdKey]] || 'Loading...'
    : '';

  return (
    <DashboardLayout title="Messages">
      <div style={{
        display: 'flex', gap: 0,
        height: 'calc(100vh - 120px)',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>

        {/* ── Left: Room list ── */}
        <div style={{
          width: 300, flexShrink: 0,
          borderRight: `1px solid ${COLORS.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${COLORS.border}`,
            fontWeight: 700, fontSize: 15, color: COLORS.text,
          }}>
            Conversations
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: 8 }}><MessageSquare size={32} color={COLORS.textLight} /></div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>No conversations yet.</p>
                <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>
                  {profile?.role === 'client'
                    ? 'Message a contractor from the Bids page.'
                    : 'Wait for a client to start a conversation.'}
                </p>
              </div>
            ) : (
              rooms.map((room) => {
                const otherId  = room[otherIdKey];
                const name     = otherProfiles[otherId] || '...';
                const unread   = room[unreadKey] || 0;
                const isActive = activeRoom === room.id;

                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '14px 20px',
                      border: 'none',
                      borderBottom: `1px solid ${COLORS.border}`,
                      backgroundColor: isActive ? `${COLORS.primary}10` : 'transparent',
                      borderLeft: isActive ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>{name}</span>
                      <span style={{ fontSize: 10, color: COLORS.textLight }}>{timeAgo(room.last_at)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.project_title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                        {room.last_message || 'No messages yet'}
                      </span>
                      {unread > 0 && (
                        <span style={{
                          backgroundColor: COLORS.primary, color: '#fff',
                          borderRadius: 20, padding: '1px 7px',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>{unread}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Chat window ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {activeRoom ? (
            <ChatWindow
              roomId={activeRoom}
              otherName={otherName}
              projectTitle={activeRoomData?.project_title}
            />
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: COLORS.textMuted,
            }}>
              <div style={{ marginBottom: 12 }}><MessageSquare size={48} color={COLORS.textLight} /></div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Select a conversation</p>
              <p style={{ fontSize: 13, color: COLORS.textLight }}>
                Choose from the list on the left to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
