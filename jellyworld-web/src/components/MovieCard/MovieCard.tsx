"use client";

import Link from "next/link";
import { JellyfinItem, formatRuntime } from "@/lib/jellyfin";
import styles from "./MovieCard.module.css";

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

  const progress = item.UserData?.PlayedPercentage ?? 0;
  const isPoster = variant === "poster";

  return (
    <Link
      href={`/item/${item.Id}`}
      className={styles.card}
      style={{
        width: isPoster ? 140 : 200,
      }}
    >
      <div
        className={`${styles.thumbnail} ${
          isPoster ? styles.poster : styles.landscape
        }`}
      >
        <img
          src={isPoster ? item.posterUrl : item.backdropUrl}
          alt={item.Name}
          loading="lazy"
          className={styles.image}
        />

        <div className={styles.overlay} />

        <div className={styles.playButton}>
          <div className={styles.playCircle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>

        {item.CommunityRating && (
          <div className={styles.rating}>
            ★ {item.CommunityRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>
          {item.Name}
        </p>

        <p className={styles.subtitle}>
          {[item.ProductionYear, formatRuntime(item.RunTimeTicks)]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {showProgress && progress > 0 && (
          <div className={styles.progress}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}