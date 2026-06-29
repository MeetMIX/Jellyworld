'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";
import styles from "./NavBar.module.css";

export default function NavBar({ libraries }: { libraries: JellyfinLibrary[] }) {
  const pathname = usePathname();

  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <img src="/logo.png" alt="JellyWorld" className={styles.logoImg} />
      </Link>

      <nav className={styles.links}>
        {libraries.map((lib) => (
          <Link
            key={lib.Id}
            href={`/${lib.Id}`}
            className={`${styles.link} ${pathname === `/${lib.Id}` ? styles.active : ""}`}
          >
            {lib.Name}
          </Link>
        ))}
      </nav>

      <div className={styles.actions}>
        <button className={styles.searchBtn} aria-label="Rechercher">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        <div className={styles.avatar}>A</div>
      </div>
    </header>
  );
}
