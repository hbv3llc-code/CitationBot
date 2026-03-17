import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership via business
  const { data: desc } = await supabase
    .from("business_descriptions")
    .select("business_id")
    .eq("id", params.id)
    .single();

  if (!desc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", desc.business_id)
    .eq("user_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("business_descriptions")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approved } = await req.json();

  const { data: desc } = await supabase
    .from("business_descriptions")
    .select("business_id")
    .eq("id", params.id)
    .single();

  if (!desc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", desc.business_id)
    .eq("user_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("business_descriptions")
    .update({ approved })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
