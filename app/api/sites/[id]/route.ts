import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, sites, siteAdapters } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [site] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, params.id), eq(sites.user_id, session.user.id)))
    .limit(1);

  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adapters = await db
    .select()
    .from(siteAdapters)
    .where(eq(siteAdapters.site_id, params.id));

  return NextResponse.json({ data: { ...site, site_adapters: adapters } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...updates } = body;

  try {
    const [data] = await db
      .update(sites)
      .set({ ...updates, updated_at: new Date() })
      .where(and(eq(sites.id, params.id), eq(sites.user_id, session.user.id)))
      .returning();

    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(sites)
    .where(and(eq(sites.id, params.id), eq(sites.user_id, session.user.id)));

  return NextResponse.json({ success: true });
}
