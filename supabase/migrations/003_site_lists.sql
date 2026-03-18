-- Site Lists: saved CSV lists for reuse in bulk runs
CREATE TABLE site_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sites JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_lists_user_id ON site_lists(user_id);

ALTER TABLE site_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own site lists"
  ON site_lists FOR ALL USING (auth.uid() = user_id);
