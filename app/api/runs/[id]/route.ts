import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, bulkRuns, bulkRunResults, citationAccounts } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [run] = await db
    .select({
      id: bulkRuns.id,
      user_id: bulkRuns.user_id,
      business_id: bulkRuns.business_id,
      status: bulkRuns.status,
      total_sites: bulkRuns.total_sites,
      completed_sites: bulkRuns.completed_sites,
      successful_sites: bulkRuns.successful_sites,
      failed_sites: bulkRuns.failed_sites,
      skipped_sites: bulkRuns.skipped_sites,
      concurrency: bulkRuns.concurrency,
      started_at: bulkRuns.started_at,
      completed_at: bulkRuns.completed_at,
      created_at: bulkRuns.created_at,
      business_name: businesses.name,
    })
    .from(bulkRuns)
    .leftJoin(businesses, eq(bulkRuns.business_id, businesses.id))
    .where(and(eq(bulkRuns.id, params.id), eq(bulkRuns.user_id, session.user.id)))
    .limit(1);

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawResults = await db
    .select()
    .from(bulkRunResults)
    .where(eq(bulkRunResults.bulk_run_id, params.id))
    .orderBy(asc(bulkRunResults.created_at));

  // Attach profile_url from citation_accounts
  const accountIds = rawResults
    .map((r) => r.citation_account_id)
    .filter((id): id is string => id !== null);

  const accountMap: Record<string, string | null> = {};
  if (accountIds.length > 0) {
    const accounts = await db
      .select({ id: citationAccounts.id, profile_url: citationAccounts.profile_url })
      .from(citationAccounts)
      .where(inArray(citationAccounts.id, accountIds));
    accounts.forEach((a) => { accountMap[a.id] = a.profile_url; });
  }

  const results = rawResults.map((r) => ({
    ...r,
    citation_accounts: r.citation_account_id
      ? { profile_url: accountMap[r.citation_account_id] ?? null }
      : null,
  }));

  const { business_name, ...runData } = run;
  return NextResponse.json({ data: { ...runData, businesses: { name: business_name }, results } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .update(bulkRuns)
    .set({ status: "cancelled", completed_at: new Date() })
    .where(
      and(
        eq(bulkRuns.id, params.id),
        eq(bulkRuns.user_id, session.user.id),
        inArray(bulkRuns.status, ["pending", "running"])
      )
    );

  return NextResponse.json({ success: true });
}
