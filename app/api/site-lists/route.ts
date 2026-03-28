import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, siteLists } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await db
    .select()
    .from(siteLists)
    .where(eq(siteLists.user_id, session.user.id))
    .orderBy(desc(siteLists.created_at));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, sites } = await req.json();
  if (!name || !sites?.length) {
    return NextResponse.json({ error: "name and sites are required" }, { status: 400 });
  }

  const [data] = await db
    .insert(siteLists)
    .values({ user_id: session.user.id, name, sites })
    .returning();

  return NextResponse.json({ data }, { status: 201 });
}
