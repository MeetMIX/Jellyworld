'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HeroItem {
  Id: string; Name: string; Overview?: string;
  ProductionYear?: number; CommunityRating?: number;
  backdropUrl: string; posterUrl: string;
  Genres?: string[];
}

interface HeroCarouselProps {
  items: HeroItem[];
  rotationSeconds?: number; // paramétrable
}

export default function HeroCarousel({ items, rotationSeconds = 15 }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

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

  // Rotation auto
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(next, rotationSeconds * 1000);
    return () => clearInterval(timer);
  }, [paused, next, rotationSeconds, items.length]);

  if (!items.length) return null;
  const item = items[current];

  return (
    <section
      style={{ position: "relative", height: "82vh", minHeight: 480, overflow: "hidden" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop avec transition fade */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        opacity: transitioning ? 0 : 1,
        transition: "opacity 400ms ease",
      }}>
        <img src={item.backdropUrl} alt={item.Name}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.42) contrast(1.05)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--jw-bg) 0%, rgba(7,6,11,0.15) 50%, transparent 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--jw-bg) 0%, rgba(7,6,11,0.5) 45%, transparent 70%)" }} />
      </div>

      {/* Contenu */}
      <div style={{
        position: "relative", zIndex: 1,
        height: "100%",
        display: "flex", alignItems: "flex-end",
        padding: "calc(72px + 24px) 48px 52px",
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

          <h1 style={{
            fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.0,
            color: "#fff", margin: 0, textTransform: "uppercase",
          }}>{item.Name}</h1>

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

          {/* CTA */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <Link href={`/item/${item.Id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)", border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Regarder
            </Link>
            <Link href={`/item/${item.Id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: "var(--jw-r-md)",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
              textTransform: "uppercase", letterSpacing: "0.04em", backdropFilter: "blur(8px)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/>
              </svg>
              Détails
            </Link>
          </div>
        </div>
      </div>

      {/* Dots + timer */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8, zIndex: 2,
      }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
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
        <div key={`${current}-${paused}`} style={{
          height: "100%",
          background: "var(--jw-gradient)",
          animation: paused ? "none" : `progress ${rotationSeconds}s linear forwards`,
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
