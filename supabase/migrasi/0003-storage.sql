-- ============================================================
-- MIGRASI 0003 — KUNCI AKSES PENYIMPANAN BERKAS
-- Wadah "publik"  : boleh dibaca siapa saja (web publik), hanya pengurus yang mengunggah.
-- Wadah "internal": tidak boleh dibaca publik sama sekali; hanya pengurus
--                   yang berhak, dan hanya lewat tautan berumur pendek.
-- ============================================================

-- ---------- Wadah publik ----------
drop policy if exists dwp_publik_baca on storage.objects;
create policy dwp_publik_baca on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'publik');

drop policy if exists dwp_publik_unggah on storage.objects;
create policy dwp_publik_unggah on storage.objects for insert
  to authenticated
  with check (bucket_id = 'publik');

drop policy if exists dwp_publik_ubah on storage.objects;
create policy dwp_publik_ubah on storage.objects for update
  to authenticated
  using (bucket_id = 'publik')
  with check (bucket_id = 'publik');

-- ---------- Wadah internal ----------
-- Hanya pengurus yang berhak. Pengguna anonim TIDAK punya kebijakan apa pun.
drop policy if exists dwp_internal_baca on storage.objects;
create policy dwp_internal_baca on storage.objects for select
  to authenticated
  using (
    bucket_id = 'internal'
    and public.apakah_salah_satu(
      array['super_admin','ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi','pengurus']
    )
  );

drop policy if exists dwp_internal_unggah on storage.objects;
create policy dwp_internal_unggah on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'internal'
    and public.apakah_salah_satu(
      array['super_admin','ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi','pengurus']
    )
  );

-- Penghapusan berkas dilakukan lewat kunci rahasia di server (menembus RLS),
-- jadi tidak perlu kebijakan delete untuk pengguna biasa.
