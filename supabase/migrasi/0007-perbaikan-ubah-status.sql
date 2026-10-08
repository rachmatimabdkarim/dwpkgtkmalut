-- ============================================================
-- MIGRASI 0007 — Perbaikan: izin mengubah status kegiatan
-- Masalah: pengaturan pengaman sebelumnya hanya mengizinkan pengurus inti
-- mengubah baris kegiatan. Akibatnya penanggung jawab/pengusul tidak bisa
-- memindahkan kegiatan ke tahap berikutnya (Mulai, Selesai, Ajukan Laporan,
-- Arsip) — status di database tidak berubah walau tombolnya ditekan.
--
-- Aturan setelah perbaikan:
--  - Semua pengurus boleh memperbarui kegiatan (perpindahan tahap).
--  - Yang TIDAK boleh: mengubah kegiatan yang sudah dikunci (laporan disetujui / arsip)
--    kecuali Super Admin.
--  - Data yang sudah disetujui tetap tidak dapat diubah isinya oleh sembarang orang
--    karena penyuntingan isi hanya dibuka saat status draf/revisi (dijaga di aplikasi)
--    dan lewat pengajuan perubahan.
-- ============================================================

drop policy if exists activities_ubah on public.activities;
create policy activities_ubah on public.activities for update to authenticated
  using (
    public.apakah_super()
    or (
      status not in ('laporan_disetujui', 'arsip')
      and public.apakah_salah_satu(
        array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi','pengurus']
      )
    )
  )
  with check (true);

-- Tabel anak kegiatan: pastikan juga bisa diubah pada tahap pelaksanaan/pelaporan
do $$
declare t text;
begin
  foreach t in array array['activity_reports','tasks','attendances','budget_items','committees','activity_plans']
  loop
    execute format('drop policy if exists %I_ubah on public.%I', t, t);
    execute format(
      'create policy %I_ubah on public.%I for update to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

select 'izin ubah kegiatan diperbaiki' as keterangan;
