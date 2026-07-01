'use client';

import { useEffect, useState } from "react";

// Horloge "givrée" — flotte au même endroit sur toutes les pages (montée une
// fois dans le layout racine). Pas de carte/bordure : juste un halo léger
// derrière le texte pour rester lisible sur n'importe quel fond, sans
// délimitation nette. Heure et date sont centrées l'une par rapport à l'autre.
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

  return (
    <div style={{
      position: "fixed", top: "calc(var(--jw-nav-height) + 20px)", right: 48, zIndex: 90,
      textAlign: "center", pointerEvents: "none",
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.02em", lineHeight: 1.1,
        textShadow: "0 2px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)",
      }}>
        {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.78)",
        textTransform: "capitalize", marginTop: 3,
        textShadow: "0 2px 8px rgba(0,0,0,0.55)",
      }}>
        {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}
