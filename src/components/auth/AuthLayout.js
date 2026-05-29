import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const C = { brown: '#7A3E0F', dark: '#4A2509', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355' };
const mono    = { fontFamily: "'JetBrains Mono', monospace" };
const display = { fontFamily: "'Bricolage Grotesque', sans-serif" };

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" fill="#FAF5EC" stroke="#7A3E0F" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M16 2L16 16M16 16L30 9M16 16L2 9" stroke="#7A3E0F" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 12.5L16 16.5L24 12.5" stroke="#C77A2C" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 17.5L16 21.5L24 17.5" stroke="#C77A2C" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
      <span style={{ ...display, fontWeight: 800, fontSize: 18, color: C.text }}>
        BuildBid <span style={{ color: C.amber }}>PH</span>
      </span>
    </div>
  );
}

// ── Construction blueprint canvas (dark variant) ───────────────────
function BlueprintCanvas({ mouseRef }) {
  const canvasRef = useRef(null);
  const nodesRef  = useRef([]);
  const frameRef  = useRef(null);
  const measRef   = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const SPACING   = 56;
    const REPEL     = 170;
    const BEAM_DIST = SPACING * 1.6;
    let W = 0, H = 0;

    const build = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width  = rect.width;
      H = canvas.height = rect.height;
      const nodes = [];
      let idx = 0;
      for (let x = SPACING; x < W; x += SPACING)
        for (let y = SPACING; y < H; y += SPACING)
          nodes.push({ ox: x, oy: y, x, y, vx: 0, vy: 0, id: `PT-${String(++idx).padStart(2,'0')}` });
      nodesRef.current = nodes;
      measRef.current  = Array.from({ length: nodes.length * 4 }, (_, i) =>
        `${(2.5 + (i * 1.37) % 14).toFixed(1)} m`);
    };

    const drawCrosshair = (x, y, size, alpha, amber) => {
      ctx.save();
      ctx.strokeStyle = `rgba(250,245,236,${alpha})`;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke();
      if (amber > 0.05) {
        const s = 2.5;
        ctx.fillStyle = `rgba(199,122,44,${amber})`;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
      ctx.restore();
    };

    const drawBeam = (ax, ay, bx, by, alpha, dashed) => {
      ctx.save();
      ctx.strokeStyle = `rgba(250,245,236,${alpha})`;
      ctx.lineWidth   = alpha > 0.25 ? 1.1 : 0.6;
      if (dashed) ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const drawDimension = (ax, ay, bx, by, label, alpha) => {
      if (alpha < 0.05) return;
      ctx.save();
      ctx.strokeStyle  = `rgba(199,122,44,${alpha})`;
      ctx.fillStyle    = `rgba(199,122,44,${alpha})`;
      ctx.lineWidth    = 0.8;
      ctx.font         = `700 9px "JetBrains Mono", monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) { ctx.restore(); return; }
      const nx = -dy / len, ny = dx / len;
      const off = 14;
      const x1 = ax + nx * off, y1 = ay + ny * off;
      const x2 = bx + nx * off, y2 = by + ny * off;

      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const ux = dx / len, uy = dy / len, ts = 5;
      ctx.beginPath(); ctx.moveTo(x1 - ux * ts, y1 - uy * ts); ctx.lineTo(x1 + ux * ts, y1 + uy * ts); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - ux * ts, y2 - uy * ts); ctx.lineTo(x2 + ux * ts, y2 + uy * ts); ctx.stroke();

      const mx2 = (x1 + x2) / 2, my2 = (y1 + y2) / 2;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = `rgba(74,37,9,${alpha * 0.9})`;
      ctx.fillRect(mx2 - tw / 2 - 3, my2 - 6, tw + 6, 12);
      ctx.fillStyle = `rgba(199,122,44,${alpha})`;
      ctx.fillText(label, mx2, my2);
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const { x: mx, y: my } = mouseRef.current;

      // Blueprint grid
      ctx.save();
      ctx.strokeStyle = 'rgba(250,245,236,0.05)';
      ctx.lineWidth   = 1;
      for (let x = 0; x <= W; x += SPACING) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += SPACING) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Cursor glow
      if (mx > 0) {
        const grd = ctx.createRadialGradient(mx, my, 0, mx, my, REPEL * 2);
        grd.addColorStop(0,    'rgba(199,122,44,0.22)');
        grd.addColorStop(0.45, 'rgba(199,122,44,0.07)');
        grd.addColorStop(1,    'rgba(199,122,44,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // Physics
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
        n.vx *= 0.78; n.vy *= 0.78;
        n.x  += n.vx;  n.y  += n.vy;
      });

      const CURSOR_RANGE = REPEL * 2.2;
      const active = nodes.filter(n =>
        Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2) < CURSOR_RANGE
      );

      // Beams
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          const dist = Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
          if (dist > BEAM_DIST) continue;
          const tA = Math.max(0, 1 - Math.sqrt((a.x-mx)**2+(a.y-my)**2) / CURSOR_RANGE);
          const tB = Math.max(0, 1 - Math.sqrt((b.x-mx)**2+(b.y-my)**2) / CURSOR_RANGE);
          const t  = (tA + tB) / 2;
          const cl = 1 - dist / BEAM_DIST;
          const alpha = t * cl * 0.5;
          const dashed = (Math.round(a.ox / SPACING) + Math.round(a.oy / SPACING)) % 2 === 0;
          drawBeam(a.x, a.y, b.x, b.y, alpha, dashed);
          if (t > 0.35 && cl > 0.5) {
            const s = 2;
            ctx.fillStyle = `rgba(199,122,44,${(t-0.35)*0.8})`;
            ctx.fillRect((a.x+b.x)/2-s, (a.y+b.y)/2-s, s*2, s*2);
          }
        }
      }

      // Triangle fills
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i+1; j < active.length; j++) {
          const b = active[j];
          if (Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2) > BEAM_DIST) continue;
          for (let k = j+1; k < active.length; k++) {
            const c = active[k];
            if (Math.sqrt((b.x-c.x)**2+(b.y-c.y)**2) > BEAM_DIST) continue;
            if (Math.sqrt((a.x-c.x)**2+(a.y-c.y)**2) > BEAM_DIST) continue;
            const tAvg = [a,b,c].reduce((s,n) => s + Math.max(0, 1 - Math.sqrt((n.x-mx)**2+(n.y-my)**2)/CURSOR_RANGE), 0) / 3;
            ctx.fillStyle = `rgba(199,122,44,${tAvg * 0.08})`;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.closePath(); ctx.fill();
          }
        }
      }

      // Dimension to nearest node
      if (mx > 0 && active.length > 0) {
        let nearest = active[0], nearDist = Infinity;
        active.forEach(n => {
          const d = Math.sqrt((n.x-mx)**2+(n.y-my)**2);
          if (d < nearDist) { nearDist = d; nearest = n; }
        });
        if (nearDist > 20 && nearDist < REPEL * 1.4) {
          const t = Math.max(0, 1 - nearDist / (REPEL * 1.4));
          const idx = nodes.indexOf(nearest);
          drawDimension(mx, my, nearest.x, nearest.y, measRef.current[idx] || '8.0 m', t * 0.9);
        }
      }

      // Crosshair markers
      nodes.forEach(n => {
        const d2    = Math.sqrt((n.x-mx)**2+(n.y-my)**2);
        const t     = Math.max(0, 1 - d2 / (REPEL * 1.6));
        const size  = 4 + t * 7;
        const alpha = 0.08 + t * 0.55;
        const amber = t > 0.25 ? (t-0.25) * 0.9 : 0;
        drawCrosshair(n.x, n.y, size, alpha, amber);
        if (t > 0.55) {
          ctx.save();
          ctx.font      = `600 8px "JetBrains Mono", monospace`;
          ctx.fillStyle = `rgba(250,245,236,${(t-0.55)*1.5})`;
          ctx.textAlign = 'left';
          ctx.fillText(n.id, n.x + size + 3, n.y - size - 1);
          ctx.restore();
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    build(); draw();
    const ro = new ResizeObserver(build);
    ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(frameRef.current); ro.disconnect(); };
  }, [mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

// ── Layout ─────────────────────────────────────────────────────────
export function AuthLayout({ children, title, subtitle }) {
  const [hovBack, setHovBack] = useState(false);
  const mouseRef   = useRef({ x: -9999, y: -9999 });
  const panelRef   = useRef(null);

  const handleMouseMove = (e) => {
    const rect = panelRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const handleMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: C.cream, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── LEFT: form panel ── */}
      <div style={{ width: '45%', minWidth: 420, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
        <div className="bb-blueprint" style={{ position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none' }} />

        <div style={{ padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <Link to="/" style={{ textDecoration: 'none' }}><Logo /></Link>
          <Link to="/"
            onMouseEnter={() => setHovBack(true)}
            onMouseLeave={() => setHovBack(false)}
            style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: hovBack ? C.brown : C.muted, textDecoration: 'none', transition: 'color 0.15s' }}>
            ← BACK TO HOME
          </Link>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 48px 48px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <h1 style={{ ...display, fontSize: 32, fontWeight: 800, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>{subtitle}</p>
            {children}
          </div>
        </div>
      </div>

      {/* ── RIGHT: interactive brand panel ── */}
      <div
        ref={panelRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          flex: 1, height: '100%', backgroundColor: C.brown,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '56px 64px', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Interactive canvas — behind everything */}
        <BlueprintCanvas mouseRef={mouseRef} />

        {/* Caution stripe — right edge */}
        <div className="bb-caution" style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', zIndex: 1 }} />

        {/* Top content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="bb-corner-tl" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(199,122,44,0.4)', borderRadius: 2,
            padding: '6px 14px', backgroundColor: 'rgba(74,37,9,0.5)',
            ...mono, fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: '0.1em',
            marginBottom: 32, position: 'relative',
          }}>
            <Shield size={12} />SECURE BIDDING ENVIRONMENT
          </div>
          <h2 style={{ ...display, fontSize: 48, fontWeight: 800, color: C.cream, lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: 480, margin: 0 }}>
            Build with confidence. Bid with precision.
          </h2>
        </div>

        {/* Bottom content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 480, marginBottom: 48 }}>
            <div className="bb-corner-tl" style={{ backgroundColor: 'rgba(74,37,9,0.7)', border: '1px solid rgba(199,122,44,0.3)', padding: 24, borderRadius: 2, position: 'relative', backdropFilter: 'blur(4px)' }}>
              <div style={{ ...mono, fontSize: 32, fontWeight: 700, color: C.surface, marginBottom: 6 }}>₱2.4B+</div>
              <div style={{ ...mono, fontSize: 10, color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Project Value Awarded</div>
            </div>
            <div className="bb-corner-br" style={{ backgroundColor: 'rgba(74,37,9,0.7)', border: '1px solid rgba(199,122,44,0.3)', padding: 24, borderRadius: 2, position: 'relative', backdropFilter: 'blur(4px)' }}>
              <div style={{ ...mono, fontSize: 32, fontWeight: 700, color: C.surface, marginBottom: 6 }}>100%</div>
              <div style={{ ...mono, fontSize: 10, color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PCAB Verified Contractors</div>
            </div>
          </div>
          <div style={{ opacity: 0.25, textAlign: 'right' }}>
            <div style={{ ...mono, fontSize: 12, color: C.surface, marginBottom: 8 }}>ELEVATION A-1</div>
            <svg width="180" height="90" viewBox="0 0 200 100" fill="none">
              <path d="M10 90L10 10L190 10L190 90" stroke="#FAF5EC" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M10 50L190 50" stroke="#FAF5EC" strokeWidth="1"/>
              <path d="M100 10L100 90" stroke="#FAF5EC" strokeWidth="1"/>
              <circle cx="100" cy="50" r="4" fill="#FAF5EC"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
