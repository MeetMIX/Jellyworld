'use client';

import { useState, useEffect, useRef } from "react";

interface MediaStream {
  Type: string;
  Index: number;
  Codec?: string;
  DisplayTitle?: string;
  Width?: number;
  Height?: number;
  IsDefault?: boolean;
  Language?: string;
}

interface Version {
  Id: string;
  Name: string;
  MediaStreams?: MediaStream[];
  Path?: string;
}

interface PlayerModalProps {
  itemId: string;
  itemName: string;
  versions: Version[];
  onClose: () => void;
}

const JELLYFIN_PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
const TOKEN = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

export default function PlayerModal({ itemId, itemName, versions, onClose }: PlayerModalProps) {
  const [selectedVersion, setSelectedVersion] = useState(versions[0]);
  const [selectedAudio, setSelectedAudio] = useState<number>(-1);
  const [selectedSub, setSelectedSub] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const videoStreams = selectedVersion?.MediaStreams?.filter(s => s.Type === "Video") ?? [];
  const audioStreams = selectedVersion?.MediaStreams?.filter(s => s.Type === "Audio") ?? [];
  const subStreams = selectedVersion?.MediaStreams?.filter(s => s.Type === "Subtitle") ?? [];

  // Init audio/sub defaults quand la version change
  useEffect(() => {
    const defaultAudio = audioStreams.find(s => s.IsDefault)?.Index ?? audioStreams[0]?.Index ?? -1;
    const defaultSub = subStreams.find(s => s.IsDefault)?.Index ?? -1;
    setSelectedAudio(defaultAudio);
    setSelectedSub(defaultSub);
  }, [selectedVersion]);

  function buildStreamUrl() {
    const params = new URLSearchParams({
      api_key: TOKEN,
      mediaSourceId: selectedVersion.Id,
      videoCodec: "h264",
      audioCodec: "aac",
      ...(selectedAudio >= 0 ? { audioStreamIndex: String(selectedAudio) } : {}),
      ...(selectedSub >= 0 ? { subtitleStreamIndex: String(selectedSub), subtitleMethod: "Encode" } : {}),
    });
    return `${JELLYFIN_PUBLIC}/Videos/${itemId}/stream.m3u8?${params}`;
  }

  async function startPlayback() {
    setPlaying(true);
    // Notifier Jellyfin du début de lecture
    try {
      await fetch(`/api/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "start" }),
      });
    } catch {}
  }

  useEffect(() => {
    if (!playing || !videoRef.current) return;

    const url = buildStreamUrl();

    async function initHls() {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current!);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play();
        });
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari natif
        videoRef.current.src = url;
        videoRef.current.play();
      }
    }

    initHls();

    return () => {
      hlsRef.current?.destroy();
    };
  }, [playing]);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const resLabel = (s: MediaStream) => {
    if (!s.Height) return s.DisplayTitle ?? `Stream ${s.Index}`;
    if (s.Height >= 2160) return `4K ${s.Codec?.toUpperCase() ?? ""}`;
    if (s.Height >= 1080) return `1080p ${s.Codec?.toUpperCase() ?? ""}`;
    if (s.Height >= 720)  return `720p ${s.Codec?.toUpperCase() ?? ""}`;
    return `${s.Height}p`;
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      {!playing ? (
        /* ── Sélecteur avant lecture ── */
        <div style={{
          width: "100%", maxWidth: 520,
          background: "var(--jw-surface)",
          border: "1px solid var(--jw-border)",
          borderRadius: "var(--jw-r-xl)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--jw-border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--jw-purple)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
                Lancer la lecture
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--jw-text-1)", margin: 0, lineHeight: 1.2 }}>
                {itemName}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--jw-text-3)", cursor: "pointer", fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Version (si plusieurs fichiers) */}
            {versions.length > 1 && (
              <div>
                <label style={labelStyle}>Version</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {versions.map(v => (
                    <button key={v.Id} onClick={() => setSelectedVersion(v)} style={{
                      ...optionBtn,
                      background: selectedVersion.Id === v.Id ? "rgba(107,47,217,0.2)" : "var(--jw-card)",
                      border: `1px solid ${selectedVersion.Id === v.Id ? "rgba(107,47,217,0.5)" : "var(--jw-border)"}`,
                      color: selectedVersion.Id === v.Id ? "#fff" : "var(--jw-text-2)",
                    }}>
                      <span style={{ fontWeight: 600 }}>{v.Name}</span>
                      {v.MediaStreams?.find(s => s.Type === "Video") && (
                        <span style={{ fontSize: 11, color: selectedVersion.Id === v.Id ? "#A06EF0" : "var(--jw-text-3)" }}>
                          {resLabel(v.MediaStreams.find(s => s.Type === "Video")!)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qualité vidéo info */}
            {videoStreams.length > 0 && (
              <div>
                <label style={labelStyle}>Vidéo</label>
                <div style={{ ...infoBox }}>
                  {videoStreams.map(s => (
                    <span key={s.Index} style={{ fontSize: 13, color: "var(--jw-text-1)", fontWeight: 600 }}>
                      {resLabel(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Piste audio */}
            {audioStreams.length > 0 && (
              <div>
                <label style={labelStyle}>Piste audio</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {audioStreams.map(s => (
                    <button key={s.Index} onClick={() => setSelectedAudio(s.Index)} style={{
                      ...optionBtn,
                      background: selectedAudio === s.Index ? "rgba(107,47,217,0.2)" : "var(--jw-card)",
                      border: `1px solid ${selectedAudio === s.Index ? "rgba(107,47,217,0.5)" : "var(--jw-border)"}`,
                      color: selectedAudio === s.Index ? "#fff" : "var(--jw-text-2)",
                    }}>
                      <span style={{ fontWeight: 600 }}>{s.DisplayTitle ?? `Piste ${s.Index}`}</span>
                      {s.IsDefault && <span style={{ fontSize: 10, color: "#A06EF0", background: "rgba(107,47,217,0.15)", borderRadius: 4, padding: "1px 6px" }}>Défaut</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sous-titres */}
            <div>
              <label style={labelStyle}>Sous-titres</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => setSelectedSub(-1)} style={{
                  ...optionBtn,
                  background: selectedSub === -1 ? "rgba(107,47,217,0.2)" : "var(--jw-card)",
                  border: `1px solid ${selectedSub === -1 ? "rgba(107,47,217,0.5)" : "var(--jw-border)"}`,
                  color: selectedSub === -1 ? "#fff" : "var(--jw-text-2)",
                }}>
                  <span style={{ fontWeight: 600 }}>Aucun</span>
                </button>
                {subStreams.map(s => (
                  <button key={s.Index} onClick={() => setSelectedSub(s.Index)} style={{
                    ...optionBtn,
                    background: selectedSub === s.Index ? "rgba(107,47,217,0.2)" : "var(--jw-card)",
                    border: `1px solid ${selectedSub === s.Index ? "rgba(107,47,217,0.5)" : "var(--jw-border)"}`,
                    color: selectedSub === s.Index ? "#fff" : "var(--jw-text-2)",
                  }}>
                    <span style={{ fontWeight: 600 }}>{s.DisplayTitle ?? s.Language ?? `Sous-titre ${s.Index}`}</span>
                    {s.IsDefault && <span style={{ fontSize: 10, color: "#A06EF0", background: "rgba(107,47,217,0.15)", borderRadius: 4, padding: "1px 6px" }}>Défaut</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton lancer */}
            <button onClick={startPlayback} style={{
              padding: "13px", borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)", border: "none",
              fontSize: 14, fontWeight: 700, color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 4,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Lancer la lecture
            </button>
          </div>
        </div>
      ) : (
        /* ── Player vidéo ── */
        <div style={{
          width: "100%", maxWidth: "min(95vw, 1280px)",
          background: "#000",
          borderRadius: "var(--jw-r-lg)",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}>
          {/* Barre titre */}
          <div style={{
            padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "rgba(0,0,0,0.6)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{itemName}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
          </div>
          <video
            ref={videoRef}
            controls
            style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }}
          />
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--jw-text-3)",
  textTransform: "uppercase", letterSpacing: "0.1em",
  display: "block", marginBottom: 8,
};
const optionBtn: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  borderRadius: "var(--jw-r-md)", cursor: "pointer",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 8, textAlign: "left", transition: "all 0.15s",
  fontSize: 13,
};
const infoBox: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--jw-card)",
  border: "1px solid var(--jw-border)",
  borderRadius: "var(--jw-r-md)",
  display: "flex", gap: 8, flexWrap: "wrap",
};
