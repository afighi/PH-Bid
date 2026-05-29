// ─── Brand Colors — Warm Brown Palette ───────────────────────────
export const COLORS = {
  // Core brand
  primary:      '#7B3F00',   // chocolate brown — actions, links, active states
  primaryLight: '#F5E6D3',   // warm cream — hover bg, tag bg
  primaryDark:  '#5A2D00',   // deep chocolate — pressed / dark states
  darkBlue:     '#5A2D00',   // alias for primaryDark — backward compat
  borderBlue:   '#F5E6D3',   // alias for primaryLight — backward compat
  accent:       '#C07838',   // caramel / golden brown — highlights, awards, CTA
  accentLight:  '#FDF0E0',   // light cream

  // Sidebar — espresso dark
  sidebarBg:    '#1A0A00',
  sidebarBorder:'rgba(255,255,255,0.07)',
  sidebarText:  '#C4A882',   // warm tan
  sidebarHover: 'rgba(255,255,255,0.05)',
  sidebarActive:'rgba(123,63,0,0.22)',

  // Page & surfaces — warm off-white
  bg:           '#FFFBF5',
  white:        '#FFFFFF',
  cardBg:       '#FFFFFF',
  surfaceAlt:   '#FFF8EF',   // inner panel, table header

  // Text
  text:         '#1A0A00',   // espresso near-black
  textMuted:    '#6B4F3A',   // warm muted brown
  textLight:    '#A08060',   // light warm brown

  // Borders — warm beige
  border:       '#E8D5C0',
  borderStrong: '#D4B896',

  // Semantic — unchanged for meaning clarity
  success:      '#059669',
  successLight: '#D1FAE5',
  successDark:  '#047857',
  warning:      '#C07838',
  warningLight: '#FDF0E0',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',

  // Warm grays
  gray50:       '#FFFBF5',
  gray100:      '#F5ECE0',
  gray200:      '#E8D5C0',
  gray300:      '#D4B896',
};

// ─── Shadow Scale ─────────────────────────────────────────────────
export const SHADOW = {
  sm:   '0 1px 3px rgba(26,10,0,0.06), 0 1px 2px rgba(26,10,0,0.04)',
  md:   '0 4px 12px rgba(26,10,0,0.08), 0 2px 4px rgba(26,10,0,0.04)',
  lg:   '0 8px 24px rgba(26,10,0,0.10), 0 3px 8px rgba(26,10,0,0.06)',
  xl:   '0 16px 40px rgba(26,10,0,0.12), 0 6px 16px rgba(26,10,0,0.06)',
  blue: '0 4px 14px rgba(123,63,0,0.28)',  // kept as 'blue' for backward compat
};

// ─── Reusable Style Objects ───────────────────────────────────────
export const S = {
  // Layout
  page: {
    minHeight: '100vh',
    backgroundColor: COLORS.bg,
    fontFamily: "'Montserrat', system-ui, -apple-system, sans-serif",
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    padding: 24,
    boxShadow: SHADOW.sm,
  },
  cardHover: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    padding: 24,
    boxShadow: SHADOW.sm,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },

  // Client-specific Brutalist/Flat styles
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    border: '1px solid rgba(0,0,0,0.15)',
    padding: 24,
    boxShadow: 'none',
  },
  clientCardHover: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    border: '1px solid rgba(0,0,0,0.15)',
    padding: 24,
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  clientBtnPrimary: {
    backgroundColor: '#1A0A00',
    color: '#FFF',
    border: 'none',
    borderRadius: 24,
    padding: '12px 24px',
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    boxShadow: 'none',
  },
  clientBtnSecondary: {
    backgroundColor: '#FFF',
    color: COLORS.text,
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 24,
    padding: '12px 24px',
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    boxShadow: 'none',
  },

  // Buttons
  btnPrimary: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'opacity 0.15s, box-shadow 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    boxShadow: SHADOW.blue,
  },
  btnSecondary: {
    backgroundColor: COLORS.white,
    color: COLORS.text,
    border: `1px solid rgba(0,0,0,0.15)`,
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
    color: COLORS.white,
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  btnSuccess: {
    backgroundColor: COLORS.success,
    color: COLORS.white,
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  btnAccent: {
    backgroundColor: COLORS.accent,
    color: '#3D1500',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    color: COLORS.textMuted,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },

  // Form inputs
  input: {
    width: '100%',
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: "'Montserrat', system-ui, sans-serif",
  },
  inputFocus: {
    borderColor: COLORS.primary,
    boxShadow: `0 0 0 3px rgba(123,63,0,0.12)`,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  formGroup: {
    marginBottom: 18,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: 500,
    marginTop: 5,
  },

  // Typography
  h1: { fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0, letterSpacing: '-0.02em' },
  h2: { fontSize: 20, fontWeight: 800, color: COLORS.text, margin: 0, letterSpacing: '-0.01em' },
  h3: { fontSize: 16, fontWeight: 700, color: COLORS.text, margin: 0 },
  body: { fontSize: 14, fontWeight: 400, color: COLORS.textMuted, lineHeight: 1.6 },
  small: { fontSize: 12, fontWeight: 500, color: COLORS.textLight },

  // Flex helpers
  row: { display: 'flex', alignItems: 'center' },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  col: { display: 'flex', flexDirection: 'column' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Alerts
  alertError: {
    backgroundColor: COLORS.dangerLight,
    border: `1px solid rgba(220,38,38,0.25)`,
    color: '#991B1B',
    borderRadius: 8,
    padding: '11px 15px',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  alertSuccess: {
    backgroundColor: COLORS.successLight,
    border: `1px solid rgba(5,150,105,0.25)`,
    color: '#065F46',
    borderRadius: 8,
    padding: '11px 15px',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },

  // Badges — pill with dot indicator feel
  badgeBlue: {
    backgroundColor: '#F5E6D3',
    color: COLORS.primary,
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    display: 'inline-block',
    border: `1px solid ${COLORS.border}`,
  },
  badgeYellow: {
    backgroundColor: COLORS.accentLight,
    color: '#3D1500',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    display: 'inline-block',
    border: `1px solid #E8C49A`,
  },
  badgeGreen: {
    backgroundColor: COLORS.successLight,
    color: COLORS.successDark,
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    display: 'inline-block',
    border: `1px solid #A7F3D0`,
  },
  badgeRed: {
    backgroundColor: COLORS.dangerLight,
    color: '#991B1B',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    display: 'inline-block',
    border: `1px solid #FECACA`,
  },
  badgeGray: {
    backgroundColor: COLORS.gray100,
    color: COLORS.textMuted,
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    display: 'inline-block',
    border: `1px solid ${COLORS.border}`,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    margin: '20px 0',
    border: 'none',
  },

  // Section container
  section: {
    padding: '32px 24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
};
