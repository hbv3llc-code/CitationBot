import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, proxyPool } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await db
    .delete(proxyPool)
    .where(and(eq(proxyPool.id, params.id), eq(proxyPool.user_id, userId)));

  return NextResponse.json({ success: true });
}
