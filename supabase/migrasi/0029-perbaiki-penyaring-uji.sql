-- ============================================================
-- MIGRASI 0029 — Perbaiki penyaring kegiatan uji coba
--
-- Masalah: aturan penyaring menyembunyikan SEMUA kegiatan yang judulnya
-- memuat kata "uji" — termasuk kegiatan nyata seperti "Ujian Akhir Alur
-- Penuh" yang fotonya asli. Penyaringnya terlalu kasar.
--
-- Perbaikan: hanya kegiatan yang JELAS data uji coba yang disembunyikan,
-- yaitu yang judulnya diawali "Contoh —" atau memuat "Uji Coba".
--
-- Kegiatan yang TIDAK boleh disembunyikan lagi:
--   "Ujian Akhir Alur Penuh" (kegiatan nyata berfoto piagam)
-- ============================================================

update public.activities
set is_hidden = false
where judul not ilike 'contoh%'
  and judul not ilike '%uji coba%';

-- Simpan penandanya di kolom agar tidak perlu diulang tiap kali:
-- kegiatan contoh/uji coba tetap tersembunyi.
update public.activities
set is_hidden = true
where judul ilike 'contoh%' or judul ilike '%uji coba%';

select kode, judul, is_hidden
from public.activities
order by kode;
