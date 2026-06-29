import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// Marquer vu (POST) ou non-vu (DELETE)
async function toggleWatched(itemId: string, watched: boolean, token: string, userId: string) {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/PlayedItems/${itemId}`;
  const res = await fetch(url, {
    method: watched ? "POST" : "DELETE",
    headers: {
      Authorization: `MediaBrowser Token="${token}"`,
      "Content-Type": "application/json",
    },
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { itemId, watched } = await req.json();
  const ok = await toggleWatched(itemId, watched, session.token, session.userId);
  return NextResponse.json({ ok });
}
