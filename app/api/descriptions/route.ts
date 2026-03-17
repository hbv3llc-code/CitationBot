import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBusinessDescriptions } from "@/lib/ai/descriptions";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { business_id, count = 5 } = await req.json();

  if (!business_id) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", business_id)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const descriptions = await generateBusinessDescriptions(business, count);

  // Save to database
  const { data: saved } = await supabase
    .from("business_descriptions")
    .insert(descriptions.map((content) => ({ business_id, content, approved: false })))
    .select();

  return NextResponse.json({ data: saved }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description_id, approved } = await req.json();

  if (!description_id) {
    return NextResponse.json({ error: "description_id required" }, { status: 400 });
  }

  const { data } = await supabase
    .from("business_descriptions")
    .update({ approved })
    .eq("id", description_id)
    .select()
    .single();

  return NextResponse.json({ data });
}
