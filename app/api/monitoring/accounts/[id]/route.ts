import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, citationAccounts } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify ownership via business
  const [account] = await db
    .select({ business_id: citationAccounts.business_id })
    .from(citationAccounts)
    .where(eq(citationAccounts.id, params.id))
    .limit(1);

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [biz] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.id, account.business_id), eq(businesses.user_id, session.user.id)))
    .limit(1);

  if (!biz) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed = ["monitor_interval_days", "next_monitor_at", "account_status", "profile_url"];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const [data] = await db
    .update(citationAccounts)
    .set(updates)
    .where(eq(citationAccounts.id, params.id))
    .returning();

  return NextResponse.json({ data });
}
