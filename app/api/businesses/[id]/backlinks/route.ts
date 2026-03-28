import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, businesses, backlinkPool } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Verify ownership
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.id, params.id), eq(businesses.user_id, userId)))
    .limit(1);

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { backlinks } = body as { backlinks: Array<{ url: string; anchor_text: string }> };

  // Delete all existing, re-insert
  await db.delete(backlinkPool).where(eq(backlinkPool.business_id, params.id));

  const valid = (backlinks ?? []).filter((b) => b.url && b.anchor_text);
  if (valid.length > 0) {
    await db.insert(backlinkPool).values(
      valid.map(({ url, anchor_text }) => ({
        business_id: params.id,
        url,
        anchor_text,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
