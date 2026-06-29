'use client';

import { JellyfinItem, formatRuntime } from "@/lib/jellyfin";
import styles from "./Hero.module.css";

export default function HeroSection({ item }: { item: JellyfinItem }) {
  const runtime = formatRuntime(item.RunTimeTicks);

  return (
    <section className={styles.hero}>
      <div className={styles.bg}>
        <img src={item.backdropUrl} alt={item.Name} className={styles.bgImg} />
        <div className={styles.gradTop} />
        <div className={styles.gradLeft} />
      </div>

      <div className={styles.content}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          À la une
        </span>

        <h1 className={styles.title}>{item.Name}</h1>

        <div className={styles.meta}>
          {item.ProductionYear && <span>{item.ProductionYear}</span>}
          {item.ProductionYear && runtime && <span className={styles.dot} />}
          {runtime && <span>{runtime}</span>}
          {item.CommunityRating && (
            <><span className={styles.dot} />
            <span className={styles.rating}>★ {item.CommunityRating.toFixed(1)}</span></>
          )}
        </div>

        {item.Overview && <p className={styles.overview}>{item.Overview}</p>}

        <div className={styles.actions}>
          <button className={styles.btnPrimary}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            Regarder
          </button>
          <button className={styles.btnSecondary}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" /></svg>
            Détails
          </button>
        </div>
      </div>
    </section>
  );
}
