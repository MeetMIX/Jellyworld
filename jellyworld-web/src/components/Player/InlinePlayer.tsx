'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MediaStream { Type: string; Index: number; Codec?: string; DisplayTitle?: string; Width?: number; Height?: number; IsDefault?: boolean; Language?: string; BitRate?: number; }
interface Version { Id: string; Name: string; MediaStreams?: MediaStream[]; Path?: string; }
interface Props { itemId: string; itemName: string; versions: Version[]; resumeTicks?: number; }

export default function InlinePlayer({ itemId, itemName, versions, resumeTicks = 0 }: Props) {
  const router = useRouter();
  const [selVersion, setSelVersion] = useState(versions[0]);
  const [selAudio, setSelAudio] = useState(-1);
  const [selSub, setSelSub] = useState(-1);
  const [savedTicks, setSavedTicks] = useState(resumeTicks);
  const [ungrouping, setUngrouping] = useState(false);

  async function ungroupVersions() {
    if (!confirm("Séparer ces versions groupées ? Chaque fichier réapparaîtra comme un média distinct dans la bibliothèque.")) return;
    setUngrouping(true);
    try {
      const res = await fetch("/api/merge-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      } else {
        alert(`Erreur : ${data.error ?? "séparation impossible"}`);
      }
    } catch {
      alert("Erreur réseau");
    }
    setUngrouping(false);
  }

  const audio = selVersion?.MediaStreams?.filter(s => s.Type === "Audio") ?? [];
  const subs  = selVersion?.MediaStreams?.filter(s => s.Type === "Subtitle") ?? [];
  const video = selVersion?.MediaStreams?.find(s => s.Type === "Video");

  useEffect(() => {
    setSelAudio(audio.find(s => s.IsDefault)?.Index ?? audio[0]?.Index ?? -1);
    setSelSub(subs.find(s => s.IsDefault)?.Index ?? -1);
  }, [selVersion]);

  function launch(startFromBeginning = false) {
    const params = new URLSearchParams({
      versionId: selVersion.Id,
      ...(selAudio >= 0 ? { audioIdx: String(selAudio) } : {}),
      ...(selSub >= 0 ? { subIdx: String(selSub) } : {}),
      ...(!startFromBeginning && savedTicks > 0 ? { startTicks: String(savedTicks) } : {}),
    });
    router.push(`/watch/${itemId}?${params}`);
  }

  const h = video?.Height;
  const ql = h ? h >= 2160 ? "4K UHD" : h >= 1080 ? "1080p FHD" : h >= 720 ? "720p HD" : `${h}p` : null;
  const codec = video?.Codec?.toUpperCase() ?? "";
  const needsTC = !["H264","AVC","AVC1"].includes(codec);
  const hasResume = savedTicks > 0;
  const resumeMin = Math.floor(savedTicks / 10000000 / 60);

  const optStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px", borderRadius: 8, cursor: "pointer",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 13, gap: 8, border: "none", width: "100%", textAlign: "left",
    background: active ? "rgba(107,47,217,0.22)" : "rgba(255,255,255,0.04)",
    color: active ? "#fff" : "var(--jw-text-2)",
    outline: active ? "1px solid rgba(107,47,217,0.45)" : "1px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{
      background: "var(--jw-surface)", border: "1px solid var(--jw-border)",
      borderRadius: "var(--jw-r-xl)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px", borderBottom: "1px solid var(--jw-border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--jw-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--jw-text-1)", margin: 0 }}>Options de lecture</p>
            <p style={{ fontSize: 11, color: "var(--jw-text-3)", margin: 0 }}>Choisissez puis lancez en plein écran</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {ql && <span style={{ fontSize: 11, fontWeight: 700, color: "#A06EF0", background: "rgba(107,47,217,0.15)", border: "1px solid rgba(107,47,217,0.3)", borderRadius: 6, padding: "4px 10px" }}>{ql}</span>}
          <span style={{ fontSize: 11, color: needsTC ? "#f59e0b" : "#4ade80", background: needsTC ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${needsTC ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: 6, padding: "4px 10px" }}>
            {needsTC ? "⚡ Transcodage" : "▶ Direct play"}
          </span>
          {codec && <span style={{ fontSize: 11, color: "var(--jw-text-3)" }}>{codec}</span>}
        </div>
      </div>

      {/* Sélecteurs */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: versions.length > 1 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr auto", gap: 16, alignItems: "start" }}>

        {versions.length > 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <p style={lblS}>Version</p>
              <button onClick={ungroupVersions} disabled={ungrouping} title="Séparer les versions groupées" style={{
                background: "none", border: "none", cursor: ungrouping ? "not-allowed" : "pointer",
                color: "var(--jw-text-3)", fontSize: 10, fontWeight: 700, textDecoration: "underline",
                padding: 0, marginBottom: 8, opacity: ungrouping ? 0.5 : 1,
              }}>
                {ungrouping ? "…" : "Séparer"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {versions.map(v => (
                <button key={v.Id} onClick={() => setSelVersion(v)} style={optStyle(selVersion.Id === v.Id)}>
                  <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.Name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p style={lblS}>Piste audio</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {audio.map(s => (
              <button key={s.Index} onClick={() => setSelAudio(s.Index)} style={optStyle(selAudio === s.Index)}>
                <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.DisplayTitle ?? `Piste ${s.Index}`}</span>
                {s.IsDefault && <span style={{ fontSize: 9, color: "#A06EF0", flexShrink: 0 }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={lblS}>Sous-titres</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => setSelSub(-1)} style={optStyle(selSub === -1)}>
              <span style={{ fontWeight: 600, fontSize: 12 }}>Aucun</span>
            </button>
            {subs.map(s => (
              <button key={s.Index} onClick={() => setSelSub(s.Index)} style={optStyle(selSub === s.Index)}>
                <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.DisplayTitle ?? s.Language ?? `ST ${s.Index}`}</span>
                {s.IsDefault && <span style={{ fontSize: 9, color: "#A06EF0", flexShrink: 0 }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Boutons lecture — l'action principale reprend le style du bouton
            utilisateur de la navbar (fond noir, contour dégradé) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
          {hasResume && (
            <button onClick={() => launch(false)} style={primaryBtnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Reprendre ({resumeMin}min)
            </button>
          )}
          <button onClick={() => launch(hasResume)} style={hasResume ? secondaryBtnStyle : primaryBtnStyle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            {hasResume ? "Depuis le début" : "Regarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bouton principal — même technique que le bouton utilisateur de NavBar.tsx :
// fond noir + contour en dégradé de marque (un vrai gradient sur `border`
// n'existe pas en CSS, d'où le double-background padding-box/border-box).
const primaryBtnStyle: React.CSSProperties = {
  padding: "13px 20px", borderRadius: "var(--jw-r-md)", boxSizing: "border-box",
  border: "3px solid transparent",
  backgroundColor: "#000",
  backgroundImage: "linear-gradient(#000,#000), linear-gradient(110deg, #6B2FD9 0%, #B83FA0 50%, #E03050 100%)",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  whiteSpace: "nowrap",
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: "13px 20px", borderRadius: "var(--jw-r-md)",
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  whiteSpace: "nowrap",
};

const lblS: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--jw-text-3)",
  textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px",
};
