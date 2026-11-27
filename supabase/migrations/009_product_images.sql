-- 009 — Product images (รูปภาพสินค้า)
--
-- Adds an optional photo to every product:
--   * products.image_url  : the public URL shown in the app (Stock, PRODUCT LIST, Reports)
--   * products.image_path : the file's path inside Storage — used to delete the old file
--                           when a photo is replaced or removed (no orphaned files)
--   * Storage bucket "product-images": public READ (so <img> tags can load the photos),
--     upload / replace / delete only for signed-in, APPROVED users (is_approved() from 002).
--     Files are compressed in the browser first (max 800 px, WebP/JPEG ≈ 50–150 KB);
--     the bucket refuses anything over 2 MB or that is not an image.
--
-- Nothing here touches stock movements, FIFO costs or reports. Changing a product's photo
-- is an ordinary products UPDATE, so the audit log (003) records it automatically.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 002_auth_approval.sql. Safe to re-run.
-- Without it the app keeps working: products save as before and the photo buttons explain
-- that this file still has to be run.
--
-- If the SQL Editor refuses the storage part (some projects restrict the storage schema),
-- create the bucket by hand instead: Dashboard -> Storage -> New bucket -> name
-- "product-images", Public bucket ON, file size limit 2 MB, allowed MIME types
-- image/webp, image/jpeg, image/png — then run just the policy statements below.

-- ---------- columns ----------
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists image_path text;

-- ---------- bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- policies on storage.objects (this bucket only) ----------
-- public read: the bucket is public, so photos load by URL for anyone with the link;
-- listing / reading through the API is limited to approved users.
drop policy if exists "product images: approved read" on storage.objects;
create policy "product images: approved read" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_approved());

drop policy if exists "product images: approved upload" on storage.objects;
create policy "product images: approved upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_approved());

drop policy if exists "product images: approved update" on storage.objects;
create policy "product images: approved update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_approved())
  with check (bucket_id = 'product-images' and public.is_approved());

drop policy if exists "product images: approved delete" on storage.objects;
create policy "product images: approved delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_approved());
