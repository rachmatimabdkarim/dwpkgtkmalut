-- ============================================================
-- MIGRASI 0013 — Izin untuk peran server (service_role)
-- MASALAH: peran server tidak diberi hak akses ke tabel aplikasi,
-- sehingga kode terpaksa memakai kata sandi pengguna di dalam kode
-- sebagai jalan pintas. Itu BAHAYA (bocor bila kode terunggah).
--
-- PERBAIKAN: beri peran server hak yang memadai, lalu aplikasi cukup
-- memakai kunci rahasia server — tanpa kata sandi apa pun di kode.
-- Catatan: peran server menembus RLS, jadi pemberian hak ini wajar
-- karena hanya dipakai oleh proses di sisi server.
-- ============================================================

grant usage on schema public to service_role;

-- Baca seluruh tabel
grant select on all tables in schema public to service_role;

-- Tulis pada tabel yang memang dikelola proses server
grant insert, update, delete on
  public.attachments, public.file_logs, public.audit_logs
  to service_role;

grant insert, update on
  public.app_settings, public.site_settings, public.activities, public.activity_reports,
  public.activity_logs, public.posts, public.profiles, public.user_roles
  to service_role;

grant usage, select on all sequences in schema public to service_role;

-- Penyimpanan berkas: peran server perlu membaca/menulis/menghapus objek
grant select, insert, update, delete on storage.objects to service_role;
grant select, insert, update, delete on storage.buckets to service_role;

select 'izin peran server diperbaiki' as keterangan;
