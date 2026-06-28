'use client';

import Link from "next/link";
import { JellyfinItem, formatRuntime } from "@/lib/jellyfin";
import { useState } from "react";

interface MovieCardProps {
  item: JellyfinItem;
  variant?: "poster" | "landscape";
  showProgress?: boolean;
}

export default function MovieCard({
  item,
  variant = "poster",
  showProgress = false,
}: MovieCardProps) {
  const [hovered, setHovered] = useState(false);
  const progress = item.UserData?.PlayedPercentage ?? 0;
  const isPoster = variant === "poster";

  return (
    <Link
      href={`/item/${item.Id}`}
      className="block shrink-0"
      style={{ width: isPoster ? "140px" : "200px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--jw-r-card)",
          aspectRatio: isPoster ? "2/3" : "16/9",
          background: "var(--jw-card)",
          border: `1px solid ${hovered ? "var(--jw-border-strong)" : "var(--jw-border-subtle)"}`,
          boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.5)" : "none",
          transform: hovered ? "scale(1.04) translateY(-3px)" : "scale(1)",
          transition: "border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
        }}
      >
        {/* Image */}
        <img
          src={isPoster ? item.posterUrl : item.backdropUrl}
          alt={item.Name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition: "transform 350ms ease",
          }}
          loading="lazy"
        />

        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(7,6,11,0.92) 0%, rgba(7,6,11,0.2) 60%, transparent 100%)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />

        {/* Bouton play */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        >
          <div
            style={{
              width: 40, height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingLeft: 3,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>

        {/* Rating */}
        {item.CommunityRating && (
          <div
            style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(7,6,11,0.75)",
              backdropFilter: "blur(6px)",
              borderRadius: "var(--jw-r-sm)",
              padding: "2px 6px",
              fontSize: 10, fontWeight: 700, color: "#A06EF0",
            }}
          >
            ★ {item.CommunityRating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 2px 0" }}>
        <p
          style={{
            fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.4,
            color: hovered ? "var(--jw-text-1)" : "var(--jw-text-2)",
            transition: "color 200ms ease",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {item.Name}
        </p>
        <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: "2px 0 0" }}>
          {[item.ProductionYear, formatRuntime(item.RunTimeTicks)].filter(Boolean).join(" · ")}
        </p>

        {showProgress && progress > 0 && (
          <div style={{ height: 2, background: "rgba(255,255,255,0.10)", borderRadius: 1, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--jw-gradient)", borderRadius: 1 }} />
          </div>
        )}
      </div>
    </Link>
  );
}