import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// Détermine si un codec est lisible nativement par le navigateur (DirectPlay possible)
const NATIVE_VIDEO_CODECS = ["h264", "avc", "avc1"];
const NATIVE_AUDIO_CODECS = ["aac", "mp3"];

async function getMediaSourceInfo(itemId: string, versionId: string, userId: string, token: string) {
  try {
    const res = await fetch(`${INTERNAL}/Items/${itemId}/PlaybackInfo?UserId=${userId}`, {
      method: "POST",
      headers: {
        Authorization: `MediaBrowser Token="${token}"`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        DeviceProfile: {
          MaxStreamingBitrate: 120000000,
          DirectPlayProfiles: [
            { Container: "mp4,mkv,webm", Type: "Video", VideoCodec: "h264,vp9,av1", AudioCodec: "aac,mp3,opus" },
          ],
          TranscodingProfiles: [
            { Container: "ts", Type: "Video", VideoCodec: "h264", AudioCodec: "aac", Context: "Streaming", Protocol: "hls" },
          ],
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const source = data.MediaSources?.find((s: any) => s.Id === versionId) ?? data.MediaSources?.[0];
    return source;
  } catch {
    return null;
  }
}

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
  const directMode = searchParams.get("direct"); // "1" si déjà testé DirectPlay

  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    Accept: "*/*",
    "User-Agent": "JellyWorld/1.0",
  };

  try {
    let targetUrl: string;

    if (proxyUrl) {
      const decoded = decodeURIComponent(proxyUrl);
      targetUrl = decoded.startsWith("/") ? `${INTERNAL}${decoded}` : decoded;
    } else if (itemId) {
      const vid = versionId ?? itemId;

      // ✅ Vérifie d'abord si DirectPlay est possible (comme Jellyfin natif)
      const mediaSource = await getMediaSourceInfo(itemId, vid, session.userId, session.token);
      const videoStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === "Video");
      const audioStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === "Audio" && (audioIdx === "-1" || s.Index === parseInt(audioIdx)));

      const videoCodec = (videoStream?.Codec ?? "").toLowerCase();
      const audioCodec = (audioStream?.Codec ?? "").toLowerCase();

      const canDirectPlay =
        NATIVE_VIDEO_CODECS.includes(videoCodec) &&
        NATIVE_AUDIO_CODECS.includes(audioCodec) &&
        parseInt(subIdx) < 0; // sous-titres forcent l'encodage

      console.log(`[HLS Proxy] Codec vidéo=${videoCodec} audio=${audioCodec} → DirectPlay=${canDirectPlay}`);

      if (canDirectPlay) {
        // ✅ DirectPlay HLS — Jellyfin remux sans réencoder (quasi instantané, pas de ffmpeg lourd)
        const p = new URLSearchParams({
          api_key: session.token,
          MediaSourceId: vid,
          DeviceId: `jellyworld-${session.userId}`,
          static: "true", // pas de transcoding, juste remux container
          ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        });
        targetUrl = `${INTERNAL}/Videos/${itemId}/master.m3u8?${p}`;
      } else {
        // Transcodage nécessaire — codec non supporté ou sous-titres à incruster
        const p = new URLSearchParams({
          api_key: session.token,
          MediaSourceId: vid,
          DeviceId: `jellyworld-${session.userId}`,
          VideoCodec: "h264",
          AudioCodec: "aac,mp3,ac3,eac3,opus",
          TranscodingContainer: "ts",
          VideoBitRate: "6000000",
          MaxVideoBitDepth: "8",
          TranscodingMaxAudioChannels: "6",
          EnableMpegtsM2TsMode: "false",
          // Accélération matérielle si dispo côté Jellyfin
          EnableAutoStreamCopy: "true",
          ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
          ...(parseInt(subIdx) >= 0 ? { SubtitleStreamIndex: subIdx, SubtitleMethod: "Encode" } : {}),
          ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
          PlaySessionId: `jw-${session.userId}-${Date.now()}`,
        });
        targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
      }
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] → ${targetUrl.substring(0, 130)}...`);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500));

      const controller = new AbortController();
      const timeoutMs = proxyUrl ? 20000 : 60000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const upstream = await fetch(targetUrl, { headers, cache: "no-store", signal: controller.signal });
        clearTimeout(timer);

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 150)}`);
          if (upstream.status >= 500 && attempt < 2) { lastError = new Error(`HTTP ${upstream.status}`); continue; }
          return new NextResponse(`Jellyfin ${upstream.status}`, { status: 502 });
        }

        const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

        if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8")) {
          const text = await upstream.text();
          return new NextResponse(rewriteM3u8(text, req), {
            headers: {
              "Content-Type": "application/vnd.apple.mpegurl",
              "Cache-Control": "no-cache, no-store",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        return new NextResponse(upstream.body, {
          headers: { "Content-Type": contentType, "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
        });

      } catch (e: any) {
        clearTimeout(timer);
        lastError = e;
        if (attempt === 2) break;
      }
    }

    const isTimeout = lastError?.name === "AbortError";
    return new NextResponse(
      isTimeout ? "Timeout Jellyfin" : `Erreur réseau: ${lastError?.message}`,
      { status: isTimeout ? 504 : 502 }
    );
  } catch (e: any) {
    console.error("[HLS Proxy] Erreur:", e.message);
    return new NextResponse(`Erreur: ${e.message}`, { status: 500 });
  }
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
