import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// Ce proxy reçoit les requêtes HLS du navigateur et les transmet à Jellyfin
// Le navigateur n'a jamais besoin d'atteindre Jellyfin directement
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401 });

  const { searchParams } = req.nextUrl;

  // Mode 1 : manifest m3u8 principal
  const itemId    = searchParams.get("itemId");
  const versionId = searchParams.get("versionId");
  const audioIdx  = searchParams.get("audioIdx") ?? "-1";
  const subIdx    = searchParams.get("subIdx") ?? "-1";
  const startTicks = searchParams.get("startTicks") ?? "0";

  // Mode 2 : proxy transparent (pour les segments .ts et sous-manifests)
  const proxyUrl  = searchParams.get("url");

  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    Accept: "*/*",
    "User-Agent": "JellyWorld/1.0",
  };

  try {
    let targetUrl: string;

    if (proxyUrl) {
      // Proxy transparent pour les segments et sous-manifests
      const decoded = decodeURIComponent(proxyUrl);
      // Sécurité : on n'autorise que les URLs Jellyfin internes
      if (!decoded.includes("jellyfin") && !decoded.includes(":8096")) {
        return new NextResponse("URL non autorisée", { status: 403 });
      }
      targetUrl = decoded;
    } else if (itemId) {
      // Construction de l'URL stream Jellyfin
      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: versionId ?? itemId,
        DeviceId: "jellyworld-web",
        VideoCodec: "h264,hevc,vp9",
        AudioCodec: "aac,mp3,ac3,eac3,opus",
        TranscodingContainer: "ts",
        ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
        ...(parseInt(subIdx) >= 0 ? {
          SubtitleStreamIndex: subIdx,
          SubtitleMethod: "Encode",
        } : {}),
        ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        MaxVideoBitDepth: "10",
        TranscodingMaxAudioChannels: "6",
        EnableMpegtsM2TsMode: "false",
        PlaySessionId: `jw-${Date.now()}`,
      });
      targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] GET ${targetUrl.substring(0, 120)}...`);

    const upstream = await fetch(targetUrl, { headers, cache: "no-store" });

    if (!upstream.ok) {
      console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${targetUrl.substring(0, 100)}`);
      return new NextResponse(`Jellyfin error: ${upstream.status}`, { status: upstream.statusCode ?? 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

    // Pour les manifests m3u8 : réécrire les URLs internes en URLs proxifiées
    if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8")) {
      const text = await upstream.text();
      const rewritten = rewriteM3u8(text, req);
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Pour les segments .ts : stream binaire direct
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    console.error("[HLS Proxy] Erreur:", e.message);
    return new NextResponse(`Proxy error: ${e.message}`, { status: 500 });
  }
}

// Réécrit les URLs dans un manifest m3u8 pour les faire passer par notre proxy
function rewriteM3u8(content: string, req: NextRequest): string {
  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  return content
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      // Ignorer les commentaires et les lignes vides
      if (!trimmed || trimmed.startsWith("#")) return line;

      // URL absolue http(s)://
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return `${base}/api/hls?url=${encodeURIComponent(trimmed)}`;
      }

      // URL relative — construire l'URL complète Jellyfin
      if (trimmed.endsWith(".m3u8") || trimmed.endsWith(".ts") || trimmed.includes("?")) {
        const jellyfinBase = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
        const fullUrl = trimmed.startsWith("/")
          ? `${jellyfinBase}${trimmed}`
          : `${jellyfinBase}/${trimmed}`;
        return `${base}/api/hls?url=${encodeURIComponent(fullUrl)}`;
      }

      return line;
    })
    .join("\n");
}
