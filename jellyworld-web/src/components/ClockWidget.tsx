'use client';

import { useEffect, useState } from "react";

// Horloge "givrée" — flotte au même endroit sur toutes les pages (montée une
// fois dans le layout racine). Le flou/fond n'est pas contenu dans un
// rectangle à bordure nette : un masque radial (mask-image) fait fondre le
// halo givré sur ~60px tout autour du texte, pour un dégradé progressif
// plutôt qu'une carte délimitée. Heure et date restent centrées entre elles.
export default function ClockWidget() {
  // null au premier rendu (SSR) puis rempli côté client uniquement, pour
  // éviter un mismatch d'hydratation entre l'heure du serveur et celle du navigateur.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const fadeMask = "radial-gradient(ellipse 70% 75% at center, black 30%, transparent 78%)";

  return (
    <div style={{
      position: "fixed", top: "calc(var(--jw-nav-height) + 20px)", right: 48, zIndex: 90,
      pointerEvents: "none",
    }}>
      {/* Halo givré — bords fondus sur ~60px, pas de rectangle/bordure visible */}
      <div style={{
        position: "absolute", inset: "-60px",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 45%, transparent 78%)",
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
      }} />

      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.02em", lineHeight: 1.1,
          textShadow: "0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.35)",
        }}>
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.82)",
          textTransform: "capitalize", marginTop: 3,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>
    </div>
  );
}
