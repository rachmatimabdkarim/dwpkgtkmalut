-- ============================================================
-- MIGRASI 0016 — Penutup kebocoran wewenang (hasil uji per peran)
--
-- TEMUAN UJI: pengurus biasa (Pengurus, Editor, Ketua Bidang, dst.)
-- BERHASIL mengubah data tampilan situs (`site_settings`), padahal
-- spesifikasi menyatakan HANYA Super Admin yang boleh mengubahnya.
-- Penyebab: ada kebijakan lama "for all" yang membuka akses, sehingga
-- meniadakan pembatasan yang sudah ditulis.
--
-- PERBAIKAN: hapus semua kebijakan lama pada site_settings, lalu tulis
-- ulang dengan aturan yang benar:
--   - semua pengurus boleh MEMBACA (dibutuhkan seluruh halaman)
--   - hanya Super Admin boleh MENGUBAH
-- ============================================================

-- 1. Bersihkan seluruh kebijakan lama pada site_settings
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
  loop
    execute format('drop policy if exists %I on public.site_settings', r.policyname);
  end loop;
end $$;

-- 2. Tulis ulang kebijakan yang benar
create policy site_settings_baca on public.site_settings
  for select to authenticated using (true);

create policy site_settings_tulis_super on public.site_settings
  for update to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

create policy site_settings_tambah_super on public.site_settings
  for insert to authenticated
  with check (public.apakah_super());

create policy site_settings_hapus_super on public.site_settings
  for delete to authenticated
  using (public.apakah_super());

-- 3. Pastikan izin dasar tidak berlebihan: hanya baca + ubah.
revoke all on public.site_settings from authenticated;
grant select, insert, update on public.site_settings to authenticated;
grant select on public.site_settings to anon;

-- 4. Sama untuk app_settings: pastikan tak ada kebijakan "for all" sisa.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'app_settings'
      and policyname not in ('app_settings_baca', 'app_settings_tulis_super')
  loop
    execute format('drop policy if exists %I on public.app_settings', r.policyname);
  end loop;
end $$;

-- 5. Kembalikan nilai telepon yang sempat diubah saat uji (dibersihkan)
update public.site_settings set telepon = null where telepon = 'UJI_ILEGAL';

select 'kebocoran wewenang ditutup' as keterangan;
