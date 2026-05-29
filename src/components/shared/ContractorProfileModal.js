import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { COLORS, S } from '../../theme';
import { FileText, MessageSquare } from 'lucide-react';
import Portfolio from '../contractor/Portfolio';

const SPEC_COLOR = `${COLORS.primary}15`;

export default function ContractorProfileModal({ contractorId, projectId, projectTitle, clientId, onClose, onChat }) {
  const [profile,  setProfile]  = useState(null);
  const [stats,    setStats]    = useState({ awarded: 0, total: 0 });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').eq('id', contractorId).single(),
      supabase.from('bids').select('status').eq('contractor_id', contractorId),
    ]).then(([{ data: p }, { data: bids }]) => {
      setProfile(p);
      if (bids) {
        setStats({
          awarded: bids.filter((b) => b.status === 'awarded').length,
          total:   bids.length,
        });
      }
      setLoading(false);
    });
  }, [contractorId]);

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16,
      }}
    >
      <div style={{
        backgroundColor: COLORS.white,
        borderRadius: 20,
        width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: COLORS.primaryDark,
          borderRadius: '20px 20px 0 0',
          padding: '28px 28px 24px',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 18,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {loading ? '?' : (profile?.company_name || profile?.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {loading ? '...' : (profile?.company_name || profile?.full_name)}
                {!loading && profile?.is_verified && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(5,150,105,0.7)', padding: '2px 8px', borderRadius: 20 }}>Verified</span>
                )}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>
                {loading ? '' : profile?.full_name}
                {!loading && profile?.location_region ? ` · ${profile.location_region}` : ''}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
              {[
                { label: 'Bids Won',      value: stats.awarded },
                { label: 'Total Bids',    value: stats.total },
                { label: 'Experience',    value: profile?.years_experience ? `${profile.years_experience} yrs` : '—' },
              ].map((s) => (
                <div key={s.label} style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>Loading profile...</div>
          ) : (
            <>
              {/* Credentials */}
              <Section title="PCAB Credentials">
                <InfoRow label="License Number"    value={profile?.license_number || '—'} />
                <InfoRow label="Classification"    value={profile?.license_classification || '—'} />
              </Section>

              {/* Specializations */}
              {profile?.specializations?.length > 0 && (
                <Section title="Specializations">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.specializations.map((s) => (
                      <span key={s} style={{
                        backgroundColor: SPEC_COLOR,
                        color: COLORS.primary,
                        border: `1px solid ${COLORS.primary}33`,
                        borderRadius: 20, padding: '4px 12px',
                        fontSize: 12, fontWeight: 600,
                      }}>{s}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Portfolio */}
              <Section title="Portfolio">
                <Portfolio contractorId={contractorId} editable={false} />
              </Section>

              {/* Contact */}
              <Section title="Contact Information">
                <InfoRow label="Email"  value={profile?.email || '—'} />
                <InfoRow label="Phone"  value={profile?.phone || '—'} />
                <InfoRow label="Region" value={profile?.location_region || '—'} />
              </Section>

              {/* Documents */}
              <Section title="Documents & Certifications">
                <div style={{
                  backgroundColor: COLORS.gray50, borderRadius: 10,
                  padding: '20px', textAlign: 'center',
                  border: `1px dashed ${COLORS.border}`,
                }}>
                  <div style={{ marginBottom: 8 }}><FileText size={28} color={COLORS.textMuted} /></div>
                  <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                    No documents uploaded yet
                  </p>
                </div>
              </Section>

              {/* Chat CTA */}
              {onChat && (
                <button
                  onClick={onChat}
                  style={{
                    ...S.btnPrimary,
                    width: '100%', justifyContent: 'center',
                    padding: '13px 20px', fontSize: 15, marginTop: 8,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> Message this Contractor</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 13, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{value}</span>
    </div>
  );
}
