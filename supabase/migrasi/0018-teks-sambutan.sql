-- ============================================================
-- MIGRASI 0018 — Teks sambutan & profil singkat yang dapat diedit
--
-- MASALAH: beberapa teks yang tampil di web publik ditulis mati di kode,
-- sehingga tidak bisa diubah dari panel:
--   * kalimat sambutan di beranda dan di footer
--   * profil singkat di halaman Profil
-- Perbaikan: pindahkan ke pengaturan situs supaya Super Admin dapat
-- mengubahnya dari Pengaturan → Tampilan.
-- ============================================================

alter table public.site_settings
  add column if not exists sambutan text,
  add column if not exists profil_singkat text;

-- Nilai awal: pakai teks yang selama ini tampil, supaya tampilan tidak berubah
update public.site_settings
   set sambutan = coalesce(sambutan,
        'Mewujudkan kebersamaan, ketahanan keluarga, dan karya nyata di lingkungan pendidikan Maluku Utara.'),
       profil_singkat = coalesce(profil_singkat,
        'Dharma Wanita Persatuan (DWP) Kantor Guru dan Tenaga Kependidikan Provinsi Maluku Utara adalah wadah silaturahmi, kebersamaan, dan pengabdian bagi peningkatan kualitas keluarga pendidik dan tenaga kependidikan di Maluku Utara.')
 where id = (select id from public.site_settings limit 1);

-- View publik harus ikut menyediakan kolom baru (hanya yang aman dibaca publik)
drop view if exists public.public_site_settings cascade;
create view public.public_site_settings as
  select nama_aplikasi, nama_unit, nama_organisasi, warna_utama,
         logo_path, favicon_path, alamat, telepon, email,
         sambutan, profil_singkat
    from public.site_settings;

grant select on public.public_site_settings to anon, authenticated;

select nama_aplikasi, left(sambutan, 40) as sambutan, left(profil_singkat, 40) as profil
  from public.public_site_settings;
