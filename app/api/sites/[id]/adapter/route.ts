import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, sites, siteAdapters } from "@/lib/db";
import { fetchPageHtml } from "@/lib/automation/engine";
import { autoRepairAdapter } from "@/lib/ai/descriptions";

// Save a new adapter (called by the Chrome extension after a teaching session)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [site] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.id, params.id), eq(sites.user_id, session.user.id)))
    .limit(1);

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const { instructions, taught_by = "user" } = await req.json();
  if (!instructions) return NextResponse.json({ error: "instructions required" }, { status: 400 });

  // Deactivate existing adapters
  await db
    .update(siteAdapters)
    .set({ is_active: false })
    .where(eq(siteAdapters.site_id, params.id));

  const [latest] = await db
    .select({ version: siteAdapters.version })
    .from(siteAdapters)
    .where(eq(siteAdapters.site_id, params.id))
    .orderBy(desc(siteAdapters.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  const [data] = await db
    .insert(siteAdapters)
    .values({ site_id: params.id, version: nextVersion, instructions, is_active: true, taught_by })
    .returning();

  await db
    .update(sites)
    .set({ adapter_status: "active", last_adapter_check_at: new Date() })
    .where(eq(sites.id, params.id));

  return NextResponse.json({ data }, { status: 201 });
}

// Trigger AI auto-repair for a broken adapter
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [site] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, params.id), eq(sites.user_id, session.user.id)))
    .limit(1);

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const adapters = await db
    .select()
    .from(siteAdapters)
    .where(eq(siteAdapters.site_id, params.id));

  const activeAdapter = adapters.find((a) => a.is_active);
  if (!activeAdapter) {
    return NextResponse.json({ error: "No active adapter to repair" }, { status: 400 });
  }

  await db.update(sites).set({ adapter_status: "repairing" }).where(eq(sites.id, params.id));

  try {
    const html = await fetchPageHtml(site.signup_url);
    const newInstructions = await autoRepairAdapter(html, site.name, activeAdapter.instructions as object);

    if (!newInstructions) {
      await db.update(sites).set({ adapter_status: "broken" }).where(eq(sites.id, params.id));
      return NextResponse.json({
        success: false,
        message: "AI could not determine new page layout. Teaching session required.",
      });
    }

    await db.update(siteAdapters).set({ is_active: false }).where(eq(siteAdapters.site_id, params.id));

    const [latest] = await db
      .select({ version: siteAdapters.version })
      .from(siteAdapters)
      .where(eq(siteAdapters.site_id, params.id))
      .orderBy(desc(siteAdapters.version))
      .limit(1);

    const nextVersion = (latest?.version ?? 0) + 1;

    await db.insert(siteAdapters).values({
      site_id: params.id,
      version: nextVersion,
      instructions: newInstructions,
      is_active: true,
      taught_by: "ai",
    });

    await db
      .update(sites)
      .set({ adapter_status: "active", last_adapter_check_at: new Date() })
      .where(eq(sites.id, params.id));

    return NextResponse.json({ success: true, message: "Adapter repaired by AI" });
  } catch (err) {
    await db.update(sites).set({ adapter_status: "broken" }).where(eq(sites.id, params.id));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
