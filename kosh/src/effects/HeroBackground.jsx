import { useEffect, useRef } from "react";

/* Animated "molecule network" that sits on top of the hero background image (public/hero-bg.jpg).
   Nodes drift slowly, link to near neighbours, glow, and react to the mouse. Pauses when off-screen. */
export default function HeroBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LINK = 150, MOUSE = 190;
    let w = 0, h = 0, nodes = [], raf = 0, visible = true;
    const mouse = { x: -9999, y: -9999 };

    const make = () => {
      const count = Math.max(30, Math.min(95, Math.round((w * h) / 15000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.9, p: Math.random() * 6.28, hot: Math.random() < 0.16,
      }));
    };

    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -10 || n.x > w + 10) n.vx *= -1;
          if (n.y < -10 || n.y > h + 10) n.vy *= -1;
          const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130 && d2 > 1) { const d = Math.sqrt(d2); n.x += (dx / d) * 0.9; n.y += (dy / d) * 0.9; } // gently pushed away
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) { ctx.strokeStyle = `rgba(125,211,252,${(1 - d / LINK) * 0.34})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        const mx = a.x - mouse.x, my = a.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < MOUSE) { ctx.strokeStyle = `rgba(165,243,252,${(1 - md / MOUSE) * 0.55})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 700 + n.p);
        if (n.hot) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 16 + pulse * 8);
          g.addColorStop(0, "rgba(125,211,252,.55)"); g.addColorStop(1, "rgba(125,211,252,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 16 + pulse * 8, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = n.hot ? "rgba(224,247,255,.95)" : `rgba(147,197,253,${0.45 + pulse * 0.35})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (n.hot ? 0.8 : 0), 0, 6.283); ctx.fill();
      }
    };

    const loop = (t) => { if (visible) frame(t); raf = requestAnimationFrame(loop); };

    const size = () => {
      const r = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make(); frame(0);
    };

    const move = (e) => { const r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };

    size();
    const ro = new ResizeObserver(size); ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(host);
    host.addEventListener("pointermove", move); host.addEventListener("pointerleave", leave);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }, []);

  return (
    <>
      <div className="kw-hero-bg" aria-hidden="true" />
      <div className="kw-orb o1" aria-hidden="true" /><div className="kw-orb o2" aria-hidden="true" />
      <canvas ref={ref} className="kw-hero-canvas" aria-hidden="true" />
      <div className="kw-hero-veil" aria-hidden="true" />
    </>
  );
}
