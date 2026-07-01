import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { itemIds } = await req.json();
  if (!itemIds || itemIds.length < 2) {
    return NextResponse.json({ error: "Sélectionnez au moins 2 médias" }, { status: 400 });
  }

  const headers = {
    Authorization: `MediaBrowser Token="${session.token}"`,
    "Content-Type": "application/json",
  };

  try {
    // Endpoint officiel Jellyfin pour fusionner des versions — POST, pas DELETE
    // (c'était le bug à l'origine du 405 "Method Not Allowed").
    const ids = itemIds.join(",");
    const res = await fetch(
      `${INTERNAL}/Videos/MergeVersions?Ids=${ids}`,
      { method: "POST", headers }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({
        error: `Jellyfin a refusé le groupement (${res.status})`,
        detail: body.slice(0, 200),
      }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Annuler un groupement (séparer les versions)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { itemId } = await req.json();
  const headers = { Authorization: `MediaBrowser Token="${session.token}"` };

  try {
    // Endpoint officiel Jellyfin pour séparer des versions groupées.
    const res = await fetch(
      `${INTERNAL}/Videos/${itemId}/AlternateSources`,
      { method: "DELETE", headers }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({
        error: `Jellyfin a refusé la séparation (${res.status})`,
        detail: body.slice(0, 200),
      }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
