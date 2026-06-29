import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, encodeSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const session = await authenticateUser(username, password);

  if (!session) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username: session.username });
  res.cookies.set("jw_session", encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("jw_session");
  return res;
}
