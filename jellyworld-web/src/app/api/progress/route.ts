import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// ✅ Cache en mémoire pour éviter les appels GET répétés en rafale
const itemCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30000; // 30s

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ item: null });

  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ item: null });

  const cacheKey = `${session.userId}:${itemId}`;
  const cached = itemCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ item: cached.data });
  }

  try {
    const res = await fetch(
      `${INTERNAL}/Users/${session.userId}/Items/${itemId}?Fields=UserData,RunTimeTicks,Name,ProductionYear,MediaStreams`,
      { headers: { Authorization: `MediaBrowser Token="${session.token}"` }, cache: "no-store" }
    );
    const item = await res.json();
    const result = {
      Name: item.Name,
      ProductionYear: item.ProductionYear,
      PlaybackPositionTicks: item.UserData?.PlaybackPositionTicks ?? 0,
      Played: item.UserData?.Played ?? false,
      MediaStreams: item.MediaStreams ?? [],
    };
    itemCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });
    return NextResponse.json({ item: result });
  } catch {
    return NextResponse.json({ item: null });
  }
}

// ✅ Throttle des écritures "progress" — Jellyfin n'a pas besoin d'une update toutes les 10s,
// 30s suffit largement et réduit la pression sur SQLite de 66%
let lastProgressWrite = new Map<string, number>();
const PROGRESS_THROTTLE = 25000; // 25s minimum entre deux écritures progress pour le même item

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false });

  const body = await req.json().catch(() => ({}));
  const { itemId, action, positionTicks } = body;
  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    "Content-Type": "application/json",
  };

  try {
    if (action === "start") {
      // start et stop restent immédiats (pas de throttle, ce sont des events ponctuels)
      await fetch(`${INTERNAL}/Sessions/Playing`, {
        method: "POST", headers,
        body: JSON.stringify({ ItemId: itemId, CanSeek: true, IsPaused: false, PositionTicks: positionTicks ?? 0 }),
      });
    } else if (action === "progress") {
      // ✅ Throttle : ignore les écritures trop rapprochées
      const key = `${session.userId}:${itemId}`;
      const last = lastProgressWrite.get(key) ?? 0;
      const now = Date.now();
      if (now - last < PROGRESS_THROTTLE) {
        return NextResponse.json({ ok: true, throttled: true });
      }
      lastProgressWrite.set(key, now);

      await fetch(`${INTERNAL}/Sessions/Playing/Progress`, {
        method: "POST", headers,
        body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks, IsPaused: false }),
      });
    } else if (action === "stop") {
      lastProgressWrite.delete(`${session.userId}:${itemId}`);
      await fetch(`${INTERNAL}/Sessions/Playing/Stopped`, {
        method: "POST", headers,
        body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
