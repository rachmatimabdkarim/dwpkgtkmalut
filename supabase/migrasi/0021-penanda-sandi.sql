-- ============================================================
-- MIGRASI 0021 — Penanda "sudah ganti sandi" pada profil pengurus
--
-- Tujuan: Super Admin bisa melihat siapa yang belum pernah mengganti
-- sandi, supaya bisa diatur ulang. Data ini hanya menyimpan WAKTU
-- penggantian, bukan sandi itu sendiri (sandi tidak pernah disimpan
-- dalam bentuk yang bisa dibaca).
-- ============================================================

alter table public.profiles
  add column if not exists sandi_diganti_pada timestamptz,
  add column if not exists sandi_diatur_ulang_pada timestamptz,
  add column if not exists sandi_diatur_ulang_oleh uuid references auth.users(id) on delete set null;

comment on column public.profiles.sandi_diganti_pada is
  'Waktu pengguna mengganti sendiri sandinya lewat menu Profil. Kosong = belum pernah ganti.';
comment on column public.profiles.sandi_diatur_ulang_pada is
  'Waktu Super Admin mengatur ulang sandi pengguna ini.';
comment on column public.profiles.sandi_diatur_ulang_oleh is
  'Super Admin yang terakhir mengatur ulang sandi pengguna ini.';

-- Super Admin perlu membaca kolom ini; pengguna sendiri perlu menulis waktu ganti.
drop policy if exists profiles_baca_pengurus on public.profiles;
create policy profiles_baca_pengurus on public.profiles
  for select to authenticated
  using (
    public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris'])
    or id = auth.uid()
  );

drop policy if exists profiles_ubah_diri on public.profiles;
create policy profiles_ubah_diri on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.apakah_salah_satu(array['super_admin']))
  with check (id = auth.uid() or public.apakah_salah_satu(array['super_admin']));

grant select, update on public.profiles to authenticated;

-- Perbaikan: pengurus/super admin perlu melihat semua profil untuk daftar akun
drop policy if exists profiles_baca_semua_staf on public.profiles;
create policy profiles_baca_semua_staf on public.profiles
  for select to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

select 'kolom ganti sandi siap' as hasil;
