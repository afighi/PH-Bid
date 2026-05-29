import { useEffect, useState } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, off, update } from 'firebase/database';

// ─── Live bid counter for a specific project ───────────────────────
export function useLiveProjectData(projectId) {
  const [data, setData] = useState({ bid_count: 0, status: 'open', latest_bid_at: null, latest_bid_amt: null });

  useEffect(() => {
    if (!projectId) return;
    const r = ref(database, `projects/${projectId}`);
    onValue(r, (snap) => { if (snap.val()) setData(snap.val()); });
    return () => off(r);
  }, [projectId]);

  return data;
}

// ─── Live bids list for a project (client's bid view) ─────────────
export function useLiveBids(projectId) {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    const r = ref(database, `bids/${projectId}`);
    onValue(r, (snap) => {
      const val = snap.val();
      if (val) {
        const arr = Object.entries(val).map(([id, b]) => ({ id, ...b }));
        setBids(arr.sort((a, b) => b.submitted_at - a.submitted_at));
      } else {
        setBids([]);
      }
    });
    return () => off(r);
  }, [projectId]);

  return bids;
}

// ─── Live user registrations for admin dashboard ──────────────────
export function useAdminQueue() {
  const [liveUsers, setLiveUsers] = useState([]);

  useEffect(() => {
    const r = ref(database, 'admin_queue/users');
    onValue(r, (snap) => {
      const val = snap.val();
      if (val) {
        const arr = Object.values(val).sort((a, b) => b.created_at - a.created_at);
        setLiveUsers(arr);
      } else {
        setLiveUsers([]);
      }
    });
    return () => off(r);
  }, []);

  return liveUsers;
}

// ─── Live notifications for a user ────────────────────────────────
export function useLiveNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  useEffect(() => {
    if (!userId) return;
    const r = ref(database, `notifications/${userId}`);
    onValue(r, (snap) => {
      const val = snap.val();
      if (val) {
        const arr = Object.entries(val)
          .map(([id, n]) => ({ id, ...n }))
          .sort((a, b) => b.created_at - a.created_at);
        setNotifications(arr);
        setUnreadCount(arr.filter((n) => !n.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return () => off(r);
  }, [userId]);

  const markAllRead = () => {
    if (!userId) return;
    const updates = {};
    notifications
      .filter((n) => !n.is_read)
      .forEach((n) => { updates[`notifications/${userId}/${n.id}/is_read`] = true; });
    if (Object.keys(updates).length) update(ref(database), updates);
  };

  const markOneRead = (notifId) => {
    if (!userId) return;
    update(ref(database, `notifications/${userId}/${notifId}`), { is_read: true });
  };

  return { notifications, unreadCount, markAllRead, markOneRead };
}

// ─── Total unread message count across all chat rooms ─────────────
export function useUnreadMessages(userId, role) {
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!userId || !role) return;
    const chatsRef  = ref(database, 'chats');
    const idField   = role === 'client' ? 'client_id' : 'contractor_id';
    const unreadKey = role === 'client' ? 'unread_client' : 'unread_contractor';

    onValue(chatsRef, (snap) => {
      const data = snap.val();
      if (!data) { setTotalUnread(0); return; }
      let total = 0;
      Object.values(data).forEach((room) => {
        if (room.meta?.[idField] === userId) {
          total += room.meta?.[unreadKey] || 0;
        }
      });
      setTotalUnread(total);
    });
    return () => off(chatsRef);
  }, [userId, role]);

  return totalUnread;
}
