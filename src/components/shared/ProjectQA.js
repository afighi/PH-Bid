import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Sparkles, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { getProjectQA, askQuestion, answerQuestion } from '../../services/qaService';
import { archieSuggestAnswer, archieContractorQuestions } from '../../services/archieService';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

const C = { brown: '#7A3E0F', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E', successLight: '#D1FAE5' };
const S = { fontFamily: "'Inter', system-ui, sans-serif" };

export default function ProjectQA({ project, readOnly = false }) {
  const { profile } = useAuthStore();
  const [qas, setQas]                   = useState([]);
  const [loading, setLoading]            = useState(true);
  const [question, setQuestion]          = useState('');
  const [submitting, setSubmitting]      = useState(false);
  const [expandedId, setExpandedId]      = useState(null);
  const [answerDrafts, setAnswerDrafts]  = useState({});
  const [aiLoading, setAiLoading]        = useState({});
  const [suggestedQs, setSuggestedQs]    = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const isContractor = profile?.role === 'contractor';
  const isClient     = profile?.role === 'client';

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getProjectQA(project.id);
    setQas(data);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);
  useRealtimeQuery('project_qa', load, `project_id=eq.${project.id}`, [project.id]);

  async function handleAskQuestion(q) {
    const text = q || question.trim();
    if (!text || !isContractor) return;
    setSubmitting(true);
    try {
      await askQuestion(project.id, profile.id, text);
      setQuestion('');
      await load();
    } finally { setSubmitting(false); }
  }

  async function handleAnswer(qaId) {
    const answer = answerDrafts[qaId]?.trim();
    if (!answer || !isClient) return;
    setSubmitting(true);
    try {
      await answerQuestion(qaId, profile.id, answer);
      setAnswerDrafts(d => ({ ...d, [qaId]: '' }));
      await load();
    } finally { setSubmitting(false); }
  }

  async function handleAISuggestAnswer(qa) {
    setAiLoading(a => ({ ...a, [qa.id]: true }));
    try {
      const suggested = await archieSuggestAnswer(project, qa.question);
      setAnswerDrafts(d => ({ ...d, [qa.id]: suggested }));
    } finally { setAiLoading(a => ({ ...a, [qa.id]: false })); }
  }

  async function handleSuggestQuestions() {
    setLoadingSuggestions(true);
    try {
      const raw = await archieContractorQuestions(project);
      const match = raw.match(/OPTIONS:\[(.*?)\]/s);
      if (match) {
        const opts = JSON.parse(`[${match[1]}]`);
        setSuggestedQs(opts);
      }
    } catch { /* ignore */ }
    finally { setLoadingSuggestions(false); }
  }

  const unanswered = qas.filter(q => !q.answer).length;
  const answered   = qas.filter(q => q.answer).length;

  return (
    <div style={{ ...S, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.cream }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageSquare size={18} color={C.brown} />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Project Q&A Board</span>
          <span style={{ fontSize: 12, color: C.muted }}>({qas.length} question{qas.length !== 1 ? 's' : ''})</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unanswered > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{unanswered} awaiting answer</span>}
          {answered > 0  && <span style={{ background: C.successLight, color: C.success, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{answered} answered</span>}
        </div>
      </div>

      {/* Archie notice */}
      <div style={{ padding: '10px 24px', background: '#FFF8F0', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={13} color={C.amber} />
        <span style={{ fontSize: 12, color: C.muted }}>
          {isClient ? 'Archie can suggest professional answers to contractor questions.' : 'Archie can suggest clarification questions to strengthen your bid.'}
        </span>
      </div>

      {/* Q&A list */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading questions…</div>
        ) : qas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
            <MessageSquare size={28} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
            No questions yet. {isContractor ? 'Be the first to ask a clarification.' : 'Contractors will post questions here.'}
          </div>
        ) : (
          qas.map((qa, i) => (
            <div key={qa.id} style={{ borderBottom: i < qas.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              {/* Question row */}
              <div
                onClick={() => setExpandedId(expandedId === qa.id ? null : qa.id)}
                style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12, background: expandedId === qa.id ? '#FFFBF5' : C.surface }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>
                      {qa.asker?.company_name || qa.asker?.full_name || 'Contractor'}
                    </span>
                    <span style={{ fontSize: 11, color: C.border }}>·</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{new Date(qa.created_at).toLocaleDateString('en-PH')}</span>
                    {!qa.answer && <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>Awaiting answer</span>}
                    {qa.answer  && <span style={{ fontSize: 10, background: C.successLight, color: C.success, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>Answered</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: C.text, fontWeight: 500 }}>Q: {qa.question}</p>
                  {qa.answer && expandedId !== qa.id && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: C.muted }}>A: {qa.answer.slice(0, 80)}…</p>
                  )}
                </div>
                {expandedId === qa.id ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
              </div>

              {/* Expanded: full answer + client answer form */}
              {expandedId === qa.id && (
                <div style={{ padding: '0 24px 20px', background: '#FFFBF5' }}>
                  {qa.answer ? (
                    <div style={{ background: C.successLight, border: `1px solid ${C.success}33`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.success, display: 'block', marginBottom: 4 }}>
                        Official Answer — {qa.answerer?.full_name || 'Client'}
                      </span>
                      <p style={{ margin: 0, fontSize: 14, color: C.text }}>{qa.answer}</p>
                    </div>
                  ) : (
                    isClient && !readOnly && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Your Answer</span>
                          <button
                            onClick={() => handleAISuggestAnswer(qa)}
                            disabled={aiLoading[qa.id]}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF8F0', border: `1px solid ${C.amber}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: C.amber, cursor: 'pointer' }}
                          >
                            <Sparkles size={11} />
                            {aiLoading[qa.id] ? 'Drafting…' : 'Archie can help'}
                          </button>
                        </div>
                        <textarea
                          value={answerDrafts[qa.id] || ''}
                          onChange={e => setAnswerDrafts(d => ({ ...d, [qa.id]: e.target.value }))}
                          placeholder="Write your official answer. It will be visible to all contractors."
                          rows={3}
                          style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <Lock size={12} color={C.muted} />
                          <span style={{ fontSize: 11, color: C.muted }}>Answer will be public to all bidders</span>
                          <button
                            onClick={() => handleAnswer(qa.id)}
                            disabled={submitting || !answerDrafts[qa.id]?.trim()}
                            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: C.brown, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            <Send size={12} /> Post Answer
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Contractor: ask a question */}
      {isContractor && !readOnly && (
        <div style={{ padding: '20px 24px', borderTop: `1px solid ${C.border}`, background: C.cream }}>
          {suggestedQs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>
                <Sparkles size={11} color={C.amber} style={{ marginRight: 4 }} />
                Archie suggests asking:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestedQs.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    style={{ textAlign: 'left', background: '#FFF8F0', border: `1px solid ${C.amber}44`, borderRadius: 10, padding: '8px 12px', fontSize: 13, color: C.text, cursor: 'pointer' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask a clarification question about this project…"
              rows={2}
              style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Inter', sans-serif", resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={handleSuggestQuestions}
                disabled={loadingSuggestions}
                title="Let Archie suggest questions"
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF8F0', border: `1px solid ${C.amber}44`, borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <Sparkles size={13} />
                {loadingSuggestions ? '…' : 'Suggest'}
              </button>
              <button
                onClick={() => handleAskQuestion()}
                disabled={submitting || !question.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.brown, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                <Send size={13} /> Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
