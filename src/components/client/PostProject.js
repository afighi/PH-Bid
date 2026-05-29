import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleDollarSign, CheckCircle2, ClipboardList, Rocket, ImagePlus, X } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import FileUpload from '../shared/FileUpload';
import { useAuthStore } from '../../stores/authStore';
import { createProject, saveDocumentRecord } from '../../services/projectService';
import { PHILIPPINE_REGIONS, PROJECT_TYPES } from '../../utils/constants';
import { COLORS, S } from '../../theme';
import { storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const STEPS = ['Project Info', 'Location & Budget', 'Documents'];

export default function PostProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuthStore();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [focus,   setFocus]   = useState('');
  const [uploads, setUploads] = useState([]);

  const [form, setForm] = useState({
    title:             '',
    description:       '',
    project_type:      '',
    scope_of_work:     '',
    special_conditions:'',
    location_address:  '',
    location_city:     '',
    location_region:   'NCR (Metro Manila)',
    budget_min:        '',
    budget_max:        '',
    bid_deadline:      '',
    start_date:        '',
    end_date:          '',
    cover_image:       '',
  });

  // Pre-fill from Archie if navigated with state
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      setForm(prev => ({
        ...prev,
        title:              prefill.title              || prev.title,
        description:        prefill.description        || prev.description,
        project_type:       prefill.project_type       || prev.project_type,
        scope_of_work:      prefill.scope_of_work      || prev.scope_of_work,
        special_conditions: prefill.special_conditions || prev.special_conditions,
        location_city:      prefill.location_city      || prev.location_city,
        location_region:    prefill.location_region    || prev.location_region,
        budget_min:         prefill.budget_min != null ? String(prefill.budget_min) : prev.budget_min,
        budget_max:         prefill.budget_max != null ? String(prefill.budget_max) : prev.budget_max,
        bid_deadline:       prefill.bid_deadline       || prev.bid_deadline,
        start_date:         prefill.start_date         || prev.start_date,
        end_date:           prefill.end_date           || prev.end_date,
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const inp = (name) => ({ ...S.input, borderRadius: 24, padding: '12px 18px', ...(focus === name ? { borderColor: '#0F172A', boxShadow: 'none' } : {}) });

  const validateStep = () => {
    if (step === 0) {
      if (!form.title.trim() || form.title.length < 10) { setError('Project title must be at least 10 characters.'); return false; }
      if (!form.description.trim() || form.description.length < 30) { setError('Description must be at least 30 characters.'); return false; }
      if (!form.project_type) { setError('Please select a project type.'); return false; }
      if (!form.scope_of_work.trim()) { setError('Scope of work is required.'); return false; }
    }
    if (step === 1) {
      if (!form.location_city.trim()) { setError('City is required.'); return false; }
      if (!form.budget_min || !form.budget_max) { setError('Both budget fields are required.'); return false; }
      if (Number(form.budget_max) < Number(form.budget_min)) { setError('Maximum budget must be ≥ minimum budget.'); return false; }
      if (!form.bid_deadline) { setError('Bid deadline is required.'); return false; }
    }
    setError('');
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const project = await createProject({
        ...form,
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
      }, profile.id);

      // Save document records in Supabase
      for (const doc of uploads) {
        await saveDocumentRecord({
          projectId:     project.id,
          uploadedBy:    profile.id,
          fileName:      doc.name,
          fileUrl:       doc.url,
          fileType:      'attachment',
          fileSizeBytes: doc.size,
        });
      }

      navigate(`/client/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPrefilled = !!location.state?.prefill;

  return (
    <DashboardLayout title="Post New Project">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Archie prefill notice */}
        {isPrefilled && (
          <div style={{
            backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12,
            padding: '11px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: '#92400E', fontWeight: 600,
          }}>
            <img src="/Mascot_02.png" alt="Archie" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
            Archie pre-filled this form based on your conversation. Review and adjust any details before submitting.
          </div>
        )}

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4,
                backgroundColor: i <= step ? '#0F172A' : 'rgba(0,0,0,0.05)',
                marginBottom: 6, transition: 'background 0.3s',
              }} />
              <span style={{ fontSize: 11, color: i <= step ? '#0F172A' : COLORS.textMuted, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={{...S.clientCard, padding: 32}}>
          {error && <div style={S.alertError}>{error}</div>}

          {/* ── Step 0: Project Info ── */}
          {step === 0 && (
            <div>
              <h2 style={{ ...S.h2, marginBottom: 4 }}>Project Information</h2>
              <p style={{ ...S.body, marginBottom: 24 }}>Describe what you need built</p>

              <div style={S.formGroup}>
                <label style={S.label}>Project Title <span style={{ color: COLORS.danger }}>*</span></label>
                <input style={inp('title')} value={form.title}
                  onChange={(e) => f('title', e.target.value)}
                  onFocus={() => setFocus('title')} onBlur={() => setFocus('')}
                  placeholder="e.g., 2-Storey Residential House in Quezon City" />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Project Type <span style={{ color: COLORS.danger }}>*</span></label>
                <select style={inp('type')} value={form.project_type}
                  onChange={(e) => f('project_type', e.target.value)}
                  onFocus={() => setFocus('type')} onBlur={() => setFocus('')}>
                  <option value="">Select a type...</option>
                  {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Project Description <span style={{ color: COLORS.danger }}>*</span></label>
                <textarea style={{ ...inp('desc'), minHeight: 120, resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => f('description', e.target.value)}
                  onFocus={() => setFocus('desc')} onBlur={() => setFocus('')}
                  placeholder="Describe the project in detail — what do you want to build? Any special requirements?" />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Scope of Work <span style={{ color: COLORS.danger }}>*</span></label>
                <textarea style={{ ...inp('scope'), minHeight: 100, resize: 'vertical' }}
                  value={form.scope_of_work}
                  onChange={(e) => f('scope_of_work', e.target.value)}
                  onFocus={() => setFocus('scope')} onBlur={() => setFocus('')}
                  placeholder="List what the contractor needs to do (e.g., excavation, foundation, framing, roofing...)" />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Special Conditions / Notes</label>
                <textarea style={{ ...inp('special'), minHeight: 80, resize: 'vertical' }}
                  value={form.special_conditions}
                  onChange={(e) => f('special_conditions', e.target.value)}
                  onFocus={() => setFocus('special')} onBlur={() => setFocus('')}
                  placeholder="Any special requirements, restrictions, or conditions..." />
              </div>

              <button onClick={next} style={{ ...S.clientBtnPrimary, width: '100%', justifyContent: 'center' }}>
                Next: Location & Budget →
              </button>
            </div>
          )}

          {/* ── Step 1: Location & Budget ── */}
          {step === 1 && (
            <div>
              <h2 style={{ ...S.h2, marginBottom: 4 }}>Location & Budget</h2>
              <p style={{ ...S.body, marginBottom: 24 }}>Where and how much?</p>

              <div style={S.formGroup}>
                <label style={S.label}>Street Address</label>
                <input style={inp('addr')} value={form.location_address}
                  onChange={(e) => f('location_address', e.target.value)}
                  onFocus={() => setFocus('addr')} onBlur={() => setFocus('')}
                  placeholder="123 Rizal Street, Barangay..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={S.formGroup}>
                  <label style={S.label}>City / Municipality <span style={{ color: COLORS.danger }}>*</span></label>
                  <input style={inp('city')} value={form.location_city}
                    onChange={(e) => f('location_city', e.target.value)}
                    onFocus={() => setFocus('city')} onBlur={() => setFocus('')}
                    placeholder="Quezon City" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Region</label>
                  <select style={inp('region')} value={form.location_region}
                    onChange={(e) => f('location_region', e.target.value)}
                    onFocus={() => setFocus('region')} onBlur={() => setFocus('')}>
                    {PHILIPPINE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: `${COLORS.primaryLight}22`, border: `1px solid ${COLORS.primaryLight}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><CircleDollarSign size={16} /> Budget Range (PHP)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ ...S.label, fontSize: 12 }}>Minimum Budget</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontWeight: 600 }}>₱</span>
                      <input style={{ ...inp('bmin'), paddingLeft: 28 }} type="number" value={form.budget_min}
                        onChange={(e) => f('budget_min', e.target.value)}
                        onFocus={() => setFocus('bmin')} onBlur={() => setFocus('')}
                        placeholder="500,000" min="0" />
                    </div>
                  </div>
                  <div>
                    <label style={{ ...S.label, fontSize: 12 }}>Maximum Budget</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontWeight: 600 }}>₱</span>
                      <input style={{ ...inp('bmax'), paddingLeft: 28 }} type="number" value={form.budget_max}
                        onChange={(e) => f('budget_max', e.target.value)}
                        onFocus={() => setFocus('bmax')} onBlur={() => setFocus('')}
                        placeholder="1,000,000" min="0" />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Bid Deadline <span style={{ color: COLORS.danger }}>*</span></label>
                  <input style={inp('bdeadline')} type="datetime-local" value={form.bid_deadline}
                    onChange={(e) => f('bid_deadline', e.target.value)}
                    onFocus={() => setFocus('bdeadline')} onBlur={() => setFocus('')} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Project Start Date</label>
                  <input style={inp('sdate')} type="date" value={form.start_date}
                    onChange={(e) => f('start_date', e.target.value)}
                    onFocus={() => setFocus('sdate')} onBlur={() => setFocus('')} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Target End Date</label>
                  <input style={inp('edate')} type="date" value={form.end_date}
                    onChange={(e) => f('end_date', e.target.value)}
                    onFocus={() => setFocus('edate')} onBlur={() => setFocus('')} />
                </div>
              </div>

              {/* Cover image */}
              <CoverImageUpload
                value={form.cover_image}
                onChange={(url) => f('cover_image', url)}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={back} style={{ ...S.clientBtnSecondary, flex: 1, justifyContent: 'center' }}>← BACK</button>
                <button onClick={next} style={{ ...S.clientBtnPrimary, flex: 2, justifyContent: 'center' }}>NEXT: UPLOAD DOCUMENTS →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Documents ── */}
          {step === 2 && (
            <div>
              <h2 style={{ ...S.h2, marginBottom: 4 }}>Attach Documents</h2>
              <p style={{ ...S.body, marginBottom: 24 }}>Upload blueprints, floor plans, specs — anything that helps contractors bid accurately (optional but recommended)</p>

              <FileUpload
                storagePath={`project-documents/${profile?.id}`}
                onUploadComplete={(file) => setUploads((prev) => [...prev, file])}
                maxFiles={10}
              />

              {uploads.length > 0 && (
                <div style={{ ...S.alertSuccess, marginTop: 16 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> {uploads.length} file{uploads.length > 1 ? 's' : ''} ready to attach</span>
                </div>
              )}

              <div style={{ backgroundColor: COLORS.gray50, borderRadius: 12, padding: 16, margin: '20px 0' }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={16} /> Project Summary</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    ['Title', form.title],
                    ['Type', form.project_type],
                    ['Location', `${form.location_city}, ${form.location_region}`],
                    ['Budget', `₱${Number(form.budget_min).toLocaleString()} – ₱${Number(form.budget_max).toLocaleString()}`],
                    ['Bid Deadline', form.bid_deadline ? new Date(form.bid_deadline).toLocaleString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{k}: </span>
                      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={back} style={{ ...S.clientBtnSecondary, flex: 1, justifyContent: 'center' }}>← BACK</button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ ...S.clientBtnPrimary, flex: 2, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'PUBLISHING...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Rocket size={16} /> PUBLISH PROJECT</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── Cover Image Upload ──────────────────────────────────────────── */
function CoverImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const inputRef   = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr('Please select an image file (JPG, PNG, WebP).'); return; }
    if (file.size > 10 * 1024 * 1024)   { setUploadErr('Image must be under 10MB.'); return; }

    setUploadErr('');
    setUploading(true);
    try {
      const sRef = storageRef(storage, `project-covers/${Date.now()}-${file.name}`);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((res, rej) => task.on('state_changed', null, rej, res));
      const url = await getDownloadURL(task.snapshot.ref);
      onChange(url);
    } catch {
      setUploadErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ ...S.formGroup, marginBottom: 20 }}>
      <label style={S.label}>
        Cover Photo
        <span style={{ color: COLORS.textLight, fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>— Optional, helps contractors visualize the site</span>
      </label>

      {value ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 180 }}>
          <img src={value} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }} />
          <button
            type="button"
            onClick={() => { onChange(''); if (inputRef.current) inputRef.current.value = ''; }}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
              color: '#fff', padding: '5px 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
            }}
          >
            <X size={12} /> Remove
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 10, right: 10,
              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
              color: '#fff', padding: '5px 10px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
          >
            Change Photo
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${COLORS.border}`, borderRadius: 14,
            padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
            backgroundColor: COLORS.gray50,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.backgroundColor = COLORS.primaryLight + '33'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.backgroundColor = COLORS.gray50; }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0 }}>Uploading photo...</p>
            </div>
          ) : (
            <>
              <ImagePlus size={28} color={COLORS.textLight} style={{ marginBottom: 10 }} />
              <p style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                Click to add a cover photo
              </p>
              <p style={{ color: COLORS.textLight, fontSize: 11, margin: 0 }}>
                JPG, PNG, WebP — up to 10MB. A site photo helps contractors prepare better bids.
              </p>
            </>
          )}
        </div>
      )}

      {uploadErr && <p style={{ ...S.errorText, marginTop: 6 }}>{uploadErr}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
