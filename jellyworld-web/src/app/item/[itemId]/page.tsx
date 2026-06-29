import Link from "next/link";
import {
  getFirstUserId, getUserLibraries, getItemById, getSimilarItems,
  formatRuntime, formatFileSize, ticksToTime
} from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const userId = await getFirstUserId();

  const [libraries, item, similar] = await Promise.all([
    userId ? getUserLibraries(userId) : Promise.resolve([]),
    userId ? getItemById(itemId, userId) : Promise.resolve(null),
    userId ? getSimilarItems(itemId, userId) : Promise.resolve([]),
  ]);

  if (!item) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
        <NavBar libraries={libraries} />
        <main style={{ paddingTop: 112, paddingLeft: 48 }}>
          <Link href="/" style={{ color: "var(--jw-purple)", fontSize: 12, fontWeight: 700 }}>← Accueil</Link>
          <p style={{ marginTop: 32, color: "var(--jw-text-3)" }}>Média introuvable.</p>
        </main>
      </div>
    );
  }

  const runtime = formatRuntime(item.RunTimeTicks);
  const videoStream = item.MediaStreams?.find(s => s.Type === "Video");
  const audioStreams = item.MediaStreams?.filter(s => s.Type === "Audio") ?? [];
  const subtitleStreams = item.MediaStreams?.filter(s => s.Type === "Subtitle") ?? [];
  const cast = item.People?.filter(p => p.Type === "Actor").slice(0, 12) ?? [];
  const directors = item.People?.filter(p => p.Type === "Director") ?? [];

  const resLabel = videoStream?.Height
    ? videoStream.Height >= 2160 ? "4K" : videoStream.Height >= 1080 ? "1080p"
    : videoStream.Height >= 720 ? "720p" : `${videoStream.Height}p`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />

      {/* ── HERO ── */}
      <section style={{ position: "relative", height: "65vh", minHeight: 380, overflow: "hidden" }}>
        <img src={item.backdropUrl} alt={item.Name}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--jw-bg) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--jw-bg) 0%, transparent 55%)" }} />
      </section>

      {/* ── HERO CONTENT — chevauche le backdrop ── */}
      <div style={{
        position: "relative", zIndex: 10, marginTop: "-260px",
        padding: "0 48px 0",
        display: "flex", gap: 40, alignItems: "flex-end",
      }}>
        {/* Poster */}
        <div style={{
          flexShrink: 0, width: 180,
          borderRadius: "var(--jw-r-lg)", overflow: "hidden",
          border: "1px solid var(--jw-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.7)",
        }}>
          <img src={item.posterUrl} alt={item.Name}
            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
        </div>

        {/* Infos principales */}
        <div style={{ flex: 1, paddingBottom: 8, maxWidth: 700 }}>
          {item.Taglines?.[0] && (
            <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--jw-text-3)", margin: "0 0 8px" }}>
              {item.Taglines[0]}
            </p>
          )}
          <h1 style={{
            fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1.05,
            color: "#fff", margin: "0 0 14px", textTransform: "uppercase",
          }}>{item.Name}</h1>

          {/* Badges meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {item.CommunityRating && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
                ★ {item.CommunityRating.toFixed(1)}
              </span>
            )}
            {item.CriticRating && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: item.CriticRating >= 60 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                border: `1px solid ${item.CriticRating >= 60 ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                color: item.CriticRating >= 60 ? "#4ade80" : "#f87171",
                borderRadius: 4, padding: "2px 8px",
              }}>🍅 {item.CriticRating}%</span>
            )}
            {item.ProductionYear && <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{item.ProductionYear}</span>}
            {runtime && <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{runtime}</span>}
            {item.OfficialRating && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "var(--jw-text-2)",
                border: "1px solid var(--jw-border-strong)", borderRadius: 4, padding: "2px 8px",
              }}>{item.OfficialRating}</span>
            )}
            {resLabel && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#A06EF0",
                background: "rgba(107,47,217,0.15)", border: "1px solid rgba(107,47,217,0.3)",
                borderRadius: 4, padding: "2px 8px",
              }}>{resLabel} {videoStream?.Codec?.toUpperCase()}</span>
            )}
          </div>

          {/* Genres */}
          {item.Genres && item.Genres.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {item.Genres.map(g => (
                <span key={g} style={{
                  fontSize: 11, fontWeight: 600, color: "var(--jw-purple)",
                  background: "rgba(107,47,217,0.12)", border: "1px solid rgba(107,47,217,0.25)",
                  borderRadius: 20, padding: "3px 12px",
                }}>{g}</span>
              ))}
            </div>
          )}

          {/* Overview */}
          {item.Overview && (
            <p style={{
              fontSize: 13, color: "var(--jw-text-2)", lineHeight: 1.75,
              margin: "0 0 20px", maxWidth: 600,
            }}>{item.Overview}</p>
          )}

          {/* Réalisateur */}
          {directors.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--jw-text-3)", margin: "0 0 20px" }}>
              <span style={{ color: "var(--jw-text-2)", fontWeight: 600 }}>Réalisateur : </span>
              {directors.map(d => d.Name).join(", ")}
            </p>
          )}

          {/* CTA */}
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)", border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Regarder
            </button>
            <Link href="javascript:history.back()" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 20px", borderRadius: "var(--jw-r-md)",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>← Retour</Link>
          </div>
        </div>
      </div>

      {/* ── SECTIONS DÉTAIL ── */}
      <div style={{ padding: "48px 48px 80px", display: "flex", flexDirection: "column", gap: 48 }}>

        {/* Cast */}
        {cast.length > 0 && (
          <section>
            <h2 style={sectionTitle}>Distribution</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {cast.map(person => (
                <div key={person.Id} style={{ flexShrink: 0, width: 90, textAlign: "center" }}>
                  <div style={{
                    width: 90, height: 90, borderRadius: "50%", overflow: "hidden",
                    background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                    marginBottom: 8,
                  }}>
                    <img src={person.photoUrl} alt={person.Name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 2px", lineHeight: 1.3 }}>
                    {person.Name}
                  </p>
                  {person.Role && (
                    <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0, lineHeight: 1.3 }}>
                      {person.Role}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chapitres */}
        {item.Chapters && item.Chapters.length > 0 && (
          <section>
            <h2 style={sectionTitle}>Chapitres</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {item.Chapters.map((ch, i) => (
                <div key={i} style={{ flexShrink: 0, width: 160 }}>
                  <div style={{
                    width: 160, height: 90, borderRadius: "var(--jw-r-md)", overflow: "hidden",
                    background: "var(--jw-card)", border: "1px solid var(--jw-border)", marginBottom: 6,
                  }}>
                    <img src={ch.imageUrl} alt={ch.Name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 2px" }}>
                    {ch.Name || `Chapitre ${i + 1}`}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0 }}>
                    {ticksToTime(ch.StartPositionTicks)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Films similaires */}
        {similar.length > 0 && (
          <section>
            <h2 style={sectionTitle}>Similaire</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {similar.map(s => (
                <Link key={s.Id} href={`/item/${s.Id}`} style={{
                  flexShrink: 0, width: 120, display: "block",
                }}>
                  <div style={{
                    borderRadius: "var(--jw-r-md)", overflow: "hidden",
                    border: "1px solid var(--jw-border)", marginBottom: 6,
                    transition: "border-color 0.2s",
                  }}>
                    <img src={s.posterUrl} alt={s.Name}
                      style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--jw-text-2)", margin: "0 0 2px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.Name}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: 0 }}>{s.ProductionYear}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* À propos + Infos média — deux colonnes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

          {/* À propos */}
          <section>
            <h2 style={sectionTitle}>À propos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {item.Genres && item.Genres.length > 0 && (
                <div>
                  <p style={labelStyle}>Genres</p>
                  <p style={valueStyle}>{item.Genres.join(", ")}</p>
                </div>
              )}
              {item.Studios && item.Studios.length > 0 && (
                <div>
                  <p style={labelStyle}>Studios</p>
                  <p style={valueStyle}>{item.Studios.map(s => s.Name).join(", ")}</p>
                </div>
              )}
              {item.ExternalUrls && item.ExternalUrls.length > 0 && (
                <div>
                  <p style={labelStyle}>Liens</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.ExternalUrls.map(link => (
                      <a key={link.Name} href={link.Url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, fontWeight: 600, color: "var(--jw-purple)",
                        background: "rgba(107,47,217,0.12)", border: "1px solid rgba(107,47,217,0.25)",
                        borderRadius: 20, padding: "3px 12px", textDecoration: "none",
                      }}>{link.Name} ↗</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Infos média */}
          <section>
            <h2 style={sectionTitle}>Informations du média</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {item.Path && (
                <div>
                  <p style={labelStyle}>Fichier</p>
                  <p style={{ ...valueStyle, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                    {item.Path.split("/").pop()}
                  </p>
                </div>
              )}
              {videoStream && (
                <div>
                  <p style={labelStyle}>Vidéo</p>
                  <p style={valueStyle}>
                    {[resLabel, videoStream.Codec?.toUpperCase(), videoStream.BitRate ? `${Math.round(videoStream.BitRate/1000)} kbps` : null]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}
              {audioStreams.length > 0 && (
                <div>
                  <p style={labelStyle}>Audio</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {audioStreams.map((a, i) => (
                      <p key={i} style={{ ...valueStyle, margin: 0 }}>
                        {[a.DisplayTitle, a.IsDefault ? "(défaut)" : null].filter(Boolean).join(" ")}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {subtitleStreams.length > 0 && (
                <div>
                  <p style={labelStyle}>Sous-titres</p>
                  <p style={valueStyle}>
                    {subtitleStreams.map(s => s.DisplayTitle || s.Language).filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
              {item.DateCreated && (
                <div>
                  <p style={labelStyle}>Ajouté le</p>
                  <p style={valueStyle}>{new Date(item.DateCreated).toLocaleDateString("fr-FR")}</p>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}

// ── Styles partagés ────────────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: "var(--jw-text-1)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  margin: "0 0 18px", paddingBottom: 8,
  borderBottom: "1px solid var(--jw-border-subtle)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--jw-text-3)",
  textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px",
};
const valueStyle: React.CSSProperties = {
  fontSize: 13, color: "var(--jw-text-2)", margin: 0, lineHeight: 1.6,
};
