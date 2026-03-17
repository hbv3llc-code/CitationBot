import { google } from "googleapis";

export interface EmailVerificationResult {
  success: boolean;
  verificationUrl?: string;
  error?: string;
}

/**
 * Polls Gmail for a verification email from a citation site and clicks the link.
 * Uses read-only OAuth access — cannot send, delete, or modify emails.
 */
export async function waitForVerificationEmail(
  refreshToken: string,
  fromDomain: string,
  maxWaitMs = 120000,
  pollIntervalMs = 5000
): Promise<EmailVerificationResult> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth });
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Search for recent unread emails from the citation site domain
      const since = Math.floor((Date.now() - 5 * 60 * 1000) / 1000); // last 5 min
      const query = `from:${fromDomain} after:${since} subject:(verify OR confirm OR activate)`;

      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 5,
      });

      const messages = listResponse.data.messages ?? [];

      for (const msg of messages) {
        const msgData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });

        const body = extractEmailBody(msgData.data);
        const verificationUrl = extractVerificationLink(body, fromDomain);

        if (verificationUrl) {
          return { success: true, verificationUrl };
        }
      }
    } catch (error) {
      console.error("Gmail poll error:", error);
    }

    await sleep(pollIntervalMs);
  }

  return {
    success: false,
    error: `No verification email found from ${fromDomain} within ${maxWaitMs / 1000}s`,
  };
}

function extractEmailBody(message: import("googleapis").gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts ?? [];
  const body = message.payload?.body;

  if (body?.data) {
    return Buffer.from(body.data, "base64").toString("utf8");
  }

  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf8");
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf8");
    }
  }

  return "";
}

function extractVerificationLink(html: string, fromDomain: string): string | null {
  // Match href URLs containing "verify", "confirm", or "activate"
  const urlPattern = /https?:\/\/[^\s"'<>]+(?:verif|confirm|activat)[^\s"'<>]*/gi;
  const matches = html.match(urlPattern);

  if (!matches) return null;

  // Prefer links from the same domain as the sending site
  const domainMatch = matches.find((url) => url.includes(fromDomain));
  return domainMatch ?? matches[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
