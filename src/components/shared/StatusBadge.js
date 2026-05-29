import { S } from '../../theme';

const STATUS_MAP = {
  // Project
  open:         { style: S.badgeGreen,  label: 'Open for Bidding' },
  draft:        { style: S.badgeGray,   label: 'Draft' },
  under_review: { style: S.badgeBlue,   label: 'Under Review' },
  awarded:      { style: S.badgeYellow, label: 'Awarded' },
  in_progress:  { style: S.badgeBlue,   label: 'In Progress' },
  completed:    { style: S.badgeGreen,  label: 'Completed' },
  cancelled:    { style: S.badgeRed,    label: 'Cancelled' },
  disputed:     { style: S.badgeRed,    label: 'Disputed' },
  // Bid
  submitted:    { style: S.badgeBlue,   label: 'Submitted' },
  shortlisted:  { style: S.badgeYellow, label: 'Shortlisted' },
  rejected:     { style: S.badgeRed,    label: 'Rejected' },
  withdrawn:    { style: S.badgeGray,   label: 'Withdrawn' },
  // Transaction
  pending:      { style: S.badgeYellow, label: 'Pending' },
  processing:   { style: S.badgeBlue,   label: 'Processing' },
  failed:       { style: S.badgeRed,    label: 'Failed' },
  refunded:     { style: S.badgeGray,   label: 'Refunded' },
  // User
  active:       { style: S.badgeGreen,  label: 'Active' },
  suspended:    { style: S.badgeRed,    label: 'Suspended' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { style: S.badgeGray, label: status };
  return <span style={cfg.style}>{cfg.label}</span>;
}
