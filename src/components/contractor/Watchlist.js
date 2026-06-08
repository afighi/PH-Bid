import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getWatchlist, removeFromWatchlist } from '../../services/watchlistService';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Bookmark, MapPin, Clock, X, ArrowRight } from 'lucide-react';

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - Date.now()) / 86400000);
}

export default function Watchlist() {
  const { profile } = useAuthStore();
  const navigate    = useNavigate();

  const { data: items, loading } = useSupabaseRealtime(
    'watchlist',
    () => getWatchlist(profile.id),
    `contractor_id=eq.${profile.id}`,
    [profile?.id]
  );

  const handleRemove = async (contractorId, projectId, e) => {
    e.stopPropagation();
    await removeFromWatchlist(contractorId, projectId);
  };

  return (
    <DashboardLayout title="Project Watchlist">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>Project Watchlist</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>Projects you are tracking for bidding opportunities.</div>
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>{items.length} tracked</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 56, color: COLORS.textMuted }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: '56px 32px', textAlign: 'center' }}>
          <Bookmark size={40} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: 6 }}>No projects on your watchlist</div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>Add projects to your watchlist from Browse Projects to track bidding deadlines and updates.</p>
          <button onClick={() => navigate('/contractor/browse')}
            style={{ marginTop: 16, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Browse Projects
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {items.map(item => {
            const p    = item.project;
            const days = daysLeft(p.bid_deadline);
            const closed = days <= 0;
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/contractor/projects/${p.id}`)}
                style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${COLORS.border}`, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 2px 8px rgba(26,10,0,0.05)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,10,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,10,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, flex: 1, paddingRight: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
                  <button
                    onClick={e => handleRemove(profile.id, p.id, e)}
                    style={{ background: COLORS.gray100, border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
                  <MapPin size={11} />{p.location_city}, {p.location_region}
                </div>

                <div style={{ background: 'linear-gradient(135deg, #FAF5EC, #F5ECE0)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Budget</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(p.budget_min)} – {formatCurrency(p.budget_max)}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                    color: closed ? COLORS.danger : days <= 3 ? COLORS.danger : COLORS.textMuted,
                    background: closed ? COLORS.dangerLight : days <= 3 ? COLORS.dangerLight : COLORS.gray100,
                    padding: '3px 9px', borderRadius: 20 }}>
                    <Clock size={10} /> {closed ? 'Closed' : `${days}d left`}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/contractor/projects/${p.id}/bid`); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Bid <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
