import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDomain } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("sites")
    .select("*, site_adapters(id, version, is_active, taught_by, created_at)")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, signup_url, allows_backlinks = false, requires_email_verification = true } = body;

  if (!name || !signup_url) {
    return NextResponse.json({ error: "name and signup_url are required" }, { status: 400 });
  }

  const base_domain = extractDomain(signup_url);

  const { data, error } = await supabase
    .from("sites")
    .insert({ user_id: user.id, name, signup_url, base_domain, allows_backlinks, requires_email_verification })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
