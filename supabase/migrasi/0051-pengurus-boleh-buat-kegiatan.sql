-- ============================================================
-- PERBAIKAN: "pengurus" tidak bisa membuat kegiatan.
--
-- Gejala yang dilaporkan pemilik:
--   user Ny. Aida Ibrahim (peran: pengurus) menekan Simpan Draf pada form
--   kegiatan baru dan mendapat galat:
--   "new row violates row-level security policy for table activities"
--
-- Akar: DUA SUMBER ATURAN YANG BERTENTANGAN.
--   * Kode aplikasi (src/lib/peran.ts, PERAN_PENGAJU) MENYERTAKAN "pengurus"
--     dengan catatan tegas: "pengurus = anggota biasa. Mereka BOLEH mengajukan".
--     Halaman daftar kegiatan dan form baru memakai daftar itu, sehingga Aida
--     melihat tombol + bisa mengisi form panjang.
--   * Kebijakan INSERT di basis data TIDAK memuat "pengurus" (hanya super_admin,
--     ketua, wakil_ketua, sekretaris, bendahara, ketua_seksi), sehingga
--     penyimpanan ditolak di akhir.
--
-- Perbaikan: samakan kebijakan INSERT dengan PERAN_PENGAJU di kode, yaitu
-- tambahkan "pengurus". Kolom `dibuat_oleh = auth.uid()` tetap dipertahankan
-- supaya tidak ada yang bisa membuat kegiatan atas nama orang lain.
-- ============================================================

drop policy if exists activities_buat on public.activities;

create policy activities_buat on public.activities
  for insert
  with check (
    dibuat_oleh = auth.uid()
    and apakah_salah_satu(
      array[
        'super_admin',
        'ketua',
        'wakil_ketua',
        'sekretaris',
        'bendahara',
        'ketua_seksi',
        'pengurus'
      ]
    )
  );
