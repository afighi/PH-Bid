import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, MessageSquare, Sparkles, History, ArrowLeft, Trash2, ArrowRight } from 'lucide-react';
import { COLORS } from '../../theme';
import { chatWithArchie, getWelcomeSummary } from '../../services/archieService';
import { supabase } from '../../config/supabase';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const MASCOT      = '/Mascot_02.png';
const MASCOT_HEAD = '/Mascot_Chathead.png';

const MAX_SESSIONS = 20;

function storageKey(userId) {
  return userId ? `archie_history_${userId}` : 'archie_history_guest';
}

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm Archie, your AI assistant on BuildBid PH. How can I help you today?",
};

const QUICK_ACTIONS = {
  client: [
    { label: 'Post a Project',    prompt: 'I want to post a new construction project. What do I need to prepare and where do I go?' },
    { label: 'How to Pay',        prompt: 'Walk me through how payments and milestone releases work as a client.' },
    { label: 'Find Contractors',  prompt: 'How do I find and compare contractors for my project?' },
    { label: 'Create a Contract', prompt: 'How do I create a contract after awarding a bid?' },
    { label: 'File a Dispute',    prompt: 'I have an issue with my contractor. How do I file a dispute?' },
    { label: 'My Projects',       prompt: 'Take me to my projects and tell me what needs my attention.' },
  ],
  contractor: [
    { label: 'Find Projects',     prompt: 'Show me how to find and filter open projects that match my skills.' },
    { label: 'How to Get Paid',   prompt: 'Walk me through how I receive payments for completed milestones.' },
    { label: 'Submit a Bid',      prompt: 'Give me tips on writing a winning bid proposal.' },
    { label: 'My Earnings',       prompt: 'Take me to my earnings dashboard and explain what I\'m looking at.' },
    { label: 'Sign a Contract',   prompt: 'I have an awarded bid. How do I sign the contract and get started?' },
    { label: 'File a Dispute',    prompt: 'I have an issue with a client. How do I file a dispute?' },
  ],
  admin: [
    { label: 'Platform Health',   prompt: 'Give me a summary of platform health and what needs attention.' },
    { label: 'Pending Approvals', prompt: 'How many contractors are pending approval and what should I do?' },
    { label: 'Resolve Disputes',  prompt: 'Walk me through how to review and resolve an open dispute.' },
    { label: 'Find Anomalies',    prompt: 'Are there any unusual patterns or issues I should investigate?' },
  ],
};

/* ── localStorage helpers ─────────────────────────────────────────── */
function loadHistory(userId) {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'); } catch { return []; }
}
function saveHistory(userId, sessions) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(sessions.slice(0, MAX_SESSIONS))); } catch {}
}
function saveSession(userId, messages) {
  if (messages.length <= 1) return;
  const sessions = loadHistory(userId);
  const preview = messages.find(m => m.role === 'user')?.content?.slice(0, 80) || 'Chat session';
  const session = { id: Date.now(), timestamp: new Date().toISOString(), preview, messages };
  saveHistory(userId, [session, ...sessions]);
}

/* ── Typing dots ─────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.primaryLight }}>
        <img src={MASCOT} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      </div>
      <div style={{ backgroundColor: COLORS.gray100, borderRadius: '14px 14px 14px 4px', padding: '12px 16px', border: `1px solid ${COLORS.border}`, display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', backgroundColor: COLORS.primary,
            animation: `archie-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────── */
function Bubble({ msg, onFillForm, role, onOptionClick, onNavigate, disabled }) {
  const isUser = msg.role === 'user';

  let text = msg.content;
  let projectData = null;
  let options = [];
  let navigatePath = null;

  if (!isUser) {
    // Extract PROJECT_DATA
    const pdMatch = text.match(/PROJECT_DATA:(\{[\s\S]*?\})\s*$/);
    if (pdMatch) {
      try { projectData = JSON.parse(pdMatch[1]); } catch {}
      text = text.replace(/PROJECT_DATA:[\s\S]*$/, '').trim();
    }
    // Extract NAVIGATE path
    const navMatch = text.match(/NAVIGATE:(\/[^\s\n]+)/);
    if (navMatch) {
      navigatePath = navMatch[1];
      text = text.replace(/NAVIGATE:\/[^\s\n]+/, '').trim();
    }
    // Extract OPTIONS
    const optMatch = text.match(/OPTIONS:(\[[\s\S]*?\])/);
    if (optMatch) {
      try { options = JSON.parse(optMatch[1]); } catch {}
      text = text.replace(/OPTIONS:\[[\s\S]*?\]/, '').trim();
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
      {!isUser && (
        <div style={{ width: 48, height: 48, flexShrink: 0, backgroundColor: 'transparent' }}>
          <img src={MASCOT_HEAD} alt="Archie" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <div style={{ maxWidth: '80%' }}>
        <div style={{
          backgroundColor: isUser ? COLORS.primary : COLORS.gray100,
          color: isUser ? '#fff' : COLORS.text,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '10px 14px',
          fontSize: 13, lineHeight: 1.65,
          border: isUser ? 'none' : `1px solid ${COLORS.border}`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {text}
        </div>

        {/* Option chips */}
        {options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => !disabled && onOptionClick && onOptionClick(opt)}
                disabled={disabled}
                style={{
                  backgroundColor: disabled ? COLORS.gray100 : '#fff',
                  color: disabled ? COLORS.textMuted : COLORS.primary,
                  border: `1.5px solid ${disabled ? COLORS.border : COLORS.primary}`,
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 12, fontWeight: 700,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = COLORS.primaryLight; } }}
                onMouseLeave={e => { if (!disabled) { e.currentTarget.style.backgroundColor = '#fff'; } }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Navigate button */}
        {navigatePath && (
          <button
            onClick={() => onNavigate && onNavigate(navigatePath)}
            style={{
              marginTop: 6, backgroundColor: COLORS.primary, color: '#fff',
              border: 'none', borderRadius: 10, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ArrowRight size={13} /> Take me there
          </button>
        )}

        {/* Fill project form button */}
        {projectData && role === 'client' && (
          <button
            onClick={() => onFillForm(projectData)}
            style={{
              marginTop: 6, backgroundColor: COLORS.accentLight, color: '#3D1500',
              border: `1px solid ${COLORS.accent}55`, borderRadius: 10, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Sparkles size={13} /> Fill Project Form with this data
          </button>
        )}
      </div>
    </div>
  );
}

/* ── History panel ───────────────────────────────────────────────── */
function HistoryPanel({ onBack, onLoad, userId }) {
  const [sessions, setSessions] = useState(() => loadHistory(userId));

  const deleteSession = (id) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveHistory(userId, updated);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* History header */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: COLORS.gray50, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, flexShrink: 0 }}
        >
          <ArrowLeft size={14} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Chat History</span>
        {sessions.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.textMuted }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: 13 }}>
            <History size={28} style={{ marginBottom: 10, opacity: 0.4, display: 'block', margin: '0 auto 10px' }} />
            No past sessions yet.<br />Start chatting and your history will appear here.
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 8px', borderRadius: 10,
                cursor: 'pointer', transition: 'background 0.12s',
                border: `1px solid transparent`,
                marginBottom: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = COLORS.gray100; e.currentTarget.style.borderColor = COLORS.border; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div
                style={{ flex: 1, minWidth: 0 }}
                onClick={() => onLoad(session)}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.preview}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
                  {formatDate(session.timestamp)} · {session.messages.length - 1} message{session.messages.length !== 2 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                title="Delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
                onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ArchieBanner — dashboard welcome with half-body mascot on the LEFT
   ═══════════════════════════════════════════════════════════════════ */
export function ArchieBanner({ role, profile, stats, onOpenChat }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    getWelcomeSummary(role, profile, stats)
      .then(text => { setSummary(text); setLoading(false); })
      .catch(() => { setSummary("Welcome back! I'm Archie, your AI assistant. Ask me anything about your account."); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const name     = profile?.full_name?.split(' ')[0] || 'there';
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <style>{`
        @keyframes archie-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>

      {/* Outer wrapper — overflow visible so mascot arm isn't clipped */}
      <div style={{ position: 'relative', marginBottom: 24 }}>

        {/* Background layer — clips to rounded corners independently */}
        <div style={{
          background: 'linear-gradient(110deg, #DEBB8F 0%, #EDD0A0 30%, #F5E2C0 60%, #FDF3E3 100%)',
          borderRadius: 20,
          position: 'absolute', inset: 0,
          boxShadow: '0 4px 20px rgba(139,90,43,0.13)',
          border: '1px solid #DDB97A',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {/* Warm decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: 60,  width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(180,120,50,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -10, width: 140, height: 140, borderRadius: '50%', backgroundColor: 'rgba(180,120,50,0.05)' }} />
        </div>

        {/* Content grid — overflow visible so mascot can poke out */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '100px 1fr' : '200px 1fr',
          position: 'relative',
          minHeight: isMobile ? 140 : 170,
        }}>

        {/* ── Mascot column ── */}
        <div style={{ position: 'relative', overflow: 'visible' }}>
          <img
            src={MASCOT}
            alt="Archie mascot"
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-38%)',
              height: isMobile ? 130 : 205,
              width: 'auto',
              maxWidth: 'none',
              filter: 'drop-shadow(0 6px 16px rgba(100,60,20,0.20))',
              zIndex: 102,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ── Content column ── */}
        <div style={{ padding: isMobile ? '16px 16px 16px 8px' : '28px 40px 28px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Sparkles size={13} color="#8B5A1A" />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#8B5A1A', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Archie AI · Personal Assistant
            </span>
          </div>

          <h2 style={{ color: '#2C1300', fontWeight: 900, fontSize: isMobile ? 16 : 22, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {greeting}, {name}!
          </h2>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20, marginBottom: 18 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#B8782A', animation: `archie-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          ) : (
            <p style={{ color: '#5C3A10', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>
              {summary}
            </p>
          )}

          <button
            onClick={onOpenChat}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              backgroundColor: '#2C1300', color: '#FDF3E3',
              border: 'none', borderRadius: 10,
              padding: '9px 20px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', alignSelf: 'flex-start',
              transition: 'background 0.15s',
              boxShadow: '0 2px 10px rgba(44,19,0,0.22)',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4A2200'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2C1300'}
          >
            <MessageSquare size={13} /> Chat with Archie
          </button>
        </div>

        </div>{/* end content grid */}
      </div>{/* end outer wrapper */}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ArchieChat — floating button + slide-in panel
   ═══════════════════════════════════════════════════════════════════ */
export default function ArchieChat({ role, profile, stats: propStats, defaultOpen = false }) {
  const navigate  = useNavigate();
  const scrollRef = useRef(null);
  const prevOpen  = useRef(false);
  const userId    = profile?.id;
  const { isMobile } = useBreakpoint();

  const [isOpen,      setIsOpen]      = useState(defaultOpen);
  const [messages,    setMessages]    = useState([INITIAL_MESSAGE]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [liveStats,   setLiveStats]   = useState(propStats || {});

  // Open panel whenever the parent signals it (e.g. "Chat with Archie" button in banner)
  useEffect(() => { if (defaultOpen) { setIsOpen(true); } }, [defaultOpen]);

  // New session every time the panel opens
  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setShowHistory(false);
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  // Fetch live stats when the panel first opens so Archie has real context
  useEffect(() => {
    if (!isOpen || !profile?.id) return;
    if (role === 'client') {
      supabase.from('projects').select('status').eq('client_id', profile.id)
        .then(({ data }) => {
          if (!data) return;
          setLiveStats({
            total_projects:    data.length,
            open_projects:     data.filter(p => p.status === 'open').length,
            active_projects:   data.filter(p => p.status === 'in_progress').length,
            completed_projects: data.filter(p => p.status === 'completed').length,
          });
        });
    } else if (role === 'contractor') {
      supabase.from('bids').select('status, bid_amount').eq('contractor_id', profile.id)
        .then(({ data }) => {
          if (!data) return;
          const awarded = data.filter(b => b.status === 'awarded');
          setLiveStats({
            total_bids:     data.length,
            active_bids:    data.filter(b => b.status === 'submitted').length,
            bids_won:       awarded.length,
            win_rate:       data.length > 0 ? Math.round((awarded.length / data.length) * 100) + '%' : '0%',
            total_won_value: '₱' + awarded.reduce((s, b) => s + Number(b.bid_amount || 0), 0).toLocaleString('en-PH'),
          });
        });
    }
  }, [isOpen, profile?.id, role]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const closePanel = useCallback(() => {
    saveSession(userId, messages);
    setIsOpen(false);
  }, [userId, messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const updated = [...messages, { role: 'user', content: msg }];
    setMessages(updated);
    setLoading(true);

    try {
      const apiMessages = updated.filter((m, i) => i > 0 || m.role === 'user');
      const reply = await chatWithArchie(apiMessages, role, profile, liveStats);
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, I had trouble connecting right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    saveSession(userId, messages);
    navigate(path);
    setIsOpen(false);
  };

  const handleFillForm = (data) => {
    let prefill = { ...data };
    if (prefill.bid_deadline && /^\d{4}-\d{2}-\d{2}$/.test(prefill.bid_deadline)) {
      prefill.bid_deadline = prefill.bid_deadline + 'T09:00';
    }
    saveSession(userId, messages);
    navigate('/client/new-project', { state: { prefill } });
    setIsOpen(false);
  };

  const handleLoadSession = (session) => {
    setMessages(session.messages);
    setShowHistory(false);
  };

  const quickActions = QUICK_ACTIONS[role] || [];

  return (
    <>
      <style>{`
        @keyframes archie-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes archie-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* ── Float button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Chat with Archie"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            width: 96, height: 96, borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none', cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.2s, filter 0.2s',
            filter: 'drop-shadow(0 4px 14px rgba(44,19,0,0.35))',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.10)'; e.currentTarget.style.filter = 'drop-shadow(0 6px 20px rgba(44,19,0,0.50))'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.filter = 'drop-shadow(0 4px 14px rgba(44,19,0,0.35))'; }}
        >
          <img src={MASCOT_HEAD} alt="Archie" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </button>
      )}

      {/* ── Slide-in panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1002,
          width: isMobile ? '100%' : 384, backgroundColor: '#FFFFFF',
          boxShadow: '-6px 0 40px rgba(26,10,0,0.12)',
          display: 'flex', flexDirection: 'column',
          borderLeft: `1px solid ${COLORS.border}`,
          animation: 'archie-slide-in 0.22s ease',
        }}>

          {/* Header */}
          <div style={{
            backgroundColor: '#C49A5A',
            borderBottom: '1px solid #B8863E',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'transparent' }}>
              <img src={MASCOT_HEAD} alt="Archie" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#2C1300', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Archie</div>
              <div style={{ color: '#7A4A18', fontSize: 11 }}>AI Assistant · BuildBid PH</div>
            </div>
            {/* History button */}
            <button
              onClick={() => setShowHistory(v => !v)}
              title="Chat History"
              style={{
                width: 30, height: 30, border: '1px solid rgba(44,19,0,0.18)', borderRadius: 8,
                background: showHistory ? 'rgba(44,19,0,0.18)' : 'rgba(44,19,0,0.07)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2C1300', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,19,0,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = showHistory ? 'rgba(44,19,0,0.18)' : 'rgba(44,19,0,0.07)'}
            >
              <History size={14} />
            </button>
            <button
              onClick={closePanel}
              style={{
                width: 30, height: 30, border: '1px solid rgba(44,19,0,0.18)', borderRadius: 8,
                background: 'rgba(44,19,0,0.07)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2C1300', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,19,0,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(44,19,0,0.07)'}
            >
              <X size={14} />
            </button>
          </div>

          {/* History panel (replaces chat body) */}
          {showHistory ? (
            <HistoryPanel
              onBack={() => setShowHistory(false)}
              onLoad={handleLoadSession}
              userId={userId}
            />
          ) : (
            <>
              {/* Quick actions */}
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, backgroundColor: COLORS.gray50, maxHeight: 90, overflowY: 'auto' }}>
                {quickActions.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => send(prompt)}
                    disabled={loading}
                    style={{
                      backgroundColor: COLORS.primaryLight, color: COLORS.primary,
                      border: `1px solid ${COLORS.border}`, borderRadius: 20,
                      padding: '5px 12px', fontSize: 11, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = COLORS.gray200)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = COLORS.primaryLight)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: COLORS.gray50 }}
              >
                {messages.map((msg, i) => (
                  <Bubble
                    key={i}
                    msg={msg}
                    role={role}
                    onFillForm={handleFillForm}
                    onOptionClick={send}
                    onNavigate={handleNavigate}
                    disabled={loading}
                  />
                ))}
                {loading && <TypingIndicator />}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 8, flexShrink: 0, backgroundColor: '#fff' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask Archie anything..."
                  disabled={loading}
                  style={{
                    flex: 1, border: `1.5px solid ${COLORS.border}`, borderRadius: 10,
                    padding: '10px 14px', fontSize: 13, outline: 'none',
                    fontFamily: "'Montserrat', system-ui, sans-serif",
                    color: COLORS.text, backgroundColor: COLORS.gray50,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => e.target.style.borderColor = COLORS.primary}
                  onBlur={e   => e.target.style.borderColor = COLORS.border}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: input.trim() && !loading ? COLORS.primary : COLORS.gray200,
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: input.trim() && !loading ? '#fff' : COLORS.textLight,
                    flexShrink: 0, transition: 'background 0.15s',
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
