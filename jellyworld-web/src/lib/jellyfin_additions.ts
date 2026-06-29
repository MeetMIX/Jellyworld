// ── À AJOUTER à la fin de src/lib/jellyfin.ts ──────────────────────────────

// Récupère les versions multiples d'un item (même film en 4K + 1080p)
export async function getItemVersions(itemId: string, userId: string, token: string) {
  const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  try {
    const res = await fetch(
      `${JELLYFIN_INTERNAL}/Items/${itemId}/MediaSources?UserId=${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `MediaBrowser Token="${token}"`,
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // MediaSources = versions (chaque source = un fichier)
    return (data ?? []).map((src: any) => ({
      Id: src.Id,
      Name: src.Name || extractVersionName(src.Path),
      MediaStreams: src.MediaStreams ?? [],
      Path: src.Path,
    }));
  } catch {
    return [];
  }
}

// Extrait un nom de version depuis le chemin du fichier
// Ex: "/movies/Film (2024) [IMDBID=tt1234567] [4K].mkv" → "4K"
function extractVersionName(path?: string): string {
  if (!path) return "Version originale";
  const filename = path.split("/").pop() ?? path;
  // Cherche [4K], [1080p], [HEVC], etc.
  const qualityMatch = filename.match(/\[([^\]]+)\]/g);
  if (qualityMatch && qualityMatch.length > 0) {
    return qualityMatch.join(" ").replace(/\[|\]/g, "");
  }
  return filename.replace(/\.[^.]+$/, ""); // sans extension
}
