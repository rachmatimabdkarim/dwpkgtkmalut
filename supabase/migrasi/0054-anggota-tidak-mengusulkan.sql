-- ATURAN PEMILIK: Anggota biasa TIDAK boleh mengusulkan kegiatan.
-- Sebelumnya migrasi 0051 menambahkan 'pengurus' ke kebijakan INSERT.
-- Sekarang dicabut kembali: hanya pengurus harian dan Ketua Bidang.
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
        'ketua_seksi'
      ]
    )
  );
