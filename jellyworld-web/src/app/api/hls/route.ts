import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

const NATIVE_VIDEO_CODECS = ["h264", "avc", "avc1"];
const NATIVE_AUDIO_CODECS = ["aac", "mp3"];

async function getMediaSourceInfo(itemId: string, versionId: string, userId: string, token: string) {
  try {
    const res = await fetch(`${INTERNAL}/Items/${itemId}/PlaybackInfo?UserId=${userId}`, {
      method: "POST",
      headers: { Authorization: `MediaBrowser Token="${token}"`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.MediaSources?.find((s: any) => s.Id === versionId) ?? data.MediaSources?.[0];
  } catch { return null; }
}

// ✅ CRUCIAL : un PlaySessionId STABLE par session de lecture (pas un nouveau à chaque retry/appel)
// Stocké en mémoire côté serveur, indexé par itemId+userId+audioIdx+subIdx
// → Jellyfin réutilise le job de transcodage existant au lieu d'en relancer un nouveau
const sessionIds = new Map<string, string>();
function getStablePlaySessionId(userId: string, itemId: string, audioIdx: string, subIdx: string): string {
  const key = `${userId}:${itemId}:${audioIdx}:${subIdx}`;
  let id = sessionIds.get(key);
  if (!id) {
    id = `jw-${userId}-${itemId}-${Date.now()}`;
    sessionIds.set(key, id);
    // Nettoyage auto après 5 minutes pour éviter les fuites mémoire
    setTimeout(() => sessionIds.delete(key), 5 * 60 * 1000);
  }
  return id;
}

// ✅ Empêche plusieurs requêtes concurrentes identiques de partir en parallèle.
// Si une requête pour le même stream est déjà en vol, on attend son résultat
// au lieu d'en lancer une deuxième.
const inFlightRequests = new Map<string, Promise<{ status: number; body: string | ReadableStream | null; contentType: string }>>();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401 });

  const { searchParams } = req.nextUrl;
  const proxyUrl   = searchParams.get("url");
  const itemId     = searchParams.get("itemId");
  const versionId  = searchParams.get("versionId");
  const audioIdx   = searchParams.get("audioIdx") ?? "-1";
  const subIdx     = searchParams.get("subIdx") ?? "-1";
  const startTicks = searchParams.get("startTicks") ?? "0";

  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    Accept: "*/*",
    "User-Agent": "JellyWorld/1.0",
  };

  try {
    let targetUrl: string;
    let dedupeKey: string | null = null;

    if (proxyUrl) {
      const decoded = decodeURIComponent(proxyUrl);
      targetUrl = decoded.startsWith("/") ? `${INTERNAL}${decoded}` : decoded;
    } else if (itemId) {
      const vid = versionId ?? itemId;
      const mediaSource = await getMediaSourceInfo(itemId, vid, session.userId, session.token);
      const videoStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === "Video");
      const audioStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === "Audio" && (audioIdx === "-1" || s.Index === parseInt(audioIdx)));

      const videoCodec = (videoStream?.Codec ?? "").toLowerCase();
      const audioCodec = (audioStream?.Codec ?? "").toLowerCase();
      const videoHeight = videoStream?.Height ?? 0;
      const isHDR = videoStream?.VideoRange === "HDR";
      const canDirectPlay =
        NATIVE_VIDEO_CODECS.includes(videoCodec) &&
        NATIVE_AUDIO_CODECS.includes(audioCodec) &&
        parseInt(subIdx) < 0;
      const isHeavyTranscode = !canDirectPlay && (videoHeight >= 2000 || isHDR);

      console.log(`[HLS Proxy] Codec=${videoCodec}/${audioCodec} ${videoHeight}p HDR=${isHDR} → DirectPlay=${canDirectPlay} Heavy=${isHeavyTranscode}`);

      // ✅ Clé de dédoublonnage : même fichier + mêmes streams = même job
      dedupeKey = `${session.userId}:${itemId}:${vid}:${audioIdx}:${subIdx}:${startTicks}`;
      const playSessionId = getStablePlaySessionId(session.userId, itemId, audioIdx, subIdx);

      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: vid,
        DeviceId: `jellyworld-${session.userId}`,
        AudioCodec: "aac,mp3,ac3,eac3,opus",
        TranscodingContainer: "ts",
        TranscodingMaxAudioChannels: "6",
        EnableMpegtsM2TsMode: "false",
        ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
        ...(parseInt(subIdx) >= 0 ? { SubtitleStreamIndex: subIdx, SubtitleMethod: "Encode" } : {}),
        ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        PlaySessionId: playSessionId, // ✅ STABLE, pas Date.now() à chaque appel
      });

      if (canDirectPlay) {
        p.set("VideoCodec", "copy");
      } else if (isHeavyTranscode) {
        p.set("VideoCodec", "h264");
        p.set("MaxWidth", "1920");
        p.set("MaxHeight", "1080");
        p.set("VideoBitRate", "5000000");
        p.set("MaxVideoBitDepth", "8");
      } else {
        p.set("VideoCodec", "h264");
        p.set("VideoBitRate", "6000000");
        p.set("MaxVideoBitDepth", "8");
      }

      targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] → ${targetUrl.substring(0, 160)}...`);

    // ✅ Si une requête identique est déjà en vol, on attend SON résultat
    // au lieu de relancer un nouveau fetch (et donc un nouveau ffmpeg)
    if (dedupeKey && inFlightRequests.has(dedupeKey)) {
      console.log(`[HLS Proxy] Requête déjà en vol pour ${dedupeKey}, attente du résultat existant...`);
      try {
        const result = await inFlightRequests.get(dedupeKey)!;
        return buildResponse(result, req);
      } catch {
        // Le résultat en vol a échoué, on continue avec une nouvelle tentative
      }
    }

    const fetchPromise = (async () => {
      const controller = new AbortController();
      const timeoutMs = proxyUrl ? 20000 : 60000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const upstream = await fetch(targetUrl, { headers, cache: "no-store", signal: controller.signal });
        clearTimeout(timer);

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 150)}`);
          return { status: 502, body: `Jellyfin ${upstream.status}`, contentType: "text/plain" };
        }

        const contentType = upstream.headers.get("content-type") ?? "";
        const contentLength = parseInt(upstream.headers.get("content-length") ?? "0");
        const looksLikeRawFile = contentLength > 1_000_000;

        if (!looksLikeRawFile && (contentType.includes("mpegurl") || targetUrl.includes(".m3u8"))) {
          const text = await upstream.text();
          if (!text.startsWith("#EXTM3U")) {
            return { status: 502, body: "Manifest HLS invalide", contentType: "text/plain" };
          }
          return { status: 200, body: text, contentType: "application/vnd.apple.mpegurl" };
        }

        return { status: 200, body: upstream.body, contentType: contentType || "video/mp2t" };
      } catch (e: any) {
        clearTimeout(timer);
        throw e;
      }
    })();

    if (dedupeKey) {
      inFlightRequests.set(dedupeKey, fetchPromise as any);
      fetchPromise.finally(() => {
        // Garde le résultat en cache 2s pour les requêtes qui arrivent juste après
        setTimeout(() => inFlightRequests.delete(dedupeKey!), 2000);
      });
    }

    try {
      const result = await fetchPromise;
      return buildResponse(result, req);
    } catch (e: any) {
      console.error(`[HLS Proxy] Échec:`, e.message);
      const isTimeout = e.name === "AbortError";
      return new NextResponse(
        isTimeout ? "Timeout Jellyfin — transcodage trop lent" : `Erreur: ${e.message}`,
        { status: isTimeout ? 504 : 502 }
      );
    }

  } catch (e: any) {
    console.error("[HLS Proxy] Erreur:", e.message);
    return new NextResponse(`Erreur: ${e.message}`, { status: 500 });
  }
}

function buildResponse(
  result: { status: number; body: string | ReadableStream | null; contentType: string },
  req: NextRequest
): NextResponse {
  if (result.status !== 200) {
    return new NextResponse(result.body as string, { status: result.status });
  }
  if (result.contentType === "application/vnd.apple.mpegurl") {
    return new NextResponse(rewriteM3u8(result.body as string, req), {
      headers: { "Content-Type": result.contentType, "Cache-Control": "no-cache, no-store", "Access-Control-Allow-Origin": "*" },
    });
  }
  return new NextResponse(result.body as ReadableStream, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
  });
}

function rewriteM3u8(content: string, req: NextRequest): string {
  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return content.split("\n").map(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    if (t.startsWith("http://") || t.startsWith("https://")) {
      return `${base}/api/hls?url=${encodeURIComponent(t)}`;
    }
    if (t.includes(".m3u8") || t.includes(".ts") || t.includes("?")) {
      const full = t.startsWith("/") ? `${INTERNAL}${t}` : `${INTERNAL}/${t}`;
      return `${base}/api/hls?url=${encodeURIComponent(full)}`;
    }
    return line;
  }).join("\n");
}
