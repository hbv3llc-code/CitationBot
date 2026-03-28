import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses, bulkRuns, bulkRunResults, sites } from "@/lib/db";
import { extractDomain } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { business_id, sites: siteList, concurrency = 1 } = body;

  if (!business_id || !Array.isArray(siteList) || siteList.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.id, business_id), eq(businesses.user_id, session.user.id)))
    .limit(1);

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const [run] = await db
    .insert(bulkRuns)
    .values({
      user_id: session.user.id,
      business_id,
      status: "pending",
      total_sites: siteList.length,
      concurrency,
    })
    .returning();

  for (const site of siteList) {
    const domain = extractDomain(site.signup_url);

    // Upsert site
    const existing = await db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.user_id, session.user.id), eq(sites.base_domain, domain)))
      .limit(1);

    let siteId: string | null = existing[0]?.id ?? null;

    if (!siteId) {
      const [newSite] = await db
        .insert(sites)
        .values({ user_id: session.user.id, name: site.name, signup_url: site.signup_url, base_domain: domain })
        .returning({ id: sites.id });
      siteId = newSite.id;
    }

    await db.insert(bulkRunResults).values({
      bulk_run_id: run.id,
      site_id: siteId,
      site_name: site.name,
      signup_url: site.signup_url,
      status: "pending",
    });
  }

  return NextResponse.json({ run_id: run.id }, { status: 201 });
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await db
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
    .where(eq(bulkRuns.user_id, session.user.id))
    .orderBy(desc(bulkRuns.created_at));

  const data = runs.map(({ business_name, ...r }) => ({
    ...r,
    businesses: { name: business_name },
  }));

  return NextResponse.json({ data });
}
