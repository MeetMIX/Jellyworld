const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
const JELLYFIN_PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
const JELLYFIN_TOKEN    = process.env.JELLYFIN_API_KEY || "";

const authHeaders = {
  Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
  Accept: "application/json",
};

export interface JellyfinLibrary { Id: string; Name: string; CollectionType?: string; }
export interface JellyfinPerson { Id: string; Name: string; Role?: string; Type: string; photoUrl: string; }
export interface JellyfinChapter { StartPositionTicks: number; Name: string; imageUrl: string; }
export interface JellyfinMediaStream {
  Type: string; Codec?: string; DisplayTitle?: string;
  Width?: number; Height?: number; BitRate?: number;
  Language?: string; IsDefault?: boolean;
}
export interface JellyfinItem {
  Id: string; Name: string; Overview?: string; Taglines?: string[];
  ProductionYear?: number; CommunityRating?: number; CriticRating?: number;
  RunTimeTicks?: number; Type: string; OfficialRating?: string;
  Genres?: string[]; Studios?: { Name: string }[];
  People?: JellyfinPerson[];
  Chapters?: JellyfinChapter[];
  MediaStreams?: JellyfinMediaStream[];
  ExternalUrls?: { Name: string; Url: string }[];
  Path?: string; DateCreated?: string;
  PremiereDate?: string;
  ImageTags?: Record<string, string>; BackdropImageTags?: string[];
  UserData?: { PlayedPercentage?: number; IsFavorite?: boolean };
  posterUrl: string; backdropUrl: string; logoUrl?: string;
}
export interface LibraryWithItems extends JellyfinLibrary { items: JellyfinItem[]; }
export interface LibraryShowcaseItem { Id: string; Name: string; imageUrl: string; }

export function getPosterUrl(id: string) {
  return `${JELLYFIN_PUBLIC}/Items/${id}/Images/Primary?api_key=${JELLYFIN_TOKEN}&fillWidth=300&quality=90`;
}
export function getBackdropUrl(id: string) {
  return `${JELLYFIN_PUBLIC}/Items/${id}/Images/Backdrop?api_key=${JELLYFIN_TOKEN}&fillWidth=1280&quality=85`;
}
export function getPersonPhotoUrl(personId: string) {
  return `${JELLYFIN_PUBLIC}/Items/${personId}/Images/Primary?api_key=${JELLYFIN_TOKEN}&fillWidth=200&quality=85`;
}
export function getChapterImageUrl(itemId: string, index: number) {
  return `${JELLYFIN_PUBLIC}/Items/${itemId}/Images/Chapter?ImageIndex=${index}&api_key=${JELLYFIN_TOKEN}&fillWidth=320&quality=85`;
}
// Logo officiel du titre (image "Logo" fournie par TMDb/Fanart.tv via les
// métadonnées Jellyfin) — n'existe pas pour tous les éléments, d'où la
// vérification de ImageTags.Logo avant de construire l'URL dans enrich().
export function getLogoUrl(id: string) {
  return `${JELLYFIN_PUBLIC}/Items/${id}/Images/Logo?api_key=${JELLYFIN_TOKEN}&fillWidth=500&quality=90`;
}
export function formatRuntime(ticks?: number): string {
  if (!ticks) return "";
  const m = Math.floor(ticks / 600000000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m}min`;
}
export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const gb = bytes / 1073741824;
  return gb >= 1 ? `${gb.toFixed(1)} Go` : `${(bytes / 1048576).toFixed(0)} Mo`;
}
export function ticksToTime(ticks: number): string {
  const s = Math.floor(ticks / 10000000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

function enrich(item: any): JellyfinItem {
  const enriched = {
    ...item,
    posterUrl: getPosterUrl(item.Id),
    backdropUrl: getBackdropUrl(item.Id),
    logoUrl: item.ImageTags?.Logo ? getLogoUrl(item.Id) : undefined,
  };
  if (enriched.People) {
    enriched.People = enriched.People.map((p: any) => ({ ...p, photoUrl: getPersonPhotoUrl(p.Id) }));
  }
  return enriched;
}

// "boxsets" (Collections/sagas) n'est plus exclu : c'est désormais une
// bibliothèque automatique à part entière (cf. [libraryId]/page.tsx qui
// bascule IncludeItemTypes=BoxSet pour cette bibliothèque précise). Les
// bibliothèques Movie/Series classiques n'incluent jamais "BoxSet" dans leur
// propre IncludeItemTypes, donc les collections n'y apparaissent pas.
const EXCLUDED_TYPES = ["playlists"];

async function jellyGet(url: string, revalidate = 300) {
  try {
    const res = await fetch(url, { method: "GET", headers: authHeaders, next: { revalidate } });
    if (!res.ok) { console.error(`[Jellyfin] ${res.status} — ${url}`); return null; }
    return res.json();
  } catch (e) { console.error(`[Jellyfin] error:`, e); return null; }
}

export async function getFirstUserId(): Promise<string | null> {
  const data = await jellyGet(`${JELLYFIN_INTERNAL}/Users`);
  return data?.[0]?.Id ?? null;
}

export async function getUserLibraries(userId: string): Promise<JellyfinLibrary[]> {
  const data = await jellyGet(`${JELLYFIN_INTERNAL}/Users/${userId}/Views`);
  return (data?.Items ?? []).filter((l: any) => !EXCLUDED_TYPES.includes(l.CollectionType ?? ""));
}

// Films récents triés par date de sortie (PremiereDate)
export async function getRecentItems(userId: string, limit = 10): Promise<JellyfinItem[]> {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
    + `?Recursive=true`
    + `&IncludeItemTypes=Movie`
    + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,Genres,PremiereDate`
    + `&SortBy=PremiereDate&SortOrder=Descending`
    + `&Limit=${limit}`
    + `&HasTmdbId=true`; // seulement les films avec métadonnées
  const data = await jellyGet(url, 3600);
  return (data?.Items ?? [])
    .filter((item: any) => item.BackdropImageTags?.length > 0) // seulement ceux avec backdrop
    .map(enrich);
}

export async function getItemsByLibrary(parentId: string, userId: string, limit = 16): Promise<JellyfinItem[]> {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
    + `?ParentId=${parentId}&Recursive=true`
    + `&IncludeItemTypes=Movie,Series,Episode,MusicVideo,Video`
    + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,UserData`
    + `&Limit=${limit}&SortBy=SortName&SortOrder=Ascending`;
  const data = await jellyGet(url);
  return (data?.Items ?? []).map(enrich);
}

export async function getAllItemsByLibrary(
  parentId: string, userId: string, page = 0, pageSize = 100
): Promise<{ items: JellyfinItem[]; total: number }> {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
    + `?ParentId=${parentId}&Recursive=true`
    + `&IncludeItemTypes=Movie,Series,Episode,MusicVideo,Video`
    + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks`
    + `&Limit=${pageSize}&StartIndex=${page * pageSize}`
    + `&SortBy=SortName&SortOrder=Ascending`;
  const data = await jellyGet(url);
  return { items: (data?.Items ?? []).map(enrich), total: data?.TotalRecordCount ?? 0 };
}

export async function getItemById(itemId: string, userId: string): Promise<JellyfinItem | null> {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items/${itemId}`
    + `?Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,Genres,People,`
    + `MediaStreams,Chapters,Studios,ExternalUrls,Path,DateCreated,Taglines,OfficialRating,`
    + `CriticRating,CommunityRating,ProviderIds,PremiereDate`;
  const data = await jellyGet(url, 600);
  if (!data) return null;
  if (data.Chapters) {
    data.Chapters = data.Chapters.map((ch: any, i: number) => ({
      ...ch, imageUrl: getChapterImageUrl(itemId, i),
    }));
  }
  return enrich(data);
}

export async function getSimilarItems(itemId: string, userId: string): Promise<JellyfinItem[]> {
  const url = `${JELLYFIN_INTERNAL}/Items/${itemId}/Similar`
    + `?UserId=${userId}&Limit=8&Fields=PrimaryImageAspectRatio,ImageTags,Overview`;
  const data = await jellyGet(url, 3600);
  return (data?.Items ?? []).map(enrich);
}

export async function getHomeData() {
  const userId = await getFirstUserId();
  if (!userId) return { libraries: [], activeLibraries: [], recentItems: [] };
  const libraries = await getUserLibraries(userId);
  const [results, recentItems] = await Promise.all([
    Promise.all(libraries.map((lib) => getItemsByLibrary(lib.Id, userId, 16))),
    getRecentItems(userId, 10),
  ]);
  const activeLibraries = libraries
    .map((lib, i) => ({ ...lib, items: results[i] }))
    .filter((lib) => lib.items.length > 0);
  return { libraries, activeLibraries, recentItems };
}

// Une vignette "mix" par bibliothèque (jusqu'à `max`), image piochée au
// hasard côté serveur — revalidate:0 pour un tirage différent à chaque
// visite de la page, comme demandé.
export async function getLibraryShowcase(
  libraries: JellyfinLibrary[], userId: string, max = 8
): Promise<LibraryShowcaseItem[]> {
  const targets = libraries.slice(0, max);
  const results = await Promise.all(targets.map(async (lib) => {
    // Élargi : Movie/Series/MusicVideo/Video excluait Episode et Audio, donc
    // une bibliothèque Séries ou Musique (dont les items "de fond" sont des
    // Episode/Audio une fois IsNotFolder appliqué) ne retournait jamais rien.
    // BoxSet couvre la bibliothèque automatique "Collections".
    const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
      + `?ParentId=${lib.Id}&Recursive=true`
      + `&IncludeItemTypes=Movie,Series,Episode,MusicVideo,Video,Audio,MusicAlbum,Photo,BoxSet`
      + `&Filters=IsNotFolder&SortBy=Random&Limit=1`
      + `&Fields=BackdropImageTags,ImageTags`;
    const data = await jellyGet(url, 0);
    const pick = data?.Items?.[0];
    if (!pick) return null;
    const imageUrl = pick.BackdropImageTags?.length ? getBackdropUrl(pick.Id) : getPosterUrl(pick.Id);
    return { Id: lib.Id, Name: lib.Name, imageUrl };
  }));
  return results.filter((r): r is LibraryShowcaseItem => r !== null);
}
