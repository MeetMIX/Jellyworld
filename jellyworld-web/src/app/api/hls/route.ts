import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401 });

  const { searchParams } = req.nextUrl;
  const proxyUrl  = searchParams.get("url");
  const itemId    = searchParams.get("itemId");
  const versionId = searchParams.get("versionId");
  const audioIdx  = searchParams.get("audioIdx") ?? "-1";
  const subIdx    = searchParams.get("subIdx") ?? "-1";
  const startTicks = searchParams.get("startTicks") ?? "0";

  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    Accept: "*/*",
    "User-Agent": "JellyWorld/1.0",
  };

  try {
    let targetUrl: string;

    if (proxyUrl) {
      const decoded = decodeURIComponent(proxyUrl);
      // Sécurité : URLs Jellyfin uniquement
      if (!decoded.includes("jellyfin-backend") && !decoded.includes(":8096")) {
        // Essai avec URL relative → reconstruire avec base interne
        if (decoded.startsWith("/")) {
          targetUrl = `${INTERNAL}${decoded}`;
        } else {
          return new NextResponse("URL non autorisée", { status: 403 });
        }
      } else {
        targetUrl = decoded;
      }
    } else if (itemId) {
      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: versionId ?? itemId,
        DeviceId: "jellyworld-web",
        // Codecs compatibles navigateur — évite un double transcodage inutile
        VideoCodec: "h264",
        AudioCodec: "aac,mp3,ac3,eac3,opus",
        TranscodingContainer: "ts",
        // Qualité raisonnable pour éviter les timeouts
        VideoBitRate: "8000000",
        MaxVideoBitDepth: "8",
        TranscodingMaxAudioChannels: "6",
        EnableMpegtsM2TsMode: "false",
        ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
        ...(parseInt(subIdx) >= 0 ? {
          SubtitleStreamIndex: subIdx,
          SubtitleMethod: "Encode",
        } : {}),
        ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
        PlaySessionId: `jw-${session.userId}-${Date.now()}`,
      });
      targetUrl = `${INTERNAL}/Videos/${itemId}/stream.m3u8?${p}`;
    } else {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    console.log(`[HLS Proxy] GET ${targetUrl.substring(0, 120)}...`);

    // Timeout généreux pour le transcodage initial (Jellyfin peut mettre 10-30s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s max

    const upstream = await fetch(targetUrl, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 200)}`);
      return new NextResponse(`Erreur Jellyfin ${upstream.status}: ${body.substring(0, 100)}`, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

    // Manifests m3u8 → réécrire les URLs
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

    // Segments .ts → stream binaire
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (e: any) {
    if (e.name === "AbortError") {
      console.error("[HLS Proxy] Timeout — Jellyfin met trop de temps à répondre");
      return new NextResponse("Timeout : Jellyfin prend trop de temps à préparer le stream", { status: 504 });
    }
    console.error("[HLS Proxy] Erreur:", e.message);
    return new NextResponse(`Erreur proxy: ${e.message}`, { status: 500 });
  }
}

function rewriteM3u8(content: string, req: NextRequest): string {
  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  return content
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      // URL absolue
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return `${base}/api/hls?url=${encodeURIComponent(trimmed)}`;
      }

      // URL relative
      if (trimmed.includes(".m3u8") || trimmed.includes(".ts") || trimmed.includes("?")) {
        const fullUrl = trimmed.startsWith("/")
          ? `${INTERNAL}${trimmed}`
          : `${INTERNAL}/${trimmed}`;
        return `${base}/api/hls?url=${encodeURIComponent(fullUrl)}`;
      }

      return line;
    })
    .join("\n");
}
