// PATCH À APPLIQUER dans src/lib/jellyfin.ts
// Changer la fonction getAllItemsByLibrary pour utiliser un cache plus long

// Remplacer revalidate: 300 par revalidate: 600 dans getAllItemsByLibrary
// ET limiter les champs retournés pour réduire la taille de la réponse

export async function getAllItemsByLibraryFast(
  parentId: string,
  userId: string,
  page = 0,
  pageSize = 100
): Promise<{ items: any[]; total: number }> {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const TOKEN    = process.env.JELLYFIN_API_KEY || "";
  const API_KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

  const url = `${INTERNAL}/Users/${userId}/Items`
    + `?ParentId=${parentId}`
    + `&Recursive=true`
    + `&IncludeItemTypes=Movie,Series,MusicVideo`
    // Champs minimaux — beaucoup plus rapide que la version complète
    + `&Fields=PrimaryImageAspectRatio,ImageTags,PremiereDate`
    + `&Limit=${pageSize}&StartIndex=${page * pageSize}`
    + `&SortBy=SortName&SortOrder=Ascending`;

  const res = await fetch(url, {
    headers: {
      Authorization: `MediaBrowser Token="${TOKEN}"`,
      Accept: "application/json",
    },
    next: { revalidate: 600 }, // 10 minutes de cache
  });

  if (!res.ok) return { items: [], total: 0 };
  const data = await res.json();

  return {
    total: data.TotalRecordCount ?? 0,
    items: (data.Items ?? []).map((item: any) => ({
      Id: item.Id,
      Name: item.Name,
      Type: item.Type,
      ProductionYear: item.ProductionYear,
      CommunityRating: item.CommunityRating,
      PremiereDate: item.PremiereDate,
      DateCreated: item.DateCreated,
      UserData: item.UserData,
      posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&fillWidth=300&quality=85`,
    })),
  };
}
