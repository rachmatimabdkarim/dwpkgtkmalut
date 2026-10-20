-- ============================================================
-- PERBAIKAN LANJUTAN: kebijakan UPDATE activities butuh WITH CHECK
--
-- GEJALA: "new row violates row-level security policy for table activities"
-- saat Ketua Panitia menandai kegiatan selesai.
--
-- SEBAB: kebijakan activities_ubah hanya punya USING (baris lama boleh diubah),
-- TANPA WITH CHECK. Pada UPDATE, Postgres memeriksa baris HASIL dengan WITH CHECK;
-- bila kosong, yang dipakai adalah USING — dan USING memuat syarat
-- "status = 'berjalan'". Begitu status berubah menjadi 'selesai', syarat itu
-- tidak lagi terpenuhi sehingga perubahan DITOLAK.
--
-- PERBAIKAN: tambahkan WITH CHECK yang tidak membatasi status hasil, hanya
-- memastikan hak pengguna atas kegiatan tersebut.
-- ============================================================

drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    apakah_super()
    or (status <> 'arsip' and apakah_salah_satu(
          array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
        ))
    or (dibuat_oleh = auth.uid() and status = 'laporan_disetujui')
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

select with_check from pg_policies where policyname = 'activities_ubah';
