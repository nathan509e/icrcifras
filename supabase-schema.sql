-- Run this SQL in your Supabase SQL editor

-- SONGS TABLE
CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  youtube_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON songs FOR SELECT USING (true);
CREATE POLICY "Allow admin insert" ON songs FOR INSERT WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admins));
CREATE POLICY "Allow admin update" ON songs FOR UPDATE USING (auth.jwt()->>'email' IN (SELECT email FROM admins));
CREATE POLICY "Allow admin delete" ON songs FOR DELETE USING (auth.jwt()->>'email' IN (SELECT email FROM admins));

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON admins FOR SELECT USING (true);

-- SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  song_name TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON suggestions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update" ON suggestions FOR UPDATE USING (auth.jwt()->>'email' IN (SELECT email FROM admins));
CREATE POLICY "Allow admin delete" ON suggestions FOR DELETE USING (auth.jwt()->>'email' IN (SELECT email FROM admins));

-- LISTS TABLE
CREATE TABLE IF NOT EXISTS lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  song_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON lists FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow owner or admin update" ON lists FOR UPDATE USING (user_email = auth.jwt()->>'email' OR auth.jwt()->>'email' IN (SELECT email FROM admins));
CREATE POLICY "Allow owner or admin delete" ON lists FOR DELETE USING (user_email = auth.jwt()->>'email' OR auth.jwt()->>'email' IN (SELECT email FROM admins));
