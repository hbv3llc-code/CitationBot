import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, proxyPool } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { host, port, username, proxy_type } = body;

  if (!host || !port) {
    return NextResponse.json({ error: "host and port are required" }, { status: 400 });
  }

  const [proxy] = await db
    .insert(proxyPool)
    .values({
      user_id: userId,
      host: String(host),
      port: parseInt(String(port), 10),
      username: username || null,
      proxy_type: proxy_type ?? "residential",
    })
    .returning();

  return NextResponse.json({ data: proxy });
}
