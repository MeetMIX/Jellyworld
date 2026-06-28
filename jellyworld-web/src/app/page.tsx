import { getHomeData } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import HeroSection from "@/components/HeroSection";
import RailSection from "@/components/RailSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { libraries, activeLibraries, heroItem } = await getHomeData();

  if (!libraries.length) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          color: "var(--jw-text-2)",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        <p style={{ fontSize: 14, margin: 0 }}>Backend Jellyfin introuvable</p>
        <p style={{ fontSize: 12, color: "var(--jw-text-3)", margin: 0 }}>
          Vérifiez que le container <code>jellyfin-backend</code> est démarré
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--jw-bg)",
        color: "var(--jw-text-1)",
      }}
    >
      {/* Navigation */}
      <NavBar libraries={libraries} />

      {/* Hero */}
      {heroItem && <HeroSection item={heroItem} />}

      {/* Rails de contenu */}
      <main
        style={{
          padding: `${heroItem ? "0" : "calc(var(--jw-nav-height) + 32px)"} var(--jw-page-px) 80px`,
          marginTop: heroItem ? "-48px" : 0,
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {activeLibraries.map((lib) => (
          <RailSection
            key={lib.Id}
            title={lib.Name}
            libraryId={lib.Id}
            items={lib.items}
            variant="poster"
          />
        ))}
      </main>
    </div>
  );
}
