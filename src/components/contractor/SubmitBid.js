import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { submitBid } from '../../services/bidService';
import { getProjectDetail } from '../../services/projectService';
import { getMyTemplates, saveTemplate, deleteTemplate } from '../../services/bidTemplateService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { MapPin, CircleDollarSign, PartyPopper, Lightbulb, Rocket, Sparkles, ChevronDown, ChevronUp, Bookmark, Trash2, BookMarked, Clock, MessageSquare } from 'lucide-react';
import BidAssistant from './BidAssistant';
import ProjectQA from '../shared/ProjectQA';

export default function SubmitBid() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { profile }   = useAuthStore();

  const [project,    setProject]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [focus,      setFocus]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [showQA,     setShowQA]     = useState(false);
  const [showArchie,    setShowArchie]    = useState(true);
  const [templates,     setTemplates]     = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTpl,     setSavingTpl]     = useState(false);
  const [tplName,       setTplName]       = useState('');
  const [showSaveForm,  setShowSaveForm]  = useState(false);

  const [form, setForm] = useState({
    bid_amount:          '',
    proposed_start_date: '',
    proposed_end_date:   '',
    cover_letter:        '',
    technical_proposal:  '',
    payment_terms:       '',
    milestones:          [],
  });

  useEffect(() => {
    getProjectDetail(projectId).then(p => { setProject(p); setLoading(false); });
  }, [projectId]);

  useEffect(() => {
    if (profile?.id) getMyTemplates(profile.id).then(setTemplates);
  }, [profile?.id]);

  const applyTemplate = (tpl) => {
    if (tpl.cover_letter)       f('cover_letter',       tpl.cover_letter);
    if (tpl.technical_proposal) f('technical_proposal', tpl.technical_proposal);
    if (tpl.payment_terms)      f('payment_terms',      tpl.payment_terms);
    setShowTemplates(false);
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) return;
    setSavingTpl(true);
    try {
      const saved = await saveTemplate(profile.id, {
        name:               tplName.trim(),
        coverLetter:        form.cover_letter,
        technicalProposal:  form.technical_proposal,
        paymentTerms:       form.payment_terms,
      });
      setTemplates(prev => [saved, ...prev]);
      setTplName('');
      setShowSaveForm(false);
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const f   = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const inp = name  => ({ ...S.input, ...(focus === name ? S.inputFocus : {}) });

  // Archie fills the form fields automatically
  const handleApplyProposal = (data) => {
    if (data.recommended_bid)    f('bid_amount',           String(data.recommended_bid));
    if (data.proposed_start_date) f('proposed_start_date', data.proposed_start_date);
    if (data.proposed_end_date)   f('proposed_end_date',   data.proposed_end_date);
    if (data.cover_letter)       f('cover_letter',         data.cover_letter);
    if (data.technical_proposal) f('technical_proposal',   data.technical_proposal);
    if (data.payment_terms)      f('payment_terms',        data.payment_terms);
    if (data.milestones)         f('milestones',           data.milestones);
    setShowArchie(false);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const validate = () => {
    if (!form.bid_amount || Number(form.bid_amount) <= 0) { setError('Enter a valid bid amount.'); return false; }
    if (!form.proposed_start_date || !form.proposed_end_date) { setError('Both dates are required.'); return false; }
    if (new Date(form.proposed_end_date) <= new Date(form.proposed_start_date)) { setError('End date must be after start date.'); return false; }
    if (form.cover_letter.trim().length < 80) { setError('Cover letter must be at least 80 characters.'); return false; }
    if (!form.payment_terms.trim()) { setError('Payment terms are required.'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitBid({ ...form, bid_amount: Number(form.bid_amount), project_id: projectId }, profile.id);
      setSuccess(true);
      setTimeout(() => navigate('/contractor/my-bids'), 2000);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <DashboardLayout title="Submit Bid"><div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>Loading project...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Submit Bid">
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Project overview card */}
        <div style={{ ...S.card, borderLeft: `4px solid ${COLORS.primary}` }}>
          <h3 style={{ ...S.h3, marginBottom: 8 }}>{project?.title}</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: COLORS.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{project?.location_city}, {project?.location_region}</span>
            <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CircleDollarSign size={12} />{formatCurrency(project?.budget_min)} – {formatCurrency(project?.budget_max)}</span>
            <span style={{ fontSize: 13, color: COLORS.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} />Deadline: {formatDate(project?.bid_deadline)}</span>
          </div>
          {project?.scope_of_work && (
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 10, lineHeight: 1.6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>{project.scope_of_work}</p>
          )}
        </div>

        {/* Archie Bid Intelligence Panel */}
        {!success && (
          <div>
            <button
              onClick={() => setShowArchie(s => !s)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', marginBottom: showArchie ? 12 : 0 }}
            >
              <Sparkles size={16} color={COLORS.primary} />
              <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Archie Bid Intelligence</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>— analyze fit, get pricing guidance, draft your proposal</span>
              {showArchie ? <ChevronUp size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />}
            </button>
            {showArchie && <BidAssistant project={project} targetAmount={form.bid_amount} onApplyProposal={handleApplyProposal} />}
          </div>
        )}

        {/* Project Q&A */}
        {!success && (
          <div>
            <button
              onClick={() => setShowQA(s => !s)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', marginBottom: showQA ? 12 : 0 }}
            >
              <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} />Project Q&A Board</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>— ask clarification questions before bidding</span>
              {showQA ? <ChevronUp size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />}
            </button>
            {showQA && <ProjectQA project={project} />}
          </div>
        )}

        {/* Bid Form */}
        {success ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
            <div style={{ marginBottom: 16 }}><PartyPopper size={64} color={COLORS.primary} /></div>
            <h2 style={{ ...S.h2, marginBottom: 8 }}>Bid Submitted!</h2>
            <p style={{ color: COLORS.textMuted }}>The client will be notified. Redirecting to your bids...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h2 style={{ ...S.h2, margin: 0 }}>Your Proposal</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {templates.length > 0 && (
                    <button type="button" onClick={() => setShowTemplates(s => !s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: showTemplates ? COLORS.primaryLight : 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: COLORS.primary, cursor: 'pointer' }}>
                      <BookMarked size={13} /> Load Template
                    </button>
                  )}
                  <button type="button" onClick={() => setShowSaveForm(s => !s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer' }}>
                    <Bookmark size={13} /> Save as Template
                  </button>
                </div>
              </div>

              {/* Save template form */}
              {showSaveForm && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: COLORS.gray50, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', margin: '12px 0' }}>
                  <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Template name…"
                    style={{ flex: 1, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  <button type="button" onClick={handleSaveTemplate} disabled={savingTpl || !tplName.trim()}
                    style={{ background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !tplName.trim() ? 0.5 : 1 }}>
                    {savingTpl ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowSaveForm(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* Template picker */}
              {showTemplates && templates.length > 0 && (
                <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden', margin: '12px 0' }}>
                  {templates.map(tpl => (
                    <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{tpl.name}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => applyTemplate(tpl)}
                          style={{ background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Apply
                        </button>
                        <button type="button" onClick={() => handleDeleteTemplate(tpl.id)}
                          style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: COLORS.danger, display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ ...S.body, marginBottom: 28, marginTop: 8 }}>
                {form.cover_letter ? '✓ Proposal drafted. Review and edit before submitting.' : 'Make it compelling — compete on value, not just price.'}
              </p>

              {error && <div style={S.alertError}>{error}</div>}

              {/* Bid Amount */}
              <div style={{ backgroundColor: `${COLORS.primaryLight}22`, border: `1px solid ${COLORS.primaryLight}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <label style={{ ...S.label, fontSize: 15, marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CircleDollarSign size={16} /> Bid Amount (PHP) <span style={{ color: COLORS.danger }}>*</span></span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.primary, fontWeight: 800, fontSize: 18 }}>₱</span>
                  <input
                    style={{ ...inp('amount'), paddingLeft: 36, fontSize: 22, fontWeight: 700, height: 54, color: COLORS.darkBlue }}
                    type="number" value={form.bid_amount}
                    onChange={e => f('bid_amount', e.target.value)}
                    onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                    placeholder="2,500,000" min="1"
                  />
                </div>
                {form.bid_amount && (
                  <p style={{ fontSize: 13, color: COLORS.primary, marginTop: 8, fontWeight: 600 }}>
                    = {formatCurrency(Number(form.bid_amount))}
                    {project && Number(form.bid_amount) < project.budget_min && <span style={{ color: COLORS.warning }}> (below client's minimum)</span>}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Proposed Start Date <span style={{ color: COLORS.danger }}>*</span></label>
                  <input style={inp('sdate')} type="date" value={form.proposed_start_date}
                    onChange={e => f('proposed_start_date', e.target.value)}
                    onFocus={() => setFocus('sdate')} onBlur={() => setFocus('')} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Proposed Completion <span style={{ color: COLORS.danger }}>*</span></label>
                  <input style={inp('edate')} type="date" value={form.proposed_end_date}
                    onChange={e => f('proposed_end_date', e.target.value)}
                    onFocus={() => setFocus('edate')} onBlur={() => setFocus('')} />
                </div>
              </div>

              {/* Cover Letter */}
              <div style={S.formGroup}>
                <label style={S.label}>
                  Cover Letter <span style={{ color: COLORS.danger }}>*</span>
                  <span style={{ color: COLORS.textLight, fontWeight: 400, marginLeft: 6 }}>({form.cover_letter.length} chars — min 80)</span>
                </label>
                <textarea
                  style={{ ...inp('cover'), minHeight: 140, resize: 'vertical' }}
                  value={form.cover_letter}
                  onChange={e => f('cover_letter', e.target.value)}
                  onFocus={() => setFocus('cover')} onBlur={() => setFocus('')}
                  placeholder="Introduce your company. Why are you the best fit for this project?..."
                />
              </div>

              {/* Technical Proposal */}
              <div style={S.formGroup}>
                <label style={S.label}>Technical Approach</label>
                <textarea
                  style={{ ...inp('tech'), minHeight: 110, resize: 'vertical' }}
                  value={form.technical_proposal}
                  onChange={e => f('technical_proposal', e.target.value)}
                  onFocus={() => setFocus('tech')} onBlur={() => setFocus('')}
                  placeholder="Describe your construction methodology, materials, and quality control..."
                />
              </div>

              {/* Payment Terms */}
              <div style={S.formGroup}>
                <label style={S.label}>Payment Terms <span style={{ color: COLORS.danger }}>*</span></label>
                <input style={inp('terms')} value={form.payment_terms}
                  onChange={e => f('payment_terms', e.target.value)}
                  onFocus={() => setFocus('terms')} onBlur={() => setFocus('')}
                  placeholder="e.g., 15% mobilization, 35% at 50% completion, 40% at completion, 10% retention" />
              </div>

              {/* Milestones from Archie */}
              {form.milestones?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Proposed Milestones <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 400 }}>(from Archie — edit as needed)</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.milestones.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${COLORS.primaryLight}44`, borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, minWidth: 24 }}>{i + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: COLORS.textMuted }}>{m.description} · Day {m.days_from_start} · {m.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div style={{ backgroundColor: `${COLORS.accent}44`, border: `1px solid ${COLORS.accent}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <p style={{ fontWeight: 700, color: '#78600A', margin: '0 0 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={13} color="#78600A" /> Tips for a Winning Bid</p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#78600A', lineHeight: 1.8 }}>
                  <li>Reference specific details from the project description</li>
                  <li>Mention similar completed projects with sizes/values</li>
                  <li>Be realistic with timelines — padding helps avoid delays</li>
                  <li>Industry standard: 15% mobilization, milestone payments, 10% retention</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => navigate(-1)} style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center', padding: '13px 20px' }}>← Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...S.btnPrimary, flex: 2, justifyContent: 'center', padding: '13px 20px', fontSize: 15, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Rocket size={16} /> Submit Bid</span>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
