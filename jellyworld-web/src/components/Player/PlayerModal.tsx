'use client';

import { useState, useEffect, useRef, useCallback } from "react";

interface MediaStream {
  Type: string; Index: number; Codec?: string; DisplayTitle?: string;
  Width?: number; Height?: number; IsDefault?: boolean; Language?: string;
  BitRate?: number; Profile?: string;
}
interface Version {
  Id: string; Name: string; MediaStreams?: MediaStream[]; Path?: string;
}
interface PlayerModalProps {
  itemId: string; itemName: string; versions: Version[]; onClose: () => void;
}

const JELLYFIN_PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
const TOKEN = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

// ── Détection des capacités du navigateur ─────────────────────────────────
function getBrowserCapabilities() {
  if (typeof window === "undefined") return { canPlayH264: true, canPlayH265: false, canPlayAV1: false };
  const v = document.createElement("video");
  return {
    canPlayH264: !!v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    canPlayH265: !!v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.90"') ||
                 !!v.canPlayType('video/mp4; codecs="hev1.1.6.L93.90"'),
    canPlayAV1:  !!v.canPlayType('video/mp4; codecs="av01.0.05M.08"'),
    canPlayVP9:  !!v.canPlayType('video/webm; codecs="vp9"'),
    supportsHLS: !!v.canPlayType("application/vnd.apple.mpegurl"),
  };
}

// ── Construit l'URL de stream optimale pour le navigateur ─────────────────
function buildStreamUrl(itemId: string, version: Version, audioIdx: number, subIdx: number, startTicks = 0) {
  const caps = getBrowserCapabilities();
  const videoStream = version.MediaStreams?.find(s => s.Type === "Video");
  const codec = videoStream?.Codec?.toLowerCase() ?? "";

  // Codecs natifs dans le navigateur → direct stream sans transcoding
  const nativeCodecs = ["h264", "avc", "avc1"];
  const hevcCodecs = ["hevc", "h265", "hvc1", "hev1"];
  const av1Codecs = ["av1", "av01"];
  const vp9Codecs = ["vp9", "vp09"];
  const needsTranscode =
    (hevcCodecs.includes(codec) && !caps.canPlayH265) ||
    (av1Codecs.includes(codec) && !caps.canPlayAV1) ||
    (vp9Codecs.includes(codec) && !caps.canPlayVP9) ||
    (!nativeCodecs.includes(codec) && !hevcCodecs.includes(codec) &&
     !av1Codecs.includes(codec) && !vp9Codecs.includes(codec));

  const baseUrl = `${JELLYFIN_PUBLIC}/Videos/${itemId}`;
  const common = new URLSearchParams({
    api_key: TOKEN,
    mediaSourceId: version.Id,
    ...(startTicks > 0 ? { StartTimeTicks: String(startTicks) } : {}),
    ...(audioIdx >= 0 ? { audioStreamIndex: String(audioIdx) } : {}),
  });

  if (needsTranscode) {
    // Transcoding HLS — Jellyfin convertit en H264+AAC côté serveur
    common.set("videoCodec", "h264");
    common.set("audioCodec", "aac,mp3");
    common.set("videoBitRate", "8000000"); // 8 Mbps max
    common.set("maxVideoBitDepth", "8");
    common.set("requireNonAnamorphic", "false");
    common.set("transcodingMaxAudioChannels", "2");
    common.set("cpuCoreLimit", "4");
    if (subIdx >= 0) {
      common.set("subtitleStreamIndex", String(subIdx));
      common.set("subtitleMethod", "Encode"); // brûler les ST dans la vidéo
    }
    return `${baseUrl}/stream.m3u8?${common}`;
  } else {
    // Direct stream — le navigateur peut lire nativement
    if (subIdx >= 0) {
      common.set("subtitleStreamIndex", String(subIdx));
      common.set("subtitleMethod", "Encode");
    }
    return `${baseUrl}/stream.m3u8?${common}&videoCopyCodec=${codec}`;
  }
}

export default function PlayerModal({ itemId, itemName, versions, onClose }: PlayerModalProps) {
  const [selectedVersion, setSelectedVersion] = useState(versions[0]);
  const [selectedAudio, setSelectedAudio] = useState<number>(-1);
  const [selectedSub, setSelectedSub] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const audioStreams = selectedVersion?.MediaStreams?.filter(s => s.Type === "Audio") ?? [];
  const subStreams   = selectedVersion?.MediaStreams?.filter(s => s.Type === "Subtitle") ?? [];
  const videoStream  = selectedVersion?.MediaStreams?.find(s => s.Type === "Video");

  useEffect(() => {
    const defAudio = audioStreams.find(s => s.IsDefault)?.Index ?? audioStreams[0]?.Index ?? -1;
    const defSub   = subStreams.find(s => s.IsDefault)?.Index ?? -1;
    setSelectedAudio(defAudio);
    setSelectedSub(defSub);
  }, [selectedVersion]);

  const startPlayback = useCallback(async () => {
    setLoading(true); setError("");
    try {
      await fetch("/api/playback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, action: "start" }) });
    } catch {}
    setPlaying(true);
    setLoading(false);
  }, [itemId]);

  // Init HLS.js avec tous les codecs
  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const url = buildStreamUrl(itemId, selectedVersion, selectedAudio, selectedSub);

    async function initPlayer() {
      if (!videoRef.current) return;
      const Hls = (await import("hls.js")).default;

      // Nettoyer instance précédente
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          progressive: true,
          // Retry agressif
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          levelLoadingRetryDelay: 1000,
          fragLoadingRetryDelay: 1000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setError("Erreur réseau — vérifiez que Jellyfin est accessible");
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // Tenter de récupérer
              hls.recoverMediaError();
            } else {
              setError(`Erreur de lecture : ${data.details}`);
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => setError("Impossible de lancer la lecture automatique — cliquez ▶"));
        });

        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari — HLS natif
        videoRef.current.src = url;
        videoRef.current.play().catch(() => {});
      } else {
        setError("Votre navigateur ne supporte pas la lecture HLS. Utilisez Chrome, Firefox ou Safari.");
      }
    }

    initPlayer();
    return () => { hlsRef.current?.destroy(); };
  }, [playing, itemId, selectedVersion, selectedAudio, selectedSub]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const resLabel = (s?: MediaStream) => {
    if (!s) return "";
    if (s.Height! >= 2160) return "4K";
    if (s.Height! >= 1080) return "1080p";
    if (s.Height! >= 720) return "720p";
    return s.Height ? `${s.Height}p` : "";
  };
  const codecBadge = (codec?: string) => codec?.toUpperCase() ?? "";

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {!playing ? (
        // ── Sélecteur ──
        <div style={{
          width: "100%", maxWidth: 540,
          background: "var(--jw-surface)", border: "1px solid var(--jw-border)",
          borderRadius: "var(--jw-r-xl)", overflow: "hidden",
          maxHeight: "90vh", overflowY: "auto",
        }}>
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--jw-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "var(--jw-surface)", zIndex: 1 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: "var(--jw-purple)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>Lancer la lecture</p>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--jw-text-1)", margin: 0, lineHeight: 1.2 }}>{itemName}</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--jw-text-3)", cursor: "pointer", fontSize: 20, padding: "4px 8px", lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Info codec */}
            {videoStream && (
              <div style={{ padding: "10px 14px", background: "rgba(107,47,217,0.08)", border: "1px solid rgba(107,47,217,0.2)", borderRadius: "var(--jw-r-md)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {resLabel(videoStream) && <span style={{ fontSize: 12, fontWeight: 700, color: "#A06EF0" }}>{resLabel(videoStream)}</span>}
                <span style={{ fontSize: 12, color: "var(--jw-text-2)" }}>{codecBadge(videoStream.Codec)}</span>
                {videoStream.Profile && <span style={{ fontSize: 11, color: "var(--jw-text-3)" }}>{videoStream.Profile}</span>}
                {videoStream.BitRate && <span style={{ fontSize: 11, color: "var(--jw-text-3)" }}>{Math.round(videoStream.BitRate / 1000000 * 10) / 10} Mbps</span>}
                <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 4, padding: "1px 8px", marginLeft: "auto" }}>
                  {["hevc","h265","hvc1","hev1","av1","av01"].includes(videoStream.Codec?.toLowerCase() ?? "") ? "⚡ Transcodage" : "▶ Direct play"}
                </span>
              </div>
            )}

            {/* Versions */}
            {versions.length > 1 && (
              <div>
                <label style={labelStyle}>Version</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {versions.map(v => (
                    <button key={v.Id} onClick={() => setSelectedVersion(v)} style={{ ...optBtn(selectedVersion.Id === v.Id) }}>
                      <span style={{ fontWeight: 600 }}>{v.Name}</span>
                      {v.MediaStreams?.find(s => s.Type === "Video") && (
                        <span style={{ fontSize: 11, color: selectedVersion.Id === v.Id ? "#A06EF0" : "var(--jw-text-3)" }}>
                          {resLabel(v.MediaStreams.find(s => s.Type === "Video"))} {codecBadge(v.MediaStreams.find(s => s.Type === "Video")?.Codec)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Audio */}
            {audioStreams.length > 0 && (
              <div>
                <label style={labelStyle}>Piste audio</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {audioStreams.map(s => (
                    <button key={s.Index} onClick={() => setSelectedAudio(s.Index)} style={{ ...optBtn(selectedAudio === s.Index) }}>
                      <span style={{ fontWeight: 600 }}>{s.DisplayTitle ?? `Piste ${s.Index}`}</span>
                      {s.IsDefault && <span style={{ fontSize: 10, color: "#A06EF0", background: "rgba(107,47,217,0.15)", borderRadius: 4, padding: "1px 8px" }}>Défaut</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sous-titres */}
            <div>
              <label style={labelStyle}>Sous-titres</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => setSelectedSub(-1)} style={{ ...optBtn(selectedSub === -1) }}>
                  <span style={{ fontWeight: 600 }}>Désactivés</span>
                </button>
                {subStreams.map(s => (
                  <button key={s.Index} onClick={() => setSelectedSub(s.Index)} style={{ ...optBtn(selectedSub === s.Index) }}>
                    <span style={{ fontWeight: 600 }}>{s.DisplayTitle ?? s.Language ?? `Sous-titre ${s.Index}`}</span>
                    {s.IsDefault && <span style={{ fontSize: 10, color: "#A06EF0", background: "rgba(107,47,217,0.15)", borderRadius: 4, padding: "1px 8px" }}>Défaut</span>}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startPlayback} disabled={loading} style={{
              padding: "14px", borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)", border: "none",
              fontSize: 14, fontWeight: 700, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              {loading ? "Chargement…" : "Lancer la lecture"}
            </button>
          </div>
        </div>
      ) : (
        // ── Player ──
        <div style={{
          width: "100%", maxWidth: "min(95vw, 1400px)",
          background: "#000", borderRadius: "var(--jw-r-lg)", overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.9)",
        }}>
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.7)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{itemName}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
          </div>
          {error && <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.15)", borderTop: "1px solid rgba(239,68,68,0.3)", fontSize: 13, color: "#f87171" }}>{error}</div>}
          <video ref={videoRef} controls style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }} />
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
const optBtn = (selected: boolean): React.CSSProperties => ({
  width: "100%", padding: "10px 14px",
  borderRadius: "var(--jw-r-md)", cursor: "pointer",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 8, textAlign: "left", fontSize: 13,
  background: selected ? "rgba(107,47,217,0.2)" : "var(--jw-card)",
  border: `1px solid ${selected ? "rgba(107,47,217,0.5)" : "var(--jw-border)"}`,
  color: selected ? "#fff" : "var(--jw-text-2)",
  transition: "all 0.15s",
});
