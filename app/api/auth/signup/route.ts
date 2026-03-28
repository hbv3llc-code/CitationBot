import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);

  await db.insert(users).values({ email, password: hash });

  return NextResponse.json({ success: true }, { status: 201 });
}
