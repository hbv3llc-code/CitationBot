-- CitationBot Initial Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  address_country TEXT NOT NULL DEFAULT 'US',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT NOT NULL,
  founding_year INTEGER,
  service_categories TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  -- Gmail OAuth tokens (encrypted at rest via Supabase RLS + app-level encryption)
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUSINESS DESCRIPTIONS (AI-generated variants)
-- ============================================================
CREATE TABLE business_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BACKLINK POOL (URLs + anchor text per business)
-- ============================================================
CREATE TABLE backlink_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CITATION SITES
-- ============================================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  signup_url TEXT NOT NULL,
  base_domain TEXT NOT NULL,
  allows_backlinks BOOLEAN NOT NULL DEFAULT FALSE,
  requires_email_verification BOOLEAN NOT NULL DEFAULT TRUE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,   -- Do Not Run List
  blocked_reason TEXT,
  adapter_status TEXT NOT NULL DEFAULT 'unknown' CHECK (adapter_status IN ('unknown', 'learning', 'active', 'broken', 'repairing')),
  last_adapter_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SITE ADAPTERS (stored instructions for filling forms)
-- ============================================================
CREATE TABLE site_adapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  instructions JSONB NOT NULL,  -- field mappings, selectors, steps
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  taught_by TEXT NOT NULL DEFAULT 'user' CHECK (taught_by IN ('user', 'ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, version)
);

-- ============================================================
-- CITATION ACCOUNTS (a business's account on a site)
-- ============================================================
CREATE TABLE citation_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  profile_url TEXT,
  email_used TEXT NOT NULL,
  -- Password is AES-256 encrypted; never stored in plaintext
  encrypted_password TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending_verification', 'flagged', 'removed', 'unknown')),
  description_id UUID REFERENCES business_descriptions(id),
  last_monitored_at TIMESTAMPTZ,
  monitor_interval_days INTEGER NOT NULL DEFAULT 30,
  next_monitor_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, site_id)
);

-- ============================================================
-- MONITORING CHECKS (profile health check results)
-- ============================================================
CREATE TABLE monitoring_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  citation_account_id UUID NOT NULL REFERENCES citation_accounts(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('ok', 'removed', 'changed', 'error', 'flagged')),
  details TEXT,
  screenshot_url TEXT
);

-- ============================================================
-- BULK DISCOVERY RUNS
-- ============================================================
CREATE TABLE bulk_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_sites INTEGER NOT NULL DEFAULT 0,
  completed_sites INTEGER NOT NULL DEFAULT 0,
  successful_sites INTEGER NOT NULL DEFAULT 0,
  failed_sites INTEGER NOT NULL DEFAULT 0,
  skipped_sites INTEGER NOT NULL DEFAULT 0,
  concurrency INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BULK RUN RESULTS (per-site result within a run)
-- ============================================================
CREATE TABLE bulk_run_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bulk_run_id UUID NOT NULL REFERENCES bulk_runs(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  site_name TEXT NOT NULL,
  signup_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped', 'blocked')),
  failure_reason TEXT,
  citation_account_id UUID REFERENCES citation_accounts(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROXY POOL
-- ============================================================
CREATE TABLE proxy_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  encrypted_password TEXT,
  proxy_type TEXT NOT NULL DEFAULT 'residential' CHECK (proxy_type IN ('residential', 'datacenter', 'mobile')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  fail_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_business_descriptions_business_id ON business_descriptions(business_id);
CREATE INDEX idx_backlink_pool_business_id ON backlink_pool(business_id);
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_base_domain ON sites(base_domain);
CREATE INDEX idx_site_adapters_site_id ON site_adapters(site_id);
CREATE INDEX idx_citation_accounts_business_id ON citation_accounts(business_id);
CREATE INDEX idx_citation_accounts_site_id ON citation_accounts(site_id);
CREATE INDEX idx_citation_accounts_next_monitor ON citation_accounts(next_monitor_at) WHERE account_status = 'active';
CREATE INDEX idx_monitoring_checks_account_id ON monitoring_checks(citation_account_id);
CREATE INDEX idx_bulk_runs_user_id ON bulk_runs(user_id);
CREATE INDEX idx_bulk_run_results_run_id ON bulk_run_results(bulk_run_id);
CREATE INDEX idx_proxy_pool_user_id ON proxy_pool(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citation_accounts_updated_at BEFORE UPDATE ON citation_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_pool ENABLE ROW LEVEL SECURITY;

-- Businesses: users can only see/modify their own
CREATE POLICY "Users can manage their own businesses"
  ON businesses FOR ALL USING (auth.uid() = user_id);

-- Business descriptions: via business ownership
CREATE POLICY "Users can manage descriptions for their businesses"
  ON business_descriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid())
  );

-- Backlink pool: via business ownership
CREATE POLICY "Users can manage backlinks for their businesses"
  ON backlink_pool FOR ALL USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid())
  );

-- Sites: users can see/modify their own sites
CREATE POLICY "Users can manage their own sites"
  ON sites FOR ALL USING (auth.uid() = user_id);

-- Site adapters: via site ownership
CREATE POLICY "Users can manage adapters for their sites"
  ON site_adapters FOR ALL USING (
    EXISTS (SELECT 1 FROM sites WHERE id = site_id AND user_id = auth.uid())
  );

-- Citation accounts: via business ownership
CREATE POLICY "Users can manage citation accounts for their businesses"
  ON citation_accounts FOR ALL USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid())
  );

-- Monitoring checks: via citation account -> business ownership
CREATE POLICY "Users can view monitoring checks for their accounts"
  ON monitoring_checks FOR ALL USING (
    EXISTS (
      SELECT 1 FROM citation_accounts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.id = citation_account_id AND b.user_id = auth.uid()
    )
  );

-- Bulk runs: own runs only
CREATE POLICY "Users can manage their own bulk runs"
  ON bulk_runs FOR ALL USING (auth.uid() = user_id);

-- Bulk run results: via bulk run ownership
CREATE POLICY "Users can view results for their bulk runs"
  ON bulk_run_results FOR ALL USING (
    EXISTS (SELECT 1 FROM bulk_runs WHERE id = bulk_run_id AND user_id = auth.uid())
  );

-- Proxy pool: own proxies only
CREATE POLICY "Users can manage their own proxies"
  ON proxy_pool FOR ALL USING (auth.uid() = user_id);
