import { getHomeData } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import HeroCarousel from "@/components/Hero/HeroCarousel";
import RailSection from "@/components/Rail/RailSection";

export const dynamic = "force-dynamic";

// Paramètre de rotation en secondes — modifiable ici
const HERO_ROTATION_SECONDS = 15;

export default async function Home() {
  const { libraries, activeLibraries, recentItems } = await getHomeData();

  if (!libraries.length) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--jw-text-2)" }}>
        <p>Backend Jellyfin introuvable — vérifiez que le container est démarré.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />

      {/* Hero carousel — films récents */}
      {recentItems.length > 0 && (
        <HeroCarousel items={recentItems} rotationSeconds={HERO_ROTATION_SECONDS} />
      )}

      {/* Rails */}
      <main style={{
        padding: `0 48px 80px`,
        marginTop: recentItems.length > 0 ? "-48px" : "calc(72px + 32px)",
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", gap: 40,
      }}>
        {activeLibraries.map((lib) => (
          <RailSection key={lib.Id} title={lib.Name} libraryId={lib.Id} items={lib.items} variant="poster" />
        ))}
      </main>
    </div>
  );
}
