const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
const JELLYFIN_PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
const JELLYFIN_TOKEN    = process.env.JELLYFIN_API_KEY || "";

const authHeaders = {
  Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
  Accept: "application/json",
};

export interface JellyfinLibrary { Id: string; Name: string; CollectionType?: string; }
export interface JellyfinItem {
  Id: string; Name: string; Overview?: string;
  ProductionYear?: number; CommunityRating?: number; RunTimeTicks?: number; Type: string;
  Genres?: string[];
  ImageTags?: Record<string, string>; BackdropImageTags?: string[];
  UserData?: { PlayedPercentage?: number; };
  posterUrl: string; backdropUrl: string;
}
export interface LibraryWithItems extends JellyfinLibrary { items: JellyfinItem[]; }

export function getPosterUrl(id: string) {
  return `${JELLYFIN_PUBLIC}/Items/${id}/Images/Primary?api_key=${JELLYFIN_TOKEN}&fillWidth=300&quality=90`;
}
export function getBackdropUrl(id: string) {
  return `${JELLYFIN_PUBLIC}/Items/${id}/Images/Backdrop?api_key=${JELLYFIN_TOKEN}&fillWidth=1280&quality=85`;
}
export function formatRuntime(ticks?: number): string {
  if (!ticks) return "";
  const m = Math.floor(ticks / 600000000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}
function enrich(item: any): JellyfinItem {
  return { ...item, posterUrl: getPosterUrl(item.Id), backdropUrl: getBackdropUrl(item.Id) };
}

const EXCLUDED_TYPES = ["boxsets", "playlists"];

async function jellyGet(url: string, revalidate = 300) {
  try {
    const res = await fetch(url, {
      method: "GET", headers: authHeaders,
      next: { revalidate },
    });
    if (!res.ok) {
      console.error(`[Jellyfin] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(`[Jellyfin] fetch error:`, e);
    return null;
  }
}

export async function getFirstUserId(): Promise<string | null> {
  const data = await jellyGet(`${JELLYFIN_INTERNAL}/Users`);
  return data?.[0]?.Id ?? null;
}

export async function getUserLibraries(userId: string): Promise<JellyfinLibrary[]> {
  const data = await jellyGet(`${JELLYFIN_INTERNAL}/Users/${userId}/Views`);
  return (data?.Items ?? []).filter(
    (l: any) => !EXCLUDED_TYPES.includes(l.CollectionType ?? "")
  );
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

// Paginated — évite les réponses >2MB qui cassent le cache Next.js
export async function getAllItemsByLibrary(
  parentId: string,
  userId: string,
  page = 0,
  pageSize = 100
): Promise<{ items: JellyfinItem[]; total: number }> {
  const startIndex = page * pageSize;
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
    + `?ParentId=${parentId}&Recursive=true`
    + `&IncludeItemTypes=Movie,Series,Episode,MusicVideo,Video`
    + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks`
    + `&Limit=${pageSize}&StartIndex=${startIndex}`
    + `&SortBy=SortName&SortOrder=Ascending`;
  const data = await jellyGet(url);
  const total = data?.TotalRecordCount ?? 0;
  const items = (data?.Items ?? []).map(enrich);
  console.log(`[Jellyfin] getAllItemsByLibrary parentId=${parentId} page=${page} → ${items.length}/${total}`);
  return { items, total };
}

export async function getItemById(itemId: string, userId: string): Promise<JellyfinItem | null> {
  const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items/${itemId}`
    + `?Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,Genres,People,MediaStreams`;
  const data = await jellyGet(url, 600);
  if (!data) return null;
  return enrich(data);
}

export async function getHomeData(): Promise<{
  libraries: JellyfinLibrary[];
  activeLibraries: LibraryWithItems[];
  heroItem: JellyfinItem | null;
}> {
  const userId = await getFirstUserId();
  if (!userId) return { libraries: [], activeLibraries: [], heroItem: null };
  const libraries = await getUserLibraries(userId);
  const results = await Promise.all(
    libraries.map((lib) => getItemsByLibrary(lib.Id, userId, 16))
  );
  const activeLibraries = libraries
    .map((lib, i) => ({ ...lib, items: results[i] }))
    .filter((lib) => lib.items.length > 0);
  return { libraries, activeLibraries, heroItem: activeLibraries[0]?.items[0] ?? null };
}
