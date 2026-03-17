import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify ownership via business
  const { data: account } = await supabase
    .from("citation_accounts")
    .select("business_id")
    .eq("id", params.id)
    .single();

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", account.business_id)
    .eq("user_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed = ["monitor_interval_days", "next_monitor_at", "account_status", "profile_url"];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from("citation_accounts")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
