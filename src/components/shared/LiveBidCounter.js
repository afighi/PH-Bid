import { useEffect, useRef, useState } from 'react';
import { useLiveProjectData } from '../../hooks/useRealtime';
import { formatRelative } from '../../utils/formatters';
import { COLORS } from '../../theme';
import { TrendingUp } from 'lucide-react';

// Animated number that counts up when the value increases
function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(value);
  const [flash,   setFlash]   = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current && value > prevRef.current) {
      setFlash(true);
      const steps = value - prevRef.current;
      let current = prevRef.current;
      const interval = setInterval(() => {
        current += 1;
        setDisplay(current);
        if (current >= value) clearInterval(interval);
      }, Math.max(60, 300 / steps));
      setTimeout(() => setFlash(false), 800);
      prevRef.current = value;
      return () => clearInterval(interval);
    } else {
      setDisplay(value);
      prevRef.current = value;
    }
  }, [value]);

  return (
    <span style={{
      fontWeight: 800, fontSize: 15,
      color: flash ? COLORS.success : COLORS.text,
      transition: 'color 0.4s',
      display: 'inline-block',
      transform: flash ? 'scale(1.18)' : 'scale(1)',
      transformOrigin: 'left center',
    }}>
      {display}
    </span>
  );
}

export default function LiveBidCounter({ projectId, size = 'normal' }) {
  const data      = useLiveProjectData(projectId);
  const count     = data.bid_count || 0;
  const isCompact = size === 'compact';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 5 : 8 }}>
      {/* Live pulse dot */}
      <div style={{ position: 'relative', width: isCompact ? 8 : 10, height: isCompact ? 8 : 10, flexShrink: 0 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: COLORS.success, position: 'absolute' }} />
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: COLORS.success, position: 'absolute', opacity: 0.4, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <AnimatedCount value={count} />
        <span style={{ fontSize: isCompact ? 11 : 12, color: COLORS.textMuted, fontWeight: 500 }}>
          {count === 1 ? 'bid' : 'bids'}
        </span>
      </div>

      {!isCompact && data.latest_bid_at && (
        <span style={{ fontSize: 11, color: COLORS.textLight }}>
          · last {formatRelative(data.latest_bid_at)}
        </span>
      )}
    </div>
  );
}
