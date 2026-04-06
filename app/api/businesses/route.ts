import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await db
    .select()
    .from(businesses)
    .where(eq(businesses.user_id, session.user.id))
    .orderBy(businesses.name);

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, owner_name, address_street, address_city, address_state,
    address_zip, address_country = "US", phone, email, website,
    founding_year, service_categories = [],
  } = body;

  if (!name || !address_city || !address_state || !address_zip || !website) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [data] = await db
    .insert(businesses)
    .values({
      user_id: session.user.id,
      name,
      owner_name: owner_name || null,
      address_street: address_street || null,
      address_city,
      address_state,
      address_zip,
      address_country,
      phone: phone || null,
      email: email || null,
      website,
      founding_year: founding_year ?? null,
      service_categories,
    })
    .returning();

  return NextResponse.json({ data }, { status: 201 });
}
