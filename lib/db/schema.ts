import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ============================================================
// ENUMS
// ============================================================

export const adapterStatusEnum = pgEnum("adapter_status", [
  "unknown",
  "learning",
  "active",
  "broken",
  "repairing",
]);

export const taughtByEnum = pgEnum("taught_by", ["user", "ai"]);

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "pending_verification",
  "flagged",
  "removed",
  "unknown",
]);

export const monitoringStatusEnum = pgEnum("monitoring_status", [
  "ok",
  "removed",
  "changed",
  "error",
  "flagged",
]);

export const bulkRunStatusEnum = pgEnum("bulk_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const bulkRunResultStatusEnum = pgEnum("bulk_run_result_status", [
  "pending",
  "running",
  "success",
  "failed",
  "skipped",
  "blocked",
]);

export const proxyTypeEnum = pgEnum("proxy_type", [
  "residential",
  "datacenter",
  "mobile",
]);

// ============================================================
// NEXTAUTH TABLES (required by @auth/drizzle-adapter)
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    compoundKey: unique().on(t.provider, t.providerAccountId),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    compoundKey: unique().on(t.identifier, t.token),
  })
);

// ============================================================
// BUSINESSES
// ============================================================

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    owner_name: text("owner_name").notNull(),
    address_street: text("address_street").notNull(),
    address_city: text("address_city").notNull(),
    address_state: text("address_state").notNull(),
    address_zip: text("address_zip").notNull(),
    address_country: text("address_country").notNull().default("US"),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    website: text("website").notNull(),
    founding_year: integer("founding_year"),
    service_categories: text("service_categories").array().notNull().default([]),
    logo_url: text("logo_url"),
    google_sheet_id: text("google_sheet_id"),
    google_sheet_url: text("google_sheet_url"),
    gmail_access_token: text("gmail_access_token"),
    gmail_refresh_token: text("gmail_refresh_token"),
    gmail_token_expiry: timestamp("gmail_token_expiry", { withTimezone: true }),
    gmail_connected_at: timestamp("gmail_connected_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("idx_businesses_user_id").on(t.user_id),
  })
);

// ============================================================
// BUSINESS DESCRIPTIONS
// ============================================================

export const businessDescriptions = pgTable(
  "business_descriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    approved: boolean("approved").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    businessIdIdx: index("idx_business_descriptions_business_id").on(t.business_id),
  })
);

// ============================================================
// BACKLINK POOL
// ============================================================

export const backlinkPool = pgTable(
  "backlink_pool",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    anchor_text: text("anchor_text").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    businessIdIdx: index("idx_backlink_pool_business_id").on(t.business_id),
  })
);

// ============================================================
// SITES
// ============================================================

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    signup_url: text("signup_url").notNull(),
    base_domain: text("base_domain").notNull(),
    requires_email_verification: boolean("requires_email_verification")
      .notNull()
      .default(true),
    is_blocked: boolean("is_blocked").notNull().default(false),
    blocked_reason: text("blocked_reason"),
    adapter_status: adapterStatusEnum("adapter_status").notNull().default("unknown"),
    last_adapter_check_at: timestamp("last_adapter_check_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("idx_sites_user_id").on(t.user_id),
    baseDomainIdx: index("idx_sites_base_domain").on(t.base_domain),
    uniqueUserDomain: unique("sites_user_id_base_domain_key").on(t.user_id, t.base_domain),
  })
);

// ============================================================
// SITE ADAPTERS
// ============================================================

export const siteAdapters = pgTable(
  "site_adapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    site_id: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    instructions: jsonb("instructions").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    taught_by: taughtByEnum("taught_by").notNull().default("user"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteIdIdx: index("idx_site_adapters_site_id").on(t.site_id),
    uniqueSiteVersion: unique().on(t.site_id, t.version),
  })
);

// ============================================================
// SITE LISTS
// ============================================================

export const siteLists = pgTable("site_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sites: jsonb("sites").notNull().default([]),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// CITATION ACCOUNTS
// ============================================================

export const citationAccounts = pgTable(
  "citation_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    site_id: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    profile_url: text("profile_url"),
    email_used: text("email_used").notNull(),
    encrypted_password: text("encrypted_password"),
    account_status: accountStatusEnum("account_status").notNull().default("active"),
    description_id: uuid("description_id").references(() => businessDescriptions.id),
    last_monitored_at: timestamp("last_monitored_at", { withTimezone: true }),
    monitor_interval_days: integer("monitor_interval_days").notNull().default(30),
    next_monitor_at: timestamp("next_monitor_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    businessIdIdx: index("idx_citation_accounts_business_id").on(t.business_id),
    siteIdIdx: index("idx_citation_accounts_site_id").on(t.site_id),
    nextMonitorIdx: index("idx_citation_accounts_next_monitor").on(t.next_monitor_at),
    uniqueBusinessSite: unique().on(t.business_id, t.site_id),
  })
);

// ============================================================
// MONITORING CHECKS
// ============================================================

export const monitoringChecks = pgTable(
  "monitoring_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citation_account_id: uuid("citation_account_id")
      .notNull()
      .references(() => citationAccounts.id, { onDelete: "cascade" }),
    checked_at: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    status: monitoringStatusEnum("status").notNull(),
    details: text("details"),
    screenshot_url: text("screenshot_url"),
  },
  (t) => ({
    accountIdIdx: index("idx_monitoring_checks_account_id").on(t.citation_account_id),
  })
);

// ============================================================
// BULK RUNS
// ============================================================

export const bulkRuns = pgTable(
  "bulk_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: bulkRunStatusEnum("status").notNull().default("pending"),
    total_sites: integer("total_sites").notNull().default(0),
    completed_sites: integer("completed_sites").notNull().default(0),
    successful_sites: integer("successful_sites").notNull().default(0),
    failed_sites: integer("failed_sites").notNull().default(0),
    skipped_sites: integer("skipped_sites").notNull().default(0),
    concurrency: integer("concurrency").notNull().default(1),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("idx_bulk_runs_user_id").on(t.user_id),
  })
);

// ============================================================
// BULK RUN RESULTS
// ============================================================

export const bulkRunResults = pgTable(
  "bulk_run_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bulk_run_id: uuid("bulk_run_id")
      .notNull()
      .references(() => bulkRuns.id, { onDelete: "cascade" }),
    site_id: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    site_name: text("site_name").notNull(),
    signup_url: text("signup_url").notNull(),
    status: bulkRunResultStatusEnum("status").notNull().default("pending"),
    failure_reason: text("failure_reason"),
    citation_account_id: uuid("citation_account_id").references(() => citationAccounts.id),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdIdx: index("idx_bulk_run_results_run_id").on(t.bulk_run_id),
  })
);

// ============================================================
// PROXY POOL
// ============================================================

export const proxyPool = pgTable(
  "proxy_pool",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    port: integer("port").notNull(),
    username: text("username"),
    encrypted_password: text("encrypted_password"),
    proxy_type: proxyTypeEnum("proxy_type").notNull().default("residential"),
    is_active: boolean("is_active").notNull().default(true),
    is_flagged: boolean("is_flagged").notNull().default(false),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    fail_count: integer("fail_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("idx_proxy_pool_user_id").on(t.user_id),
  })
);
