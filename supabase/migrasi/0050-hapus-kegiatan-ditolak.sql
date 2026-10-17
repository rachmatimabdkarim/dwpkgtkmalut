-- ============================================================
-- PERBAIKAN: kegiatan yang DITOLAK dapat dihapus pengusulnya.
--
-- Keputusan pemilik: "Ditolak itu berarti selesai, harus buat kegiatan baru
-- dari nol." Kegiatan yang ditolak TIDAK dapat diperbaiki dan TIDAK dapat
-- diajukan kembali — jadi kalau tidak bisa dihapus, ia menggantung di daftar
-- selamanya tanpa guna.
--
-- Sebelumnya izin hapus hanya untuk status `draf`. Kini `ditolak` juga
-- diizinkan, tetapi TETAP terbatas pada pengusul catatan itu sendiri
-- (atau super admin) — orang lain tidak boleh menghapus.
-- ============================================================

drop policy if exists activities_hapus on public.activities;

create policy activities_hapus on public.activities
  for delete
  using (
    apakah_super()
    or (
      dibuat_oleh = auth.uid()
      and status in ('draf', 'ditolak')
    )
  );
