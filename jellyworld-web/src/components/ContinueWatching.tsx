import Link from "next/link";

interface ContinueItem {
  Id: string; Name: string; Type: string;
  ProductionYear?: number; RunTimeTicks?: number;
  PlaybackPositionTicks: number; PlayedPercentage: number;
  posterUrl: string; backdropUrl: string;
}

function formatRemaining(totalTicks?: number, playedTicks?: number): string {
  if (!totalTicks || !playedTicks) return "";
  const remainSec = Math.floor((totalTicks - playedTicks) / 10000000);
  if (remainSec <= 0) return "";
  const h = Math.floor(remainSec / 3600);
  const m = Math.floor((remainSec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
}

export default function ContinueWatching({ items }: { items: ContinueItem[] }) {
  if (!items.length) return null;

  return (
    <section>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: 10, marginBottom: 16,
      }}>
        <h2 style={{
          fontSize: 13, fontWeight: 800, color: "var(--jw-text-1)",
          textTransform: "uppercase", letterSpacing: "0.12em", margin: 0,
        }}>
          Continuer à regarder
        </h2>
      </div>

      <div className="scrollbar-none" style={{
        display: "flex", gap: 10,
        overflowX: "auto", paddingBottom: 8,
        scrollSnapType: "x mandatory",
      }}>
        {items.map(item => {
          const remaining = formatRemaining(item.RunTimeTicks, item.PlaybackPositionTicks);
          const pct = Math.min(100, Math.max(0, item.PlayedPercentage));

          return (
            <Link
              key={item.Id}
              href={`/item/${item.Id}`}
              style={{
                /* ← même largeur que MovieCard poster */
                flexShrink: 0,
                width: 140,
                scrollSnapAlign: "start",
                display: "block",
                textDecoration: "none",
              }}
            >
              {/* Thumbnail — format PORTRAIT 2/3 comme les autres cartes */}
              <div style={{
                position: "relative",
                /* ← même ratio que MovieCard */
                aspectRatio: "2/3",
                borderRadius: "var(--jw-r-card)",
                overflow: "hidden",
                background: "var(--jw-card)",
                border: "1px solid var(--jw-border-subtle)",
                transition: "border-color 200ms, transform 200ms, box-shadow 200ms",
              }}>
                <img
                  src={item.posterUrl}
                  alt={item.Name}
                  loading="lazy"
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                  }}
                />

                {/* Overlay sombre en bas */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: "45%",
                  background: "linear-gradient(to top, rgba(7,6,11,0.85) 0%, transparent 100%)",
                }} />

                {/* Bouton play centré */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(6px)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    paddingLeft: 3,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  </div>
                </div>

                {/* Barre de progression en bas du poster */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: 3, background: "rgba(255,255,255,0.15)",
                }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: "var(--jw-gradient)",
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>

              {/* Titre + temps restant */}
              <div style={{ padding: "7px 2px 0" }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.4,
                  color: "var(--jw-text-2)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {item.Name}
                </p>
                {remaining && (
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: "2px 0 0" }}>
                    {remaining}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
