import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { branchService } from "../services";
import { getViewBranch } from "./viewBranch";

/* White-label: every branch is its own brand (name, logo, colours, tagline, optional domain). The brand shown is decided by
   1) the logged-in branch user (or the branch a super admin is viewing), 2) ?branch=<code> in the link (remembered), 3) the website domain, 4) the default brand. */
export const DEFAULT_BRAND = { id: 0, code: "", name: "", city: "", brandName: "Sahyadri", instituteName: "Sahyadri Easy Coaching", tagline: "EASY COACHING • JEE • NEET • MHT-CET", logo: "/logo.png", primaryColor: "#2563eb", darkColor: "#0a2463", phone: "", email: "" };
const KEY = "kosh-brand-code";
const Ctx = createContext({ brand: DEFAULT_BRAND, branches: [], ready: true });
let current = DEFAULT_BRAND;
export const currentBrand = () => current; // for non-React code (print windows)

const codeFromLink = () => {
  try {
    const q = new URLSearchParams(window.location.search).get("branch");
    if (q) { if (q === "default") localStorage.removeItem(KEY); else localStorage.setItem(KEY, q.toLowerCase()); }
    return localStorage.getItem(KEY) || "";
  } catch { return ""; }
};

export function BrandProvider({ children }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState(null);
  useEffect(() => { branchService.publicList().then(setBranches).catch(() => setBranches([])); }, []);

  const brand = useMemo(() => {
    const list = branches || [];
    const host = window.location.hostname.toLowerCase();
    let b = null;
    if (user && user.role !== "superadmin" && user.branchId) b = list.find((x) => x.id === user.branchId);
    else if (user && user.role === "superadmin" && getViewBranch()) b = list.find((x) => x.id === getViewBranch());
    if (!b) { const code = codeFromLink(); b = (code && list.find((x) => x.code === code)) || list.find((x) => x.domain && x.domain === host) || null; }
    return b ? { ...DEFAULT_BRAND, ...b, logo: b.logo || "" } : DEFAULT_BRAND;
  }, [branches, user]);

  useEffect(() => {
    current = brand;
    const r = document.documentElement.style;
    if (!brand.id) { ["--brand", "--brand-dark", "--blue", "--navy", "--k-grad", "--brand-soft", "--glass-tint"].forEach((v) => r.removeProperty(v)); document.title = DEFAULT_BRAND.instituteName; return; }
    r.setProperty("--brand", brand.primaryColor);
    r.setProperty("--brand-dark", brand.darkColor);
    r.setProperty("--blue", brand.primaryColor);
    r.setProperty("--navy", brand.darkColor);
    r.setProperty("--k-grad", `linear-gradient(135deg,${brand.darkColor} 0%,${brand.primaryColor} 100%)`);
    r.setProperty("--brand-soft", `color-mix(in srgb, ${brand.primaryColor} 14%, white)`);
    r.setProperty("--glass-tint", `color-mix(in srgb, ${brand.darkColor} 62%, transparent)`);
    document.title = brand.instituteName;
  }, [brand]);

  const value = useMemo(() => ({ brand, branches: branches || [], ready: branches !== null }), [brand, branches]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useBrand = () => useContext(Ctx);

/* Logo image, or round initials in the brand colours when the branch has no logo. */
export function BrandLogo({ size = 54, className = "kw-logo" }) {
  const { brand } = useBrand();
  if (brand.logo) return <img className={className} src={brand.logo} alt={brand.instituteName} width={size} height={size} style={{ objectFit: "contain" }} />;
  return <span className={className} aria-label={brand.instituteName} style={{ width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", background: `linear-gradient(135deg,${brand.darkColor},${brand.primaryColor})`, color: "#fff", fontWeight: 700, fontSize: size * 0.42, border: "2px solid rgba(255,255,255,.5)", flex: "0 0 auto" }}>{brand.brandName.slice(0, 1).toUpperCase()}</span>;
}
