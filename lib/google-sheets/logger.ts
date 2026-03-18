import { google } from "googleapis";
import type { Business, CitationAccount, Site } from "@/types";

/**
 * Creates a new Google Sheet ledger for a business.
 * Returns the sheet ID and URL.
 */
export async function createBusinessLedger(
  business: Business,
  accessToken: string
): Promise<{ sheetId: string; sheetUrl: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `CitationBot — ${business.name}`,
      },
      sheets: [
        {
          properties: { title: "Citation Accounts", sheetId: 0, index: 0 },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Site Name" } },
                    { userEnteredValue: { stringValue: "Profile URL" } },
                    { userEnteredValue: { stringValue: "Email Used" } },
                    { userEnteredValue: { stringValue: "Password" } },
                    { userEnteredValue: { stringValue: "Status" } },
                    { userEnteredValue: { stringValue: "Date Created" } },
                    { userEnteredValue: { stringValue: "Last Checked" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const sheetId = response.data.spreadsheetId!;
  const sheetUrl = response.data.spreadsheetUrl!;

  // Make it accessible (optional: share with specific users)
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: business.email,
    },
  });

  return { sheetId, sheetUrl };
}

/**
 * Appends a new citation account row to a business's Google Sheet.
 * The password column always shows "stored in CitationBot".
 */
export async function logCitationAccount(
  sheetId: string,
  site: Site,
  account: CitationAccount,
  accessToken: string
): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Citation Accounts!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          site.name,
          account.profile_url ?? "",
          account.email_used,
          "stored in CitationBot",
          account.account_status,
          new Date(account.created_at).toLocaleDateString(),
          account.last_monitored_at
            ? new Date(account.last_monitored_at).toLocaleDateString()
            : "",
        ],
      ],
    },
  });
}

/**
 * Updates an existing row's status in the Google Sheet.
 */
export async function updateAccountStatus(
  sheetId: string,
  profileUrl: string,
  newStatus: string,
  lastChecked: Date,
  accessToken: string
): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Find the row by profile URL
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Citation Accounts!A:G",
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row: string[]) => row[1] === profileUrl);

  if (rowIndex === -1) return;

  const rowNum = rowIndex + 1; // 1-indexed

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Citation Accounts!E${rowNum}:G${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newStatus, "", lastChecked.toLocaleDateString()]],
    },
  });
}
