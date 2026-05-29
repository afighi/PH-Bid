import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, FileText, Hammer, Trophy, CreditCard,
  Building2, ClipboardList, Zap, Shield, DollarSign, Star, CheckCircle2,
} from 'lucide-react';

const C = {
  brown:   '#7A3E0F',
  dark:    '#4A2509',
  amber:   '#C77A2C',
  cream:   '#FAF5EC',
  surface: '#FFFFFF',
  border:  '#E8DFCE',
  text:    '#1C1410',
  muted:   '#8B7355',
  success: '#2D7A3E',
};
const mono    = { fontFamily: "'JetBrains Mono', monospace" };
const display = { fontFamily: "'Bricolage Grotesque', sans-serif" };

// ── Reusable hover-aware button ────────────────────────────────────
function BtnPrimary({ onClick, children, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: hov ? C.dark : C.brown,
        color: C.cream,
        border: 'none',
        borderRadius: 100,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background-color 0.15s',
        boxShadow: hov ? '0 4px 20px rgba(122,62,15,0.4)' : '0 2px 10px rgba(122,62,15,0.25)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BtnAmber({ onClick, children, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: hov ? 'rgba(199,122,44,0.3)' : 'rgba(199,122,44,0.2)',
        color: C.brown,
        border: '1.5px solid rgba(199,122,44,0.6)',
        borderRadius: 100,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BtnCta({ onClick, children, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: hov ? C.surface : C.amber,
        color: hov ? C.brown : '#3D1500',
        border: 'none',
        borderRadius: 100,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        transition: 'background-color 0.15s, color 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Logo ───────────────────────────────────────────────────────────
function Logo({ isDark = false }) {
  const textColor = isDark ? 'rgba(250,245,236,0.75)' : C.text;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" fill={isDark ? 'rgba(250,245,236,0.15)' : '#FAF5EC'} stroke={isDark ? 'rgba(250,245,236,0.5)' : '#7A3E0F'} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M16 2L16 16M16 16L30 9M16 16L2 9" stroke={isDark ? 'rgba(250,245,236,0.5)' : '#7A3E0F'} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 12.5L16 16.5L24 12.5" stroke={isDark ? C.amber : '#C77A2C'} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 17.5L16 21.5L24 17.5" stroke={isDark ? C.amber : '#C77A2C'} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
      <span style={{ ...display, fontWeight: 800, fontSize: 20, color: textColor }}>
        BuildBid <span style={{ color: C.amber }}>PH</span>
      </span>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────
function Navbar({ onSignIn, onSignUp }) {
  const [hovSignIn, setHovSignIn] = useState(false);
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 200,
      backgroundColor: 'rgba(250,245,236,0.92)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div className="bb-caution" style={{ height: 4 }} />
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 32px',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onSignIn}
            onMouseEnter={() => setHovSignIn(true)}
            onMouseLeave={() => setHovSignIn(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: hovSignIn ? C.brown : C.text,
              fontWeight: 600, fontSize: 14,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'color 0.15s',
            }}
          >
            Sign In
          </button>
          <BtnPrimary onClick={onSignUp} style={{ padding: '10px 20px', fontSize: 14 }}>
            Get Started Free
          </BtnPrimary>
        </div>
      </div>
    </nav>
  );
}

// ── Construction blueprint interactive canvas ──────────────────────
function InteractiveCanvas({ mouseRef }) {
  const canvasRef = useRef(null);
  const nodesRef  = useRef([]);
  const frameRef  = useRef(null);
  // Stable mock measurements per node pair (seeded from index)
  const measRef   = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const SPACING      = 64;   // wider grid — blueprint feel
    const REPEL        = 190;
    const BEAM_DIST    = SPACING * 1.55; // max distance to draw a beam
    let W = 0, H = 0;

    const build = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width  = rect.width;
      H = canvas.height = rect.height;
      const nodes = [];
      // Assign a stable label per node (PT-01, PT-02 …)
      let idx = 0;
      for (let x = SPACING; x < W; x += SPACING) {
        for (let y = SPACING; y < H; y += SPACING) {
          nodes.push({
            ox: x, oy: y, x, y, vx: 0, vy: 0,
            id: `PT-${String(++idx).padStart(2,'0')}`,
          });
        }
      }
      nodesRef.current = nodes;
      // Seed mock dimension strings (e.g. "4.2 m")
      measRef.current = Array.from({ length: nodes.length * 4 }, (_, i) =>
        `${(2.5 + (i * 1.37) % 14).toFixed(1)} m`
      );
    };

    // Helper: draw a crosshair survey marker
    const drawCrosshair = (x, y, size, alpha, amber) => {
      ctx.save();
      ctx.strokeStyle = `rgba(122,62,15,${alpha})`;
      ctx.lineWidth   = 1;
      // horizontal
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.stroke();
      // vertical
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke();
      // small center square (bolt plate style)
      if (amber > 0.05) {
        const s = 2.5;
        ctx.fillStyle = `rgba(199,122,44,${amber})`;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
      ctx.restore();
    };

    // Helper: draw a structural beam line
    const drawBeam = (ax, ay, bx, by, alpha, dashed) => {
      ctx.save();
      ctx.strokeStyle = `rgba(122,62,15,${alpha})`;
      ctx.lineWidth   = alpha > 0.25 ? 1.2 : 0.7;
      if (dashed) ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    // Helper: draw a dimension line (tick-ended measurement annotation)
    const drawDimension = (ax, ay, bx, by, label, alpha) => {
      if (alpha < 0.05) return;
      ctx.save();
      ctx.strokeStyle = `rgba(199,122,44,${alpha})`;
      ctx.fillStyle   = `rgba(199,122,44,${alpha})`;
      ctx.lineWidth   = 0.8;
      ctx.font        = `700 9px "JetBrains Mono", monospace`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';

      // Main dimension line (offset perpendicular by 12px)
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) { ctx.restore(); return; }
      const nx = -dy / len, ny = dx / len; // normal
      const off = 14;
      const x1 = ax + nx * off, y1 = ay + ny * off;
      const x2 = bx + nx * off, y2 = by + ny * off;

      // Leader lines from points to dim line
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      // Dimension line with tick ends
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const tickSize = 5;
      const ux = dx / len, uy = dy / len;
      // tick at start
      ctx.beginPath(); ctx.moveTo(x1 - ux * tickSize, y1 - uy * tickSize); ctx.lineTo(x1 + ux * tickSize, y1 + uy * tickSize); ctx.stroke();
      // tick at end
      ctx.beginPath(); ctx.moveTo(x2 - ux * tickSize, y2 - uy * tickSize); ctx.lineTo(x2 + ux * tickSize, y2 + uy * tickSize); ctx.stroke();

      // Label at midpoint
      const mx2 = (x1 + x2) / 2, my2 = (y1 + y2) / 2;
      ctx.fillStyle = `rgba(250,245,236,${alpha * 0.9})`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(mx2 - tw / 2 - 3, my2 - 6, tw + 6, 12);
      ctx.fillStyle = `rgba(199,122,44,${alpha})`;
      ctx.fillText(label, mx2, my2);

      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const { x: mx, y: my } = mouseRef.current;

      // ── Background blueprint grid lines ──
      ctx.save();
      ctx.strokeStyle = 'rgba(122,62,15,0.045)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += SPACING) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += SPACING) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // ── Cursor amber glow ──
      if (mx > 0) {
        const grd = ctx.createRadialGradient(mx, my, 0, mx, my, REPEL * 2);
        grd.addColorStop(0,    'rgba(199,122,44,0.16)');
        grd.addColorStop(0.45, 'rgba(199,122,44,0.05)');
        grd.addColorStop(1,    'rgba(199,122,44,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // ── Physics update ──
      const nodes = nodesRef.current;
      nodes.forEach(n => {
        const dx = n.x - mx, dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL && dist > 0) {
          const f = ((REPEL - dist) / REPEL) ** 1.7;
          n.vx += (dx / dist) * f * 8;
          n.vy += (dy / dist) * f * 8;
        }
        n.vx += (n.ox - n.x) * 0.08;
        n.vy += (n.oy - n.y) * 0.08;
        n.vx *= 0.78;
        n.vy *= 0.78;
        n.x  += n.vx;
        n.y  += n.vy;
      });

      // ── Structural beams between nearby nodes ──
      // Only draw beams for nodes somewhat near the cursor (perf + visual focus)
      const CURSOR_RANGE = REPEL * 2.2;
      const active = nodes.filter(n => {
        const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        return d < CURSOR_RANGE;
      });

      // Beam connections
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > BEAM_DIST) continue;

          const da = Math.sqrt((a.x - mx) ** 2 + (a.y - my) ** 2);
          const db = Math.sqrt((b.x - mx) ** 2 + (b.y - my) ** 2);
          const tA = Math.max(0, 1 - da / CURSOR_RANGE);
          const tB = Math.max(0, 1 - db / CURSOR_RANGE);
          const t  = (tA + tB) / 2;
          const closeness = 1 - dist / BEAM_DIST;
          const alpha = t * closeness * 0.55;

          // Alternate dashed / solid based on grid parity
          const dashed = (Math.round(a.ox / SPACING) + Math.round(a.oy / SPACING)) % 2 === 0;
          drawBeam(a.x, a.y, b.x, b.y, alpha, dashed);

          // Small square bolt at beam midpoint
          if (t > 0.35 && closeness > 0.5) {
            const boltAlpha = (t - 0.35) * 0.8;
            const s = 2;
            ctx.fillStyle = `rgba(199,122,44,${boltAlpha})`;
            ctx.fillRect((a.x + b.x) / 2 - s, (a.y + b.y) / 2 - s, s * 2, s * 2);
          }
        }
      }

      // ── Triangle fill for triplets close to cursor ──
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          if (Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2) > BEAM_DIST) continue;
          for (let k = j + 1; k < active.length; k++) {
            const c = active[k];
            if (Math.sqrt((b.x-c.x)**2+(b.y-c.y)**2) > BEAM_DIST) continue;
            if (Math.sqrt((a.x-c.x)**2+(a.y-c.y)**2) > BEAM_DIST) continue;
            const tAvg = [a, b, c].reduce((s, n) => s + Math.max(0, 1 - Math.sqrt((n.x-mx)**2+(n.y-my)**2) / CURSOR_RANGE), 0) / 3;
            ctx.fillStyle = `rgba(199,122,44,${tAvg * 0.06})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
          }
        }
      }

      // ── Dimension annotation: cursor → nearest node ──
      if (mx > 0 && active.length > 0) {
        let nearest = active[0];
        let nearDist = Infinity;
        active.forEach(n => {
          const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
          if (d < nearDist) { nearDist = d; nearest = n; }
        });
        if (nearDist > 20 && nearDist < REPEL * 1.4) {
          const t = Math.max(0, 1 - nearDist / (REPEL * 1.4));
          const measIdx = nodesRef.current.indexOf(nearest);
          const label = measRef.current[measIdx] || '8.0 m';
          drawDimension(mx, my, nearest.x, nearest.y, label, t * 0.9);
        }
      }

      // ── Crosshair markers (survey points) ──
      nodes.forEach((n, idx) => {
        const d2    = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        const t     = Math.max(0, 1 - d2 / (REPEL * 1.6));
        const size  = 4 + t * 7;
        const alpha = 0.1 + t * 0.6;
        const amber = t > 0.25 ? (t - 0.25) * 0.9 : 0;
        drawCrosshair(n.x, n.y, size, alpha, amber);

        // Node label (PT-xx) for nodes very close to cursor
        if (t > 0.55) {
          ctx.save();
          ctx.font      = `600 8px "JetBrains Mono", monospace`;
          ctx.fillStyle = `rgba(122,62,15,${(t - 0.55) * 1.5})`;
          ctx.textAlign = 'left';
          ctx.fillText(n.id, n.x + size + 3, n.y - size - 1);
          ctx.restore();
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    build();
    draw();

    const ro = new ResizeObserver(build);
    ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

// ── Hero ───────────────────────────────────────────────────────────
function Hero({ onPostProject, onBrowse }) {
  const [hovPost,   setHovPost]   = useState(false);
  const [hovBrowse, setHovBrowse] = useState(false);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const sectionRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = sectionRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const handleMouseLeave = () => {
    mouseRef.current = { x: -9999, y: -9999 };
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative', backgroundColor: C.cream,
        borderBottom: `1px solid ${C.border}`,
        padding: '80px 32px 96px', overflow: 'hidden',
      }}
    >
      <InteractiveCanvas mouseRef={mouseRef} />
      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 56, alignItems: 'center' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Badge — TL corner only */}
            <div className="bb-corner-tl" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `2px solid ${C.brown}`, borderRadius: 2,
              padding: '6px 14px', alignSelf: 'flex-start', position: 'relative',
              ...mono, fontSize: 11, fontWeight: 700, color: C.brown, letterSpacing: '0.1em',
            }}>
              <span style={{ width: 8, height: 8, backgroundColor: C.brown, borderRadius: '50%', display: 'inline-block' }} />
              BUILT FOR PHILIPPINE CONSTRUCTION
            </div>

            {/* Headline */}
            <h1 style={{
              ...display, fontSize: 68, fontWeight: 800, color: C.text,
              lineHeight: 1.05, letterSpacing: '-0.025em', margin: 0,
            }}>
              The Smarter Way to{' '}
              <span style={{ color: C.brown, position: 'relative', display: 'inline-block' }}>
                Bid on
                <svg style={{ position: 'absolute', bottom: -8, left: 0, width: '100%', height: 12, color: C.amber }}
                  viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none"/>
                </svg>
              </span>
              <br />Construction Projects
            </h1>

            <p style={{ fontSize: 18, color: C.muted, maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
              Connect private clients with verified contractors. Post projects, receive competitive bids, and manage payments — all in real time.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 14, paddingTop: 8 }}>
              <button
                onClick={onPostProject}
                onMouseEnter={() => setHovPost(true)}
                onMouseLeave={() => setHovPost(false)}
                className="bb-corner"
                style={{
                  backgroundColor: hovPost ? C.dark : C.brown,
                  color: C.cream, border: 'none', borderRadius: 100,
                  padding: '16px 32px', fontWeight: 700, fontSize: 15,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: hovPost ? '0 4px 20px rgba(122,62,15,0.4)' : '0 2px 10px rgba(122,62,15,0.25)',
                  transition: 'background-color 0.15s, box-shadow 0.15s',
                }}
              >
                Post a Project
                <span className={`bb-arrow${hovPost ? ' bb-arrow-moved' : ''}`}><ArrowRight size={18} /></span>
              </button>

              <button
                onClick={onBrowse}
                onMouseEnter={() => setHovBrowse(true)}
                onMouseLeave={() => setHovBrowse(false)}
                style={{
                  backgroundColor: hovBrowse ? 'rgba(199,122,44,0.3)' : 'rgba(199,122,44,0.2)',
                  color: C.brown,
                  border: '1px solid rgba(199,122,44,0.5)',
                  borderRadius: 100, padding: '16px 32px',
                  fontWeight: 700, fontSize: 15,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: 'pointer', transition: 'background-color 0.15s',
                }}
              >
                Browse as Contractor
              </button>
            </div>

          </div>

          {/* Right — Bid panel */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -20, left: -8, ...mono, fontSize: 11, color: `${C.brown}66` }}>FIG. A</div>
            <div style={{ position: 'absolute', bottom: -20, right: 0, ...mono, fontSize: 11, color: `${C.brown}66` }}>SCALE: 1:100</div>
            <div className="bb-corner" style={{
              backgroundColor: C.surface, border: `2px solid ${C.brown}`,
              borderRadius: 2, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(26,10,0,0.18)', position: 'relative',
            }}>
              {/* header */}
              <div style={{
                backgroundColor: C.brown, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `2px solid ${C.dark}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.surface, ...mono, fontSize: 13, fontWeight: 700 }}>
                  <Activity size={14} />LIVE BID ACTIVITY
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0.3, 0.3, 0.3].map((op, i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: `rgba(250,245,236,${op})` }} />
                  ))}
                </div>
              </div>

              {/* item 1 — animated flash */}
              <div className="bb-ticker-highlight" style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono, fontSize: 11, fontWeight: 700, color: C.success, backgroundColor: `${C.success}18`, padding: '3px 8px', borderRadius: 2 }}>
                    <CheckCircle2 size={11} /> BID RECEIVED
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: C.muted }}>Just now</span>
                </div>
                <div style={{ ...display, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>Quezon City Office Renovation</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={13} /> 4 bids total</span>
                  <span style={{ ...mono, fontWeight: 700, fontSize: 18, color: C.brown }}>₱2.4M</span>
                </div>
              </div>

              {/* item 2 */}
              <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, backgroundColor: `${C.cream}55` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono, fontSize: 11, fontWeight: 700, color: C.amber, backgroundColor: `${C.amber}22`, padding: '3px 8px', borderRadius: 2 }}>
                    <Activity size={11} /> NEW PROJECT
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: C.muted }}>2m ago</span>
                </div>
                <div style={{ ...display, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>Makati Residential Build</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Budget Est.</span>
                  <span style={{ ...mono, fontWeight: 700, fontSize: 17, color: C.text }}>₱8.5M – ₱10M</span>
                </div>
              </div>

              {/* item 3 */}
              <div style={{ padding: 16, backgroundColor: `${C.cream}55`, opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono, fontSize: 11, fontWeight: 700, color: C.success, backgroundColor: `${C.success}18`, padding: '3px 8px', borderRadius: 2 }}>
                    <CheckCircle2 size={11} /> BID RECEIVED
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: C.muted }}>15m ago</span>
                </div>
                <div style={{ ...display, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>Cebu Warehouse Extension</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={13} /> 12 bids total</span>
                  <span style={{ ...mono, fontWeight: 700, fontSize: 18, color: C.brown }}>₱15.2M</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Stats Band ─────────────────────────────────────────────────────
function StatsBand() {
  const stats = [
    { value: '500+',   label: 'Verified Contractors',  id: '01' },
    { value: '1,200+', label: 'Projects Posted',        id: '02' },
    { value: '₱2.4B+', label: 'Project Value Awarded',  id: '03' },
    { value: '17',     label: 'Regions Covered',        id: '04' },
  ];
  return (
    <section className="bb-blueprint-dark" style={{
      backgroundColor: C.brown,
      borderTop: `4px solid ${C.dark}`, borderBottom: `4px solid ${C.dark}`,
      padding: '64px 32px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32 }}>
        {stats.map((s) => (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ ...mono, fontSize: 10, color: `${C.amber}88`, letterSpacing: '0.08em', marginBottom: 12 }}>MK.{s.id}</div>
            <div style={{ ...mono, fontSize: 44, fontWeight: 700, color: C.surface, letterSpacing: '-0.02em', marginBottom: 10 }}>{s.value}</div>
            <div style={{ width: 64, height: 1, backgroundColor: `${C.amber}66`, marginBottom: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0,   top: -3, width: 1, height: 7, backgroundColor: `${C.amber}66` }} />
              <div style={{ position: 'absolute', right: 0,  top: -3, width: 1, height: 7, backgroundColor: `${C.amber}66` }} />
              <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 4, backgroundColor: `${C.amber}66` }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: `${C.cream}cc`, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features ───────────────────────────────────────────────────────
function Features() {
  const [hovCard, setHovCard] = useState(null);
  const features = [
    { icon: <Building2 size={22} />,     title: 'Post Projects Easily', desc: 'Clients post detailed projects with blueprints, budgets, and deadlines in minutes.',   ref: 'F-01' },
    { icon: <ClipboardList size={22} />, title: 'Competitive Bidding',  desc: 'Contractors submit their best bids. Clients compare proposals side-by-side.',           ref: 'F-02' },
    { icon: <Zap size={22} />,           title: 'Live Updates',         desc: 'Bid counts and notifications update in real time — no page refresh needed.',             ref: 'F-03' },
    { icon: <Shield size={22} />,        title: 'Verified Contractors', desc: 'Every contractor is PCAB-verified and admin-approved before they can bid.',              ref: 'F-04' },
    { icon: <DollarSign size={22} />,    title: 'Milestone Payments',   desc: 'Release payments by milestone with full transaction history and proof uploads.',         ref: 'F-05' },
    { icon: <Star size={22} />,          title: 'Reviews & Ratings',    desc: 'Build trust through project reviews. Top contractors rise to the top.',                  ref: 'F-06' },
  ];
  return (
    <section style={{ backgroundColor: C.cream, padding: '88px 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Platform Capabilities</div>
          <h2 style={{ ...display, fontSize: 48, fontWeight: 800, color: C.text, margin: '0 0 20px', letterSpacing: '-0.02em' }}>Everything You Need</h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            A complete platform for private construction bidding in the Philippines, engineered for transparency and efficiency.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {features.map((f, i) => {
            const hov = hovCard === i;
            return (
              <div
                key={f.ref}
                className="bb-corner"
                onMouseEnter={() => setHovCard(i)}
                onMouseLeave={() => setHovCard(null)}
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${hov ? C.brown : C.border}`,
                  borderRadius: 2, padding: '32px 28px',
                  position: 'relative',
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
              >
                {/* REF */}
                <div style={{
                  position: 'absolute', top: 14, right: 16,
                  ...mono, fontSize: 10, letterSpacing: '0.06em',
                  color: hov ? 'rgba(122,62,15,0.45)' : C.border,
                  transition: 'color 0.2s',
                }}>REF: {f.ref}</div>

                {/* Icon + hatched shadow */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                  <div style={{
                    width: 48, height: 48, backgroundColor: C.cream,
                    border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.brown, position: 'relative', zIndex: 1,
                  }}>{f.icon}</div>
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 48, height: 48, zIndex: 0,
                    border: `1px solid ${C.brown}33`,
                    backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(122,62,15,0.1) 2px,rgba(122,62,15,0.1) 4px)',
                    transform: hov ? 'translate(4px,4px)' : 'translate(0,0)',
                    transition: 'transform 0.2s',
                  }} />
                </div>

                <h3 style={{ ...display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: <FileText size={24} />,   title: 'Post Project',   desc: 'Post your project with budget, specs, and bid deadline.',     num: '01' },
    { icon: <Hammer size={24} />,     title: 'Receive Bids',   desc: 'Browse and submit competitive bids with proposals.',          num: '02' },
    { icon: <Trophy size={24} />,     title: 'Award Contract', desc: 'Compare bids, review profiles, and award the contract.',     num: '03' },
    { icon: <CreditCard size={24} />, title: 'Track & Pay',    desc: 'Track progress and release payments by milestone.',          num: '04' },
  ];
  return (
    <section className="bb-blueprint" style={{
      backgroundColor: C.surface,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      padding: '88px 32px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <h2 style={{ ...display, fontSize: 48, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: '0 0 12px' }}>How It Works</h2>
          <p style={{ ...mono, fontSize: 13, color: C.muted, margin: 0 }}>From posting to payment in 4 simple steps // PROCESS FLOW</p>
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
          {/* dashed connector */}
          <div style={{ position: 'absolute', top: 48, left: '12%', right: '12%', borderTop: `2px dashed ${C.brown}44` }} />
          {steps.map((step) => (
            <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="bb-corner" style={{
                width: 96, height: 96, backgroundColor: C.cream,
                border: `2px solid ${C.brown}`, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.brown, marginBottom: 24, position: 'relative', zIndex: 1,
                boxShadow: '2px 2px 0 rgba(122,62,15,0.1)',
              }}>
                {step.icon}
                <div style={{
                  position: 'absolute', top: -12, right: -12,
                  backgroundColor: C.surface, border: `1px solid ${C.brown}`,
                  padding: '2px 6px',
                  ...mono, fontSize: 9, fontWeight: 700, color: C.brown, letterSpacing: '0.06em',
                }}>STP.{step.num}</div>
              </div>
              <h3 style={{ ...display, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: C.muted, maxWidth: 200, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────────
function CTA({ onSignUp }) {
  const [hov, setHov] = useState(false);
  return (
    <section className="bb-blueprint-dark" style={{
      backgroundColor: C.brown, padding: '96px 32px',
      textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div className="bb-caution" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6 }} />
      <div style={{
        position: 'absolute', right: -40, bottom: -40,
        ...display, fontSize: 200, fontWeight: 800,
        color: `${C.dark}66`, lineHeight: 1,
        pointerEvents: 'none', userSelect: 'none',
      }}>PH</div>
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{ ...display, fontSize: 52, fontWeight: 800, color: C.surface, marginBottom: 20, letterSpacing: '-0.025em' }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: 18, color: `${C.cream}cc`, margin: '0 auto 40px', maxWidth: 520, lineHeight: 1.7 }}>
          Join hundreds of clients and contractors already using BuildBid PH to streamline their construction projects.
        </p>
        <button
          onClick={onSignUp}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          className="bb-corner"
          style={{
            backgroundColor: hov ? C.surface : C.amber,
            color: hov ? C.brown : '#3D1500',
            border: 'none', borderRadius: 100,
            padding: '18px 48px', fontWeight: 700, fontSize: 17,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          Create Free Account
          <span className={`bb-arrow${hov ? ' bb-arrow-moved' : ''}`}><ArrowRight size={20} /></span>
        </button>
        <div style={{ marginTop: 24, ...mono, fontSize: 11, color: `${C.cream}55`, letterSpacing: '0.1em' }}>
          SECURE PLATFORM // PCAB VERIFIED CONTRACTORS ONLY
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────
function FooterLink({ label }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href="#"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...mono, fontSize: 12, fontWeight: 600,
        color: hov ? C.amber : 'rgba(250,245,236,0.5)',
        textDecoration: 'none',
        transition: 'color 0.15s',
      }}
    >
      {label}
    </a>
  );
}

function Footer() {
  return (
    <footer style={{ backgroundColor: C.dark, borderTop: `4px solid ${C.amber}`, padding: '56px 32px 28px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <Logo isDark />
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {['TERMS', 'PRIVACY', 'CONTACT'].map((l) => <FooterLink key={l} label={l} />)}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(250,245,236,0.08)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...mono, fontSize: 11, color: 'rgba(250,245,236,0.35)', margin: 0 }}>
            © 2026 BuildBid PH. Private Construction Bidding Platform for the Philippines.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: C.cream }}>
      <Navbar  onSignIn={() => navigate('/login')}   onSignUp={() => navigate('/signup')} />
      <Hero    onPostProject={() => navigate('/signup')} onBrowse={() => navigate('/signup')} />
      <StatsBand />
      <Features />
      <HowItWorks />
      <CTA     onSignUp={() => navigate('/signup')} />
      <Footer />
    </div>
  );
}
