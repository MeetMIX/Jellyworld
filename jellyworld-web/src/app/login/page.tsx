'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Erreur de connexion");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--jw-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Fond dégradé décoratif */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 30% 40%, rgba(107,47,217,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(228,48,80,0.1) 0%, transparent 55%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        padding: "0 24px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.png" alt="JellyWorld"
            style={{ height: 64, width: "auto", display: "inline-block", objectFit: "contain" }} />
        </div>

        {/* Card */}
        <div style={{
          background: "var(--jw-surface)",
          border: "1px solid var(--jw-border)",
          borderRadius: "var(--jw-r-xl)",
          padding: "36px 32px",
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--jw-text-1)", margin: "0 0 6px", textAlign: "center" }}>
            Connexion
          </h1>
          <p style={{ fontSize: 13, color: "var(--jw-text-3)", textAlign: "center", margin: "0 0 28px" }}>
            Entrez vos identifiants Jellyfin
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--jw-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                Utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                  borderRadius: "var(--jw-r-md)", fontSize: 14,
                  color: "var(--jw-text-1)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--jw-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                  borderRadius: "var(--jw-r-md)", fontSize: 14,
                  color: "var(--jw-text-1)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: "#f87171", margin: 0, textAlign: "center" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username}
              style={{
                padding: "12px", borderRadius: "var(--jw-r-md)",
                background: loading ? "rgba(107,47,217,0.4)" : "var(--jw-gradient)",
                border: "none", fontSize: 14, fontWeight: 700,
                color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 11, color: "var(--jw-text-3)", textAlign: "center", marginTop: 16 }}>
          JellyWorld — interface pour Jellyfin
        </p>
      </div>
    </div>
  );
}
