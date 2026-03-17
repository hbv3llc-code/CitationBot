import Anthropic from "@anthropic-ai/sdk";
import type { Business } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Scrapes a business website and generates 3–6 unique description variants
 * suitable for citation directory profiles.
 */
export async function generateBusinessDescriptions(
  business: Business,
  count = 5
): Promise<string[]> {
  const prompt = `You are writing business profile descriptions for local citation directories.

Business details:
- Name: ${business.name}
- Owner: ${business.owner_name}
- Address: ${business.address_street}, ${business.address_city}, ${business.address_state} ${business.address_zip}
- Phone: ${business.phone}
- Website: ${business.website}
- Founded: ${business.founding_year ?? "N/A"}
- Services: ${business.service_categories.join(", ")}

Generate exactly ${count} unique description variants for this business. Each description should:
1. Be 75–150 words
2. Sound natural and professional, NOT templated
3. Emphasize different aspects (services, location, experience, quality, community)
4. NOT include the phone number, address, or website URL in the text
5. Be unique enough to avoid duplicate content SEO penalties

Return ONLY a JSON array of strings, no other text. Example format:
["Description 1 here...", "Description 2 here...", ...]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, count).filter((d) => typeof d === "string");
    }
  } catch {
    // Try to extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, count).filter((d) => typeof d === "string");
      }
    }
  }

  throw new Error("Failed to parse AI description response");
}

/**
 * Attempts to automatically re-learn a site's adapter instructions when they break.
 * Returns updated adapter instructions or null if AI couldn't figure it out.
 */
export async function autoRepairAdapter(
  siteHtml: string,
  siteName: string,
  previousInstructions: object
): Promise<object | null> {
  const prompt = `You are analyzing a business directory signup page to extract form field mappings.

Site: ${siteName}

Previous instructions (now broken due to site redesign):
${JSON.stringify(previousInstructions, null, 2)}

Current page HTML (truncated):
${siteHtml.slice(0, 8000)}

Analyze the HTML and generate updated adapter instructions as a JSON object with this structure:
{
  "steps": [
    { "type": "navigate", "description": "Go to signup page" },
    { "type": "fill", "selector": "#field-id", "field_key": "name", "description": "Fill business name" },
    { "type": "click", "selector": "button[type=submit]", "description": "Submit form" }
  ],
  "field_mappings": [
    { "field_key": "name", "selector": "#business-name" },
    { "field_key": "phone", "selector": "input[name=phone]", "transform": "phone_formatted" }
  ],
  "post_submit_check": ".success-message"
}

Valid field_key values: name, owner_name, address_street, address_city, address_state, address_zip, phone, email, website, founding_year, description, backlink_url, backlink_anchor

Return ONLY the JSON object, no explanation. If you cannot determine the correct mappings, return null.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  if (text === "null") return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
