import { getHomeData } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import HeroSection from "@/components/Hero/HeroSection";
import RailSection from "@/components/Rail/RailSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { libraries, activeLibraries, heroItem } = await getHomeData();

  if (!libraries.length) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--jw-text-2)" }}>
        <p style={{ fontSize: 14, margin: 0 }}>Backend Jellyfin introuvable</p>
        <p style={{ fontSize: 12, color: "var(--jw-text-3)", margin: 0 }}>
          Vérifiez que le container <code>jellyfin-backend</code> est démarré
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />
      {heroItem && <HeroSection item={heroItem} />}
      <main style={{
        padding: `${heroItem ? "0" : "calc(var(--jw-nav-height) + 32px)"} var(--jw-page-px) 80px`,
        marginTop: heroItem ? "-48px" : 0,
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
