import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import FullscreenPlayer from "@/components/Player/FullscreenPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params, searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ versionId?: string; audioIdx?: string; subIdx?: string; startTicks?: string; }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { itemId } = await params;
  const { versionId, audioIdx, subIdx, startTicks } = await searchParams;

  const PUBLIC    = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const TOKEN_PUB = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";
  const logoUrl     = `${PUBLIC}/Items/${itemId}/Images/Logo?api_key=${TOKEN_PUB}&fillWidth=500&quality=90`;
  const backdropUrl = `${PUBLIC}/Items/${itemId}/Images/Backdrop?api_key=${TOKEN_PUB}&fillWidth=1920&quality=80`;

  return (
    <FullscreenPlayer
      itemId={itemId}
      versionId={versionId ?? itemId}
      audioIdx={audioIdx ? parseInt(audioIdx) : -1}
      subIdx={subIdx ? parseInt(subIdx) : -1}
      startTicks={startTicks ? parseInt(startTicks) : 0}
      userId={session.userId}
      token={session.token}
      logoUrl={logoUrl}
      backdropUrl={backdropUrl}
    />
  );
}
