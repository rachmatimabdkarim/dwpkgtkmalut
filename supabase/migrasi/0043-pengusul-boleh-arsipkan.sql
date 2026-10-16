-- ============================================================
-- PERBAIKAN: pengusul tidak boleh mengubah kegiatan yang sudah disetujui
--            laporannya — sehingga tombol "Kunci & Arsipkan" selalu gagal.
--
-- Temuan (penyisiran alur pelaporan):
--   Pada kegiatan berstatus `laporan_disetujui`, halaman menampilkan tombol
--   "Kunci & Arsipkan" kepada PENGUSUL (Yayuk). Menekan tombol itu tidak
--   melakukan apa pun: tanpa pesan, tanpa galat, status tetap `laporan_disetujui`.
--
-- Akar:
--   Kebijakan izin `activities_ubah` hanya mengizinkan peran inti
--   (ketua, wakil_ketua, sekretaris, bendahara, ketua_seksi) atau super admin.
--   Pengusul — yang justru diberi tombolnya di layar — tidak termasuk,
--   sehingga pembaruan status tidak mengenai satu baris pun. PostgREST
--   mengembalikan sukses untuk pembaruan yang tidak kena baris, jadi layar
--   tidak menampilkan galat apa pun.
--
-- Perbaikan:
--   Izinkan PENGUSUL catatan itu sendiri menandai arsip, dengan syarat:
--     - dia pemilik catatan (dibuat_oleh = auth.uid()), DAN
--     - statusnya memang sudah `laporan_disetujui` (laporan sudah disetujui
--       penuh oleh seluruh jenjang — bukan melompati persetujuan).
--   Peran inti tetap seperti semula.
-- ============================================================

drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    apakah_super()
    or (
      status <> 'arsip'
      and apakah_salah_satu(
        array['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'ketua_seksi']
      )
    )
    -- Pengusul boleh menutup catatannya sendiri (kunci & arsip), tetapi
    -- HANYA setelah laporan disetujui penuh.
    or (
      dibuat_oleh = auth.uid()
      and status = 'laporan_disetujui'
    )
  );
