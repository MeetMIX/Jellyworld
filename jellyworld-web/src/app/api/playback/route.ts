import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false });

  const { itemId, action } = await req.json();
  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    "Content-Type": "application/json",
  };

  try {
    if (action === "start") {
      // Notifie Jellyfin du début de lecture → met à jour "En cours"
      await fetch(`${JELLYFIN_INTERNAL}/Sessions/Playing`, {
        method: "POST", headers,
        body: JSON.stringify({ ItemId: itemId, CanSeek: true, IsPaused: false }),
      });
    } else if (action === "stop") {
      await fetch(`${JELLYFIN_INTERNAL}/Sessions/Playing/Stopped`, {
        method: "POST", headers,
        body: JSON.stringify({ ItemId: itemId }),
      });
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
