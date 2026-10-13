-- ============================================================
-- MIGRASI 0034 — Perbaiki aturan baca peran pengguna (penyebab tombol
-- persetujuan tidak muncul + celah keterbukaan data)
--
-- MASALAH 1 (fatal): aturan baca tabel `user_roles` berbunyi
--     user_id = auth.uid()
--     OR apakah_salah_satu(array['ketua','wakil_ketua','secretaris',...])
--   Karena banyak pengurus memegang peran 'ketua'/'wakil_ketua', mereka bisa
--   membaca baris peran MILIK SIAPA SAJA. Akibatnya aplikasi yang membaca
--   "peran saya" malah menerima peran seluruh pengurus, lalu salah
--   menyimpulkan siapa yang berhak menyetujui. Inilah sebab tombol
--   persetujuan tidak muncul untuk Sekretaris.
--
--   Ada juga salah ketik: 'secretaris' seharusnya 'sekretaris'.
--
-- MASALAH 2: informasi peran seluruh pengurus terbuka bagi setiap orang yang
--   sudah masuk.
--
-- PERBAIKAN: setiap orang hanya boleh membaca baris perannya SENDIRI.
-- Kebutuhan pengurus melihat susunan peran orang lain dilayani lewat fungsi
-- khusus yang hanya mengembalikan data yang memang perlu (lihat aplikasi).
-- ============================================================

drop policy if exists user_roles_baca on public.user_roles;

create policy user_roles_baca on public.user_roles
  for select
  using (
    -- diri sendiri
    user_id = auth.uid()
    -- Super Admin boleh membaca semuanya (untuk mengelola pengurus)
    or public.apakah_super()
  );

comment on policy user_roles_baca on public.user_roles is
  'Setiap pengguna hanya dapat membaca baris perannya sendiri. Super Admin boleh membaca semuanya untuk keperluan pengelolaan.';

-- Periksa
select policyname, cmd, qual
from pg_policies
where tablename = 'user_roles';
