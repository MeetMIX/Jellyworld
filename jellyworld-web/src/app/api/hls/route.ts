import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// ✅ NOUVELLE APPROCHE : on demande à Jellyfin lui-même de construire l'URL,
// exactement comme le fait le client web officiel, via PlaybackInfo.
// On ne devine plus les paramètres — on laisse Jellyfin décider.
async function getPlaybackInfo(itemId: string, userId: string, token: string, audioIdx: number, subIdx: number, startTicks: number) {
  const body = {
    UserId: userId,
    StartTimeTicks: startTicks > 0 ? startTicks : 0,
    AudioStreamIndex: audioIdx >= 0 ? audioIdx : undefined,
    SubtitleStreamIndex: subIdx >= 0 ? subIdx : undefined,
    MaxStreamingBitrate: 120000000,
    // ✅ Profil identique à celui que Jellyfin Web envoie réellement
    DeviceProfile: {
      MaxStreamingBitrate: 120000000,
      MaxStaticBitrate: 100000000,
      MusicStreamingTranscodingBitrate: 384000,
      DirectPlayProfiles: [
        { Container: "webm", Type: "Video", VideoCodec: "vp8,vp9,av1", AudioCodec: "vorbis,opus" },
        { Container: "mp4,m4v", Type: "Video", VideoCodec: "h264,vp9,av1,hevc", AudioCodec: "aac,mp3,opus,flac,vorbis" },
        { Container: "mkv", Type: "Video", VideoCodec: "h264,vp9,av1,hevc", AudioCodec: "aac,mp3,opus,flac,vorbis,ac3,eac3" },
        { Container: "mp3", Type: "Audio" },
        { Container: "aac", Type: "Audio" },
        { Container: "m4a", AudioCodec: "aac", Type: "Audio" },
        { Container: "flac", Type: "Audio" },
        { Container: "webma,webm", Type: "Audio" },
        { Container: "wav", Type: "Audio" },
        { Container: "ogg", Type: "Audio" },
      ],
      TranscodingProfiles: [
        { Container: "ts", Type: "Audio", AudioCodec: "aac", Context: "Streaming", Protocol: "hls", MaxAudioChannels: "6", MinSegments: "1", BreakOnNonKeyFrames: true },
        { Container: "aac", Type: "Audio", AudioCodec: "aac", Context: "Streaming", Protocol: "http", MaxAudioChannels: "6" },
        { Container: "mp3", Type: "Audio", AudioCodec: "mp3", Context: "Streaming", Protocol: "http" },
        {
          Container: "ts", Type: "Video", AudioCodec: "aac,mp3,ac3,eac3,opus", VideoCodec: "h264",
          Context: "Streaming", Protocol: "hls", MaxAudioChannels: "6",
          MinSegments: "1", BreakOnNonKeyFrames: true,
        },
      ],
      ContainerProfiles: [],
      CodecProfiles: [
        {
          Type: "Video", Codec: "h264",
          Conditions: [
            { Condition: "NotEquals", Property: "IsAnamorphic", Value: "true", IsRequired: false },
            { Condition: "EqualsAny", Property: "VideoProfile", Value: "high|main|baseline|constrained baseline", IsRequired: false },
            { Condition: "LessThanEqual", Property: "VideoLevel", Value: "51", IsRequired: false },
          ],
        },
      ],
      SubtitleProfiles: [
        { Format: "vtt", Method: "Hls" },
        { Format: "ass", Method: "Encode" },
        { Format: "ssa", Method: "Encode" },
        { Format: "srt", Method: "Encode" },
      ],
    },
  };

  try {
    const res = await fetch(`${INTERNAL}/Items/${itemId}/PlaybackInfo`, {
      method: "POST",
      headers: {
        Authorization: `MediaBrowser Token="${token}"`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("[PlaybackInfo] error:", e);
    return null;
  }
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
  const audioIdx   = parseInt(searchParams.get("audioIdx") ?? "-1");
  const subIdx     = parseInt(searchParams.get("subIdx") ?? "-1");
  const startTicks = parseInt(searchParams.get("startTicks") ?? "0");

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
      // ✅ On laisse Jellyfin décider via PlaybackInfo — comme le client officiel
      const playbackInfo = await getPlaybackInfo(itemId, session.userId, session.token, audioIdx, subIdx, startTicks);

      if (!playbackInfo?.MediaSources?.length) {
        console.error("[HLS Proxy] PlaybackInfo n'a retourné aucune MediaSource");
        return new NextResponse("Impossible d'obtenir les infos de lecture", { status: 502 });
      }

      const source = playbackInfo.MediaSources.find((s: any) => s.Id === versionId) ?? playbackInfo.MediaSources[0];
      console.log(`[HLS Proxy] SupportsDirectPlay=${source.SupportsDirectPlay} SupportsDirectStream=${source.SupportsDirectStream} TranscodingUrl=${!!source.TranscodingUrl}`);

      dedupeKey = `${session.userId}:${itemId}:${source.Id}:${audioIdx}:${subIdx}:${startTicks}`;
      const playSessionId = playbackInfo.PlaySessionId ?? getStablePlaySessionId(session.userId, itemId, String(audioIdx), String(subIdx));

      if (source.SupportsDirectStream && !source.TranscodingUrl) {
        // ✅ DirectStream : Jellyfin sert le fichier en HLS sans réencoder (remux pur)
        const p = new URLSearchParams({
          api_key: session.token,
          MediaSourceId: source.Id,
          DeviceId: `jellyworld-${session.userId}`,
          PlaySessionId: playSessionId,
          ...(audioIdx >= 0 ? { AudioStreamIndex: String(audioIdx) } : {}),
          ...(subIdx >= 0 ? { SubtitleStreamIndex: String(subIdx) } : {}),
          ...(startTicks > 0 ? { StartTimeTicks: String(startTicks) } : {}),
          Static: "false",
        });
        targetUrl = `${INTERNAL}/Videos/${itemId}/master.m3u8?${p}`;
      } else if (source.TranscodingUrl) {
        // ✅ Jellyfin a déjà calculé l'URL de transcodage optimale lui-même
        targetUrl = `${INTERNAL}${source.TranscodingUrl}`;
      } else {
        return new NextResponse("Aucune méthode de lecture disponible pour ce fichier", { status: 502 });
      }
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] → ${targetUrl.substring(0, 180)}...`);

    if (dedupeKey && inFlightRequests.has(dedupeKey)) {
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
        isTimeout ? "Timeout Jellyfin" : `Erreur: ${e.message}`,
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
