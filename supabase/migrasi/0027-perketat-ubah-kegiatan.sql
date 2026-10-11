-- ============================================================
-- MIGRASI 0027 — Perketat aturan siapa yang boleh MENGUBAH kegiatan
--
-- Masalah: aturan `activities_ubah` memuat peran 'pengurus' — dan peran itu
-- dimiliki SEMUA anggota biasa. Akibatnya semua anggota bisa mengubah kegiatan,
-- padahal kegiatan adalah dokumen resmi organisasi.
--
-- Perbaikan: hanya pengurus inti yang boleh mengubah kegiatan.
-- Peran 'pengurus' tetap boleh pada hal lain (unggah/baca berkas internal),
-- karena pekerjaan dokumentasi memang perlu diikuti anggota.
--
-- Peran yang tetap boleh mengubah kegiatan:
--   super_admin (lewat apakah_super), ketua, wakil_ketua, sekretaris,
--   bendahara, ketua_seksi
-- ============================================================

drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    public.apakah_super()
    or (
      status <> 'arsip'
      and public.apakah_salah_satu(
        array['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'ketua_seksi']
      )
    )
  );

select 'aturan ubah kegiatan diperketat' as hasil;

-- Periksa hasilnya
select policyname,
       cmd,
       qual
from pg_policies
where tablename = 'activities' and cmd = 'UPDATE';
