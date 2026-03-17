import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPageHtml } from "@/lib/automation/engine";
import { autoRepairAdapter } from "@/lib/ai/descriptions";

// Save a new adapter (called by the Chrome extension after a teaching session)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify site belongs to user
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const { instructions, taught_by = "user" } = await req.json();

  if (!instructions) {
    return NextResponse.json({ error: "instructions required" }, { status: 400 });
  }

  // Deactivate existing adapters
  await supabase
    .from("site_adapters")
    .update({ is_active: false })
    .eq("site_id", params.id);

  // Get next version number
  const { data: existing } = await supabase
    .from("site_adapters")
    .select("version")
    .eq("site_id", params.id)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("site_adapters")
    .insert({
      site_id: params.id,
      version: nextVersion,
      instructions,
      is_active: true,
      taught_by,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update site adapter_status
  await supabase
    .from("sites")
    .update({ adapter_status: "active", last_adapter_check_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ data }, { status: 201 });
}

// Trigger AI auto-repair for a broken adapter
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: site } = await supabase
    .from("sites")
    .select("*, site_adapters(*)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const activeAdapter = site.site_adapters?.find((a: { is_active: boolean }) => a.is_active);
  if (!activeAdapter) {
    return NextResponse.json({ error: "No active adapter to repair" }, { status: 400 });
  }

  // Mark as repairing
  await supabase.from("sites").update({ adapter_status: "repairing" }).eq("id", params.id);

  try {
    const html = await fetchPageHtml(site.signup_url);
    const newInstructions = await autoRepairAdapter(html, site.name, activeAdapter.instructions);

    if (!newInstructions) {
      await supabase.from("sites").update({ adapter_status: "broken" }).eq("id", params.id);
      return NextResponse.json({
        success: false,
        message: "AI could not determine new page layout. Teaching session required.",
      });
    }

    // Save AI-repaired adapter
    await supabase.from("site_adapters").update({ is_active: false }).eq("site_id", params.id);

    const { data: existing } = await supabase
      .from("site_adapters")
      .select("version")
      .eq("site_id", params.id)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    await supabase.from("site_adapters").insert({
      site_id: params.id,
      version: nextVersion,
      instructions: newInstructions,
      is_active: true,
      taught_by: "ai",
    });

    await supabase
      .from("sites")
      .update({ adapter_status: "active", last_adapter_check_at: new Date().toISOString() })
      .eq("id", params.id);

    return NextResponse.json({ success: true, message: "Adapter repaired by AI" });
  } catch (err) {
    await supabase.from("sites").update({ adapter_status: "broken" }).eq("id", params.id);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
