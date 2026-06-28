import { JellyfinItem, formatRuntime } from "@/lib/jellyfin";

interface HeroSectionProps {
  item: JellyfinItem;
}

export default function HeroSection({ item }: HeroSectionProps) {
  const runtime = formatRuntime(item.RunTimeTicks);

  return (
    <section
      style={{
        position: "relative",
        height: "82vh",
        minHeight: 480,
        display: "flex",
        alignItems: "flex-end",
        padding: `calc(var(--jw-nav-height) + 24px) var(--jw-page-px) 52px`,
        overflow: "hidden",
      }}
    >
      {/* Image de fond */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img
          src={item.backdropUrl}
          alt={item.Name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.45) contrast(1.05)",
          }}
        />
        {/* Dégradés */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, var(--jw-bg) 0%, rgba(7,6,11,0.15) 50%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, var(--jw-bg) 0%, rgba(7,6,11,0.6) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Contenu */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Badge */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#A06EF0",
              background: "rgba(107,47,217,0.18)",
              border: "1px solid rgba(107,47,217,0.4)",
              borderRadius: "var(--jw-r-sm)",
              padding: "4px 12px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#A06EF0",
                display: "inline-block",
              }}
            />
            À la une
          </span>
        </div>

        {/* Titre */}
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            color: "#fff",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {item.Name}
        </h1>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: "var(--jw-text-2)",
          }}
        >
          {item.ProductionYear && <span>{item.ProductionYear}</span>}
          {item.ProductionYear && runtime && (
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "var(--jw-text-3)",
                display: "inline-block",
              }}
            />
          )}
          {runtime && <span>{runtime}</span>}
          {item.CommunityRating && (
            <>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "var(--jw-text-3)",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#A06EF0", fontWeight: 700 }}>
                ★ {item.CommunityRating.toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {item.Overview && (
          <p
            style={{
              fontSize: 13,
              color: "var(--jw-text-2)",
              lineHeight: 1.7,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxWidth: 460,
            }}
          >
            {item.Overview}
          </p>
        )}

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "opacity var(--jw-transition), transform var(--jw-transition)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.88";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Regarder
          </button>

          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: "var(--jw-r-md)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--jw-text-1)",
              cursor: "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
              transition: "background var(--jw-transition), transform var(--jw-transition)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            Détails
          </button>
        </div>
      </div>
    </section>
  );
}
