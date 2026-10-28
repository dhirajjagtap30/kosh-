import { useEffect, useState } from "react";

const SEL = [
  ".kw-main .kw-center", ".kw-main .kw-feature > div", ".kw-main .kw-card", ".kw-main .kw-stepcard",
  ".kw-main .kw-strip-grid > div", ".kw-main .kw-step", ".kw-main .kw-tile", ".kw-main .kw-demo",
  ".kw-main .kw-quick a", ".kw-main .kw-banner", ".kw-main .kw-note", ".kw-main .kw-faq details",
  ".kw-main .kw-split > *", ".kw-main .kw-form", ".kw-foot-grid > div",
].join(",");

/* Fades/slides elements in as they scroll into view. Re-runs on every route change. */
export function useReveal(routeKey) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return undefined;
    const all = [...document.querySelectorAll(SEL)];
    const els = all.filter((el) => !(el.parentElement && el.parentElement.closest(SEL))); // skip children of an already-revealed block
    const timers = [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target; io.unobserve(el);
        el.classList.add("rv-in");
        timers.push(setTimeout(() => el.classList.remove("rv", "rv-in"), 1100)); // hand control back to normal hover styles
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => {
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(SEL)) : [];
      el.style.setProperty("--rd", `${Math.min(Math.max(sibs.indexOf(el), 0), 6) * 90}ms`);
      el.classList.add("rv"); io.observe(el);
    });
    return () => { io.disconnect(); timers.forEach(clearTimeout); els.forEach((el) => el.classList.remove("rv", "rv-in")); };
  }, [routeKey]);
}

export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const d = document.documentElement; setP(d.scrollHeight - d.clientHeight > 0 ? d.scrollTop / (d.scrollHeight - d.clientHeight) : 0); };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <div className="kw-progress" aria-hidden="true" style={{ transform: `scaleX(${p})` }} />;
}
