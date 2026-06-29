'use client';

import { useState, useEffect, useRef, useCallback } from "react";

interface MediaStream {
  Type: string; Index: number; Codec?: string; DisplayTitle?: string;
  Width?: number; Height?: number; IsDefault?: boolean; Language?: string; BitRate?: number;
}
interface Version { Id: string; Name: string; MediaStreams?: MediaStream[]; Path?: string; }
interface InlinePlayerProps { itemId: string; itemName: string; versions: Version[]; }

const JELLYFIN_PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
const TOKEN = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

function getBrowserCaps() {
  if (typeof window === "undefined") return { h265: false, av1: false, vp9: false };
  const v = document.createElement("video");
  return {
    h265: !!(v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.90"') || v.canPlayType('video/mp4; codecs="hev1.1.6.L93.90"')),
    av1:  !!v.canPlayType('video/mp4; codecs="av01.0.05M.08"'),
    vp9:  !!v.canPlayType('video/webm; codecs="vp9"'),
  };
}

function buildUrl(itemId: string, version: Version, audioIdx: number, subIdx: number) {
  const caps = getBrowserCaps();
  const vs = version.MediaStreams?.find(s => s.Type === "Video");
  const codec = (vs?.Codec ?? "").toLowerCase();
  const transcodeCodecs = ["hevc","h265","hvc1","hev1","vc1","mpeg2video","mpeg4","xvid","divx","wmv","flv","vp8","av1","av01","vp9","vp09","theora","mjpeg","prores","dnxhd","cineform","huffyuv","ffv1","rawvideo","h263","rv40","svq3","indeo","cinepak","msvideo1"];
  const needsTranscode = transcodeCodecs.includes(codec) &&
    !(codec.includes("h265") || codec.includes("hevc") || codec.includes("hvc1") || codec.includes("hev1") ? caps.h265 :
      codec.includes("av1") ? caps.av1 :
      codec.includes("vp9") ? caps.vp9 : false);

  const p = new URLSearchParams({
    api_key: TOKEN,
    mediaSourceId: version.Id,
    ...(audioIdx >= 0 ? { audioStreamIndex: String(audioIdx) } : {}),
    ...(subIdx >= 0 ? { subtitleStreamIndex: String(subIdx), subtitleMethod: "Encode" } : {}),
  });

  if (needsTranscode || !["h264","avc","avc1"].includes(codec)) {
    p.set("videoCodec", "h264");
    p.set("audioCodec", "aac");
    p.set("videoBitRate", "8000000");
    p.set("maxVideoBitDepth", "8");
    p.set("transcodingMaxAudioChannels", "6");
  }

  return `${JELLYFIN_PUBLIC}/Videos/${itemId}/stream.m3u8?${p}`;
}

export default function InlinePlayer({ itemId, itemName, versions }: InlinePlayerProps) {
  const [selVersion, setSelVersion] = useState(versions[0]);
  const [selAudio, setSelAudio] = useState(-1);
  const [selSub, setSelSub] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const audio = selVersion?.MediaStreams?.filter(s => s.Type === "Audio") ?? [];
  const subs  = selVersion?.MediaStreams?.filter(s => s.Type === "Subtitle") ?? [];
  const video = selVersion?.MediaStreams?.find(s => s.Type === "Video");

  useEffect(() => {
    setSelAudio(audio.find(s => s.IsDefault)?.Index ?? audio[0]?.Index ?? -1);
    setSelSub(subs.find(s => s.IsDefault)?.Index ?? -1);
  }, [selVersion]);

  const launch = useCallback(async () => {
    setError("");
    try { await fetch("/api/playback", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ itemId, action: "start" }) }); } catch {}
    setPlaying(true);
  }, [itemId]);

  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const url = buildUrl(itemId, selVersion, selAudio, selSub);

    async function init() {
      const Hls = (await import("hls.js")).default;
      hlsRef.current?.destroy();

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true, lowLatencyMode: false,
          backBufferLength: 90, maxBufferLength: 60, maxMaxBufferLength: 120,
          manifestLoadingMaxRetry: 8, levelLoadingMaxRetry: 8, fragLoadingMaxRetry: 8,
          xhrSetup: (xhr: XMLHttpRequest) => { xhr.timeout = 30000; },
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); }
            else { setError(`Erreur de lecture (${data.details}) — essayez une autre version ou piste audio`); }
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current?.play().catch(() => {}));
        hls.loadSource(url);
        hls.attachMedia(videoRef.current!);
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = url;
        videoRef.current.play().catch(() => {});
      } else {
        setError("Navigateur incompatible — utilisez Chrome, Edge ou Firefox.");
      }
    }
    init();
    return () => { hlsRef.current?.destroy(); };
  }, [playing, selVersion, selAudio, selSub, itemId]);

  const h = video?.Height;
  const ql = h ? h >= 2160 ? "4K UHD" : h >= 1080 ? "1080p Full HD" : h >= 720 ? "720p HD" : `${h}p` : null;
  const needsTC = !["h264","avc","avc1"].includes((video?.Codec ?? "").toLowerCase());

  const sel = (active: boolean): React.CSSProperties => ({
    padding: "9px 14px", borderRadius: "var(--jw-r-md)", cursor: "pointer",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 13, gap: 8, border: "none", width: "100%", textAlign: "left",
    background: active ? "rgba(107,47,217,0.25)" : "rgba(255,255,255,0.04)",
    color: active ? "#fff" : "var(--jw-text-2)",
    outline: active ? "1px solid rgba(107,47,217,0.5)" : "1px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{
      background: "var(--jw-surface)",
      border: "1px solid var(--jw-border)",
      borderRadius: "var(--jw-r-xl)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px", borderBottom: "1px solid var(--jw-border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--jw-gradient)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--jw-text-1)", margin: 0 }}>Lecture</p>
            <p style={{ fontSize: 11, color: "var(--jw-text-3)", margin: 0 }}>Sélectionnez les options puis lancez</p>
          </div>
        </div>
        {ql && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#A06EF0", background: "rgba(107,47,217,0.15)", border: "1px solid rgba(107,47,217,0.3)", borderRadius: 6, padding: "4px 10px" }}>{ql}</span>
            <span style={{ fontSize: 11, color: needsTC ? "#f59e0b" : "#4ade80", background: needsTC ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${needsTC ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: 6, padding: "4px 10px" }}>
              {needsTC ? "⚡ Transcodage" : "▶ Direct play"}
            </span>
            <span style={{ fontSize: 11, color: "var(--jw-text-3)" }}>{video?.Codec?.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Player vidéo (affiché quand en lecture) */}
      {playing && (
        <div style={{ position: "relative", background: "#000" }}>
          {error && <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.15)", fontSize: 13, color: "#f87171" }}>{error}</div>}
          <video ref={videoRef} controls style={{ width: "100%", maxHeight: "60vh", display: "block", background: "#000" }} />
          <button onClick={() => { setPlaying(false); hlsRef.current?.destroy(); }}
            style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
            ✕ Fermer
          </button>
        </div>
      )}

      {/* Sélecteurs */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: versions.length > 1 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16 }}>

        {/* Versions */}
        {versions.length > 1 && (
          <div>
            <p style={labelS}>Version</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {versions.map(v => (
                <button key={v.Id} onClick={() => { setSelVersion(v); setPlaying(false); }} style={sel(selVersion.Id === v.Id)}>
                  <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.Name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio */}
        <div>
          <p style={labelS}>Piste audio</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {audio.map(s => (
              <button key={s.Index} onClick={() => { setSelAudio(s.Index); if (playing) { hlsRef.current?.destroy(); setPlaying(false); setTimeout(() => setPlaying(true), 100); } }} style={sel(selAudio === s.Index)}>
                <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.DisplayTitle ?? `Piste ${s.Index}`}</span>
                {s.IsDefault && <span style={{ fontSize: 9, color: "#A06EF0", flexShrink: 0 }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Sous-titres */}
        <div>
          <p style={labelS}>Sous-titres</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => { setSelSub(-1); if (playing) { hlsRef.current?.destroy(); setPlaying(false); setTimeout(() => setPlaying(true), 100); } }} style={sel(selSub === -1)}>
              <span style={{ fontWeight: 600, fontSize: 12 }}>Aucun</span>
            </button>
            {subs.map(s => (
              <button key={s.Index} onClick={() => { setSelSub(s.Index); if (playing) { hlsRef.current?.destroy(); setPlaying(false); setTimeout(() => setPlaying(true), 100); } }} style={sel(selSub === s.Index)}>
                <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.DisplayTitle ?? s.Language ?? `ST ${s.Index}`}</span>
                {s.IsDefault && <span style={{ fontSize: 9, color: "#A06EF0", flexShrink: 0 }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton Lancer */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <button onClick={launch} style={{
            padding: "14px 20px", borderRadius: "var(--jw-r-md)",
            background: "var(--jw-gradient)", border: "none",
            fontSize: 14, fontWeight: 700, color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            {playing ? "Relancer" : "Regarder"}
          </button>
          {playing && (
            <p style={{ fontSize: 11, color: "var(--jw-text-3)", textAlign: "center", marginTop: 8 }}>
              Modifiez les options et cliquez Relancer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const labelS: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--jw-text-3)",
  textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px",
};
