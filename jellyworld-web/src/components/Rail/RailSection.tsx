import Link from "next/link";
import MovieCard from "@/components/MovieCard/MovieCard";
import { JellyfinItem } from "@/lib/jellyfin";
import styles from "./Rail.module.css";

interface RailSectionProps {
  title: string;
  libraryId: string;
  items: JellyfinItem[];
  variant?: "poster" | "landscape";
  showProgress?: boolean;
}

export default function RailSection({ title, libraryId, items, variant = "poster", showProgress = false }: RailSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={styles.rail}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <Link href={`/${libraryId}`} className={styles.viewAll}>Voir tout →</Link>
      </div>
      <div className={styles.scroll}>
        {items.map((item) => (
          <MovieCard key={item.Id} item={item} variant={variant} showProgress={showProgress} />
        ))}
      </div>
    </section>
  );
}
