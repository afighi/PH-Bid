import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { COLORS } from '../../theme';
import { submitReview, getMyReviewForProject } from '../../services/reviewService';
import { useEffect } from 'react';

function StarRating({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
          >
            <Star
              size={22}
              fill={(hover || value) >= n ? COLORS.accent : 'transparent'}
              color={(hover || value) >= n ? COLORS.accent : COLORS.border}
            />
          </button>
        ))}
        {value > 0 && <span style={{ fontSize: 12, color: COLORS.textMuted, alignSelf: 'center', marginLeft: 4 }}>{value}/5</span>}
      </div>
    </div>
  );
}

export default function ReviewForm({ projectId, reviewerId, revieweeId, reviewerRole, revieweeName, onDone, onClose }) {
  const [rating,        setRating]        = useState(0);
  const [quality,       setQuality]       = useState(0);
  const [communication, setCommunication] = useState(0);
  const [timeliness,    setTimeliness]    = useState(0);
  const [text,          setText]          = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');
  const [alreadyDone,   setAlreadyDone]   = useState(false);

  useEffect(() => {
    getMyReviewForProject(projectId, reviewerId).then(r => { if (r) setAlreadyDone(true); });
  }, [projectId, reviewerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select an overall rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitReview({
        projectId, reviewerId, revieweeId, reviewerRole,
        rating,
        qualityRating:        quality       || rating,
        communicationRating:  communication || rating,
        timelinessRating:     timeliness    || rating,
        reviewText:           text.trim() || null,
      });
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyDone) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <Star size={36} fill={COLORS.accent} color={COLORS.accent} style={{ marginBottom: 12 }} />
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Review already submitted</div>
      <p style={{ fontSize: 13, color: COLORS.textMuted }}>You already left a review for this project.</p>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden', maxWidth: 480, width: '100%' }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.gray50 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>Review {revieweeName}</div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
        <StarRating value={rating}        onChange={setRating}        label="Overall Rating *" />
        <StarRating value={quality}       onChange={setQuality}       label="Quality of Work" />
        <StarRating value={communication} onChange={setCommunication} label="Communication" />
        <StarRating value={timeliness}    onChange={setTimeliness}    label="Timeliness" />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your Review</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share your experience working with this person…"
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: COLORS.text, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
            onFocus={e  => e.target.style.borderColor = COLORS.primary}
            onBlur={e   => e.target.style.borderColor = COLORS.border}
          />
        </div>

        {error && <div style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', background: COLORS.primary, color: '#fff',
            border: 'none', borderRadius: 12, padding: '13px 0',
            fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
