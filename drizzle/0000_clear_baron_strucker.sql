CREATE TYPE "public"."account_status" AS ENUM('active', 'pending_verification', 'flagged', 'removed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."adapter_status" AS ENUM('unknown', 'learning', 'active', 'broken', 'repairing');--> statement-breakpoint
CREATE TYPE "public"."bulk_run_result_status" AS ENUM('pending', 'running', 'success', 'failed', 'skipped', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."bulk_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."monitoring_status" AS ENUM('ok', 'removed', 'changed', 'error', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."proxy_type" AS ENUM('residential', 'datacenter', 'mobile');--> statement-breakpoint
CREATE TYPE "public"."taught_by" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_unique" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "backlink_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"url" text NOT NULL,
	"anchor_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_run_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulk_run_id" uuid NOT NULL,
	"site_id" uuid,
	"site_name" text NOT NULL,
	"signup_url" text NOT NULL,
	"status" "bulk_run_result_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"citation_account_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "bulk_run_status" DEFAULT 'pending' NOT NULL,
	"total_sites" integer DEFAULT 0 NOT NULL,
	"completed_sites" integer DEFAULT 0 NOT NULL,
	"successful_sites" integer DEFAULT 0 NOT NULL,
	"failed_sites" integer DEFAULT 0 NOT NULL,
	"skipped_sites" integer DEFAULT 0 NOT NULL,
	"concurrency" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"content" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"owner_name" text NOT NULL,
	"address_street" text NOT NULL,
	"address_city" text NOT NULL,
	"address_state" text NOT NULL,
	"address_zip" text NOT NULL,
	"address_country" text DEFAULT 'US' NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"website" text NOT NULL,
	"founding_year" integer,
	"service_categories" text[] DEFAULT '{}' NOT NULL,
	"logo_url" text,
	"google_sheet_id" text,
	"google_sheet_url" text,
	"gmail_access_token" text,
	"gmail_refresh_token" text,
	"gmail_token_expiry" timestamp with time zone,
	"gmail_connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citation_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"profile_url" text,
	"email_used" text NOT NULL,
	"encrypted_password" text,
	"account_status" "account_status" DEFAULT 'active' NOT NULL,
	"description_id" uuid,
	"last_monitored_at" timestamp with time zone,
	"monitor_interval_days" integer DEFAULT 30 NOT NULL,
	"next_monitor_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "citation_accounts_business_id_site_id_unique" UNIQUE("business_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "monitoring_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"citation_account_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "monitoring_status" NOT NULL,
	"details" text,
	"screenshot_url" text
);
--> statement-breakpoint
CREATE TABLE "proxy_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"username" text,
	"encrypted_password" text,
	"proxy_type" "proxy_type" DEFAULT 'residential' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"instructions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"taught_by" "taught_by" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_adapters_site_id_version_unique" UNIQUE("site_id","version")
);
--> statement-breakpoint
CREATE TABLE "site_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"signup_url" text NOT NULL,
	"base_domain" text NOT NULL,
	"requires_email_verification" boolean DEFAULT true NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" text,
	"adapter_status" "adapter_status" DEFAULT 'unknown' NOT NULL,
	"last_adapter_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_user_id_base_domain_key" UNIQUE("user_id","base_domain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_unique" UNIQUE("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlink_pool" ADD CONSTRAINT "backlink_pool_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_run_results" ADD CONSTRAINT "bulk_run_results_bulk_run_id_bulk_runs_id_fk" FOREIGN KEY ("bulk_run_id") REFERENCES "public"."bulk_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_run_results" ADD CONSTRAINT "bulk_run_results_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_run_results" ADD CONSTRAINT "bulk_run_results_citation_account_id_citation_accounts_id_fk" FOREIGN KEY ("citation_account_id") REFERENCES "public"."citation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_runs" ADD CONSTRAINT "bulk_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_runs" ADD CONSTRAINT "bulk_runs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_descriptions" ADD CONSTRAINT "business_descriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_accounts" ADD CONSTRAINT "citation_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_accounts" ADD CONSTRAINT "citation_accounts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_accounts" ADD CONSTRAINT "citation_accounts_description_id_business_descriptions_id_fk" FOREIGN KEY ("description_id") REFERENCES "public"."business_descriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_citation_account_id_citation_accounts_id_fk" FOREIGN KEY ("citation_account_id") REFERENCES "public"."citation_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_pool" ADD CONSTRAINT "proxy_pool_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD CONSTRAINT "site_adapters_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_lists" ADD CONSTRAINT "site_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_backlink_pool_business_id" ON "backlink_pool" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_bulk_run_results_run_id" ON "bulk_run_results" USING btree ("bulk_run_id");--> statement-breakpoint
CREATE INDEX "idx_bulk_runs_user_id" ON "bulk_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_business_descriptions_business_id" ON "business_descriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_businesses_user_id" ON "businesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_citation_accounts_business_id" ON "citation_accounts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_citation_accounts_site_id" ON "citation_accounts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_citation_accounts_next_monitor" ON "citation_accounts" USING btree ("next_monitor_at");--> statement-breakpoint
CREATE INDEX "idx_monitoring_checks_account_id" ON "monitoring_checks" USING btree ("citation_account_id");--> statement-breakpoint
CREATE INDEX "idx_proxy_pool_user_id" ON "proxy_pool" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_site_adapters_site_id" ON "site_adapters" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_sites_user_id" ON "sites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sites_base_domain" ON "sites" USING btree ("base_domain");