import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Cette route génère une URL de stream Jellyfin signée et valide
// Le navigateur accède directement à Jellyfin via cette URL
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const itemId    = searchParams.get("itemId") ?? "";
  const versionId = searchParams.get("versionId") ?? itemId;
  const audioIdx  = searchParams.get("audioIdx") ?? "-1";
  const subIdx    = searchParams.get("subIdx") ?? "-1";
  const startTicks = searchParams.get("startTicks") ?? "0";

  const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const TOKEN  = session.token; // token utilisateur (plus sécurisé que l'API key)

  // Paramètres de transcoding — Jellyfin décide du codec optimal
  const params = new URLSearchParams({
    api_key:        TOKEN,
    MediaSourceId:  versionId,
    DeviceId:       "jellyworld-web",
    // Codecs supportés par tous les navigateurs modernes
    VideoCodec:     "h264,hevc,vp9,av1",
    AudioCodec:     "aac,mp3,ac3,eac3,opus,vorbis",
    // Transcoding auto si nécessaire
    TranscodingContainer: "ts",
    TranscodeReasons:     "ContainerNotSupported,VideoCodecNotSupported,AudioCodecNotSupported",
    // Streams sélectionnés
    ...(parseInt(audioIdx) >= 0 ? { AudioStreamIndex: audioIdx } : {}),
    ...(parseInt(subIdx) >= 0 ? {
      SubtitleStreamIndex: subIdx,
      SubtitleMethod: "Encode", // Brûle les ST dans la vidéo = compatible tous navigateurs
    } : {}),
    // Reprise
    ...(parseInt(startTicks) > 0 ? { StartTimeTicks: startTicks } : {}),
    // Qualité
    MaxVideoBitDepth: "10",
    TranscodingMaxAudioChannels: "6",
    EnableMpegtsM2TsMode: "false",
    // Permet au navigateur de mettre en cache
    Static: "false",
  });

  const streamUrl = `${PUBLIC}/Videos/${itemId}/stream.m3u8?${params}`;

  return NextResponse.json({ url: streamUrl, token: TOKEN });
}
