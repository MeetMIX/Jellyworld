'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface MediaStream {
  Type: string; Index: number; Codec?: string; DisplayTitle?: string;
  Width?: number; Height?: number; IsDefault?: boolean; Language?: string;
}

interface Props {
  itemId: string; versionId: string;
  audioIdx: number; subIdx: number; startTicks: number;
  userId: string; token: string;
  logoUrl?: string;
  backdropUrl?: string;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function formatClock(remainSec: number) {
  const end = new Date(Date.now() + remainSec * 1000);
  return end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function secToTicks(s: number) { return Math.floor(s * 10000000); }
function ticksToSec(t: number) { return Math.floor(t / 10000000); }

function buildHlsUrl(itemId: string, versionId: string, audioIdx: number, subIdx: number, startTicks: number) {
  const p = new URLSearchParams({
    itemId, versionId,
    audioIdx: String(audioIdx),
    subIdx: String(subIdx),
    startTicks: String(startTicks),
  });
  return `/api/hls?${p}`;
}

export default function FullscreenPlayer({ itemId, versionId, audioIdx: initAudio, subIdx: initSub, startTicks, logoUrl, backdropUrl }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(ticksToSec(startTicks));
  const [duration, setDuration] = useState(0);
  const [volume, setVolume]     = useState(1);
  const [muted, setMuted]       = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [itemName, setItemName] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu]     = useState(false);
  const [audioStreams, setAudioStreams]    = useState<MediaStream[]>([]);
  const [subStreams, setSubStreams]        = useState<MediaStream[]>([]);
  const [curAudio, setCurAudio] = useState(initAudio);
  const [curSub, setCurSub]     = useState(initSub);

  useEffect(() => {
    fetch(`/api/progress?itemId=${itemId}&action=get`)
      .then(r => r.json())
      .then(d => {
        if (d.item?.Name) setItemName(d.item.Name);
        if (d.item?.MediaStreams) {
          setAudioStreams(d.item.MediaStreams.filter((s: MediaStream) => s.Type === "Audio"));
          setSubStreams(d.item.MediaStreams.filter((s: MediaStream) => s.Type === "Subtitle"));
        }
      }).catch(() => {});
  }, [itemId]);

  const initHls = useCallback(async (audio: number, sub: number, ticks: number) => {
    if (!videoRef.current) return;
    setLoading(true); setError("");

    const url = buildHlsUrl(itemId, versionId, audio, sub, ticks);
    console.log("[Player] Loading:", url);

    const Hls = (await import("hls.js")).default;
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
        manifestLoadingTimeOut: 25000,
        levelLoadingTimeOut: 25000,
        fragLoadingTimeOut: 25000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (ticks > 0 && videoRef.current) {
          videoRef.current.currentTime = ticksToSec(ticks);
        }
        videoRef.current?.play()
          .then(() => {
            setPlaying(true);
            fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId, action: "start", positionTicks: ticks }),
            }).catch(() => {});
          })
          .catch(e => {
            if (e.name !== "AbortError") console.warn("play() error:", e);
            setLoading(false);
          });
      });

      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        console.error("[HLS]", data.type, data.details, "fatal:", data.fatal);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError(
              `Impossible de lire ce média.\n\n` +
              `Détail : ${data.details}\n\n` +
              `Le transcodage peut prendre du temps pour les fichiers 4K/HDR volumineux.`
            );
            setLoading(false);
          }
        }
      });

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

    } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = url;
      if (ticks > 0) videoRef.current.currentTime = ticksToSec(ticks);
      videoRef.current.play()
        .then(() => { setPlaying(true); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setError("Navigateur non compatible. Utilisez Chrome, Firefox ou Edge.");
      setLoading(false);
    }
  }, [itemId, versionId]);

  useEffect(() => {
    initHls(initAudio, initSub, startTicks);
    return () => { hlsRef.current?.destroy(); };
  }, []); // eslint-disable-line

  async function changeAudio(idx: number) {
    setCurAudio(idx); setShowAudioMenu(false);
    const pos = secToTicks(videoRef.current?.currentTime ?? 0);
    await initHls(idx, curSub, pos);
  }
  async function changeSub(idx: number) {
    setCurSub(idx); setShowSubMenu(false);
    const pos = secToTicks(videoRef.current?.currentTime ?? 0);
    await initHls(curAudio, idx, pos);
  }

  useEffect(() => {
    progressTimer.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "progress", positionTicks: secToTicks(videoRef.current.currentTime) }),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(progressTimer.current);
  }, [itemId]);

  const saveAndExit = useCallback(() => {
    if (videoRef.current) {
      navigator.sendBeacon("/api/progress", JSON.stringify({
        itemId, action: "stop",
        positionTicks: secToTicks(videoRef.current.currentTime),
      }));
    }
    hlsRef.current?.destroy();
    router.back();
  }, [itemId, router]);

  useEffect(() => {
    window.addEventListener("beforeunload", saveAndExit);
    return () => window.removeEventListener("beforeunload", saveAndExit);
  }, [saveAndExit]);

  function showCtrl() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing && !showAudioMenu && !showSubMenu) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3500);
    }
  }

  function togglePlay() {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }

  function skip(s: number) {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + s));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      showCtrl();
      switch(e.code) {
        case "Space": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "ArrowRight": e.preventDefault(); skip(30); break;
        case "KeyF": toggleFullscreen(); break;
        case "Escape": if (!showAudioMenu && !showSubMenu) saveAndExit(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, showAudioMenu, showSubMenu, duration]);

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  const menuStyle: React.CSSProperties = {
    position: "absolute", bottom: "110%", right: 0, minWidth: 280,
    background: "rgba(8,6,18,0.98)", border: "1px solid rgba(139,63,200,0.35)",
    borderRadius: 12, padding: "6px 4px",
    display: "flex", flexDirection: "column", gap: 1,
    boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
    zIndex: 10,
  };
  const menuBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? "rgba(139,63,200,0.22)" : "none",
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    fontSize: 13, textAlign: "left",
    display: "flex", alignItems: "center", gap: 10,
  });

  return (
    <div ref={containerRef}
      onMouseMove={showCtrl} onTouchStart={showCtrl}
      onClick={() => { setShowAudioMenu(false); setShowSubMenu(false); showCtrl(); }}
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, cursor: showControls ? "default" : "none", overflow: "hidden" }}
    >
      {/* ── Backdrop flou en fond pendant le chargement ── */}
      {backdropUrl && loading && !error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${backdropUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px) brightness(0.35)",
          transform: "scale(1.1)",
          transition: "opacity 0.5s ease",
        }} />
      )}

      {/* Vidéo */}
      <video ref={videoRef}
        onClick={e => { e.stopPropagation(); togglePlay(); }}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => { setPlaying(true); showCtrl(); }}
        onPause={() => { setPlaying(false); setShowControls(true); clearTimeout(hideTimer.current); }}
        onEnded={saveAndExit}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", zIndex: 1 }}
        playsInline
      />

      {/* Spinner + logo pendant le chargement */}
      {loading && !error && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, pointerEvents: "none" }}>
          {logoUrl && !logoFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={itemName}
              onError={() => setLogoFailed(true)}
              style={{ maxHeight: 90, maxWidth: 360, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.9))" }}
            />
          )}
          <div style={{ width: 52, height: 52, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#fff", borderRadius: "50%", animation: "jw-spin 0.7s linear infinite" }} />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>Préparation du flux vidéo…</p>
          <style>{`@keyframes jw-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 3, background: "rgba(8,6,18,0.97)", border: "1px solid rgba(239,68,68,0.4)", padding: "32px 40px", borderRadius: 16, color: "#f87171", textAlign: "center", maxWidth: 520, lineHeight: 1.65 }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#fff" }}>⚠ Erreur de lecture</p>
          <p style={{ fontSize: 13, margin: "0 0 24px", whiteSpace: "pre-wrap", opacity: 0.85 }}>{error}</p>
          <button onClick={saveAndExit} style={{ padding: "10px 28px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
      )}

      {/* Overlay contrôles */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column",
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.3s ease",
        pointerEvents: showControls ? "auto" : "none",
      }}>
        <div style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, transparent 100%)", padding: "18px 24px 40px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={saveAndExit} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            {logoUrl && !logoFailed && !loading ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={itemName} style={{ maxHeight: 46, maxWidth: 260, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }} />
            ) : itemName ? (
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{itemName}</p>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1 }} onClick={e => { e.stopPropagation(); togglePlay(); }} />

        <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, transparent 100%)", padding: "40px 24px 20px" }} onClick={e => e.stopPropagation()}>
          <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center", marginBottom: 6, cursor: "pointer" }}>
            <div style={{ position: "absolute", inset: 0, height: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 0, height: 4, top: "50%", transform: "translateY(-50%)", width: `${pct}%`, background: "linear-gradient(90deg, #6B2FD9, #E03050)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: `${pct}%`, width: 14, height: 14, borderRadius: "50%", background: "#fff", transform: "translate(-50%,-50%)", top: "50%", zIndex: 2, boxShadow: "0 0 4px rgba(0,0,0,0.6)" }} />
            <input type="range" min={0} max={duration || 100} value={currentTime} step={0.5}
              onChange={e => { const t = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t); }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 3 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {duration > 0 && remaining > 30 && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                Fin à {formatClock(remaining)} · {formatTime(remaining)} restantes
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={togglePlay} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              {playing
                ? <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              }
            </button>

            <button onClick={() => skip(-10)} title="-10s" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.3"/></svg>10
            </button>
            <button onClick={() => skip(30)} title="+30s" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
              30<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.3"/></svg>
            </button>

            <button onClick={() => { if(videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              {muted || volume === 0
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); if(videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
              style={{ width: 72, accentColor: "#8B3FC8", cursor: "pointer" }}
            />

            <div style={{ flex: 1 }} />

            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setShowAudioMenu(v => !v); setShowSubMenu(false); }} style={{
                padding: "6px 12px", borderRadius: 7,
                background: showAudioMenu ? "rgba(139,63,200,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${showAudioMenu ? "rgba(139,63,200,0.6)" : "rgba(255,255,255,0.15)"}`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                Audio
              </button>
              {showAudioMenu && audioStreams.length > 0 && (
                <div style={menuStyle} onClick={e => e.stopPropagation()}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 10px 6px" }}>Piste audio</p>
                  {audioStreams.map(s => (
                    <button key={s.Index} onClick={() => changeAudio(s.Index)} style={menuBtnStyle(curAudio === s.Index)}>
                      <span style={{ width: 16, flexShrink: 0 }}>
                        {curAudio === s.Index && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      </span>
                      {s.DisplayTitle ?? `Piste ${s.Index}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setShowSubMenu(v => !v); setShowAudioMenu(false); }} style={{
                padding: "6px 12px", borderRadius: 7,
                background: curSub >= 0 || showSubMenu ? "rgba(139,63,200,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${curSub >= 0 || showSubMenu ? "rgba(139,63,200,0.6)" : "rgba(255,255,255,0.15)"}`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M7 12h10M7 16h6"/></svg>
                ST{curSub >= 0 ? " ●" : ""}
              </button>
              {showSubMenu && (
                <div style={menuStyle} onClick={e => e.stopPropagation()}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 10px 6px" }}>Sous-titres</p>
                  <button onClick={() => changeSub(-1)} style={menuBtnStyle(curSub === -1)}>
                    <span style={{ width: 16, flexShrink: 0 }}>
                      {curSub === -1 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </span>
                    Désactivés
                  </button>
                  {subStreams.map(s => (
                    <button key={s.Index} onClick={() => changeSub(s.Index)} style={menuBtnStyle(curSub === s.Index)}>
                      <span style={{ width: 16, flexShrink: 0 }}>
                        {curSub === s.Index && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      </span>
                      {s.DisplayTitle ?? s.Language ?? `ST ${s.Index}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              {fullscreen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
