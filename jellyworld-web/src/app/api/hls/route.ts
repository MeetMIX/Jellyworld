import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

// ─── Cache disque pour les segments transcodés (.ts) et sous-titres (.vtt) ───
// But : atténuer les temps d'attente quand Jellyfin transcode un média lourd
// (HEVC 10bit, gros bitrate...). Le cache ne peut pas accélérer la toute
// première lecture d'un segment jamais transcodé (ffmpeg doit tourner), mais
// il évite de re-solliciter Jellyfin pour tout ce qui a déjà été produit une
// fois : un second visionnage du même film avec les mêmes réglages (piste
// audio/sous-titres/qualité), une avance/retour dans le player, ou une
// re-tentative de hls.js après une erreur réseau.
//
// IMPORTANT : jellyworld-web tourne en mode dev avec tout /app bind-mounté
// sur le dossier du repo (`../jellyworld-web:/app` dans docker-compose.yml)
// -> écrire le cache sous /app l'enverrait directement dans le dossier
// synchronisé/suivi par Git. Le chemin par défaut est donc HORS /app, dans
// la couche d'écriture propre au conteneur (survit à `docker restart`,
// c'est-à-dire au workflow habituel git pull + restart, mais pas à une
// recréation du conteneur). Pour le faire survivre aussi aux recréations,
// ajouter un volume nommé dans docker-compose.yml, ex:
//   services.jellyworld-web.volumes: - hls-cache:/hls-cache
//   volumes: { hls-cache: {} }
const CACHE_DIR = process.env.HLS_CACHE_DIR || "/hls-cache";
const CACHE_MAX_BYTES = parseInt(process.env.HLS_CACHE_MAX_MB ?? "2048", 10) * 1024 * 1024;
const CACHEABLE_EXT = [".ts", ".vtt"];

// Paramètres qui identifient le CONTENU réel d'un segment (à conserver dans
// la clé de cache) — à l'exclusion des paramètres volatils propres à chaque
// session de lecture (ApiKey, DeviceId, PlaySessionId, Tag), qui changent à
// chaque nouvelle lecture même pour un film/réglages identiques. Les ignorer
// permet au cache de servir un second visionnage, pas seulement des retries
// dans la même session.
const CACHE_KEY_PARAMS = [
  "AudioStreamIndex", "SubtitleStreamIndex", "VideoBitrate", "AudioBitrate",
  "VideoCodec", "AudioCodec", "StartPositionTicks", "EndPositionTicks",
];

function cacheKeyFor(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const ext = path.extname(u.pathname);
  if (!CACHEABLE_EXT.includes(ext)) return null;
  const kept = CACHE_KEY_PARAMS.map(k => `${k}=${u.searchParams.get(k) ?? ""}`).join("&");
  const raw = `${u.pathname}?${kept}`;
  return crypto.createHash("sha1").update(raw).digest("hex") + ext;
}

async function readHlsCache(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const dataPath = path.join(CACHE_DIR, `${key}.bin`);
    const metaPath = path.join(CACHE_DIR, `${key}.meta`);
    const [body, metaRaw] = await Promise.all([fs.readFile(dataPath), fs.readFile(metaPath, "utf8")]);
    const meta = JSON.parse(metaRaw);
    fs.utimes(dataPath, new Date(), new Date()).catch(() => {}); // touch pour LRU
    return { body, contentType: meta.contentType };
  } catch { return null; }
}

async function writeHlsCache(key: string, body: Buffer, contentType: string) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(CACHE_DIR, `${key}.bin`), body),
      fs.writeFile(path.join(CACHE_DIR, `${key}.meta`), JSON.stringify({ contentType, cachedAt: Date.now() })),
    ]);
    // Nettoyage best-effort, pas à chaque écriture (juste 1 fois sur 20 en
    // moyenne) pour éviter de scanner le dossier à chaque segment.
    if (Math.random() < 0.05) cleanupHlsCache().catch(() => {});
  } catch (e) {
    console.error("[HLS Cache] write error:", e);
  }
}

async function cleanupHlsCache() {
  const entries = await fs.readdir(CACHE_DIR).catch(() => [] as string[]);
  const binFiles = entries.filter(f => f.endsWith(".bin"));
  const stats = (await Promise.all(binFiles.map(async f => {
    const p = path.join(CACHE_DIR, f);
    const s = await fs.stat(p).catch(() => null);
    return s ? { key: f.replace(/\.bin$/, ""), size: s.size, mtime: s.mtimeMs } : null;
  }))).filter((s): s is { key: string; size: number; mtime: number } => !!s);

  const total = stats.reduce((sum, s) => sum + s.size, 0);
  if (total <= CACHE_MAX_BYTES) return;

  // Éviction LRU : supprime les entrées les plus anciennes (par mtime, touché
  // à chaque lecture cache) jusqu'à repasser sous le budget.
  stats.sort((a, b) => a.mtime - b.mtime);
  let freed = 0;
  for (const s of stats) {
    if (total - freed <= CACHE_MAX_BYTES) break;
    await Promise.all([
      fs.unlink(path.join(CACHE_DIR, `${s.key}.bin`)).catch(() => {}),
      fs.unlink(path.join(CACHE_DIR, `${s.key}.meta`)).catch(() => {}),
    ]);
    freed += s.size;
  }
}

async function getPlaybackInfo(itemId: string, userId: string, token: string, audioIdx: number, subIdx: number, startTicks: number) {
  const body = {
    UserId: userId,
    StartTimeTicks: startTicks > 0 ? startTicks : 0,
    AudioStreamIndex: audioIdx >= 0 ? audioIdx : undefined,
    SubtitleStreamIndex: subIdx >= 0 ? subIdx : undefined,
    MaxStreamingBitrate: 120000000,
    DeviceProfile: {
      MaxStreamingBitrate: 120000000,
      MaxStaticBitrate: 100000000,
      MusicStreamingTranscodingBitrate: 384000,
      // Pas de "hevc" ici : la plupart des navigateurs ne le décodent pas nativement.
      // Le déclarer en DirectPlay fait croire à Jellyfin qu'il peut envoyer le flux
      // HEVC tel quel -> hls.js rejette le manifest (manifestIncompatibleCodecsError).
      // Sans hevc dans la liste, Jellyfin transcode automatiquement en H264 (cf.
      // TranscodingProfiles plus bas), qui lui est lisible partout.
      // Ni "ac3" ni "eac3" (Dolby Digital / Digital Plus) ne sont décodables par les
      // navigateurs via MediaSource Extensions -> on ne les déclare nulle part (ni en
      // DirectPlay ni comme cible de transcodage), pour forcer un audio AAC systématique.
      DirectPlayProfiles: [
        { Container: "webm", Type: "Video", VideoCodec: "vp8,vp9,av1", AudioCodec: "vorbis,opus" },
        { Container: "mp4,m4v", Type: "Video", VideoCodec: "h264,vp9,av1", AudioCodec: "aac,mp3,opus,flac,vorbis" },
        { Container: "mkv", Type: "Video", VideoCodec: "h264,vp9,av1", AudioCodec: "aac,mp3,opus,flac,vorbis" },
        // Bibliothèques musicales : mp3 (tous débits/qualités confondus — le profil ne
        // distingue pas le bitrate), flac, wav, aac/m4a, ogg/opus, tous nativement
        // lisibles par le <video> HTML utilisé comme lecteur. wma n'a pas de lecture
        // native fiable -> laissé hors DirectPlay pour forcer son transcodage (cf.
        // TranscodingProfiles ci-dessous).
        { Container: "mp3", Type: "Audio", AudioCodec: "mp3" },
        { Container: "flac", Type: "Audio", AudioCodec: "flac" },
        { Container: "wav", Type: "Audio", AudioCodec: "PCM_S16LE,PCM_S24LE,PCM_U8" },
        { Container: "aac", Type: "Audio", AudioCodec: "aac" },
        { Container: "m4a", Type: "Audio", AudioCodec: "aac,alac" },
        { Container: "ogg,oga", Type: "Audio", AudioCodec: "vorbis,opus" },
      ],
      TranscodingProfiles: [
        {
          Container: "ts", Type: "Video", AudioCodec: "aac,mp3,opus", VideoCodec: "h264",
          Context: "Streaming", Protocol: "hls", MaxAudioChannels: "6",
          MinSegments: "1", BreakOnNonKeyFrames: true,
        },
        // Repli pour les formats audio non couverts en DirectPlay (wma, ape, dsd...) :
        // transcodage systématique vers mp3, lisible partout.
        {
          Container: "mp3", Type: "Audio", AudioCodec: "mp3",
          Context: "Streaming", Protocol: "hls", MaxAudioChannels: "2",
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
      headers: { Authorization: `MediaBrowser Token="${token}"`, "Content-Type": "application/json" },
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

const inFlightRequests = new Map<string, Promise<any>>();

// ✅ Headers CORS systématiques sur TOUTES les réponses, y compris erreurs
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401, headers: CORS_HEADERS });

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
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        targetUrl = decoded;
      } else if (decoded.startsWith("/")) {
        targetUrl = `${INTERNAL}${decoded}`;
      } else {
        targetUrl = `${INTERNAL}/${decoded}`;
      }
    } else if (itemId) {
      const playbackInfo = await getPlaybackInfo(itemId, session.userId, session.token, audioIdx, subIdx, startTicks);

      if (!playbackInfo?.MediaSources?.length) {
        console.error("[HLS Proxy] PlaybackInfo n'a retourné aucune MediaSource");
        return new NextResponse("Impossible d'obtenir les infos de lecture", { status: 502, headers: CORS_HEADERS });
      }

      const source = playbackInfo.MediaSources.find((s: any) => s.Id === versionId) ?? playbackInfo.MediaSources[0];
      console.log(`[HLS Proxy] SupportsDirectPlay=${source.SupportsDirectPlay} SupportsDirectStream=${source.SupportsDirectStream} TranscodingUrl=${!!source.TranscodingUrl}`);

      dedupeKey = `${session.userId}:${itemId}:${source.Id}:${audioIdx}:${subIdx}:${startTicks}`;

      if (source.TranscodingUrl) {
        const rawTcUrl = source.TranscodingUrl.startsWith("http")
          ? source.TranscodingUrl
          : `${INTERNAL}${source.TranscodingUrl}`;

        // Jellyfin est censé honorer AudioStreamIndex/SubtitleStreamIndex envoyés
        // dans PlaybackInfo, mais en pratique la TranscodingUrl qu'il retourne peut
        // contenir ses propres indices par défaut au lieu de ceux demandés (observé
        // en prod : audioIdx=4/subIdx=6 demandés côté client, mais
        // AudioStreamIndex=1&SubtitleStreamIndex=5 dans l'URL renvoyée -> le film
        // continuait à jouer la piste par défaut malgré la sélection dans l'UI).
        // On réécrit donc ces paramètres nous-mêmes avant utilisation.
        const tcUrl = new URL(rawTcUrl);
        if (audioIdx >= 0) tcUrl.searchParams.set("AudioStreamIndex", String(audioIdx));
        if (subIdx >= 0) {
          tcUrl.searchParams.set("SubtitleStreamIndex", String(subIdx));
        } else {
          tcUrl.searchParams.delete("SubtitleStreamIndex");
        }
        targetUrl = tcUrl.toString();
        console.log(`[HLS Proxy] TranscodingUrl corrigée -> AudioStreamIndex=${tcUrl.searchParams.get("AudioStreamIndex")} SubtitleStreamIndex=${tcUrl.searchParams.get("SubtitleStreamIndex")}`);
      } else if (source.SupportsDirectStream) {
        const p = new URLSearchParams({
          api_key: session.token,
          MediaSourceId: source.Id,
          DeviceId: `jellyworld-${session.userId}`,
          PlaySessionId: playbackInfo.PlaySessionId ?? `jw-${Date.now()}`,
          ...(audioIdx >= 0 ? { AudioStreamIndex: String(audioIdx) } : {}),
          ...(subIdx >= 0 ? { SubtitleStreamIndex: String(subIdx) } : {}),
          ...(startTicks > 0 ? { StartTimeTicks: String(startTicks) } : {}),
        });
        targetUrl = `${INTERNAL}/Videos/${itemId}/master.m3u8?${p}`;
      } else {
        return new NextResponse("Aucune méthode de lecture disponible", { status: 502, headers: CORS_HEADERS });
      }
    } else {
      return new NextResponse("Paramètres manquants", { status: 400, headers: CORS_HEADERS });
    }

    // Cache disque : uniquement pour les segments/sous-titres binaires (.ts/.vtt),
    // jamais pour les manifestes .m3u8 (dynamiques, doivent rester en direct).
    const cacheKey = cacheKeyFor(targetUrl);
    if (cacheKey) {
      const cached = await readHlsCache(cacheKey);
      if (cached) {
        return new NextResponse(cached.body, {
          headers: { "Content-Type": cached.contentType, "Cache-Control": "no-cache", "X-HLS-Cache": "HIT", ...CORS_HEADERS },
        });
      }
    }

    if (dedupeKey && inFlightRequests.has(dedupeKey)) {
      try {
        const result = await inFlightRequests.get(dedupeKey)!;
        return buildResponse(result, req, targetUrl);
      } catch {}
    }

    const capturedUrl = targetUrl;

    const fetchPromise = (async () => {
      const controller = new AbortController();
      // Les playlists (.m3u8) peuvent déclencher/attendre le démarrage du transcodage
      // côté Jellyfin (ffmpeg doit produire MinSegments avant de répondre) — ça peut
      // prendre plus de 20s sur des sources gros bitrate (4K/HDR). Seuls les vrais
      // segments binaires (.ts/.mp4, déjà prêts une fois la playlist renvoyée) gardent
      // le timeout court.
      const isPlaylistFetch = !proxyUrl || capturedUrl.includes(".m3u8");
      // 20s s'est révélé trop court pour un segment .ts qui nécessite un vrai
      // transcodage vidéo (ex: source HEVC 10bit -> H264) plutôt qu'un simple
      // remux/transcodage audio : logs prod montrant des 504 systématiques
      // suivis d'un retry réussi quelques secondes plus tard (ffmpeg avait
      // simplement besoin de plus de temps pour produire ce segment).
      const timeoutMs = isPlaylistFetch ? 60000 : 45000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const upstream = await fetch(capturedUrl, { headers, cache: "no-store", signal: controller.signal });
        clearTimeout(timer);

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          console.error(`[HLS Proxy] Jellyfin ${upstream.status}: ${body.substring(0, 200)}`);
          return { status: 502, body: `Jellyfin ${upstream.status}`, contentType: "text/plain" };
        }

        const contentType = upstream.headers.get("content-type") ?? "";

        // Un manifeste .m3u8 est toujours un petit fichier texte — on le détecte par
        // content-type OU extension d'URL, sans condition sur la taille. Avant ce
        // correctif, un Content-Length déclaré > 1 Mo (même pour un vrai .m3u8) faisait
        // sauter cette branche : le flux binaire brut atterrissait dans buildResponse()
        // avec un contentType "mpegurl", qui tentait alors content.split() sur un
        // ReadableStream -> crash "content.split is not a function".
        if (contentType.includes("mpegurl") || capturedUrl.includes(".m3u8")) {
          const text = await upstream.text();
          if (!text.startsWith("#EXTM3U")) {
            return { status: 502, body: "Manifest HLS invalide", contentType: "text/plain" };
          }
          return { status: 200, body: text, contentType: "application/vnd.apple.mpegurl", sourceUrl: capturedUrl };
        }

        // Segment/sous-titre binaire : on bufférise (au lieu de streamer
        // directement upstream.body) pour pouvoir l'écrire dans le cache
        // disque avant de répondre. Les segments HLS font au plus quelques
        // Mo — le coût en latence est négligeable face au gain sur les
        // relectures.
        const buf = Buffer.from(await upstream.arrayBuffer());
        const finalContentType = contentType || "video/mp2t";
        const key = cacheKeyFor(capturedUrl);
        if (key) writeHlsCache(key, buf, finalContentType).catch(() => {});
        return { status: 200, body: buf, contentType: finalContentType };
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
      return buildResponse(result, req, result.sourceUrl ?? capturedUrl);
    } catch (e: any) {
      console.error(`[HLS Proxy] Échec:`, e.message);
      const isTimeout = e.name === "AbortError";
      return new NextResponse(
        isTimeout ? "Timeout Jellyfin" : `Erreur: ${e.message}`,
        { status: isTimeout ? 504 : 502, headers: CORS_HEADERS }
      );
    }

  } catch (e: any) {
    console.error("[HLS Proxy] Erreur:", e.message);
    return new NextResponse(`Erreur: ${e.message}`, { status: 500, headers: CORS_HEADERS });
  }
}

function buildResponse(result: any, req: NextRequest, sourceUrl: string): NextResponse {
  if (result.status !== 200) {
    return new NextResponse(result.body as string, { status: result.status, headers: CORS_HEADERS });
  }
  if (result.contentType === "application/vnd.apple.mpegurl") {
    const rewritten = rewriteM3u8(result.body as string, req, sourceUrl);
    return new NextResponse(rewritten, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-cache, no-store",
        ...CORS_HEADERS,
      },
    });
  }
  // ✅ Pour les segments .ts/.vtt (Buffer, bufférisé pour permettre la mise
  // en cache disque) — CORS + headers explicites pour hls.js
  return new NextResponse(result.body as Buffer, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-cache",
      ...CORS_HEADERS,
    },
  });
}

function rewriteM3u8(content: string, req: NextRequest, sourceUrl: string): string {
  let sourceBase: URL;
  try {
    sourceBase = new URL(sourceUrl);
  } catch {
    sourceBase = new URL(INTERNAL);
  }

  function resolveAndProxy(raw: string): string {
    let fullUrl: string;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      fullUrl = raw;
    } else if (raw.startsWith("/")) {
      fullUrl = `${sourceBase.protocol}//${sourceBase.host}${raw}`;
    } else {
      const lastSlash = sourceBase.pathname.lastIndexOf("/");
      const basePath = lastSlash >= 0 ? sourceBase.pathname.substring(0, lastSlash + 1) : "/";
      fullUrl = `${sourceBase.protocol}//${sourceBase.host}${basePath}${raw}`;
    }
    // URL relative (sans schéma/hôte) : le navigateur la résout par rapport à l'origine
    // de la page en cours, quelle que soit l'adresse utilisée pour y accéder (IP locale,
    // nom de domaine...). Évite de dépendre de req.nextUrl.host, qui peut ne pas
    // refléter l'adresse réellement utilisée par le client (vu en prod : "localhost"
    // au lieu de l'IP du serveur -> segments inaccessibles depuis le poste du client).
    return `/api/hls?url=${encodeURIComponent(fullUrl)}`;
  }

  return content.split("\n").map(line => {
    const t = line.trim();
    if (!t) return line;

    // Les tags comme #EXT-X-MEDIA (sous-titres), #EXT-X-KEY, #EXT-X-MAP embarquent
    // leur URL dans un attribut URI="..." plutôt que sur leur propre ligne. Sans ça,
    // ces URLs (souvent relatives) ne passent jamais par le proxy et le navigateur
    // tente de les résoudre lui-même -> échec (404 / levelLoadError).
    if (t.startsWith("#")) {
      const uriMatch = t.match(/URI="([^"]+)"/);
      if (!uriMatch) return line;
      return line.replace(uriMatch[0], `URI="${resolveAndProxy(uriMatch[1])}"`);
    }

    return resolveAndProxy(t);
  }).join("\n");
}
