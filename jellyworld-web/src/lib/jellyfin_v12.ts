// ── Fonctions à AJOUTER dans src/lib/jellyfin.ts ──────────────────────────

// URL du logo officiel du film/série (pas le poster, le logo texte)
export function getLogoUrl(id: string): string {
  const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const TOKEN  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";
  return `${PUBLIC}/Items/${id}/Images/Logo?api_key=${TOKEN}&fillWidth=400&quality=90`;
}

// Films en cours (non terminés, avec position de lecture)
export async function getContinueWatching(userId: string): Promise<any[]> {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const TOKEN    = process.env.JELLYFIN_API_KEY || "";
  const PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";

  try {
    const url = `${INTERNAL}/Users/${userId}/Items/Resume`
      + `?Limit=12&MediaTypes=Video`
      + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,UserData,RunTimeTicks`
      + `&EnableTotalRecordCount=false`;
    const res = await fetch(url, {
      headers: { Authorization: `MediaBrowser Token="${TOKEN}"`, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []).map((item: any) => ({
      ...item,
      posterUrl:   `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${TOKEN}&fillWidth=300&quality=90`,
      backdropUrl: `${PUBLIC}/Items/${item.Id}/Images/Backdrop?api_key=${TOKEN}&fillWidth=800&quality=80`,
    }));
  } catch { return []; }
}
