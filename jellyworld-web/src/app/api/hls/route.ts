import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

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

    if (proxyUrl) {
      const decoded = decodeURIComponent(proxyUrl);
      if (decoded.startsWith("/")) {
        targetUrl = `${INTERNAL}${decoded}`;
      } else if (decoded.includes("jellyfin-backend") || decoded.includes(":8096")) {
        targetUrl = decoded;
      } else {
        return new NextResponse("URL non autorisée", { status: 403 });
      }
    } else if (itemId) {
      const p = new URLSearchParams({
        api_key: session.token,
        MediaSourceId: versionId ?? itemId,
        DeviceId: `jellyworld-${session.userId}`,
        VideoCodec: "h264",
        AudioCodec: "aac,mp3,ac3,eac3,opus",
        TranscodingContainer: "ts",
        VideoBitRate: "6000000",
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

    console.log(`[HLS Proxy] ${targetUrl.substring(0, 100)}...`);

    // Retry avec backoff exponentiel (max 3 essais)
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, attempt * 2000)); // 0, 2s, 4s
        console.log(`[HLS Proxy] Retry ${attempt}...`);
      }

      const controller = new AbortController();
      // Segments courts = timeout court, manifest initial = timeout long
      const timeoutMs = proxyUrl ? 30000 : 90000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const upstream = await fetch(targetUrl, {
          headers, cache: "no-store", signal: controller.signal,
        });
        clearTimeout(timer);

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 100)}`);
          // 503/504 = Jellyfin surchargé, on réessaie
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
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          },
        });

      } catch (e: any) {
        clearTimeout(timer);
        lastError = e;
        if (e.name === "AbortError") {
          console.error(`[HLS Proxy] Timeout (${timeoutMs/1000}s) attempt ${attempt + 1}`);
        } else {
          console.error(`[HLS Proxy] fetch error attempt ${attempt + 1}:`, e.message);
        }
        if (attempt === 2) break;
      }
    }

    const isTimeout = lastError?.name === "AbortError";
    return new NextResponse(
      isTimeout
        ? "Jellyfin prend trop de temps. Vérifiez que le container est démarré et pas surchargé."
        : `Erreur réseau: ${lastError?.message}`,
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
