-- ============================================================
-- MIGRASI 0008 — Perbaikan: penguncian arsip
-- Masalah: aturan sebelumnya mengunci kegiatan berstatus "laporan_disetujui",
-- sehingga langkah terakhir (Kunci & Arsipkan) gagal dijalankan.
--
-- Aturan yang benar:
--  - Kegiatan boleh diubah sampai tahap pengarsipan.
--  - Setelah berstatus "arsip", barulah benar-benar terkunci: hanya Super Admin
--    yang dapat mengubahnya (mis. untuk koreksi darurat).
--  - Isi laporan tetap tidak dapat diubah setelah laporan disetujui (dijaga di aplikasi).
-- ============================================================

drop policy if exists activities_ubah on public.activities;
create policy activities_ubah on public.activities for update to authenticated
  using (
    public.apakah_super()
    or (
      status <> 'arsip'
      and public.apakah_salah_satu(
        array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi','pengurus']
      )
    )
  )
  with check (true);

select 'penguncian arsip diperbaiki' as keterangan;
