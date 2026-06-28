import Link from "next/link";
import { JellyfinItem, formatRuntime } from "@/lib/jellyfin";

interface MovieCardProps {
  item: JellyfinItem;
  /** "poster" = format 2/3 (films), "landscape" = format 16/9 (séries/épisodes) */
  variant?: "poster" | "landscape";
  /** Affiche la barre de progression si l'item est en cours */
  showProgress?: boolean;
}

export default function MovieCard({
  item,
  variant = "poster",
  showProgress = false,
}: MovieCardProps) {
  const progress = item.UserData?.PlayedPercentage ?? 0;
  const isPoster = variant === "poster";

  return (
    <Link
      href={`/item/${item.Id}`}
      className="group block shrink-0"
      style={{ width: isPoster ? "140px" : "200px" }}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden rounded-[var(--jw-r-card)]"
        style={{
          aspectRatio: isPoster ? "2/3" : "16/9",
          background: "var(--jw-card)",
          border: "1px solid var(--jw-border-subtle)",
          transition: "border-color var(--jw-transition), box-shadow var(--jw-transition), transform var(--jw-transition)",
        }}
      >
        {/* Image */}
        <img
          src={isPoster ? item.posterUrl : item.backdropUrl}
          alt={item.Name}
          className="w-full h-full object-cover"
          style={{ transition: "transform var(--jw-transition-slow)" }}
          loading="lazy"
        />

        {/* Overlay hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          style={{
            background: "linear-gradient(to top, rgba(7,6,11,0.92) 0%, rgba(7,6,11,0.2) 60%, transparent 100%)",
            transition: "opacity var(--jw-transition)",
          }}
        />

        {/* Bouton play centré */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
          style={{ transition: "opacity var(--jw-transition)" }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingLeft: 3,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>

        {/* Rating badge */}
        {item.CommunityRating && (
          <div
            className="absolute top-2 right-2"
            style={{
              background: "rgba(7,6,11,0.75)",
              backdropFilter: "blur(6px)",
              borderRadius: "var(--jw-r-sm)",
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
              color: "#A06EF0",
            }}
          >
            ★ {item.CommunityRating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info sous la card */}
      <div style={{ padding: "8px 2px 0" }}>
        <p
          className="truncate"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--jw-text-2)",
            margin: 0,
            lineHeight: 1.4,
            transition: "color var(--jw-transition)",
          }}
        >
          {item.Name}
        </p>
        <p
          style={{
            fontSize: 10,
            color: "var(--jw-text-3)",
            margin: "2px 0 0",
          }}
        >
          {[item.ProductionYear, formatRuntime(item.RunTimeTicks)]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* Barre de progression */}
        {showProgress && progress > 0 && (
          <div className="progress-bar" style={{ marginTop: 6 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Effet hover global sur la card (border + scale via CSS inline) */}
      <style jsx>{`
        a:hover > div:first-child {
          border-color: var(--jw-border-strong) !important;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--jw-border-strong);
          transform: scale(1.04) translateY(-3px);
        }
        a:hover p:first-child {
          color: var(--jw-text-1) !important;
        }
        a:hover img {
          transform: scale(1.06);
        }
      `}</style>
    </Link>
  );
}
