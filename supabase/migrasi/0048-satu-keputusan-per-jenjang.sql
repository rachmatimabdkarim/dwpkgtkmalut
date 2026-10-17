-- ============================================================
-- PERBAIKAN: satu jenjang tidak boleh diputuskan DUA KALI.
--
-- Temuan uji berebut: dua orang menekan "Setujui" pada jenjang yang SAMA
-- dalam waktu hampir bersamaan. Hasilnya DUA baris keputusan tercatat:
--   sekretaris:setuju | sekretaris:setuju
-- padahal hanya satu jenjang. Riwayat resmi jadi cacat, dan bila kelak ada
-- laporan/rekap jumlah keputusan, angkanya akan salah.
--
-- Akar: tabel `approvals` hanya punya kunci utama `id`; tidak ada aturan yang
-- menjamin satu (kegiatan, tahap, jenjang) diputuskan sekali. Aplikasi pun
-- tidak memeriksa ulang setelah membaca (dua pembacaan bersamaan sama-sama
-- melihat "belum diputuskan").
--
-- Perbaikan:
--   * indeks unik untuk (activity_id, tahap, step_urutan) — pengaman di
--     tingkat data, berlaku untuk SEMUA jalur (termasuk yang belum ditulis).
--   * bersihkan dulu baris kembar yang sudah terlanjur ada, simpan yang
--     PALING AWAL (keputusan pertama adalah yang sah).
-- ============================================================

-- 1. hapus baris kembar: pertahankan yang paling awal per jenjang
delete from public.approvals a
using public.approvals b
where a.activity_id = b.activity_id
  and a.tahap = b.tahap
  and a.step_urutan = b.step_urutan
  and a.dibuat_pada > b.dibuat_pada;

-- 2. pasang pengaman permanen
create unique index if not exists idx_approvals_satu_per_jenjang
  on public.approvals (activity_id, tahap, step_urutan);
