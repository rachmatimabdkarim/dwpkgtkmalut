-- ============================================================
-- MIGRASI 0010 — Perbaikan: mengesahkan berkas setelah data induk tersimpan
-- Masalah: berkas dipindahkan ke folder resmi, tetapi catatannya di tabel
-- `attachments` (status, path, entitas_id) tidak ikut diperbarui sehingga
-- foto tidak muncul di halaman kegiatan dan dianggap belum resmi.
--
-- Penyebab: aturan pengaman memakai "dengan pemeriksaan", dan nilai yang
-- diperiksa (diunggah_oleh) tidak dikirim ulang saat pembaruan.
--
-- Perbaikan:
--  - Pemilik berkas atau Super Admin boleh memperbarui catatan berkas.
--  - Berkas yang sudah resmi tidak boleh diubah sembarang orang
--    kecuali untuk keperluan keterangan/visibilitas (dijaga aplikasi).
-- ============================================================

drop policy if exists attachments_ubah on public.attachments;
create policy attachments_ubah on public.attachments for update to authenticated
  using (
    public.apakah_super()
    or diunggah_oleh = auth.uid()
    or public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris'])
  )
  with check (
    public.apakah_super()
    or diunggah_oleh = auth.uid()
    or public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris'])
  );

-- Sengketa kecil: izin dasar
grant select, insert, update, delete on public.attachments to authenticated;

select 'izin mengesahkan berkas diperbaiki' as keterangan;
