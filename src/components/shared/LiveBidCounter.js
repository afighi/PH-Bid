import { useLiveProjectData } from '../../hooks/useRealtime';
import { formatRelative } from '../../utils/formatters';
import { COLORS } from '../../theme';

export default function LiveBidCounter({ projectId }) {
  const data = useLiveProjectData(projectId);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Pulse dot */}
      <div style={{ position: 'relative', width: 10, height: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: COLORS.success,
          position: 'absolute',
        }} />
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: COLORS.success,
          position: 'absolute',
          opacity: 0.4,
          animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
        {data.bid_count || 0} {(data.bid_count || 0) === 1 ? 'bid' : 'bids'}
      </span>
      {data.latest_bid_at && (
        <span style={{ fontSize: 11, color: COLORS.textLight }}>
          · Last {formatRelative(data.latest_bid_at)}
        </span>
      )}
    </div>
  );
}
