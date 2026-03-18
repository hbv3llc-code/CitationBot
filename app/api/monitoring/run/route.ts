import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProfileHealth } from "@/lib/automation/engine";

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find accounts due for monitoring
  const { data: accounts } = await supabase
    .from("citation_accounts")
    .select("*, sites(base_domain)")
    .eq("account_status", "active")
    .not("profile_url", "is", null)
    .or(`next_monitor_at.is.null,next_monitor_at.lte.${new Date().toISOString()}`);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: "No accounts due for monitoring", count: 0 });
  }

  let checked = 0;
  let alerts = 0;

  for (const account of accounts) {
    if (!account.profile_url) continue;

    const result = await checkProfileHealth(account.profile_url);
    checked++;

    // Save monitoring check result
    await supabase.from("monitoring_checks").insert({
      citation_account_id: account.id,
      status: result.status,
      details: result.details ?? null,
    });

    // Update account status if changed
    if (result.status === "removed") {
      await supabase
        .from("citation_accounts")
        .update({ account_status: "removed" })
        .eq("id", account.id);
      alerts++;
    } else if (result.status === "error") {
      alerts++;
    }

    // Schedule next check
    const intervalDays = account.monitor_interval_days ?? 30;
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + intervalDays);

    await supabase
      .from("citation_accounts")
      .update({
        last_monitored_at: new Date().toISOString(),
        next_monitor_at: nextCheck.toISOString(),
      })
      .eq("id", account.id);
  }

  return NextResponse.json({ checked, alerts });
}
