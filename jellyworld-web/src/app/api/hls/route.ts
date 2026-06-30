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

const sessionIds = new Map<string, string>();
function getStablePlaySessionId(userId: string, itemId: string, audioIdx: string, subIdx: string): string {
  const key = `${userId}:${itemId}:${audioIdx}:${subIdx}`;
  let id = sessionIds.get(key);
  if (!id) {
    id = `jw-${userId}-${itemId}-${Date.now()}`;
    sessionIds.set(key, id);
    setTimeout(() => sessionIds.delete(key), 5 * 60 * 1000);
  }
  return id;
}

const inFlightRequests = new Map<string, Promise<any>>();

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
      const hasSubtitleBurn = parseInt(subIdx) >= 0;

      // ✅ FIX CRITIQUE : on sépare la décision vidéo de la décision audio.
      // Le navigateur lit nativement le H264 — si la vidéo est déjà H264 et
      // qu'on n'a pas de sous-titres à incruster, on COPIE la vidéo (gratuit
      // en CPU) même si l'audio doit être transcodé (DTS/AC3 → AAC).
      // Avant : tout l'item était réencodé en H264 dès que l'AUDIO posait
      // problème — c'est ce qui causait les ralentissements énormes.
      const videoCanCopy = NATIVE_VIDEO_CODECS.includes(videoCodec) && !hasSubtitleBurn;
      const audioCanCopy = NATIVE_AUDIO_CODECS.includes(audioCodec);
      const canFullDirectPlay = videoCanCopy && audioCanCopy;
      const isHeavyVideoTranscode = !videoCanCopy && (videoHeight >= 2000 || isHDR);

      console.log(`[HLS Proxy] Codec=${videoCodec}/${audioCodec} ${videoHeight}p HDR=${isHDR} → VideoCopy=${videoCanCopy} AudioCopy=${audioCanCopy} HeavyVideoTC=${isHeavyVideoTranscode}`);

      dedupeKey = `${session.userId}:${itemId}:${vid}:${audioIdx}:${subIdx}:${startTicks}`;
      const playSessionId = getStablePlaySessionId(session.userId, itemId, audioIdx, subIdx);

      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: vid,
        DeviceId: `jellyworld-${session.userId}`,
        TranscodingContainer: "ts",
        TranscodingMaxAudioChannels: "6",
        EnableMpegtsM2TsMode: "false",
        ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
        ...(parseInt(subIdx) >= 0 ? { SubtitleStreamIndex: subIdx, SubtitleMethod: "Encode" } : {}),
        ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        PlaySessionId: playSessionId,
      });

      // ✅ Vidéo : copy si possible, sinon transcoder (avec downscale si lourd)
      if (videoCanCopy) {
        p.set("VideoCodec", "copy");
      } else if (isHeavyVideoTranscode) {
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

      // ✅ Audio : codec accepté large (le navigateur HLS gère bien aac/mp3/ac3/eac3 en TS)
      // Si déjà natif, copy ; sinon transcoder seulement l'audio (quasi gratuit en CPU)
      if (audioCanCopy) {
        p.set("AudioCodec", "copy");
      } else {
        p.set("AudioCodec", "aac");
      }

      targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] → ${targetUrl.substring(0, 170)}...`);

    if (dedupeKey && inFlightRequests.has(dedupeKey)) {
      console.log(`[HLS Proxy] Requête déjà en vol pour ${dedupeKey}, attente...`);
      try {
        const result = await inFlightRequests.get(dedupeKey)!;
        return buildResponse(result, req);
      } catch {}
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
      inFlightRequests.set(dedupeKey, fetchPromise);
      fetchPromise.finally(() => {
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

function buildResponse(result: any, req: NextRequest): NextResponse {
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
