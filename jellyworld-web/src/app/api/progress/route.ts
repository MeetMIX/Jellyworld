import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ item: null });

  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ item: null });

  try {
    const res = await fetch(
      `${INTERNAL}/Users/${session.userId}/Items/${itemId}?Fields=UserData,RunTimeTicks,Name,ProductionYear`,
      { headers: { Authorization: `MediaBrowser Token="${session.token}"` }, cache: "no-store" }
    );
    const item = await res.json();
    return NextResponse.json({ item: { Name: item.Name, ProductionYear: item.ProductionYear, PlaybackPositionTicks: item.UserData?.PlaybackPositionTicks ?? 0, Played: item.UserData?.Played ?? false } });
  } catch {
    return NextResponse.json({ item: null });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false });

  const body = await req.json().catch(() => ({}));
  const { itemId, action, positionTicks } = body;
  const headers = { Authorization: `MediaBrowser Token="${session.token}"`, "Content-Type": "application/json" };

  try {
    if (action === "start") {
      await fetch(`${INTERNAL}/Sessions/Playing`, { method: "POST", headers, body: JSON.stringify({ ItemId: itemId, CanSeek: true, IsPaused: false, PositionTicks: positionTicks ?? 0 }) });
    } else if (action === "progress") {
      await fetch(`${INTERNAL}/Sessions/Playing/Progress`, { method: "POST", headers, body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks, IsPaused: false }) });
    } else if (action === "stop") {
      await fetch(`${INTERNAL}/Sessions/Playing/Stopped`, { method: "POST", headers, body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }) });
      // Marquer vu si > 90%
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
