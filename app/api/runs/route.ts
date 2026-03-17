import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDomain } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { business_id, sites, concurrency = 1 } = body;

  if (!business_id || !Array.isArray(sites) || sites.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify business belongs to user
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", business_id)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Create the bulk run
  const { data: run, error: runError } = await supabase
    .from("bulk_runs")
    .insert({
      user_id: user.id,
      business_id,
      status: "pending",
      total_sites: sites.length,
      concurrency,
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }

  // Upsert sites and create result rows
  for (const site of sites) {
    const domain = extractDomain(site.signup_url);

    // Upsert site record
    const { data: siteRecord } = await supabase
      .from("sites")
      .upsert(
        {
          user_id: user.id,
          name: site.name,
          signup_url: site.signup_url,
          base_domain: domain,
        },
        { onConflict: "user_id,base_domain", ignoreDuplicates: true }
      )
      .select()
      .single();

    // Create result row
    await supabase.from("bulk_run_results").insert({
      bulk_run_id: run.id,
      site_id: siteRecord?.id ?? null,
      site_name: site.name,
      signup_url: site.signup_url,
      status: "pending",
    });
  }

  // Mark run as queued (worker will pick it up)
  await supabase.from("bulk_runs").update({ status: "pending" }).eq("id", run.id);

  return NextResponse.json({ run_id: run.id }, { status: 201 });
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: runs } = await supabase
    .from("bulk_runs")
    .select("*, businesses(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ data: runs });
}
