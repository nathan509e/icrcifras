-- Run this SQL in your Supabase SQL editor to create the songs table

CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  youtube_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (optional, recommended)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read all songs
CREATE POLICY "Allow anonymous read" ON songs
  FOR SELECT USING (true);

-- Allow anonymous users to insert songs
CREATE POLICY "Allow anonymous insert" ON songs
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to delete songs
CREATE POLICY "Allow anonymous delete" ON songs
  FOR DELETE USING (true);
