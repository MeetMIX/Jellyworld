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
    let isHeavyTranscode = false;

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
      const isHDR = videoStream?.VideoRange === "HDR" || /dv|dolby\s*vision|hdr/i.test(mediaSource?.Name ?? "");
      const canDirectPlay =
        NATIVE_VIDEO_CODECS.includes(videoCodec) &&
        NATIVE_AUDIO_CODECS.includes(audioCodec) &&
        parseInt(subIdx) < 0;

      // ✅ Transcodage 4K HEVC/HDR = très lourd CPU → on cible 1080p pour rester fluide
      isHeavyTranscode = !canDirectPlay && (videoHeight >= 2000 || isHDR);

      console.log(`[HLS Proxy] Codec=${videoCodec}/${audioCodec} ${videoHeight}p HDR=${isHDR} → DirectPlay=${canDirectPlay} HeavyTranscode=${isHeavyTranscode}`);

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
        PlaySessionId: `jw-${session.userId}-${Date.now()}`,
      });

      if (canDirectPlay) {
        p.set("VideoCodec", "copy");
      } else if (isHeavyTranscode) {
        // ✅ Réduit à 1080p — divise la charge CPU par ~4 vs garder en 4K
        p.set("VideoCodec", "h264");
        p.set("MaxWidth", "1920");
        p.set("MaxHeight", "1080");
        p.set("VideoBitRate", "5000000");
        p.set("MaxVideoBitDepth", "8");
        // preset rapide pour ffmpeg = moins de qualité d'encodage mais bien plus rapide
        p.set("EncoderPreset", "veryfast");
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

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));

      const controller = new AbortController();
      // ✅ Timeout étendu pour les gros transcodages 4K/HDR (jusqu'à 90s)
      const timeoutMs = proxyUrl ? 20000 : (isHeavyTranscode ? 90000 : 45000);
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const upstream = await fetch(targetUrl, { headers, cache: "no-store", signal: controller.signal });
        clearTimeout(timer);

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 150)}`);
          if (upstream.status >= 500 && attempt < 1) { lastError = new Error(`HTTP ${upstream.status}`); continue; }
          return new NextResponse(`Jellyfin ${upstream.status}`, { status: 502 });
        }

        const contentType = upstream.headers.get("content-type") ?? "";
        const contentLength = parseInt(upstream.headers.get("content-length") ?? "0");
        const looksLikeRawFile = contentLength > 1_000_000;

        if (!looksLikeRawFile && (contentType.includes("mpegurl") || targetUrl.includes(".m3u8"))) {
          const text = await upstream.text();
          if (!text.startsWith("#EXTM3U")) {
            console.error(`[HLS Proxy] Pas un manifest valide, taille=${text.length}`);
            return new NextResponse("Manifest HLS invalide", { status: 502 });
          }
          return new NextResponse(rewriteM3u8(text, req), {
            headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache, no-store", "Access-Control-Allow-Origin": "*" },
          });
        }

        return new NextResponse(upstream.body, {
          headers: { "Content-Type": contentType || "video/mp2t", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
        });

      } catch (e: any) {
        clearTimeout(timer);
        lastError = e;
        console.error(`[HLS Proxy] Tentative ${attempt + 1} échouée (timeout=${timeoutMs}ms):`, e.message);
        if (attempt === 1) break;
      }
    }

    const isTimeout = lastError?.name === "AbortError";
    return new NextResponse(
      isTimeout
        ? `Le transcodage prend trop de temps (>${isHeavyTranscode ? "90" : "45"}s). Le fichier 4K/HDR demande beaucoup de CPU.`
        : `Erreur réseau: ${lastError?.message}`,
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
