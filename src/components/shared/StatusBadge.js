import { S } from '../../theme';

const STATUS_MAP = {
  // Project
  open:                 { style: S.badgeGreen,  label: 'Open for Bids' },
  draft:                { style: S.badgeGray,   label: 'Draft' },
  under_review:         { style: S.badgeBlue,   label: 'Under Review' },
  awarded:              { style: S.badgePurple, label: 'Awarded' },
  in_progress:          { style: S.badgeBlue,   label: 'In Progress' },
  completed:            { style: S.badgeGreen,  label: 'Completed' },
  cancelled:            { style: S.badgeGray,   label: 'Cancelled' },
  disputed:             { style: S.badgeRed,    label: 'Disputed' },
  // Bid
  submitted:            { style: S.badgeBlue,   label: 'Submitted' },
  shortlisted:          { style: S.badgePurple, label: 'Shortlisted' },
  accepted:             { style: S.badgeGreen,  label: 'Accepted' },
  rejected:             { style: S.badgeRed,    label: 'Rejected' },
  withdrawn:            { style: S.badgeGray,   label: 'Withdrawn' },
  // Contract
  pending_signatures:   { style: S.badgeYellow, label: 'Pending Signature' },
  active:               { style: S.badgeGreen,  label: 'Active' },
  // Transaction
  pending:              { style: S.badgeYellow, label: 'Pending' },
  processing:           { style: S.badgeBlue,   label: 'Processing' },
  failed:               { style: S.badgeRed,    label: 'Failed' },
  refunded:             { style: S.badgeOrange, label: 'Refunded' },
  // User
  suspended:            { style: S.badgeRed,    label: 'Suspended' },
  pending_verification: { style: S.badgeOrange, label: 'Unverified' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { style: S.badgeGray, label: status };
  return <span style={cfg.style}>{cfg.label}</span>;
}
