import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNotNull, or, lte, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, citationAccounts, monitoringChecks, businesses } from "@/lib/db";
import { checkProfileHealth } from "@/lib/automation/engine";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Find active accounts due for monitoring (owned by this user)
  const accounts = await db
    .select({
      id: citationAccounts.id,
      profile_url: citationAccounts.profile_url,
      monitor_interval_days: citationAccounts.monitor_interval_days,
      next_monitor_at: citationAccounts.next_monitor_at,
      business_id: citationAccounts.business_id,
    })
    .from(citationAccounts)
    .innerJoin(businesses, and(
      eq(citationAccounts.business_id, businesses.id),
      eq(businesses.user_id, session.user.id)
    ))
    .where(
      and(
        eq(citationAccounts.account_status, "active"),
        isNotNull(citationAccounts.profile_url),
        or(
          isNull(citationAccounts.next_monitor_at),
          lte(citationAccounts.next_monitor_at, now)
        )
      )
    );

  if (!accounts.length) {
    return NextResponse.json({ message: "No accounts due for monitoring", count: 0 });
  }

  let checked = 0;
  let alerts = 0;

  for (const account of accounts) {
    if (!account.profile_url) continue;

    const result = await checkProfileHealth(account.profile_url);
    checked++;

    await db.insert(monitoringChecks).values({
      citation_account_id: account.id,
      status: result.status,
      details: result.details ?? null,
    });

    if (result.status === "removed") {
      await db
        .update(citationAccounts)
        .set({ account_status: "removed" })
        .where(eq(citationAccounts.id, account.id));
      alerts++;
    } else if (result.status === "error") {
      alerts++;
    }

    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + (account.monitor_interval_days ?? 30));

    await db
      .update(citationAccounts)
      .set({ last_monitored_at: now, next_monitor_at: nextCheck })
      .where(eq(citationAccounts.id, account.id));
  }

  return NextResponse.json({ checked, alerts });
}
