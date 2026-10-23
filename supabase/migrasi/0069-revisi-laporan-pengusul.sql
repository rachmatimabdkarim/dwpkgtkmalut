-- ============================================================
-- PERBAIKAN: pengusul boleh mengembalikan & mengajukan ulang laporan
--
-- TEMUAN PEMILIK: "Alur perbaikan laporan tidak bisa ditindaklanjuti."
--
-- SEBAB:
--  1) Wakil Ketua menekan "minta revisi" pada pelaporan. Aplikasi menghitung
--     status baru "selesai", TETAPI kebijakan keamanan (RLS) menolak perubahan
--     karena pengusul tidak punya izin mengubah kegiatan berstatus
--     'laporan_diajukan'. Penolakan tidak menghasilkan galat, sehingga riwayat
--     tercatat "minta revisi" sementara status tetap 'laporan_diajukan'.
--  2) Akibatnya laporan tetap terkunci dan pengusul tidak bisa memperbaikinya.
--
-- PERBAIKAN:
--  - Pengusul (dibuat_oleh) boleh mengubah kegiatan miliknya pada status
--    pelaporan, supaya laporan dapat diajukan / diajukan ulang.
--  - Tambah status 'laporan_ditolak' untuk laporan yang ditolak penyetuju.
-- ============================================================

-- 1. Tambahkan status baru pada batasan yang ada (bila memakai check).
alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities
  add constraint activities_status_check check (
    status in (
      'draf','diajukan','dalam_review','revisi','ditolak','disetujui','berjalan',
      'selesai','laporan_diajukan','laporan_dalam_review','laporan_disetujui',
      'laporan_ditolak','arsip'
    )
  );

-- 2. Kebijakan ubah kegiatan: pengusul boleh mengelola kegiatan miliknya
--    selama berada pada tahap pelaporan.
drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    apakah_super()
    -- Pengurus inti: kegiatan yang belum diarsipkan.
    or (status <> 'arsip' and apakah_salah_satu(
          array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
        ))
    -- PENGUSUL: boleh mengajukan & mengajukan ulang laporan kegiatannya.
    or (
      dibuat_oleh = auth.uid()
      and status in (
        'draf','revisi','ditolak',
        'selesai','laporan_diajukan','laporan_dalam_review',
        'laporan_disetujui','laporan_ditolak'
      )
    )
    or (penanggung_jawab = auth.uid() and status <> 'arsip')
    or (status = 'berjalan' and public.apakah_ketua_panitia(id))
  )
  with check (
    apakah_super()
    or apakah_salah_satu(
         array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
       )
    or dibuat_oleh = auth.uid()
    or penanggung_jawab = auth.uid()
    or public.apakah_ketua_panitia(id)
  );

select 'kebijakan diperbarui' as status;
