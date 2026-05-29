import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { COLORS } from '../../theme';
import { PHILIPPINE_REGIONS, SPECIALIZATIONS } from '../../utils/constants';
import { Search, Star, MapPin, ShieldCheck, ChevronDown, X, Users } from 'lucide-react';

function VerifiedBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: COLORS.success, background: COLORS.successLight, padding: '2px 7px', borderRadius: 20, border: `1px solid ${COLORS.success}44` }}>
      <ShieldCheck size={10} /> Verified
    </span>
  );
}

function ContractorCard({ c }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 16,
        border: `1.5px solid ${hov ? COLORS.borderStrong : COLORS.border}`,
        padding: '20px', cursor: 'default',
        boxShadow: hov ? '0 8px 28px rgba(26,10,0,0.1)' : '0 2px 8px rgba(26,10,0,0.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #7B3F00, #C07838)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: 18 }}>
          {(c.company_name || c.full_name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.text }}>{c.company_name || c.full_name}</div>
            {c.is_verified && <VerifiedBadge />}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>{c.full_name}</div>
        </div>
      </div>

      {c.average_rating > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={12} fill={n <= Math.round(c.average_rating) ? COLORS.accent : 'transparent'} color={n <= Math.round(c.average_rating) ? COLORS.accent : COLORS.border} />
          ))}
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginLeft: 2 }}>{c.average_rating.toFixed(1)}</span>
        </div>
      )}

      {(c.company_region || c.location_region) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>
          <MapPin size={11} />{c.company_region || c.location_region}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {c.pcab_classification && (
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primaryLight, padding: '2px 8px', borderRadius: 20 }}>PCAB {c.pcab_classification}</span>
        )}
        {c.years_experience > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray100, padding: '2px 8px', borderRadius: 20 }}>{c.years_experience} yrs exp</span>
        )}
        {c.completed_projects > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray100, padding: '2px 8px', borderRadius: 20 }}>{c.completed_projects} projects</span>
        )}
      </div>

      {c.specializations?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {c.specializations.slice(0, 3).map(s => (
            <span key={s} style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray50, border: `1px solid ${COLORS.border}`, padding: '2px 8px', borderRadius: 20 }}>{s}</span>
          ))}
          {c.specializations.length > 3 && <span style={{ fontSize: 10, color: COLORS.textMuted }}>+{c.specializations.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

export default function ContractorDirectory() {
  const navigate  = useNavigate();
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [region,  setRegion]  = useState('');
  const [spec,    setSpec]    = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, company_name, company_region, location_region, average_rating, years_experience, completed_projects, pcab_classification, specializations, is_verified, status')
      .eq('role', 'contractor')
      .eq('status', 'active')
      .order('average_rating', { ascending: false })
      .then(({ data }) => { setAll(data || []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => all.filter(c => {
    if (verified && !c.is_verified) return false;
    if (region && (c.company_region !== region && c.location_region !== region)) return false;
    if (spec && !c.specializations?.includes(spec)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.company_name?.toLowerCase().includes(q) && !c.full_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [all, verified, region, spec, search]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: COLORS.sidebarBg, padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/buildbid_logo.png" alt="BuildBid PH" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>BuildBid PH</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: `1px solid rgba(255,255,255,0.2)`, color: '#fff', borderRadius: 100, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Log In</button>
          <button onClick={() => navigate('/signup')} style={{ background: COLORS.accent, border: 'none', color: '#fff', borderRadius: 100, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Sign Up</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #3D1500, #7B3F00)', padding: '52px 32px', textAlign: 'center', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <Users size={20} />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Contractor Directory</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Find Verified Contractors</h1>
        <p style={{ fontSize: 15, opacity: 0.8, margin: '0 auto', maxWidth: 480, lineHeight: 1.7 }}>Browse licensed contractors across the Philippines. Filter by region, specialization, and more.</p>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}`, padding: '16px 32px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', border: `1.5px solid ${COLORS.border}`, borderRadius: 100, padding: '8px 14px', background: COLORS.gray50 }}>
          <Search size={14} color={COLORS.textMuted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or company…"
            style={{ border: 'none', outline: 'none', fontSize: 13, color: COLORS.text, background: 'transparent', flex: 1, fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: COLORS.textMuted }}><X size={13} /></button>}
        </div>

        <select value={region} onChange={e => setRegion(e.target.value)}
          style={{ border: `1.5px solid ${COLORS.border}`, borderRadius: 100, padding: '8px 14px', fontSize: 13, color: COLORS.text, background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">All Regions</option>
          {PHILIPPINE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={spec} onChange={e => setSpec(e.target.value)}
          style={{ border: `1.5px solid ${COLORS.border}`, borderRadius: 100, padding: '8px 14px', fontSize: 13, color: COLORS.text, background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">All Specializations</option>
          {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={() => setVerified(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${verified ? COLORS.success : COLORS.border}`, borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: verified ? COLORS.successLight : '#fff', color: verified ? COLORS.success : COLORS.textMuted, transition: 'all 0.15s' }}>
          <ShieldCheck size={13} /> Verified Only
        </button>

        <span style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 'auto' }}>
          {loading ? '…' : `${filtered.length} contractor${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Grid */}
      <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 56, color: COLORS.textMuted }}>Loading contractors…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 56 }}>
            <Users size={40} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, color: COLORS.text }}>No contractors found</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {filtered.map(c => <ContractorCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ background: COLORS.sidebarBg, padding: '40px 32px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Are you a contractor?</div>
        <p style={{ opacity: 0.75, fontSize: 14, margin: '0 0 20px' }}>Join BuildBid PH and get discovered by clients across the Philippines.</p>
        <button onClick={() => navigate('/signup')} style={{ background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Create Free Account
        </button>
      </div>
    </div>
  );
}
