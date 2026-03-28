import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, businessDescriptions } from "@/lib/db";

async function verifyOwnership(descriptionId: string, userId: string) {
  const [desc] = await db
    .select({ business_id: businessDescriptions.business_id })
    .from(businessDescriptions)
    .where(eq(businessDescriptions.id, descriptionId))
    .limit(1);

  if (!desc) return null;

  const [biz] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.id, desc.business_id), eq(businesses.user_id, userId)))
    .limit(1);

  return biz ? desc : null;
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const desc = await verifyOwnership(params.id, session.user.id);
  if (!desc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(businessDescriptions).where(eq(businessDescriptions.id, params.id));
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approved } = await req.json();
  const desc = await verifyOwnership(params.id, session.user.id);
  if (!desc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [data] = await db
    .update(businessDescriptions)
    .set({ approved })
    .where(eq(businessDescriptions.id, params.id))
    .returning();

  return NextResponse.json({ data });
}
