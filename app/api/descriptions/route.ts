import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, businessDescriptions } from "@/lib/db";
import { generateBusinessDescriptions } from "@/lib/ai/descriptions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { business_id, count = 5 } = await req.json();
  if (!business_id) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, business_id), eq(businesses.user_id, session.user.id)))
    .limit(1);

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descriptions = await generateBusinessDescriptions(business as any, count);

  const saved = await db
    .insert(businessDescriptions)
    .values(descriptions.map((content) => ({ business_id, content, approved: false })))
    .returning();

  return NextResponse.json({ data: saved }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description_id, approved } = await req.json();
  if (!description_id) return NextResponse.json({ error: "description_id required" }, { status: 400 });

  const [data] = await db
    .update(businessDescriptions)
    .set({ approved })
    .where(eq(businessDescriptions.id, description_id))
    .returning();

  return NextResponse.json({ data });
}
