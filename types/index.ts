// ============================================================
// Core domain types for CitationBot
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ---- Business ----

export interface Business {
  id: string;
  user_id: string;
  name: string;
  owner_name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  phone: string;
  email: string;
  website: string;
  founding_year: number | null;
  service_categories: string[];
  logo_url: string | null;
  google_sheet_id: string | null;
  google_sheet_url: string | null;
  // Gmail OAuth tokens (encrypted at rest, never exposed to client)
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expiry: string | null;
  gmail_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessDescription {
  id: string;
  business_id: string;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface BacklinkEntry {
  id: string;
  business_id: string;
  url: string;
  anchor_text: string;
  created_at: string;
}

// ---- Site Lists ----

export interface SiteList {
  id: string;
  user_id: string;
  name: string;
  sites: Array<{ name: string; signup_url: string }>;
  created_at: string;
}

// ---- Sites ----

export type AdapterStatus = 'unknown' | 'learning' | 'active' | 'broken' | 'repairing';

export interface Site {
  id: string;
  user_id: string;
  name: string;
  signup_url: string;
  base_domain: string;
  requires_email_verification: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  adapter_status: AdapterStatus;
  last_adapter_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteAdapter {
  id: string;
  site_id: string;
  version: number;
  instructions: AdapterInstructions;
  is_active: boolean;
  taught_by: 'user' | 'ai';
  created_at: string;
}

export interface AdapterInstructions {
  steps: AdapterStep[];
  field_mappings: FieldMapping[];
  post_submit_check?: string; // CSS selector to confirm success
}

export interface AdapterStep {
  type: 'navigate' | 'fill' | 'click' | 'wait' | 'select' | 'upload' | 'check_email';
  selector?: string;
  value?: string;
  field_key?: keyof BusinessFields;
  description?: string;
}

export interface FieldMapping {
  field_key: keyof BusinessFields;
  selector: string;
  transform?: 'phone_digits' | 'phone_formatted' | 'zip_only' | 'state_abbrev';
}

export interface BusinessFields {
  name: string;
  owner_name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  phone: string;
  email: string;
  website: string;
  founding_year: string;
  description: string;
  backlink_url: string;
  backlink_anchor: string;
}

// ---- Citation Accounts ----

export type AccountStatus = 'active' | 'pending_verification' | 'flagged' | 'removed' | 'unknown';

export interface CitationAccount {
  id: string;
  business_id: string;
  site_id: string;
  profile_url: string | null;
  email_used: string;
  account_status: AccountStatus;
  description_id: string | null;
  last_monitored_at: string | null;
  monitor_interval_days: number;
  next_monitor_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringCheck {
  id: string;
  citation_account_id: string;
  checked_at: string;
  status: 'ok' | 'removed' | 'changed' | 'error' | 'flagged';
  details: string | null;
  screenshot_url: string | null;
}

// ---- Bulk Runs ----

export type BulkRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BulkRunResultStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'blocked';

export interface BulkRun {
  id: string;
  user_id: string;
  business_id: string;
  status: BulkRunStatus;
  total_sites: number;
  completed_sites: number;
  successful_sites: number;
  failed_sites: number;
  skipped_sites: number;
  concurrency: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BulkRunResult {
  id: string;
  bulk_run_id: string;
  site_id: string | null;
  site_name: string;
  signup_url: string;
  status: BulkRunResultStatus;
  failure_reason: string | null;
  citation_account_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---- Proxies ----

export interface Proxy {
  id: string;
  user_id: string;
  host: string;
  port: number;
  username: string | null;
  proxy_type: 'residential' | 'datacenter' | 'mobile';
  is_active: boolean;
  is_flagged: boolean;
  last_used_at: string | null;
  fail_count: number;
  created_at: string;
  encrypted_password?: string;
}

// ---- CSV Import ----

export interface CsvSiteRow {
  name: string;
  signup_url: string;
}

// ---- API Response shapes ----

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
