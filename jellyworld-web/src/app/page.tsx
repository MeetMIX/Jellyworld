import { redirect } from "next/navigation";
import { getHomeData, getUserLibraries } from "@/lib/jellyfin";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar/NavBar";
import HeroCarousel from "@/components/Hero/HeroCarousel";
import RailSection from "@/components/Rail/RailSection";
import ContinueWatching from "@/components/ContinueWatching";

export const dynamic = "force-dynamic";
const HERO_ROTATION_SECONDS = 15;

async function getContinueWatching(userId: string) {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const TOKEN    = process.env.JELLYFIN_API_KEY || "";
  const PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const API_KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";
  try {
    const res = await fetch(
      `${INTERNAL}/Users/${userId}/Items/Resume?Limit=12&MediaTypes=Video&Fields=PrimaryImageAspectRatio,ImageTags,UserData,RunTimeTicks&EnableTotalRecordCount=false`,
      { headers: { Authorization: `MediaBrowser Token="${TOKEN}"` }, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []).map((item: any) => ({
      Id: item.Id, Name: item.Name, Type: item.Type,
      ProductionYear: item.ProductionYear, RunTimeTicks: item.RunTimeTicks,
      PlaybackPositionTicks: item.UserData?.PlaybackPositionTicks ?? 0,
      PlayedPercentage: item.UserData?.PlayedPercentage ?? 0,
      posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&fillWidth=300&quality=90`,
      backdropUrl: `${PUBLIC}/Items/${item.Id}/Images/Backdrop?api_key=${API_KEY}&fillWidth=600&quality=80`,
    }));
  } catch { return []; }
}

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ libraries: navLibraries, activeLibraries, recentItems }, continueWatching] = await Promise.all([
    getHomeData(),
    getContinueWatching(session.userId),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={navLibraries} session={session} />
      {recentItems.length > 0 && <HeroCarousel items={recentItems} rotationSeconds={HERO_ROTATION_SECONDS} />}
      <main style={{
        padding: "0 40px 80px",
        marginTop: recentItems.length > 0 ? "-48px" : "calc(var(--jw-nav-height) + 32px)",
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", gap: 40,
      }}>
        {continueWatching.length > 0 && <ContinueWatching items={continueWatching} />}
        {activeLibraries.map(lib => (
          <RailSection key={lib.Id} title={lib.Name} libraryId={lib.Id} items={lib.items} variant="poster" />
        ))}
      </main>
    </div>
  );
}
