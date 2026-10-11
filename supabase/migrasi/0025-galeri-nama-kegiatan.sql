-- ============================================================
-- MIGRASI 0025 — Galeri publik memuat nama kegiatan
--
-- Masalah yang diperbaiki:
-- 1. Judul album di halaman galeri hanya "Album Kegiatan 1/2/3" — tidak
--    menyebut kegiatan yang sebenarnya, karena view `public_gallery` tidak
--    membawa judul kegiatan sehingga kode tidak punya bahan menampilkannya.
-- 2. Foto berita dan berkas sementara ikut masuk galeri walau tidak terhubung
--    kegiatan, sehingga muncul sebagai album tanpa nama.
--
-- Sumber data galeri adalah tabel `attachments` (bucket publik, status resmi,
-- visibilitas publik, kategori foto_kegiatan/banner).
-- ============================================================

drop view if exists public.public_gallery;

create view public.public_gallery as
select
  at.id,
  at.entitas_id as activity_id,
  a.judul   as kegiatan_judul,
  a.kode    as kegiatan_kode,
  a.tanggal_mulai as kegiatan_tanggal,
  at.path,
  at.keterangan,
  row_number() over (partition by at.entitas_id order by at.diunggah_pada) as urutan,
  at.bucket,
  at.diunggah_pada
from public.attachments at
join public.activities a on a.id = at.entitas_id
where
  at.bucket = 'publik'
  and at.status = 'resmi'
  and at.visibilitas = 'publik'
  and coalesce(at.kategori, '') in ('foto_kegiatan', 'banner')
  -- hanya kegiatan yang memang sudah boleh tampil di web publik
  and a.is_hidden = false
  and a.status in (
    'disetujui', 'berjalan', 'selesai',
    'laporan_diajukan', 'laporan_dalam_review', 'laporan_disetujui', 'arsip'
  );

comment on view public.public_gallery is
  'Galeri foto web publik. Membawa judul kegiatan supaya album dapat diberi nama yang benar.';

grant select on public.public_gallery to anon, authenticated;

select 'galeri publik diperbarui' as hasil,
       (select count(*) from public.public_gallery) as jumlah_foto,
       (select count(distinct activity_id) from public.public_gallery) as jumlah_kegiatan;
