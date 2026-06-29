'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  itemId: string; versionId: string;
  audioIdx: number; subIdx: number; startTicks: number;
  userId: string; token: string;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function secToTicks(s: number) { return Math.floor(s * 10000000); }
function ticksToSec(t: number) { return Math.floor(t / 10000000); }

export default function FullscreenPlayer({ itemId, versionId, audioIdx, subIdx, startTicks, token }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(ticksToSec(startTicks));
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState("");
  const [itemName, setItemName] = useState("");

  // Récupère l'URL de stream signée + infos item
  useEffect(() => {
    async function prepare() {
      try {
        // Récup URL stream
        const params = new URLSearchParams({
          itemId, versionId,
          audioIdx: String(audioIdx),
          subIdx: String(subIdx),
          startTicks: String(startTicks),
        });
        const res = await fetch(`/api/stream?${params}`);
        const data = await res.json();
        if (!data.url) { setError("Impossible de générer l'URL de stream"); setLoading(false); return; }
        setStreamUrl(data.url);

        // Récup nom du film
        const itemRes = await fetch(`/api/progress?itemId=${itemId}&action=get`);
        const itemData = await itemRes.json();
        if (itemData.item?.Name) setItemName(itemData.item.Name);
      } catch (e) {
        setError("Erreur de connexion au serveur");
        setLoading(false);
      }
    }
    prepare();
  }, [itemId, versionId, audioIdx, subIdx, startTicks]);

  // Init HLS quand on a l'URL
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    async function initHls() {
      const Hls = (await import("hls.js")).default;
      hlsRef.current?.destroy();

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
          fragLoadingMaxRetryTimeout: 8000,
          xhrSetup: (xhr: XMLHttpRequest) => {
            xhr.timeout = 30000;
          },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          // Seek si reprise
          if (startTicks > 0 && videoRef.current) {
            videoRef.current.currentTime = ticksToSec(startTicks);
          }
          videoRef.current?.play()
            .then(() => { setPlaying(true); reportStart(); })
            .catch(() => setLoading(false));
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          console.error("HLS error:", data.type, data.details, data.fatal);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log("Tentative récupération erreur média...");
              hls.recoverMediaError();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setError(`Erreur réseau : impossible d'atteindre le serveur Jellyfin.\nVérifiez que NEXT_PUBLIC_JELLYFIN_URL=${process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096"} est accessible depuis votre navigateur.`);
              setLoading(false);
            } else {
              setError(`Erreur ${data.type} : ${data.details}`);
              setLoading(false);
            }
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current!);
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari — HLS natif
        videoRef.current.src = streamUrl;
        if (startTicks > 0) videoRef.current.currentTime = ticksToSec(startTicks);
        videoRef.current.play().then(() => { setPlaying(true); setLoading(false); reportStart(); });
      } else {
        setError("Votre navigateur ne supporte pas HLS. Utilisez Chrome, Firefox ou Edge.");
        setLoading(false);
      }
    }

    initHls();
    return () => { hlsRef.current?.destroy(); };
  }, [streamUrl]);

  function reportStart() {
    fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, action: "start", positionTicks: startTicks }) }).catch(() => {});
  }

  // Rapport de progression toutes les 10s
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;
      const ticks = secToTicks(videoRef.current.currentTime);
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, action: "progress", positionTicks: ticks }) }).catch(() => {});
    }, 10000);
    return () => clearInterval(progressTimer.current);
  }, [itemId]);

  const saveAndExit = useCallback(() => {
    if (videoRef.current) {
      const ticks = secToTicks(videoRef.current.currentTime);
      navigator.sendBeacon("/api/progress", JSON.stringify({ itemId, action: "stop", positionTicks: ticks }));
    }
    router.back();
  }, [itemId, router]);

  // Auto-hide controls
  function showCtrl() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }

  function togglePlay() {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  }

  function skip(sec: number) {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + sec));
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.code) {
        case "Space": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "ArrowRight": e.preventDefault(); skip(30); break;
        case "ArrowUp": e.preventDefault(); if (videoRef.current) { videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1); setVolume(videoRef.current.volume); } break;
        case "ArrowDown": e.preventDefault(); if (videoRef.current) { videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1); setVolume(videoRef.current.volume); } break;
        case "KeyF": e.preventDefault(); toggleFullscreen(); break;
        case "Escape": if (!document.fullscreenElement) saveAndExit(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, duration]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
      style={{
        position: "fixed", inset: 0, background: "#000", zIndex: 9999,
        cursor: showControls ? "default" : "none",
      }}
    >
      {/* ── VIDEO ── */}
      <video
        ref={videoRef}
        onClick={togglePlay}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => { setPlaying(true); showCtrl(); }}
        onPause={() => { setPlaying(false); setShowControls(true); clearTimeout(hideTimer.current); }}
        onEnded={saveAndExit}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        playsInline
      />

      {/* ── SPINNER ── */}
      {loading && !error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 52, height: 52, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#fff", borderRadius: "50%", animation: "jw-spin 0.7s linear infinite" }} />
          <style>{`@keyframes jw-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── ERREUR ── */}
      {error && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(10,8,20,0.95)", border: "1px solid rgba(239,68,68,0.4)",
          padding: "28px 36px", borderRadius: 16, color: "#f87171",
          textAlign: "center", maxWidth: 480, lineHeight: 1.6,
        }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "#fff" }}>⚠ Erreur de lecture</p>
          <p style={{ fontSize: 13, margin: "0 0 20px", whiteSpace: "pre-wrap" }}>{error}</p>
          <button onClick={saveAndExit} style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13 }}>
            ← Retour
          </button>
        </div>
      )}

      {/* ── OVERLAY CONTRÔLES ── */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.35s ease",
        pointerEvents: showControls ? "auto" : "none",
      }}>
        {/* Top bar */}
        <div style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)", padding: "20px 28px 40px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={saveAndExit} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0, fontSize: 14, opacity: 0.85 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          </button>
          {itemName && (
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{itemName}</p>
            </div>
          )}
        </div>

        {/* Centre — click pour play/pause */}
        <div style={{ flex: 1 }} onClick={togglePlay} />

        {/* Bottom controls */}
        <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)", padding: "40px 28px 24px" }}>
          {/* Barre de progression */}
          <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
            {/* Track */}
            <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
            {/* Fill */}
            <div style={{ position: "absolute", left: 0, height: 4, width: `${pct}%`, background: "linear-gradient(90deg, #6B2FD9, #E03050)", borderRadius: 2 }} />
            {/* Thumb */}
            <div style={{ position: "absolute", left: `${pct}%`, width: 14, height: 14, borderRadius: "50%", background: "#fff", transform: "translateX(-50%)", boxShadow: "0 0 4px rgba(0,0,0,0.5)", zIndex: 1 }} />
            {/* Input range transparent par-dessus */}
            <input type="range" min={0} max={duration || 100} value={currentTime} step={0.5}
              onChange={e => { const t = parseFloat(e.target.value); if(videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t); }}
              style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20 }}
            />
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              {playing
                ? <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              }
            </button>

            {/* Skip */}
            <button onClick={() => skip(-10)} title="-10s" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0, opacity: 0.85 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.3"/></svg>
            </button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: -8, marginRight: 4 }}>10</span>

            <button onClick={() => skip(30)} title="+30s" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0, opacity: 0.85 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.3"/></svg>
            </button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: -8, marginRight: 4 }}>30</span>

            {/* Volume */}
            <button onClick={() => { if(!videoRef.current) return; videoRef.current.muted = !muted; setMuted(!muted); }}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0, opacity: 0.85 }}>
              {muted || volume === 0
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); if(videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
              style={{ width: 80, accentColor: "#8B3FC8", cursor: "pointer" }}
            />

            {/* Temps */}
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>
              {formatTime(currentTime)} <span style={{ opacity: 0.45 }}>/</span> {formatTime(duration)}
            </span>

            <div style={{ flex: 1 }} />

            {/* Plein écran */}
            <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0, opacity: 0.85 }}>
              {fullscreen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
