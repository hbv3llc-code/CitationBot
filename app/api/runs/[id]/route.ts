import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: run }, { data: results }] = await Promise.all([
    supabase
      .from("bulk_runs")
      .select("*, businesses(name)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("bulk_run_results")
      .select("*, citation_accounts(profile_url)")
      .eq("bulk_run_id", params.id)
      .order("created_at"),
  ]);

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ...run, results } });
}

// Cancel a running job
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("bulk_runs")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .in("status", ["pending", "running"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
