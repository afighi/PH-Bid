import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getPortfolio, addPortfolioItem, deletePortfolioItem } from '../../services/portfolioService';
import { storage } from '../../config/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLORS } from '../../theme';
import { PROJECT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { Plus, X, ImagePlus, Trash2, Briefcase } from 'lucide-react';

const TYPE_META = { residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial', infrastructure: 'Infrastructure', renovation: 'Renovation', electrical: 'Electrical', plumbing: 'Plumbing', interior: 'Interior Design' };

function AddItemModal({ contractorId, onClose }) {
  const [form, setForm]         = useState({ title: '', description: '', project_type: '', location: '', completed_year: '', budget: '' });
  const [photos, setPhotos]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async file => {
        const path = `portfolio/${contractorId}/${Date.now()}_${file.name}`;
        const snap  = await uploadBytes(storageRef(storage, path), file);
        return getDownloadURL(snap.ref);
      }));
      setPhotos(prev => [...prev, ...urls]);
    } catch (e) {
      setError('Photo upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await addPortfolioItem(contractorId, {
        title:          form.title,
        description:    form.description || null,
        project_type:   form.project_type || null,
        location:       form.location || null,
        completed_year: form.completed_year ? Number(form.completed_year) : null,
        budget:         form.budget ? Number(form.budget) : null,
        photos:         photos,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit' };
  const Label = ({ t }) => <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{t}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.gray50, flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>Add Portfolio Item</div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 14 }}><Label t="Project Title *" />
            <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. 3-Storey Residential Building" style={inputStyle} onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><Label t="Project Type" />
              <select value={form.project_type} onChange={e => setF('project_type', e.target.value)}
                style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}>
                <option value="">Select type</option>
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{TYPE_META[t.value] || t.value}</option>)}
              </select>
            </div>
            <div><Label t="Year Completed" />
              <input type="number" value={form.completed_year} onChange={e => setF('completed_year', e.target.value)} placeholder="e.g. 2023" style={inputStyle} onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><Label t="Location" />
              <input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="City, Region" style={inputStyle} onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
            </div>
            <div><Label t="Project Value (PHP)" />
              <input type="number" value={form.budget} onChange={e => setF('budget', e.target.value)} placeholder="0" style={inputStyle} onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}><Label t="Description" />
            <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Brief description of the project, your role, and key achievements…" rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e  => e.target.style.borderColor = COLORS.border} />
          </div>

          <div style={{ marginBottom: 20 }}><Label t="Photos" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px dashed ${COLORS.border}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
              <ImagePlus size={16} /> {uploading ? 'Uploading…' : 'Upload photos'}
              <input type="file" multiple accept="image/*" onChange={handlePhotos} style={{ display: 'none' }} />
            </label>
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
                    <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: COLORS.danger, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: COLORS.gray100, color: COLORS.textMuted, border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || uploading} style={{ flex: 2, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving || uploading ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Portfolio({ contractorId, editable = false }) {
  const { profile } = useAuthStore();
  const ownId = contractorId || profile?.id;
  const [showAdd, setShowAdd] = useState(false);

  const { data: items, loading } = useSupabaseRealtime(
    'portfolio_items',
    () => getPortfolio(ownId),
    `contractor_id=eq.${ownId}`,
    [ownId]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this portfolio item?')) return;
    await deletePortfolioItem(id);
  };

  if (loading) return <div style={{ padding: 24, color: COLORS.textMuted, fontSize: 13 }}>Loading portfolio…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>
          Portfolio <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, marginLeft: 6 }}>{items.length} project{items.length !== 1 ? 's' : ''}</span>
        </div>
        {editable && (
          <button onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Add Project
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ background: COLORS.gray50, borderRadius: 16, border: `1.5px dashed ${COLORS.border}`, padding: '40px 32px', textAlign: 'center' }}>
          <Briefcase size={36} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, color: COLORS.textMuted, fontSize: 14 }}>No portfolio items yet</div>
          {editable && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '6px 0 0' }}>Add past projects to showcase your work to clients.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(26,10,0,0.05)' }}>
              {item.photos?.length > 0 ? (
                <img src={item.photos[0]} alt={item.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              ) : (
                <div style={{ height: 120, background: 'linear-gradient(135deg, #3D1500, #7B3F00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={28} color="rgba(255,255,255,0.4)" />
                </div>
              )}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>
                  {[item.location, item.completed_year].filter(Boolean).join(' · ')}
                </div>
                {item.budget && <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{formatCurrency(item.budget)}</div>}
                {item.description && <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '8px 0 0', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}

                {editable && (
                  <button onClick={() => handleDelete(item.id)}
                    style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: COLORS.danger, cursor: 'pointer' }}>
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddItemModal contractorId={ownId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
