import Link from "next/link";
import MovieCard from "./MovieCard/MovieCard";
import { JellyfinItem } from "@/lib/jellyfin";

interface RailSectionProps {
  title: string;
  libraryId: string;
  items: JellyfinItem[];
  variant?: "poster" | "landscape";
  showProgress?: boolean;
}

export default function RailSection({
  title,
  libraryId,
  items,
  variant = "poster",
  showProgress = false,
}: RailSectionProps) {
  if (items.length === 0) return null;

  return (
    <section>
      {/* En-tête du rail */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--jw-border-subtle)",
          paddingBottom: 10,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--jw-text-1)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <Link
          href={`/${libraryId}`}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--jw-purple)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            transition: "color var(--jw-transition)",
          }}
          onMouseEnter={(e) =>
            ((e.target as HTMLElement).style.color = "var(--jw-pink)")
          }
          onMouseLeave={(e) =>
            ((e.target as HTMLElement).style.color = "var(--jw-purple)")
          }
        >
          Voir tout →
        </Link>
      </div>

      {/* Scroll horizontal */}
      <div
        className="scrollbar-none"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
          scrollSnapType: "x mandatory",
        }}
      >
        {items.map((item) => (
          <div key={item.Id} style={{ scrollSnapAlign: "start" }}>
            <MovieCard
              item={item}
              variant={variant}
              showProgress={showProgress}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
