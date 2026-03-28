import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, businesses } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const business_id = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !business_id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/businesses/${business_id}?error=gmail_denied`
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  const { tokens } = await oauth2Client.getToken(code);

  await db
    .update(businesses)
    .set({
      gmail_access_token: tokens.access_token ? encrypt(tokens.access_token) : null,
      gmail_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      gmail_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      gmail_connected_at: new Date(),
    })
    .where(and(eq(businesses.id, business_id), eq(businesses.user_id, session.user.id)));

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/businesses/${business_id}?success=gmail_connected`
  );
}
