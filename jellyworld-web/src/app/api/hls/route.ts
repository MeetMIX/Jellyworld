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
    let isRawFile = false; // ✅ Détecte si c'est le fichier brut (pas un manifest)

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
      const canDirectPlay =
        NATIVE_VIDEO_CODECS.includes(videoCodec) &&
        NATIVE_AUDIO_CODECS.includes(audioCodec) &&
        parseInt(subIdx) < 0;

      console.log(`[HLS Proxy] Codec vidéo=${videoCodec} audio=${audioCodec} → DirectPlay=${canDirectPlay}`);

      // ✅ FIX MAJEUR : toujours utiliser le transcodage HLS via /stream.m3u8
      // Même en "DirectPlay", on demande à Jellyfin un vrai manifest HLS
      // (remux container sans réencoder la vidéo si même codec) plutôt que
      // /master.m3u8?static=true qui retournait le fichier brut de 13GB.
      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: vid,
        DeviceId: `jellyworld-${session.userId}`,
        VideoCodec: canDirectPlay ? videoCodec || "h264" : "h264",
        AudioCodec: canDirectPlay ? "aac,mp3,ac3,eac3,opus" : "aac,mp3,ac3,eac3,opus",
        TranscodingContainer: "ts",
        // Si DirectPlay possible, on copie le flux vidéo sans réencoder (rapide)
        ...(canDirectPlay ? { VideoCodec: "copy" } : { VideoBitRate: "6000000", MaxVideoBitDepth: "8" }),
        TranscodingMaxAudioChannels: "6",
        EnableMpegtsM2TsMode: "false",
        ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
        ...(parseInt(subIdx) >= 0 ? { SubtitleStreamIndex: subIdx, SubtitleMethod: "Encode" } : {}),
        ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        PlaySessionId: `jw-${session.userId}-${Date.now()}`,
      });
      targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] → ${targetUrl.substring(0, 150)}...`);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500));

      const controller = new AbortController();
      const timeoutMs = proxyUrl ? 20000 : 45000;
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

        const contentType = upstream.headers.get("content-type") ?? "";
        const contentLength = parseInt(upstream.headers.get("content-length") ?? "0");

        // ✅ GARDE-FOU : si le "manifest" fait plus de 1 Mo, c'est le fichier brut, pas un .m3u8
        const looksLikeRawFile = contentLength > 1_000_000;

        if (!looksLikeRawFile && (contentType.includes("mpegurl") || targetUrl.includes(".m3u8"))) {
          const text = await upstream.text();
          // Vérif supplémentaire : un vrai manifest commence par #EXTM3U
          if (!text.startsWith("#EXTM3U")) {
            console.error(`[HLS Proxy] Réponse inattendue (pas un manifest HLS valide), taille=${text.length}`);
            return new NextResponse("Jellyfin n'a pas retourné un manifest HLS valide", { status: 502 });
          }
          return new NextResponse(rewriteM3u8(text, req), {
            headers: {
              "Content-Type": "application/vnd.apple.mpegurl",
              "Cache-Control": "no-cache, no-store",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // Segments .ts ou tout contenu binaire → stream direct
        return new NextResponse(upstream.body, {
          headers: { "Content-Type": contentType || "video/mp2t", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
        });

      } catch (e: any) {
        clearTimeout(timer);
        lastError = e;
        console.error(`[HLS Proxy] Tentative ${attempt + 1} échouée:`, e.message);
        if (attempt === 2) break;
      }
    }

    const isTimeout = lastError?.name === "AbortError";
    return new NextResponse(
      isTimeout ? "Timeout Jellyfin (45s)" : `Erreur réseau: ${lastError?.message}`,
      { status: isTimeout ? 504 : 502 }
    );
  } catch (e: any) {
    console.error("[HLS Proxy] Erreur inattendue:", e.message);
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
