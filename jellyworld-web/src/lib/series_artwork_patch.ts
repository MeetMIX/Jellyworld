// ── PATCH à ajouter dans src/lib/jellyfin.ts ──────────────────────────────
//
// Jellyfin stocke déjà l'image de série dans l'item Series, accessible via
// ParentId. Le problème : les épisodes individuels n'ont souvent pas de
// vignette propre — il faut remonter à la série parente.

// Récupère l'image de la série parente pour un épisode
export async function getSeriesArtwork(seriesId: string): Promise<{ posterUrl: string; backdropUrl: string; logoUrl: string } | null> {
  if (!seriesId) return null;
  const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const TOKEN  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

  return {
    posterUrl:   `${PUBLIC}/Items/${seriesId}/Images/Primary?api_key=${TOKEN}&fillWidth=300&quality=90`,
    backdropUrl: `${PUBLIC}/Items/${seriesId}/Images/Backdrop?api_key=${TOKEN}&fillWidth=1280&quality=85`,
    logoUrl:     `${PUBLIC}/Items/${seriesId}/Images/Logo?api_key=${TOKEN}&fillWidth=500&quality=90`,
  };
}

// Dans getItemById, si l'item est un épisode (Type === "Episode") et n'a pas
// de poster propre (ImageTags.Primary absent), utiliser SeriesId pour
// récupérer l'artwork de la série parente à la place.
//
// MODIFICATION dans getItemById (fonction existante) :
//
// export async function getItemById(itemId: string, userId: string) {
//   const url = ... + `&Fields=...,SeriesId,SeriesName`; // ajouter SeriesId
//   const data = await jellyGet(url, 600);
//   if (!data) return null;
//
//   // ✅ AJOUTER : fallback vers l'image de la série pour les épisodes
//   if (data.Type === "Episode" && data.SeriesId && !data.ImageTags?.Primary) {
//     const seriesArt = await getSeriesArtwork(data.SeriesId);
//     if (seriesArt) {
//       data._seriesPosterFallback = seriesArt.posterUrl;
//       data._seriesBackdropFallback = seriesArt.backdropUrl;
//     }
//   }
//   ...
//   return enrich(data);
// }
