import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import type { AdapterInstructions, AdapterStep, BusinessFields, Proxy } from "@/types";

export interface AutomationOptions {
  proxy?: Proxy;
  headless?: boolean;
  timeout?: number;
}

export interface AutomationResult {
  success: boolean;
  profileUrl?: string;
  error?: string;
  screenshotBase64?: string;
}

/**
 * Runs a citation site signup using a stored adapter's instructions.
 */
export async function runSignup(
  signupUrl: string,
  instructions: AdapterInstructions,
  fields: BusinessFields,
  options: AutomationOptions = {}
): Promise<AutomationResult> {
  const { proxy, headless = true, timeout = 60000 } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless,
      proxy: proxy
        ? {
            server: `${proxy.host}:${proxy.port}`,
            username: proxy.username ?? undefined,
            password: proxy.encrypted_password ? "[decrypted-at-call-site]" : undefined,
          }
        : undefined,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // Navigate to signup URL
    await page.goto(signupUrl, { waitUntil: "domcontentloaded" });

    // Execute each step
    for (const step of instructions.steps) {
      await executeStep(page, step, fields);
    }

    // Check for success
    let profileUrl: string | undefined;
    if (instructions.post_submit_check) {
      try {
        await page.waitForSelector(instructions.post_submit_check, { timeout: 15000 });
        profileUrl = page.url();
      } catch {
        // Success check failed — may still have worked
        profileUrl = page.url();
      }
    } else {
      profileUrl = page.url();
    }

    return { success: true, profileUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (browser) await browser.close();
  }
}

async function executeStep(
  page: Page,
  step: AdapterStep,
  fields: BusinessFields
): Promise<void> {
  switch (step.type) {
    case "navigate":
      if (step.value) {
        await page.goto(step.value, { waitUntil: "domcontentloaded" });
      }
      break;

    case "fill":
      if (step.selector && step.field_key) {
        const value = getFieldValue(fields, step.field_key);
        await page.locator(step.selector).fill(value);
      }
      break;

    case "click":
      if (step.selector) {
        await page.locator(step.selector).click();
      }
      break;

    case "select":
      if (step.selector && step.field_key) {
        const value = getFieldValue(fields, step.field_key);
        await page.locator(step.selector).selectOption(value);
      }
      break;

    case "wait":
      if (step.selector) {
        await page.waitForSelector(step.selector);
      } else if (step.value) {
        await page.waitForTimeout(parseInt(step.value, 10));
      }
      break;

    case "upload":
      // Logo upload — value contains the file path
      if (step.selector && step.value) {
        await page.locator(step.selector).setInputFiles(step.value);
      }
      break;

    case "check_email":
      // Email verification is handled separately by the email verifier
      // This step is a marker — the worker handles it out-of-band
      break;
  }
}

function getFieldValue(fields: BusinessFields, key: keyof BusinessFields): string {
  return fields[key] ?? "";
}

/**
 * Checks a profile URL to see if the citation account still exists.
 */
export async function checkProfileHealth(
  profileUrl: string,
  options: AutomationOptions = {}
): Promise<{ status: "ok" | "removed" | "changed" | "error"; details?: string }> {
  const { proxy, headless = true } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless,
      proxy: proxy
        ? { server: `${proxy.host}:${proxy.port}` }
        : undefined,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const status = response?.status() ?? 0;

    if (status === 404 || status === 410) {
      return { status: "removed", details: `HTTP ${status}` };
    }

    if (status >= 400) {
      return { status: "error", details: `HTTP ${status}` };
    }

    // Check for common "not found" page patterns
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const notFoundPhrases = [
      "page not found",
      "profile not found",
      "account not found",
      "this listing has been removed",
      "this business has been removed",
    ];

    if (notFoundPhrases.some((phrase) => bodyText.toLowerCase().includes(phrase))) {
      return { status: "removed", details: "Profile page shows 'not found' message" };
    }

    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      details: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Fetches page HTML for adapter repair analysis.
 */
export async function fetchPageHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}
