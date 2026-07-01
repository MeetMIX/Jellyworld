'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HeroItem {
  Id: string; Name: string; Overview?: string;
  ProductionYear?: number; CommunityRating?: number;
  backdropUrl: string; posterUrl: string; logoUrl?: string;
  Genres?: string[];
}

interface HeroCarouselProps {
  items: HeroItem[];
  rotationSeconds?: number; // paramétrable
}

// Échantillonne l'image via un <canvas> hors-DOM pour en extraire les 2
// couleurs les plus présentes. Utilise une Image() séparée (jamais celle
// affichée à l'écran) avec crossOrigin, pour ne jamais risquer de casser
// l'affichage du backdrop si le serveur Jellyfin ne renvoie pas d'en-têtes
// CORS — dans ce cas l'extraction échoue silencieusement (canvas "tainted")
// et l'appelant retombe sur le dégradé de marque par défaut.
function extractDominantColors(img: HTMLImageElement): [string, string] | null {
  try {
    const w = 48, h = 27;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h); // jette si canvas "tainted" (CORS)

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 200) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      // on ignore le quasi-noir / quasi-blanc pour privilégier des teintes exploitables
      if (lightness < 22 || lightness > 235) continue;
      const key = `${r >> 5},${g >> 5},${b >> 5}`; // quantisation ~8 niveaux/canal
      const entry = buckets.get(key);
      if (entry) { entry.count++; entry.r += r; entry.g += g; entry.b += b; }
      else buckets.set(key, { count: 1, r, g, b });
    }

    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return null;

    const avg = (e: typeof sorted[0]) => [e.r / e.count, e.g / e.count, e.b / e.count] as const;
    const toHex = (e: typeof sorted[0]) => {
      const [r, g, b] = avg(e).map(Math.round);
      return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
    };
    const dist = (a: typeof sorted[0], b: typeof sorted[0]) => {
      const [ar, ag, ab] = avg(a), [br, bg, bb] = avg(b);
      return Math.hypot(ar - br, ag - bg, ab - bb);
    };

    const c1 = sorted[0];
    const c2 = sorted.find(e => dist(e, c1) > 60) ?? sorted[Math.min(1, sorted.length - 1)];
    return [toHex(c1), toHex(c2)];
  } catch {
    return null;
  }
}

export default function HeroCarousel({ items, rotationSeconds = 15 }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [gradientColors, setGradientColors] = useState<[string, string] | null>(null);
  // null au premier rendu (SSR) puis rempli côté client uniquement, pour
  // éviter un mismatch d'hydratation entre l'heure du serveur et celle du navigateur.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const goTo = useCallback((index: number) => {
    if (index === current) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 400);
  }, [current]);

  const next = useCallback(() => {
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  // Rotation auto — perpétuelle, jamais mise en pause par le survol de la souris.
  // La navigation manuelle via les points (goTo) fait redémarrer le minuteur
  // naturellement puisque l'effet dépend de `current`.
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, rotationSeconds * 1000);
    return () => clearInterval(timer);
  }, [next, rotationSeconds, items.length]);

  // Couleurs dominantes de l'image actuellement affichée, pour teinter les CTA.
  useEffect(() => {
    if (!items.length) return;
    setGradientColors(null);
    const src = items[current]?.backdropUrl;
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setGradientColors(extractDominantColors(img));
    img.onerror = () => setGradientColors(null);
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [current, items]);

  if (!items.length) return null;
  const item = items[current];
  const [c1, c2] = gradientColors ?? [];

  return (
    <section style={{ position: "relative", height: "54vh", minHeight: 400 }}>
      {/* Fond — position fixed : devient l'arrière-plan de toute la page,
          recouvert naturellement plus bas par le contenu opaque (rails, etc.) */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "100vh", zIndex: 0,
        opacity: transitioning ? 0 : 1,
        transition: "opacity 400ms ease",
      }}>
        <img src={item.backdropUrl} alt={item.Name}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.82) contrast(1.03)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--jw-bg) 0%, rgba(7,6,11,0.15) 50%, transparent 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--jw-bg) 0%, rgba(7,6,11,0.5) 45%, transparent 70%)" }} />
      </div>

      {/* Horloge — widget "verre givré", indépendant de la rotation du hero */}
      {now && (
        <div style={{
          position: "absolute", top: "calc(var(--jw-nav-height) + 20px)", right: 48, zIndex: 2,
          padding: "10px 20px", borderRadius: "var(--jw-r-md)", textAlign: "right",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.02em", lineHeight: 1.1 }}>
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.72)", textTransform: "capitalize", marginTop: 3 }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      )}

      {/* Contenu */}
      <div style={{
        position: "relative", zIndex: 1,
        height: "100%",
        display: "flex", alignItems: "flex-end",
        padding: "calc(var(--jw-nav-height) + 24px) 48px 40px",
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(8px)" : "translateY(0)",
        transition: "opacity 400ms ease, transform 400ms ease",
      }}>
        <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#A06EF0", background: "rgba(107,47,217,0.18)",
            border: "1px solid rgba(107,47,217,0.4)",
            borderRadius: "var(--jw-r-sm)", padding: "4px 12px",
            alignSelf: "flex-start",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A06EF0", display: "inline-block",
              animation: "pulse 2s infinite" }} />
            Sorti récemment
          </span>

          {item.logoUrl ? (
            <img src={item.logoUrl} alt={item.Name} style={{
              maxWidth: "100%", width: "auto", maxHeight: 130,
              objectFit: "contain", objectPosition: "left center",
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.55))",
              display: "block",
            }} />
          ) : (
            <h1 style={{
              fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900,
              letterSpacing: "-0.03em", lineHeight: 1.0,
              color: "#fff", margin: 0, textTransform: "uppercase",
            }}>{item.Name}</h1>
          )}

          {/* Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--jw-text-2)" }}>
            {item.ProductionYear && <span>{item.ProductionYear}</span>}
            {item.Genres?.slice(0, 2).map((g, i) => (
              <span key={g} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--jw-text-3)", display: "inline-block" }} />
                {g}
              </span>
            ))}
            {item.CommunityRating && (
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--jw-text-3)", display: "inline-block" }} />
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>★ {item.CommunityRating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Description */}
          {item.Overview && (
            <p style={{
              fontSize: 13, color: "var(--jw-text-2)", lineHeight: 1.7,
              margin: 0, maxWidth: 460,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{item.Overview}</p>
          )}

          {/* CTA — teintés avec les couleurs dominantes de l'image affichée,
              retombent sur le dégradé de marque tant que l'extraction n'a pas
              abouti (ou si le canvas est bloqué par CORS). */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <Link href={`/item/${item.Id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: "var(--jw-r-md)",
              background: c1 && c2 ? `linear-gradient(110deg, ${c1}, ${c2})` : "var(--jw-gradient)",
              border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              textTransform: "uppercase", letterSpacing: "0.04em",
              transition: "background 0.6s ease",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Regarder
            </Link>
            <Link href={`/item/${item.Id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: "var(--jw-r-md)",
              background: c1 ? `${c1}22` : "rgba(255,255,255,0.08)",
              border: `1px solid ${c1 ? `${c1}66` : "rgba(255,255,255,0.12)"}`,
              fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
              textTransform: "uppercase", letterSpacing: "0.04em", backdropFilter: "blur(8px)",
              transition: "background 0.6s ease, border-color 0.6s ease",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/>
              </svg>
              Détails
            </Link>
          </div>
        </div>
      </div>

      {/* Dots + timer — navigation manuelle, jamais interrompue par le survol */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8, zIndex: 2,
      }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Aller à la diapositive ${i + 1}`} style={{
            width: i === current ? 24 : 6,
            height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
            background: i === current
              ? "linear-gradient(110deg, #6B2FD9, #E03050)"
              : "rgba(255,255,255,0.25)",
            transition: "width 300ms ease, background 300ms ease",
          }} />
        ))}
      </div>

      {/* Barre de progression du timer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, zIndex: 2 }}>
        <div key={current} style={{
          height: "100%",
          background: "var(--jw-gradient)",
          animation: `progress ${rotationSeconds}s linear forwards`,
        }} />
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
      `}</style>
    </section>
  );
}
