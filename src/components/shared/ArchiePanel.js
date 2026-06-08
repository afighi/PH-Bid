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

/* ── Lightweight markdown renderer ──────────────────────────────── */
function renderInline(text) {
  // Bold, italic, inline code
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 4, padding: '1px 5px', fontSize: 12, fontFamily: 'monospace' }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MarkdownContent({ text, isUser }) {
  const C2 = isUser
    ? { text: '#fff', muted: 'rgba(255,255,255,0.75)', border: 'rgba(255,255,255,0.25)', headBg: 'rgba(255,255,255,0.15)', rowBg: 'rgba(255,255,255,0.08)' }
    : { text: COLORS.text, muted: COLORS.textMuted, border: COLORS.border, headBg: '#F8FAFC', rowBg: '#FAFAF7' };

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue; }

    // Heading ## or ###
    if (/^#{1,3} /.test(line)) {
      const level = (line.match(/^#+/) || [''])[0].length;
      const content = line.replace(/^#+\s+/, '');
      elements.push(
        <div key={i} style={{ fontWeight: 800, fontSize: level === 1 ? 15 : 13, color: C2.text, marginTop: 10, marginBottom: 4, borderBottom: level === 1 ? `1px solid ${C2.border}` : 'none', paddingBottom: level === 1 ? 4 : 0 }}>
          {renderInline(content)}
        </div>
      );
      i++; continue;
    }

    // Table: collect consecutive | lines
    if (/^\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
      const rows = tableLines
        .filter(l => !/^\|[-| :]+\|$/.test(l.trim()))
        .map(l => l.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));
      if (rows.length > 0) {
        const [header, ...body] = rows;
        elements.push(
          <div key={`tbl-${i}`} style={{ overflowX: 'auto', marginTop: 8, marginBottom: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {header.map((h, hi) => (
                    <th key={hi} style={{ background: C2.headBg, color: C2.muted, fontWeight: 700, textAlign: 'left', padding: '6px 10px', border: `1px solid ${C2.border}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 1 ? C2.rowBg : 'transparent' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '6px 10px', border: `1px solid ${C2.border}`, color: C2.text, verticalAlign: 'top' }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet list: collect consecutive bullet lines
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '4px 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 13, color: C2.text, lineHeight: 1.55 }}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '4px 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 13, color: C2.text, lineHeight: 1.55 }}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph
    elements.push(
      <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: C2.text }}>{renderInline(line)}</p>
    );
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{elements}</div>;
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
      <div style={{ maxWidth: '82%' }}>
        <div style={{
          backgroundColor: isUser ? COLORS.primary : '#FFF',
          color: isUser ? '#fff' : COLORS.text,
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '10px 14px',
          border: isUser ? 'none' : `1px solid ${COLORS.border}`,
          boxShadow: isUser ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
          wordBreak: 'break-word',
        }}>
          {isUser
            ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#fff' }}>{text}</p>
            : <MarkdownContent text={text} isUser={false} />
          }
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

      {/* Outer wrapper */}
      <div style={{ position: 'relative', marginBottom: 24, overflow: 'hidden', borderRadius: 20 }}>

        {/* Background layer */}
        <div style={{
          background: 'linear-gradient(110deg, #DEBB8F 0%, #EDD0A0 30%, #F5E2C0 60%, #FDF3E3 100%)',
          position: 'absolute', inset: 0,
          boxShadow: '0 4px 20px rgba(139,90,43,0.13)',
          border: '1px solid #DDB97A',
          pointerEvents: 'none',
        }}>
          {/* Warm decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: 60,  width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(180,120,50,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -10, width: 140, height: 140, borderRadius: '50%', backgroundColor: 'rgba(180,120,50,0.05)' }} />
        </div>

        {/* Content grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '130px 1fr' : '210px 1fr',
          position: 'relative',
          alignItems: 'end',
        }}>

        {/* ── Mascot column — flex bottom-align so image drives the row height ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'visible' }}>
          <img
            src={MASCOT}
            alt="Archie mascot"
            style={{
              height: isMobile ? 140 : 205,
              width: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 6px 16px rgba(100,60,20,0.20))',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ── Content column ── */}
        <div style={{ padding: isMobile ? '16px 16px 16px 20px' : '28px 40px 28px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', position: 'relative', zIndex: 1 }}>
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
        @keyframes archie-popup {
          from { transform: scale(0.92) translateY(16px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes archie-fab {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* ── Floating action button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Chat with Archie"
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
            width: 72, height: 72, borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none', cursor: 'pointer', padding: 0,
            transition: 'transform 0.2s, filter 0.2s',
            filter: 'drop-shadow(0 6px 18px rgba(44,19,0,0.38))',
            animation: 'archie-fab 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <img src={MASCOT_HEAD} alt="Archie" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </button>
      )}

      {/* ── iOS-style popup panel ── */}
      {isOpen && (
        <>
          {/* Backdrop — subtle dimming, tap to close */}
          <div
            onClick={closePanel}
            style={{
              position: 'fixed', inset: 0, zIndex: 1001,
              backgroundColor: 'rgba(15,10,5,0.28)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              animation: 'archie-popup 0.2s ease',
            }}
          />

          {/* Floating card */}
          <div style={{
            position: 'fixed',
            bottom: isMobile ? 0 : 28,
            right: isMobile ? 0 : 28,
            left: isMobile ? 0 : 'auto',
            zIndex: 1002,
            width: isMobile ? '100%' : 380,
            height: isMobile ? '88vh' : 580,
            borderRadius: isMobile ? '24px 24px 0 0' : 24,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 32px 80px rgba(20,10,0,0.22), 0 8px 24px rgba(20,10,0,0.12)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'archie-popup 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

          {/* iOS drag handle (mobile) */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1C4B0' }} />
            </div>
          )}

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #7A3E0F 0%, #C49A5A 100%)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <img src={MASCOT_HEAD} alt="Archie" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Archie</div>
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11 }}>AI Assistant · BuildBid PH</div>
            </div>
            <button
              onClick={() => setShowHistory(v => !v)}
              title="Chat History"
              style={{
                width: 32, height: 32, border: 'none', borderRadius: '50%',
                background: showHistory ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.15)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', flexShrink: 0, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.30)'}
              onMouseLeave={e => e.currentTarget.style.background = showHistory ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.15)'}
            >
              <History size={15} />
            </button>
            <button
              onClick={closePanel}
              style={{
                width: 32, height: 32, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', flexShrink: 0, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.30)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={15} />
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
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, backgroundColor: '#FAFAF7', maxHeight: 84, overflowY: 'auto' }}>
                {quickActions.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => send(prompt)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#FFF', color: '#7A3E0F',
                      border: '1px solid #E8DFCE', borderRadius: 20,
                      padding: '5px 12px', fontSize: 11, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor = '#F5E6D3'; e.currentTarget.style.borderColor = '#C77A2C'; } }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.borderColor = '#E8DFCE'; }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: '#F7F4EF' }}
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

              {/* Input bar */}
              <div style={{ padding: '10px 12px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, backgroundColor: '#FFF' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message Archie…"
                  disabled={loading}
                  style={{
                    flex: 1, border: '1.5px solid #E8DFCE', borderRadius: 22,
                    padding: '10px 16px', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', color: COLORS.text,
                    backgroundColor: '#F7F4EF',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => e.target.style.borderColor = '#7A3E0F'}
                  onBlur={e   => e.target.style.borderColor = '#E8DFCE'}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    backgroundColor: input.trim() && !loading ? '#7A3E0F' : '#E8DFCE',
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: input.trim() && !loading ? '#FFF' : '#B8A89A',
                    flexShrink: 0, transition: 'background 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
          </div>
        </>
      )}
    </>
  );
}
