/**
 * JellyWorld — Jellyfin API Client
 * Toutes les fonctions d'accès au backend centralisées ici.
 * Les credentials viennent des variables d'environnement.
 */

const JELLYFIN_URL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
const JELLYFIN_TOKEN = process.env.JELLYFIN_API_KEY || "";

/** Headers partagés pour toutes les requêtes */
const headers = {
  Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
  Accept: "application/json",
};

const fetchOpts = { method: "GET", headers, cache: "no-store" } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JellyfinUser {
  Id: string;
  Name: string;
}

export interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Overview?: string;
  ProductionYear?: number;
  CommunityRating?: number;
  RunTimeTicks?: number;
  Type: string;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  UserData?: {
    PlayedPercentage?: number;
    PlaybackPositionTicks?: number;
  };
  // Champs calculés ajoutés côté client
  posterUrl: string;
  backdropUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPosterUrl(itemId: string): string {
  return `${JELLYFIN_URL}/Items/${itemId}/Images/Primary?api_key=${JELLYFIN_TOKEN}&fillWidth=300&quality=90`;
}

export function getBackdropUrl(itemId: string): string {
  return `${JELLYFIN_URL}/Items/${itemId}/Images/Backdrop?api_key=${JELLYFIN_TOKEN}&fillWidth=1280&quality=85`;
}

export function formatRuntime(ticks?: number): string {
  if (!ticks) return "";
  const minutes = Math.floor(ticks / 600000000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function enrichItem(item: any): JellyfinItem {
  return {
    ...item,
    posterUrl: getPosterUrl(item.Id),
    backdropUrl: getBackdropUrl(item.Id),
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getFirstUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${JELLYFIN_URL}/Users`, fetchOpts);
    if (!res.ok) return null;
    const users: JellyfinUser[] = await res.json();
    return users[0]?.Id ?? null;
  } catch {
    return null;
  }
}

export async function getUserLibraries(userId: string): Promise<JellyfinLibrary[]> {
  try {
    const res = await fetch(`${JELLYFIN_URL}/Users/${userId}/Views`, fetchOpts);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []).filter(
      (lib: JellyfinLibrary) => lib.CollectionType !== "boxsets"
    );
  } catch {
    return [];
  }
}

export async function getItemsByLibrary(
  parentId: string,
  userId: string,
  limit = 16
): Promise<JellyfinItem[]> {
  try {
    const url =
      `${JELLYFIN_URL}/Users/${userId}/Items` +
      `?ParentId=${parentId}` +
      `&Recursive=true` +
      `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks,UserData` +
      `&Limit=${limit}` +
      `&SortBy=SortName&SortOrder=Ascending`;

    const res = await fetch(url, fetchOpts);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []).map(enrichItem);
  } catch {
    return [];
  }
}

export async function getAllItemsByLibrary(
  parentId: string
): Promise<JellyfinItem[]> {
  try {
    const url =
      `${JELLYFIN_URL}/Items` +
      `?ParentId=${parentId}` +
      `&Recursive=true` +
      `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks` +
      `&SortBy=SortName&SortOrder=Ascending`;

    const res = await fetch(url, fetchOpts);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []).map(enrichItem);
  } catch {
    return [];
  }
}

// ─── Données agrégées ─────────────────────────────────────────────────────────

export interface LibraryWithItems extends JellyfinLibrary {
  items: JellyfinItem[];
}

export async function getHomeData(): Promise<{
  libraries: JellyfinLibrary[];
  activeLibraries: LibraryWithItems[];
  heroItem: JellyfinItem | null;
}> {
  const userId = await getFirstUserId();
  if (!userId) return { libraries: [], activeLibraries: [], heroItem: null };

  const libraries = await getUserLibraries(userId);

  const activeLibraries: LibraryWithItems[] = (
    await Promise.all(
      libraries.map(async (lib) => {
        const items = await getItemsByLibrary(lib.Id, userId);
        return { ...lib, items };
      })
    )
  ).filter((lib) => lib.items.length > 0);

  const heroItem = activeLibraries[0]?.items[0] ?? null;

  return { libraries, activeLibraries, heroItem };
}
