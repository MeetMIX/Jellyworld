'use client';
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: "var(--jw-r-md)",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
        cursor: "pointer",
      }}
    >
      ← Retour
    </button>
  );
}
