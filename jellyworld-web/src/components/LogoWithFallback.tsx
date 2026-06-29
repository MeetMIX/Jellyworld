'use client';
import { useState } from "react";

export default function LogoWithFallback({ logoUrl, itemName }: { logoUrl: string; itemName: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <h1 style={{
        fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900,
        letterSpacing: "-0.02em", lineHeight: 1.05,
        color: "#fff", margin: "0 0 14px", textTransform: "uppercase",
      }}>
        {itemName}
      </h1>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={itemName}
      onError={() => setFailed(true)}
      style={{
        maxHeight: 100, maxWidth: 400,
        width: "auto", objectFit: "contain",
        display: "block", marginBottom: 14,
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
      }}
    />
  );
}
