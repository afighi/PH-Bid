export const PHILIPPINE_REGIONS = [
  'NCR (Metro Manila)',
  'CAR (Cordillera)',
  'Region I – Ilocos',
  'Region II – Cagayan Valley',
  'Region III – Central Luzon',
  'Region IV-A – CALABARZON',
  'MIMAROPA',
  'Region V – Bicol',
  'Region VI – Western Visayas',
  'Region VII – Central Visayas',
  'Region VIII – Eastern Visayas',
  'Region IX – Zamboanga Peninsula',
  'Region X – Northern Mindanao',
  'Region XI – Davao',
  'Region XII – SOCCSKSARGEN',
  'Region XIII – Caraga',
  'BARMM',
];

export const PROJECT_TYPES = [
  { value: 'residential',    label: 'Residential (House, Condo, Townhouse)' },
  { value: 'commercial',     label: 'Commercial (Mall, Office, Hotel)' },
  { value: 'industrial',     label: 'Industrial (Factory, Warehouse)' },
  { value: 'infrastructure', label: 'Infrastructure (Roads, Bridges)' },
  { value: 'renovation',     label: 'Renovation / Remodeling' },
  { value: 'electrical',     label: 'Electrical Works' },
  { value: 'plumbing',       label: 'Plumbing Works' },
  { value: 'interior',       label: 'Interior Design / Fit-out' },
];

export const PAYMENT_METHODS = [
  { value: 'gcash',           label: 'GCash' },
  { value: 'maya',            label: 'Maya (PayMaya)' },
  { value: 'bank_transfer',   label: 'Bank Transfer (BDO, BPI, Metrobank)' },
  { value: 'check',           label: 'Check' },
  { value: 'cash',            label: 'Cash' },
  { value: 'online_banking',  label: 'Online Banking' },
];

export const PCAB_CLASSIFICATIONS = ['AAA', 'AA', 'A', 'B', 'C', 'D', 'E'];

export const SPECIALIZATIONS = [
  'General Construction',
  'Civil / Structural',
  'Electrical',
  'Plumbing / Sanitary',
  'Mechanical',
  'Interior Design / Fit-out',
  'Road / Bridge',
  'Renovation',
];

export const PROJECT_STATUS_LABELS = {
  draft:        'Draft',
  open:         'Open for Bidding',
  under_review: 'Under Review',
  awarded:      'Awarded',
  in_progress:  'In Progress',
  completed:    'Completed',
  cancelled:    'Cancelled',
  disputed:     'Disputed',
};

export const BID_STATUS_LABELS = {
  submitted:    'Submitted',
  under_review: 'Under Review',
  shortlisted:  'Shortlisted',
  awarded:      'Awarded',
  rejected:     'Rejected',
  withdrawn:    'Withdrawn',
};

export const TRANSACTION_TYPES = {
  downpayment:       'Down Payment',
  milestone_payment: 'Milestone Payment',
  final_payment:     'Final Payment',
  refund:            'Refund',
  penalty:           'Penalty',
};
