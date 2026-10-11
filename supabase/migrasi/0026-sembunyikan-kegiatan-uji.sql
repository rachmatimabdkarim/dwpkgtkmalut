-- ============================================================
-- MIGRASI 0026 — Sembunyikan kegiatan uji coba dari web publik
--
-- Masalah: kegiatan contoh dan kegiatan uji coba ikut tampil di halaman
-- Agenda, Galeri, dan Berita publik. Web publik adalah halaman resmi
-- organisasi — tidak layak memuat data uji coba.
--
-- Kegiatan yang ditandai `is_hidden = true` otomatis tidak muncul di semua
-- view publik (agenda, galeri, berita), karena ketiga view sudah menyaring
-- dengan `is_hidden = false`.
-- ============================================================

update public.activities
set is_hidden = true
where
  judul ilike '%contoh%'
  or judul ilike '%uji coba%'
  or judul ilike '%ujian akhir%';

select kode, judul, is_hidden
from public.activities
order by kode;

select 'kegiatan publik yang tampil' as keterangan, count(*) as jumlah
from public.public_agenda;
