import { redirect } from "next/navigation";
import { getHomeData, getLibraryShowcase } from "@/lib/jellyfin";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar/NavBar";
import HeroCarousel from "@/components/Hero/HeroCarousel";
import RailSection from "@/components/Rail/RailSection";
import LibraryShowcase from "@/components/Library/LibraryShowcase";

export const dynamic = "force-dynamic";
const HERO_ROTATION_SECONDS = 15;

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { libraries: navLibraries, activeLibraries, recentItems } = await getHomeData();
  // Vignettes bibliothèques — tirage aléatoire, un appel séparé (revalidate:0)
  // pour que l'image de chaque vignette change à chaque visite de la page.
  const showcase = await getLibraryShowcase(navLibraries, session.userId, 8);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={navLibraries} session={session} />
      {recentItems.length > 0 && <HeroCarousel items={recentItems} rotationSeconds={HERO_ROTATION_SECONDS} />}
      <main style={{
        padding: "0 40px 80px",
        marginTop: recentItems.length > 0 ? "-32px" : "calc(var(--jw-nav-height) + 32px)",
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", gap: 40,
      }}>
        <LibraryShowcase items={showcase} />
        {activeLibraries.map(lib => (
          <RailSection key={lib.Id} title={lib.Name} libraryId={lib.Id} items={lib.items} variant="poster" />
        ))}
      </main>
    </div>
  );
}
