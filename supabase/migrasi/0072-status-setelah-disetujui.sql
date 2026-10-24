-- ============================================================
-- PERBAIKAN: status tidak berubah setelah semua jenjang menyetujui
--
-- TEMUAN PEMILIK (riwayat kegiatan):
--   Wakil Ketua "setuju" 23.09, Ketua "setuju" 23.09, TETAPI status kegiatan
--   tetap 'laporan_diajukan' — seharusnya 'laporan_disetujui'.
--
-- SEBAB: kebijakan UPDATE activities memakai syarat "status <> 'arsip'" pada
-- baris LAMA. Pada UPDATE, Postgres memeriksa baris HASIL dengan WITH CHECK.
-- Karena WITH CHECK tidak membatasi status, yang dipakai adalah USING — dan
-- USING dihitung terhadap baris lama. Untuk pengurus inti ini lolos...
-- kecuali ketika perubahan status membuat baris tidak lagi memenuhi USING.
-- Penolakannya pun tidak menghasilkan galat sehingga aplikasi menganggap
-- berhasil.
--
-- PERBAIKAN: pisahkan "siapa yang boleh mengubah" (USING) dari "hasil seperti
-- apa yang boleh disimpan" (WITH CHECK). Syarat status hanya berlaku pada USING,
-- sedangkan WITH CHECK hanya memeriksa HAK pengguna, bukan status hasil.
-- ============================================================

drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    -- Baris LAMA boleh diubah bila:
    apakah_super()
    or (status <> 'arsip' and apakah_salah_satu(
          array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
        ))
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
    -- Baris HASIL boleh disimpan bila pengguna memang berhak atas kegiatan ini.
    -- TIDAK membatasi status hasil: perubahan status (mis. menjadi
    -- 'laporan_disetujui') harus ikut tersimpan.
    apakah_super()
    or apakah_salah_satu(
         array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
       )
    or dibuat_oleh = auth.uid()
    or penanggung_jawab = auth.uid()
    or public.apakah_ketua_panitia(id)
  );

select 'kebijakan laporan diperbarui' as status;
