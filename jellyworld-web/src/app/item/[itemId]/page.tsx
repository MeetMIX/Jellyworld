import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getItemById, getSimilarItems, getUserLibraries,
  formatRuntime, ticksToTime
} from "@/lib/jellyfin";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar/NavBar";
import PersonCard from "@/components/PersonCard/PersonCard";
import WatchedButton from "@/components/WatchedButton/WatchedButton";
import InlinePlayer from "@/components/Player/InlinePlayer";

export const dynamic = "force-dynamic";

async function getVersions(itemId: string, userId: string, token: string) {
  const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  try {
    const res = await fetch(`${JELLYFIN_INTERNAL}/Items/${itemId}/MediaSources?UserId=${userId}`, {
      headers: { Authorization: `MediaBrowser Token="${token}"`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data ?? []).map((src: any) => {
      const filename = (src.Path ?? "").split("/").pop() ?? "";
      const tags = (filename.match(/\[([^\]]+)\]/g) ?? [])
        .map((t: string) => t.replace(/\[|\]/g, ""))
        .filter((t: string) => !t.match(/^(IMDBID|tt\d+|tmdb=|tvdb=)/i));
      const name = tags.length > 0 ? tags.join(" · ") : (src.Name || "Version originale");
      return { Id: src.Id, Name: name, MediaStreams: src.MediaStreams ?? [], Path: src.Path };
    });
  } catch { return []; }
}

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [libraries, item, similar, versions] = await Promise.all([
    getUserLibraries(session.userId),
    getItemById(itemId, session.userId),
    getSimilarItems(itemId, session.userId),
    getVersions(itemId, session.userId, session.token),
  ]);

  if (!item) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
        <NavBar libraries={libraries} session={session} />
        <main style={{ paddingTop: 120, paddingLeft: 48 }}>
          <Link href="/" style={{ color: "var(--jw-purple)", fontSize: 12, fontWeight: 700 }}>← Accueil</Link>
          <p style={{ marginTop: 32, color: "var(--jw-text-3)" }}>Média introuvable.</p>
        </main>
      </div>
    );
  }

  const runtime = formatRuntime(item.RunTimeTicks);
  const videoStream = item.MediaStreams?.find((s: any) => s.Type === "Video");
  const audioStreams = item.MediaStreams?.filter((s: any) => s.Type === "Audio") ?? [];
  const subStreams = item.MediaStreams?.filter((s: any) => s.Type === "Subtitle") ?? [];
  const cast = item.People?.filter((p: any) => p.Type === "Actor").slice(0, 12) ?? [];
  const directors = item.People?.filter((p: any) => p.Type === "Director") ?? [];
  const isWatched = (item as any).UserData?.Played ?? false;

  const h = videoStream?.Height;
  const resLabel = h ? h >= 2160 ? "4K" : h >= 1080 ? "1080p" : h >= 720 ? "720p" : `${h}p` : null;

  const versionsForPlayer = versions.length > 0
    ? versions
    : [{ Id: itemId, Name: "Version originale", MediaStreams: item.MediaStreams ?? [], Path: "" }];

  const S: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "var(--jw-text-1)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 18px", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" };
  const L: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--jw-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" };
  const V: React.CSSProperties = { fontSize: 13, color: "var(--jw-text-2)", margin: 0, lineHeight: 1.6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} session={session} />

      {/* Hero */}
      <section style={{ position: "relative", height: "65vh", minHeight: 380, overflow: "hidden" }}>
        <img src={item.backdropUrl} alt={item.Name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.28)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--jw-bg) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--jw-bg) 0%, transparent 55%)" }} />
      </section>

      {/* Contenu principal */}
      <div style={{ position: "relative", zIndex: 10, marginTop: "-280px", padding: "0 var(--jw-page-px)", display: "flex", gap: 40, alignItems: "flex-end" }}>
        {/* Poster */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          <div style={{ width: 200, borderRadius: "var(--jw-r-lg)", overflow: "hidden", border: "1px solid var(--jw-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <img src={item.posterUrl} alt={item.Name} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
          </div>
          {isWatched && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(34,197,94,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
          )}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, paddingBottom: 8, maxWidth: 720 }}>
          {item.Taglines?.[0] && <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--jw-text-3)", margin: "0 0 8px" }}>{item.Taglines[0]}</p>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#fff", margin: "0 0 14px", textTransform: "uppercase" }}>
            {item.Name}
          </h1>

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {item.CommunityRating && <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>★ {item.CommunityRating.toFixed(1)}</span>}
            {(item as any).CriticRating && <span style={{ fontSize: 11, fontWeight: 700, background: (item as any).CriticRating >= 60 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", border: `1px solid ${(item as any).CriticRating >= 60 ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`, color: (item as any).CriticRating >= 60 ? "#4ade80" : "#f87171", borderRadius: 4, padding: "2px 8px" }}>🍅 {(item as any).CriticRating}%</span>}
            {item.ProductionYear && <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{item.ProductionYear}</span>}
            {runtime && <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{runtime}</span>}
            {(item as any).OfficialRating && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--jw-text-2)", border: "1px solid var(--jw-border-strong)", borderRadius: 4, padding: "2px 8px" }}>{(item as any).OfficialRating}</span>}
            {resLabel && <span style={{ fontSize: 11, fontWeight: 700, color: "#A06EF0", background: "rgba(107,47,217,0.15)", border: "1px solid rgba(107,47,217,0.3)", borderRadius: 4, padding: "2px 8px" }}>{resLabel} {videoStream?.Codec?.toUpperCase()}</span>}
            {versions.length > 1 && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, padding: "2px 8px" }}>{versions.length} versions</span>}
          </div>

          {item.Genres && item.Genres.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {item.Genres.map((g: string) => <span key={g} style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-purple)", background: "rgba(107,47,217,0.12)", border: "1px solid rgba(107,47,217,0.25)", borderRadius: 20, padding: "3px 12px" }}>{g}</span>)}
            </div>
          )}
          {item.Overview && <p style={{ fontSize: 13, color: "var(--jw-text-2)", lineHeight: 1.75, margin: "0 0 14px", maxWidth: 600 }}>{item.Overview}</p>}
          {directors.length > 0 && <p style={{ fontSize: 12, color: "var(--jw-text-3)", margin: "0 0 16px" }}><span style={{ color: "var(--jw-text-2)", fontWeight: 600 }}>Réalisateur : </span>{directors.map((d: any) => d.Name).join(", ")}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <WatchedButton itemId={itemId} initialWatched={isWatched} />
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: "var(--jw-r-md)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)" }}>← Retour</Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PLAYER INTÉGRÉ — sélecteur + lecture sur la page
      ══════════════════════════════════════════ */}
      <div style={{ padding: "48px var(--jw-page-px) 0" }}>
        <InlinePlayer
          itemId={itemId}
          itemName={item.Name}
          versions={versionsForPlayer}
        />
      </div>

      {/* Sections détail */}
      <div style={{ padding: "40px var(--jw-page-px) 80px", display: "flex", flexDirection: "column", gap: 48 }}>

        {cast.length > 0 && (
          <section>
            <h2 style={S}>Distribution</h2>
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {cast.map((person: any) => <PersonCard key={person.Id} photoUrl={person.photoUrl} name={person.Name} role={person.Role} />)}
            </div>
          </section>
        )}

        {item.Chapters && item.Chapters.length > 0 && (
          <section>
            <h2 style={S}>Chapitres</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {item.Chapters.map((ch: any, i: number) => (
                <div key={i} style={{ flexShrink: 0, width: 160 }}>
                  <div style={{ width: 160, height: 90, borderRadius: "var(--jw-r-md)", overflow: "hidden", background: "var(--jw-card)", border: "1px solid var(--jw-border)", marginBottom: 6 }}>
                    <img src={ch.imageUrl} alt={ch.Name || `Chapitre ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 2px" }}>{ch.Name || `Chapitre ${i+1}`}</p>
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0 }}>{ticksToTime(ch.StartPositionTicks)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section>
            <h2 style={S}>Similaire</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {similar.map((s: any) => (
                <Link key={s.Id} href={`/item/${s.Id}`} style={{ flexShrink: 0, width: 120, display: "block" }}>
                  <div style={{ borderRadius: "var(--jw-r-md)", overflow: "hidden", border: "1px solid var(--jw-border)", marginBottom: 6 }}>
                    <img src={s.posterUrl} alt={s.Name} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-2)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.Name}</p>
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0 }}>{s.ProductionYear}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <section>
            <h2 style={S}>À propos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {item.Genres && <div><p style={L}>Genres</p><p style={V}>{item.Genres.join(", ")}</p></div>}
              {(item as any).Studios?.length > 0 && <div><p style={L}>Studios</p><p style={V}>{(item as any).Studios.map((s: any) => s.Name).join(", ")}</p></div>}
              {(item as any).ExternalUrls?.length > 0 && (
                <div><p style={L}>Liens</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(item as any).ExternalUrls.map((link: any) => (
                      <a key={link.Name} href={link.Url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-purple)", background: "rgba(107,47,217,0.12)", border: "1px solid rgba(107,47,217,0.25)", borderRadius: 20, padding: "3px 12px", textDecoration: "none" }}>{link.Name} ↗</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
          <section>
            <h2 style={S}>Informations du média</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {item.Path && <div><p style={L}>Fichier</p><p style={{ ...V, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{item.Path.split("/").pop()}</p></div>}
              {videoStream && <div><p style={L}>Vidéo</p><p style={V}>{[resLabel, videoStream.Codec?.toUpperCase(), videoStream.BitRate ? `${Math.round(videoStream.BitRate/1000)} kbps` : null].filter(Boolean).join(" · ")}</p></div>}
              {audioStreams.length > 0 && <div><p style={L}>Audio</p>{audioStreams.map((a: any, i: number) => <p key={i} style={{ ...V, margin: "0 0 2px" }}>{a.DisplayTitle}{a.IsDefault ? " (défaut)" : ""}</p>)}</div>}
              {subStreams.length > 0 && <div><p style={L}>Sous-titres</p><p style={V}>{subStreams.map((s: any) => s.DisplayTitle || s.Language).filter(Boolean).join(", ")}</p></div>}
              {item.DateCreated && <div><p style={L}>Ajouté le</p><p style={V}>{new Date(item.DateCreated).toLocaleDateString("fr-FR")}</p></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
