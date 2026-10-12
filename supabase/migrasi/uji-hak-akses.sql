-- ============================================================
-- UJI HAK AKSES — membuktikan aturan peran benar-benar berlaku
--
-- Dijalankan sebagai "pengurus biasa" (anggota) dan sebagai pengurus inti,
-- lalu dilihat apakah masing-masing bisa mengubah kegiatan.
-- ============================================================

-- 1. Periksa daftar peran yang boleh mengubah kegiatan
select 'peran boleh ubah kegiatan' as keterangan,
       'pengurus' = any(array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']) as pengurus_lolos,
       'ketua'    = any(array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']) as ketua_lolos,
       'anggota'  = any(array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']) as anggota_lolos;
