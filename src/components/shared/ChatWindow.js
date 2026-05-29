import { useEffect, useRef, useState } from 'react';
import { subscribeToMessages, sendMessage, markAsRead } from '../../services/chatService';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../theme';
import { MessageSquare, Send } from 'lucide-react';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(ts) {
  if (!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function ChatWindow({ roomId, otherName, projectTitle }) {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef();
  const inputRef   = useRef();

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToMessages(roomId, setMessages);
    markAsRead(roomId, profile.role);
    return unsub;
  }, [roomId, profile.role]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(roomId, profile.id, profile.role, text);
      setText('');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages by day
  let lastDay = null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white,
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{otherName}</div>
        {projectTitle && (
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            Re: {projectTitle}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 4,
        backgroundColor: '#F4F7FB',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', margin: 'auto', color: COLORS.textMuted, fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}><MessageSquare size={32} color={COLORS.textLight} /></div>
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isMe  = msg.sender_id === profile.id;
          const day   = formatDay(msg.created_at);
          const showDay = day !== lastDay;
          lastDay = day;

          return (
            <div key={msg.id}>
              {showDay && (
                <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                  <span style={{
                    backgroundColor: COLORS.border, color: COLORS.textMuted,
                    borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600,
                  }}>{day}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: 4,
              }}>
                <div style={{
                  maxWidth: '72%',
                  backgroundColor: isMe ? COLORS.primary : COLORS.white,
                  color: isMe ? '#fff' : COLORS.text,
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  <div>{msg.text}</div>
                  <div style={{
                    fontSize: 10,
                    color: isMe ? 'rgba(255,255,255,0.65)' : COLORS.textLight,
                    marginTop: 4,
                    textAlign: 'right',
                  }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white,
        display: 'flex', gap: 10, alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message... (Enter to send)"
          rows={1}
          style={{
            flex: 1,
            border: `1.5px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 100,
            overflowY: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            backgroundColor: COLORS.primary,
            border: 'none',
            borderRadius: 12,
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: !text.trim() || sending ? 'not-allowed' : 'pointer',
            opacity: !text.trim() || sending ? 0.5 : 1,
            flexShrink: 0,
            fontSize: 18,
          }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
