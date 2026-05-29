import { database } from '../config/firebase';
import { ref, push, onValue, off, update, get } from 'firebase/database';
import { supabase } from '../config/supabase';

export function getRoomId(projectId, contractorId) {
  return `${projectId}_${contractorId}`;
}

// Create room if it doesn't exist yet
export async function initRoom(projectId, contractorId, projectTitle, clientId) {
  const roomId  = getRoomId(projectId, contractorId);
  const metaRef = ref(database, `chats/${roomId}/meta`);
  const snap    = await get(metaRef);
  if (!snap.exists()) {
    await update(metaRef, {
      client_id:     clientId,
      contractor_id: contractorId,
      project_id:    projectId,
      project_title: projectTitle,
      last_message:  '',
      last_at:       Date.now(),
      unread_client:      0,
      unread_contractor:  0,
    });
  }
  return roomId;
}

export async function sendMessage(roomId, senderId, senderRole, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await push(ref(database, `chats/${roomId}/messages`), {
    sender_id:   senderId,
    sender_role: senderRole,
    text:        trimmed,
    created_at:  Date.now(),
  });

  // Update meta: bump last_message + unread for the OTHER party
  const metaRef   = ref(database, `chats/${roomId}/meta`);
  const snap      = await get(metaRef);
  const meta      = snap.val() || {};
  const unreadKey = senderRole === 'client' ? 'unread_contractor' : 'unread_client';

  await update(metaRef, {
    last_message: trimmed.slice(0, 100),
    last_at:      Date.now(),
    [unreadKey]:  (meta[unreadKey] || 0) + 1,
  });

  // Push notification to the recipient
  const recipientId = senderRole === 'client' ? meta.contractor_id : meta.client_id;
  if (recipientId) {
    // Fetch sender's display name
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', senderId)
      .single();
    const senderName = sender?.company_name || sender?.full_name || 'Someone';

    await push(ref(database, `notifications/${recipientId}`), {
      type:       'new_message',
      title:      `New message from ${senderName}`,
      message:    trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed,
      room_id:    roomId,
      is_read:    false,
      created_at: Date.now(),
    });
  }
}

export function subscribeToMessages(roomId, callback) {
  const msgRef = ref(database, `chats/${roomId}/messages`);
  onValue(msgRef, (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const msgs = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.created_at - b.created_at);
    callback(msgs);
  });
  return () => off(msgRef);
}

// Listen to all rooms for a user (filtered client-side — small scale)
export function subscribeToUserRooms(userId, role, callback) {
  const chatsRef = ref(database, 'chats');
  onValue(chatsRef, (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const field = role === 'client' ? 'client_id' : 'contractor_id';
    const rooms = Object.entries(data)
      .filter(([, v]) => v.meta?.[field] === userId)
      .map(([id, v]) => ({ id, ...v.meta }))
      .sort((a, b) => (b.last_at || 0) - (a.last_at || 0));
    callback(rooms);
  });
  return () => off(chatsRef);
}

export async function markAsRead(roomId, role) {
  const field = role === 'client' ? 'unread_client' : 'unread_contractor';
  await update(ref(database, `chats/${roomId}/meta`), { [field]: 0 });
}
