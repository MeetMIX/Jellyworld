'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface FullscreenPlayerProps {
  itemId: string; versionId: string;
  audioIdx: number; subIdx: number; startTicks: number;
  userId: string; token: string;
}

const JELLYFIN_PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";

function buildUrl(itemId: string, versionId: string, audioIdx: number, subIdx: number, startTicks: number) {
  if (typeof window === "undefined") return "";
  const v = document.createElement("video");
  const canH265 = !!(v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.90"') || v.canPlayType('video/mp4; codecs="hev1.1.6.L93.90"'));
  const token = document.cookie.match(/jw_token=([^;]+)/)?.[1] ?? "";

  const p = new URLSearchParams({
    api_key: process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "",
    mediaSourceId: versionId,
    videoCodec: canH265 ? "h265,h264,hevc" : "h264",
    audioCodec: "aac,mp3,ac3,eac3",
    ...(audioIdx >= 0 ? { audioStreamIndex: String(audioIdx) } : {}),
    ...(subIdx >= 0 ? { subtitleStreamIndex: String(subIdx), subtitleMethod: "Encode" } : {}),
    ...(startTicks > 0 ? { StartTimeTicks: String(startTicks) } : {}),
    maxVideoBitDepth: "10",
    transcodingMaxAudioChannels: "6",
  });
  return `${JELLYFIN_PUBLIC}/Videos/${itemId}/stream.m3u8?${p}`;
}

function ticksToSec(ticks: number) { return Math.floor(ticks / 10000000); }
function secToTicks(sec: number) { return Math.floor(sec * 10000000); }
function formatTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}

export default function FullscreenPlayer({ itemId, versionId, audioIdx, subIdx, startTicks, userId, token }: FullscreenPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemInfo, setItemInfo] = useState<any>(null);

  // Récup infos item pour le titre + reprise
  useEffect(() => {
    fetch(`/api/progress?itemId=${itemId}&action=get`)
      .then(r => r.json())
      .then(d => { if (d.item) setItemInfo(d.item); })
      .catch(() => {});
  }, [itemId]);

  // Init HLS
  useEffect(() => {
    const url = buildUrl(itemId, versionId, audioIdx, subIdx, startTicks);
    if (!url) return;

    async function init() {
      const Hls = (await import("hls.js")).default;
      hlsRef.current?.destroy();

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true, lowLatencyMode: false,
          backBufferLength: 120, maxBufferLength: 60, maxMaxBufferLength: 180,
          manifestLoadingMaxRetry: 8, levelLoadingMaxRetry: 8, fragLoadingMaxRetry: 8,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else setError(`Erreur : ${data.details}`);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (startTicks > 0 && videoRef.current) {
            videoRef.current.currentTime = ticksToSec(startTicks);
          }
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => setLoading(false));
        });

        hls.loadSource(url);
        hls.attachMedia(videoRef.current!);
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = url;
        if (startTicks > 0) videoRef.current.currentTime = ticksToSec(startTicks);
        videoRef.current.play().then(() => setPlaying(true));
        setLoading(false);
      }
    }
    init();
    return () => { hlsRef.current?.destroy(); };
  }, [itemId, versionId, audioIdx, subIdx, startTicks]);

  // Progression — notifie Jellyfin toutes les 10s
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;
      const ticks = secToTicks(videoRef.current.currentTime);
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "progress", positionTicks: ticks }),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(progressTimer.current);
  }, [itemId]);

  // Sauvegarde position à la fermeture
  const savePosition = useCallback(() => {
    if (!videoRef.current) return;
    const ticks = secToTicks(videoRef.current.currentTime);
    navigator.sendBeacon("/api/progress", JSON.stringify({ itemId, action: "stop", positionTicks: ticks }));
  }, [itemId]);

  useEffect(() => {
    window.addEventListener("beforeunload", savePosition);
    return () => window.removeEventListener("beforeunload", savePosition);
  }, [savePosition]);

  // Contrôles auto-hide
  function showControlsTemp() {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }

  // Events vidéo
  function onTimeUpdate() { setCurrentTime(videoRef.current?.currentTime ?? 0); }
  function onDurationChange() { setDuration(videoRef.current?.duration ?? 0); }
  function onPlay() { setPlaying(true); }
  function onPause() { setPlaying(false); setShowControls(true); }
  function onEnded() {
    savePosition();
    fetch("/api/progress", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ itemId, action: "stop", positionTicks: secToTicks(duration) }) });
    router.back();
  }

  function togglePlay() {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }

  function skip(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  }

  function handleBack() {
    savePosition();
    router.back();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      switch(e.code) {
        case "Space": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": skip(-10); break;
        case "ArrowRight": skip(30); break;
        case "ArrowUp": if (videoRef.current) { videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1); setVolume(videoRef.current.volume); } break;
        case "ArrowDown": if (videoRef.current) { videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1); setVolume(videoRef.current.volume); } break;
        case "KeyF": toggleFullscreen(); break;
        case "Escape": handleBack(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemp}
      onClick={showControlsTemp}
      style={{
        position: "fixed", inset: 0, background: "#000", zIndex: 1000,
        cursor: showControls ? "default" : "none",
        userSelect: "none",
      }}
    >
      {/* Vidéo */}
      <video
        ref={videoRef}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onClick={togglePlay}
        style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      />

      {/* Spinner chargement */}
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.8)", padding: "20px 28px", borderRadius: 12, color: "#f87171", textAlign: "center", maxWidth: 400 }}>
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>Erreur de lecture</p>
          <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── OVERLAY CONTRÔLES ── */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.3s ease",
        pointerEvents: showControls ? "auto" : "none",
      }}>
        {/* Dégradé haut */}
        <div style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "6px 0", opacity: 0.85 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            {itemInfo?.Name && <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>{itemInfo.Name}</p>}
            {itemInfo?.ProductionYear && <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{itemInfo.ProductionYear}</p>}
          </div>
        </div>

        {/* Zone centrale — clic pour play/pause */}
        <div style={{ flex: 1 }} onClick={togglePlay} />

        {/* Dégradé bas + contrôles */}
        <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", padding: "0 24px 24px" }}>

          {/* Barre de progression */}
          <div style={{ marginBottom: 12, position: "relative", height: 4, cursor: "pointer" }}>
            <input
              type="range" min={0} max={duration || 100} value={currentTime} step={0.5}
              onChange={seek}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                opacity: 0, cursor: "pointer", zIndex: 2,
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.25)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, background: "linear-gradient(90deg, #6B2FD9, #E03050)", borderRadius: 2 }} />
            <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", zIndex: 1 }} />
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, display: "flex" }}>
              {playing ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>

            {/* Skip -10s */}
            <button onClick={() => skip(-10)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.3"/><text x="8" y="15" style={{fill:"white",fontSize:"6px",stroke:"none",fontWeight:"bold"}}>10</text></svg>
            </button>

            {/* Skip +30s */}
            <button onClick={() => skip(30)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.3"/><text x="8" y="15" style={{fill:"white",fontSize:"6px",stroke:"none",fontWeight:"bold"}}>30</text></svg>
            </button>

            {/* Volume */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => { if(videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(!muted); } }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}>
                {muted || volume === 0 ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                )}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={e => { const v = parseFloat(e.target.value); if(videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
                style={{ width: 80, accentColor: "#8B3FC8" }}
              />
            </div>

            {/* Temps */}
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div style={{ flex: 1 }} />

            {/* Plein écran */}
            <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}>
              {fullscreen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
