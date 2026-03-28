import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, businessDescriptions, backlinkPool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [biz] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, params.id), eq(businesses.user_id, session.user.id)))
    .limit(1);

  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [descriptions, backlinks] = await Promise.all([
    db.select().from(businessDescriptions).where(eq(businessDescriptions.business_id, params.id)),
    db.select().from(backlinkPool).where(eq(backlinkPool.business_id, params.id)),
  ]);

  return NextResponse.json({ data: { ...biz, business_descriptions: descriptions, backlink_pool: backlinks } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...updates } = body;

  try {
    const [data] = await db
      .update(businesses)
      .set({ ...updates, updated_at: new Date() })
      .where(and(eq(businesses.id, params.id), eq(businesses.user_id, session.user.id)))
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
    .delete(businesses)
    .where(and(eq(businesses.id, params.id), eq(businesses.user_id, session.user.id)));

  return NextResponse.json({ success: true });
}
