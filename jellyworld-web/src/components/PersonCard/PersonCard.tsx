'use client';
import { useState } from "react";

interface PersonCardProps {
  photoUrl: string;
  name: string;
  role?: string;
}

export default function PersonCard({ photoUrl, name, role }: PersonCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ flexShrink: 0, width: 90, textAlign: "center" }}>
      <div style={{
        width: 90, height: 90, borderRadius: "50%", overflow: "hidden",
        background: "var(--jw-card)", border: "1px solid var(--jw-border)",
        marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!imgError ? (
          <img src={photoUrl} alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ fontSize: 28, opacity: 0.4 }}>👤</span>
        )}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 2px", lineHeight: 1.3 }}>
        {name}
      </p>
      {role && <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0, lineHeight: 1.3 }}>{role}</p>}
    </div>
  );
}
