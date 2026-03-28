import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, sites, siteAdapters } from "@/lib/db";
import { extractDomain } from "@/lib/utils";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.user_id, session.user.id))
    .orderBy(sites.name);

  // Attach adapters (summary only)
  const adapters = await db
    .select({
      id: siteAdapters.id,
      site_id: siteAdapters.site_id,
      version: siteAdapters.version,
      is_active: siteAdapters.is_active,
      taught_by: siteAdapters.taught_by,
      created_at: siteAdapters.created_at,
    })
    .from(siteAdapters);

  const adaptersBySite = adapters.reduce<Record<string, typeof adapters>>((acc, a) => {
    (acc[a.site_id] ||= []).push(a);
    return acc;
  }, {});

  const data = allSites.map((s) => ({ ...s, site_adapters: adaptersBySite[s.id] ?? [] }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, signup_url, requires_email_verification = true } = body;

  if (!name || !signup_url) {
    return NextResponse.json({ error: "name and signup_url are required" }, { status: 400 });
  }

  const base_domain = extractDomain(signup_url);

  try {
    const [data] = await db
      .insert(sites)
      .values({ user_id: session.user.id, name, signup_url, base_domain, requires_email_verification })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
