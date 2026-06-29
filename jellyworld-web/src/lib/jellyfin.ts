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

// Cache 5 minutes — évite de refaire les appels à chaque navigation
const CACHE: RequestInit = { next: { revalidate: 300 } };

async function jellyGet(url: string) {
  const res = await fetch(url, { method: "GET", headers: authHeaders, ...CACHE });
  if (!res.ok) return null;
  return res.json();
}

export async function getFirstUserId(): Promise<string | null> {
  try {
    const users = await jellyGet(`${JELLYFIN_INTERNAL}/Users`);
    return users?.[0]?.Id ?? null;
  } catch { return null; }
}

export async function getUserLibraries(userId: string): Promise<JellyfinLibrary[]> {
  try {
    const data = await jellyGet(`${JELLYFIN_INTERNAL}/Users/${userId}/Views`);
    return (data?.Items ?? []).filter((l: any) => l.CollectionType !== "boxsets");
  } catch { return []; }
}

export async function getItemsByLibrary(parentId: string, userId: string, limit = 16): Promise<JellyfinItem[]> {
  try {
    const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
      + `?ParentId=${parentId}&Recursive=true`
      + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,UserData`
      + `&Limit=${limit}&SortBy=SortName&SortOrder=Ascending`;
    const data = await jellyGet(url);
    return (data?.Items ?? []).map(enrich);
  } catch { return []; }
}

// ✅ FIX : utilise maintenant userId — sans lui l'API retourne 0 résultats
export async function getAllItemsByLibrary(parentId: string, userId: string): Promise<JellyfinItem[]> {
  try {
    const url = `${JELLYFIN_INTERNAL}/Users/${userId}/Items`
      + `?ParentId=${parentId}&Recursive=true`
      + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks`
      + `&SortBy=SortName&SortOrder=Ascending`;
    const data = await jellyGet(url);
    return (data?.Items ?? []).map(enrich);
  } catch { return []; }
}

export async function getHomeData(): Promise<{
  libraries: JellyfinLibrary[];
  activeLibraries: LibraryWithItems[];
  heroItem: JellyfinItem | null;
}> {
  const userId = await getFirstUserId();
  if (!userId) return { libraries: [], activeLibraries: [], heroItem: null };

  const libraries = await getUserLibraries(userId);

  // Toutes les bibliothèques en parallèle
  const results = await Promise.all(
    libraries.map((lib) => getItemsByLibrary(lib.Id, userId, 16))
  );

  const activeLibraries = libraries
    .map((lib, i) => ({ ...lib, items: results[i] }))
    .filter((lib) => lib.items.length > 0);

  return { libraries, activeLibraries, heroItem: activeLibraries[0]?.items[0] ?? null };
}
