'use client';

import { useState } from "react";

interface SafeImageProps {
  src?: string;
  alt: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
}

// <img> qui ne montre jamais d'icône "image cassée" : si la source est vide
// ou que le chargement échoue (média sans affiche sur Jellyfin, URL 404,
// etc.), on bascule sur une carte de repli avec juste le titre — jamais un
// <img> mort à l'écran.
export default function SafeImage({ src, alt, style, loading = "lazy" }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div style={{
        ...style,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 8, background: "var(--jw-card)", color: "var(--jw-text-3)",
        padding: 12, boxSizing: "border-box", textAlign: "center",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/>
        </svg>
        <span style={{
          fontSize: 11, fontWeight: 600, lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        }}>{alt}</span>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} style={style} loading={loading} onError={() => setFailed(true)} />
  );
}
