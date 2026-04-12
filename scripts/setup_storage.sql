-- Run this in your Supabase SQL Editor to create the necessary storage buckets and policies

-- 1. Create the 'restaurants' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurants', 'restaurants', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the 'menu-items' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-items', 'menu-items', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Public Access Policy (Allow anyone to view images)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('restaurants', 'menu-items'));

-- 4. Set up Upload Policy (Allow anonymous/authenticated uploads for testing)
-- NOTE: In production, you should restrict this to authenticated admins only
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('restaurants', 'menu-items'));

-- 5. Set up Delete Policy
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING (bucket_id IN ('restaurants', 'menu-items'));
