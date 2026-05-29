# CLAUDE.md — ph-bid (BuildBid PH)

Guidance for Claude Code when working in this directory.

## Project Overview

**BuildBid PH** — a Philippine construction bidding platform. Clients post projects; contractors browse and submit bids. Admins manage approvals and platform health.

Frontend-only architecture: no backend server. All data operations go directly through the Firebase and Supabase client SDKs.

---

## Stack

| Concern | Technology |
|---|---|
| Framework | React 19 (Create React App) |
| Routing | React Router v7 |
| State | Zustand (`src/stores/authStore.js`) |
| Forms | React Hook Form + Zod |
| Styling | Inline styles + `src/theme.js` (no Tailwind, no CSS modules) |
| Icons | Lucide React |
| Auth | Firebase Auth |
| Database | Supabase (Postgres) |
| Realtime | Firebase Realtime Database (admin queue, notifications) |
| Storage | Firebase Storage |
| Payments | PayMongo (test keys in `.env`) |
| OTP/Email | EmailJS |

---

## Architecture

### Auth Flow
1. Firebase Auth handles credentials (email/password)
2. On sign-up, a `profiles` row is inserted into Supabase
3. `onAuthChange` (in `authService.js`) listens to Firebase state → fetches Supabase profile → populates Zustand `authStore`
4. `ProtectedRoute` checks `profile.role` and `profile.status` before rendering

### Account Status
- **Client signup**: status = `pending_verification` → OTP via EmailJS → `active`
- **Contractor signup**: status = `pending` → admin approves → `active`
- **Suspended**: blocked at login

### Role Routing
| Role | Base route |
|---|---|
| `client` | `/client` |
| `contractor` | `/contractor` |
| `admin` | `/admin` |

### Data Sources
- **Supabase**: profiles, projects, bids, transactions, audit logs
- **Firebase Realtime DB**: admin queue (`admin_queue/users/`), notifications (`notifications/admin`), real-time counters

---

## Key Files

- `src/App.js` — root component, auth listener, all route definitions
- `src/theme.js` — `COLORS`, `SHADOW`, `S` (reusable style objects) — import these for all new UI
- `src/stores/authStore.js` — Zustand store: `user` (Firebase), `profile` (Supabase), `loading`
- `src/services/authService.js` — sign-up, login, logout, password reset, `onAuthChange`
- `src/config/firebase.js` — exports `auth`, `database`, `storage`
- `src/config/supabase.js` — exports `supabase` client

---

## Styling Conventions

**Always** use `src/theme.js` for colors and shadows. Never hardcode hex values that already exist in `COLORS`.

```js
import { COLORS, SHADOW, S } from '../../theme';
```

- Use `S.card`, `S.btnPrimary`, `S.input`, `S.label`, etc. for standard UI elements
- Client-facing pages use `S.clientCard` / `S.clientBtnPrimary` (flat/brutalist style)
- Contractor/admin pages use the standard `S.card` / `S.btnPrimary` (blue/elevated style)
- All styling is inline — no CSS class additions needed

---

## Commands

```bash
# From C:\Users\hiverpc\ph-bid\
npm start          # Dev server → http://localhost:3000
npm run build      # Production build → build/
npm test           # Jest (watch mode)
npm test -- --watchAll=false  # Run once
```

---

## Environment Variables

All in `.env` (already configured — do not regenerate):
- `REACT_APP_FIREBASE_*` — Firebase project config
- `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` — Supabase connection
- `REACT_APP_EMAILJS_*` — OTP email delivery
- `REACT_APP_PAYMONGO_SECRET_KEY` / `REACT_APP_PAYMONGO_PUBLIC_KEY` — payment processing (test keys)

---

## Archie AI Assistant

**Archie** is the in-app AI assistant powered by Claude (Haiku 4.5). Present on all three dashboards.

| File | Purpose |
|---|---|
| `src/services/archieService.js` | Claude API calls via dev proxy; role-specific system prompts |
| `src/components/shared/ArchiePanel.js` | `ArchieBanner` (named export) + `ArchieChat` (default) |
| `src/setupProxy.js` | CRA dev proxy: `/api/anthropic/*` → `https://api.anthropic.com/*` (injects API key) |
| `public/Mascot_02.png` | Half-body mascot shown in banner and chat UI |

**API key**: stored in `.env` as `ANTHROPIC_API_KEY` (no `REACT_APP_` prefix — never bundled to browser; only read by `setupProxy.js` at dev-server time).

**How the proxy works**: In dev mode, `npm start` runs CRA dev server which loads `src/setupProxy.js`. All fetch calls to `/api/anthropic/v1/messages` are proxied to Anthropic's API with the key injected server-side. For production, deploy a Supabase Edge Function to replicate this proxy behavior.

**Project creation flow** (client): Archie collects project details conversationally → outputs `PROJECT_DATA:{...}` at end of message → UI shows "Fill Project Form" button → navigates to `/client/new-project` with `location.state.prefill` → `PostProject.js` reads and applies prefill.

**Adding Archie to a new page**:
```js
import { ArchieBanner } from '../shared/ArchiePanel';
import ArchieChat from '../shared/ArchiePanel';

// In component:
const [archieOpen, setArchieOpen] = useState(false);

// In JSX:
<ArchieBanner role="client" profile={profile} stats={stats} onOpenChat={() => setArchieOpen(true)} />
<ArchieChat role="client" profile={profile} stats={stats} defaultOpen={archieOpen} />
```

---

## Important Patterns

- **Audit logging**: call `logAudit()` from `src/services/auditService.js` for any significant user action (follows the `AUDIT_ACTIONS` constants defined there)
- **Supabase queries**: always use `.select('*').eq('id', uid).single()` pattern; check for `error` before using `data`
- **Firebase writes**: use `ref(database, 'path')` + `set()` or `push()` — only for admin queue and notifications, not general data
- **PayMongo proxy**: `package.json` proxies `/v1/*` to `https://api.paymongo.com` — use relative paths in `paymongoService.js`
