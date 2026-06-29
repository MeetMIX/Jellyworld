import { cookies } from "next/headers";

const JELLYFIN_INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

export interface JellyfinSession {
  userId: string;
  token: string;
  username: string;
}

// Authentifie un utilisateur et retourne le token Jellyfin
export async function authenticateUser(
  username: string,
  password: string
): Promise<JellyfinSession | null> {
  try {
    const res = await fetch(`${JELLYFIN_INTERNAL}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization":
          'MediaBrowser Client="JellyWorld", Device="Web", DeviceId="jellyworld-web", Version="1.0"',
      },
      body: JSON.stringify({ Username: username, Pw: password }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      userId: data.User.Id,
      token: data.AccessToken,
      username: data.User.Name,
    };
  } catch {
    return null;
  }
}

// Récupère la session depuis le cookie
export async function getSession(): Promise<JellyfinSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("jw_session")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

// Encode la session pour le cookie
export function encodeSession(session: JellyfinSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

// Liste tous les utilisateurs Jellyfin (pour l'écran de sélection)
export async function listUsers() {
  try {
    const res = await fetch(`${JELLYFIN_INTERNAL}/Users/Public`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
