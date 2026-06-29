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
  const h = Math.floor(remainSec / 3600);
  const m = Math.floor((remainSec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
}

export default function ContinueWatching({ items }: { items: ContinueItem[] }) {
  return (
    <section>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: 10, marginBottom: 16,
      }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--jw-text-1)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
          Continuer à regarder
        </h2>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
        {items.map(item => {
          const remaining = formatRemaining(item.RunTimeTicks, item.PlaybackPositionTicks);
          return (
            <Link key={item.Id} href={`/item/${item.Id}`} style={{
              flexShrink: 0, width: 220, display: "block",
              textDecoration: "none",
            }}>
              {/* Thumbnail paysage avec progression */}
              <div style={{
                position: "relative", borderRadius: "var(--jw-r-md)", overflow: "hidden",
                border: "1px solid var(--jw-border)", background: "var(--jw-card)",
                marginBottom: 8,
              }}>
                <img src={item.backdropUrl || item.posterUrl} alt={item.Name}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                {/* Overlay + bouton play */}
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    paddingLeft: 3,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                  </div>
                </div>
                {/* Barre de progression */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.15)" }}>
                  <div style={{ height: "100%", width: `${item.PlayedPercentage}%`, background: "var(--jw-gradient)" }} />
                </div>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.Name}
              </p>
              {remaining && (
                <p style={{ fontSize: 11, color: "var(--jw-text-3)", margin: 0 }}>{remaining}</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
