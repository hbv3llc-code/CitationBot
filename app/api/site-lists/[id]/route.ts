import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, siteLists } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(siteLists)
    .where(and(eq(siteLists.id, params.id), eq(siteLists.user_id, session.user.id)));

  return NextResponse.json({ success: true });
}
