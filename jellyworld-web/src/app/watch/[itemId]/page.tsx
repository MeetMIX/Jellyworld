import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import FullscreenPlayer from "@/components/Player/FullscreenPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ versionId?: string; audioIdx?: string; subIdx?: string; startTicks?: string; }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { itemId } = await params;
  const { versionId, audioIdx, subIdx, startTicks } = await searchParams;

  return (
    <FullscreenPlayer
      itemId={itemId}
      versionId={versionId ?? itemId}
      audioIdx={audioIdx ? parseInt(audioIdx) : -1}
      subIdx={subIdx ? parseInt(subIdx) : -1}
      startTicks={startTicks ? parseInt(startTicks) : 0}
      userId={session.userId}
      token={session.token}
    />
  );
}
