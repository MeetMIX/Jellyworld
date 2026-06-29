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
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function formatClock(sec: number) {
  const now = new Date();
  now.setSeconds(now.getSeconds() + Math.floor(sec));
  return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function secToTicks(s: number) { return Math.floor(s * 10000000); }
function ticksToSec(t: number) { return Math.floor(t / 10000000); }

function buildProxyUrl(itemId: string, versionId: string, audioIdx: number, subIdx: number, startTicks: number) {
  const p = new URLSearchParams({
    itemId, versionId,
    audioIdx: String(audioIdx),
    subIdx: String(subIdx),
    startTicks: String(startTicks),
  });
  return `/api/hls?${p}`;
}

export default function FullscreenPlayer({ itemId, versionId, audioIdx: initAudio, subIdx: initSub, startTicks, logoUrl }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const logoRef = useRef<HTMLImageElement>(null);

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

  // Contrôles audio/ST en cours de lecture
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu]     = useState(false);
  const [audioStreams, setAudioStreams]    = useState<MediaStream[]>([]);
  const [subStreams, setSubStreams]        = useState<MediaStream[]>([]);
  const [curAudio, setCurAudio] = useState(initAudio);
  const [curSub, setCurSub]     = useState(initSub);

  // Charger infos item + streams
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

  // Init / reinit HLS quand les paramètres changent
  const initHls = useCallback(async (audio: number, sub: number, ticks: number) => {
    if (!videoRef.current) return;
    setLoading(true); setError("");

    const url = buildProxyUrl(itemId, versionId, audio, sub, ticks);
    console.log("[Player] HLS URL:", url);

    const Hls = (await import("hls.js")).default;
    hlsRef.current?.destroy();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 60, maxMaxBufferLength: 120,
        manifestLoadingMaxRetry: 8, levelLoadingMaxRetry: 8, fragLoadingMaxRetry: 8,
        manifestLoadingTimeOut: 30000, levelLoadingTimeOut: 30000, fragLoadingTimeOut: 30000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (ticks > 0 && videoRef.current) videoRef.current.currentTime = ticksToSec(ticks);
        videoRef.current?.play()
          .then(() => {
            setPlaying(true);
            fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId, action: "start", positionTicks: ticks }) }).catch(() => {});
          })
          .catch(e => { console.error("play() failed:", e); setLoading(false); });
      });

      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        console.error("[HLS]", data.type, data.details, "fatal:", data.fatal);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError(`Erreur HLS : ${data.details}\n\nVérifiez que Jellyfin est démarré et accessible.`);
            setLoading(false);
          }
        }
      });

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = url;
      if (ticks > 0) videoRef.current.currentTime = ticksToSec(ticks);
      videoRef.current.play().then(() => { setPlaying(true); setLoading(false); });
    } else {
      setError("Votre navigateur ne supporte pas la lecture HLS.\nUtilisez Chrome, Firefox ou Edge.");
      setLoading(false);
    }
  }, [itemId, versionId]);

  useEffect(() => { initHls(initAudio, initSub, startTicks); return () => { hlsRef.current?.destroy(); }; }, []);

  // Changer audio/ST sans recharger la page
  async function changeAudio(idx: number) {
    setCurAudio(idx);
    setShowAudioMenu(false);
    const pos = videoRef.current?.currentTime ?? 0;
    await initHls(idx, curSub, secToTicks(pos));
  }
  async function changeSub(idx: number) {
    setCurSub(idx);
    setShowSubMenu(false);
    const pos = videoRef.current?.currentTime ?? 0;
    await initHls(curAudio, idx, secToTicks(pos));
  }

  // Progression
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;
      const ticks = secToTicks(videoRef.current.currentTime);
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "progress", positionTicks: ticks }) }).catch(() => {});
    }, 10000);
    return () => clearInterval(progressTimer.current);
  }, [itemId]);

  const saveAndExit = useCallback(() => {
    if (videoRef.current) {
      const ticks = secToTicks(videoRef.current.currentTime);
      navigator.sendBeacon("/api/progress", JSON.stringify({ itemId, action: "stop", positionTicks: ticks }));
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
    if (playing) hideTimer.current = setTimeout(() => {
      if (!showAudioMenu && !showSubMenu) setShowControls(false);
    }, 3500);
  }

  function togglePlay() { videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause(); }
  function skip(s: number) { if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + s)); }
  function toggleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().then(() => setFullscreen(true));
    else document.exitFullscreen().then(() => setFullscreen(false));
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
  }, [playing, showAudioMenu, showSubMenu]);

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remaining = duration > 0 ? duration - currentTime : 0;

  return (
    <div ref={containerRef} onMouseMove={showCtrl} onTouchStart={showCtrl}
      onClick={() => { showCtrl(); setShowAudioMenu(false); setShowSubMenu(false); }}
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, cursor: showControls ? "default" : "none" }}>

      {/* Vidéo */}
      <video ref={videoRef} onClick={e => { e.stopPropagation(); togglePlay(); }}
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

      {/* Spinner */}
      {loading && !error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 52, height: 52, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#fff", borderRadius: "50%", animation: "jw-spin 0.7s linear infinite" }} />
          <style>{`@keyframes jw-spin { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(10,8,20,0.96)", border: "1px solid rgba(239,68,68,0.4)", padding: "28px 36px", borderRadius: 16, color: "#f87171", textAlign: "center", maxWidth: 500, lineHeight: 1.6 }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "#fff" }}>⚠ Erreur de lecture</p>
          <p style={{ fontSize: 13, margin: "0 0 20px", whiteSpace: "pre-wrap", opacity: 0.85 }}>{error}</p>
          <button onClick={saveAndExit} style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
      )}

      {/* Overlay contrôles */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.3s ease",
        pointerEvents: showControls ? "auto" : "none",
      }}>
        {/* Top bar — logo ou titre */}
        <div style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)", padding: "18px 24px 40px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={saveAndExit} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {logoUrl && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={logoRef} src={logoUrl} alt={itemName}
                onError={() => setLogoFailed(true)}
                style={{ maxHeight: 44, maxWidth: 240, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}
              />
            ) : itemName ? (
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{itemName}</p>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1 }} onClick={e => { e.stopPropagation(); togglePlay(); }} />

        {/* Bottom controls */}
        <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)", padding: "40px 24px 22px" }}>

          {/* Barre de progression */}
          <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center", marginBottom: 10, cursor: "pointer" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 0, height: 4, width: `${pct}%`, background: "linear-gradient(90deg,#6B2FD9,#E03050)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: `${pct}%`, width: 14, height: 14, borderRadius: "50%", background: "#fff", transform: "translateX(-50%)", zIndex: 1 }} />
            <input type="range" min={0} max={duration || 100} value={currentTime} step={0.5}
              onChange={e => { const t = parseFloat(e.target.value); if(videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t); }}
              style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20 }}
            />
          </div>

          {/* Temps + fin de film */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {duration > 0 && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
                Fin à {formatClock(remaining)} ({formatTime(remaining)} restantes)
              </span>
            )}
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }} onClick={e => e.stopPropagation()}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              {playing
                ? <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              }
            </button>

            {/* Skip -10 */}
            <button onClick={() => skip(-10)} title="-10s" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.3"/></svg>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>10</span>
            </button>

            {/* Skip +30 */}
            <button onClick={() => skip(30)} title="+30s" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.3"/></svg>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>30</span>
            </button>

            {/* Volume */}
            <button onClick={() => { if(videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8 }}>
              {muted || volume === 0
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); if(videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
              style={{ width: 70, accentColor: "#8B3FC8", cursor: "pointer" }}
            />

            <div style={{ flex: 1 }} />

            {/* ── Sélecteur AUDIO ── */}
            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setShowAudioMenu(!showAudioMenu); setShowSubMenu(false); }} style={{
                padding: "6px 12px", borderRadius: 7,
                background: showAudioMenu ? "rgba(139,63,200,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${showAudioMenu ? "rgba(139,63,200,0.6)" : "rgba(255,255,255,0.2)"}`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                Audio
              </button>
              {showAudioMenu && audioStreams.length > 0 && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: "absolute", bottom: "110%", right: 0, minWidth: 260,
                  background: "rgba(10,8,20,0.97)", border: "1px solid rgba(139,63,200,0.3)",
                  borderRadius: 10, padding: 6, display: "flex", flexDirection: "column", gap: 2,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "2px 8px 6px" }}>Piste audio</p>
                  {audioStreams.map(s => (
                    <button key={s.Index} onClick={() => changeAudio(s.Index)} style={{
                      padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: curAudio === s.Index ? "rgba(139,63,200,0.25)" : "none",
                      color: curAudio === s.Index ? "#fff" : "rgba(255,255,255,0.65)",
                      fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {curAudio === s.Index && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      {curAudio !== s.Index && <span style={{ width: 12 }} />}
                      {s.DisplayTitle ?? `Piste ${s.Index}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Sélecteur SOUS-TITRES ── */}
            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setShowSubMenu(!showSubMenu); setShowAudioMenu(false); }} style={{
                padding: "6px 12px", borderRadius: 7,
                background: curSub >= 0 || showSubMenu ? "rgba(139,63,200,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${curSub >= 0 || showSubMenu ? "rgba(139,63,200,0.6)" : "rgba(255,255,255,0.2)"}`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M7 11h10M7 15h6"/></svg>
                ST {curSub >= 0 ? "●" : ""}
              </button>
              {showSubMenu && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: "absolute", bottom: "110%", right: 0, minWidth: 260,
                  background: "rgba(10,8,20,0.97)", border: "1px solid rgba(139,63,200,0.3)",
                  borderRadius: 10, padding: 6, display: "flex", flexDirection: "column", gap: 2,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "2px 8px 6px" }}>Sous-titres</p>
                  <button onClick={() => changeSub(-1)} style={{
                    padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: curSub === -1 ? "rgba(139,63,200,0.25)" : "none",
                    color: curSub === -1 ? "#fff" : "rgba(255,255,255,0.65)",
                    fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {curSub === -1 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    {curSub !== -1 && <span style={{ width: 12 }} />}
                    Désactivés
                  </button>
                  {subStreams.map(s => (
                    <button key={s.Index} onClick={() => changeSub(s.Index)} style={{
                      padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: curSub === s.Index ? "rgba(139,63,200,0.25)" : "none",
                      color: curSub === s.Index ? "#fff" : "rgba(255,255,255,0.65)",
                      fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {curSub === s.Index && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A06EF0" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      {curSub !== s.Index && <span style={{ width: 12 }} />}
                      {s.DisplayTitle ?? s.Language ?? `ST ${s.Index}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Plein écran */}
            <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, opacity: 0.8, lineHeight: 0 }}>
              {fullscreen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
