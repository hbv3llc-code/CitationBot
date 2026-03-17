-- Worker helper: atomic increment of bulk run counters
CREATE OR REPLACE FUNCTION increment_run_counters(
  run_id UUID,
  completed_delta INTEGER DEFAULT 0,
  successful_delta INTEGER DEFAULT 0,
  failed_delta INTEGER DEFAULT 0,
  skipped_delta INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bulk_runs SET
    completed_sites = completed_sites + completed_delta,
    successful_sites = successful_sites + successful_delta,
    failed_sites = failed_sites + failed_delta,
    skipped_sites = skipped_sites + skipped_delta
  WHERE id = run_id;
END;
$$;
