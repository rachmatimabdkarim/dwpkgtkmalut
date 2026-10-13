-- ============================================================
-- MIGRASI 0037 — Jejak penghapusan kegiatan harus selalu tercatat
--
-- MASALAH: aturan tulis tabel `audit_logs` hanya mengizinkan Super Admin
-- (apakah_super()). Akibatnya ketika pengusul biasa menghapus kegiatannya
-- sendiri, jejak penghapusan GAGAL dicatat tanpa pesan galat — kegiatan hilang
-- tanpa bekas siapa yang menghapus dan kapan.
--
-- PERBAIKAN: setiap pengguna yang sudah masuk boleh MENAMBAH catatan audit
-- (memang begitu seharusnya — jejak tindakan harus bisa ditulis oleh pelakunya).
-- Membaca tetap terbatas pada pengurus inti dan Super Admin.
-- Catatan audit tetap tidak dapat diubah atau dihapus siapa pun.
-- ============================================================

drop policy if exists audit_tambah on public.audit_logs;

create policy audit_tambah on public.audit_logs
  for insert
  with check (
    -- pelakunya harus orang yang sedang masuk — supaya jejak tidak bisa
    -- dipalsukan atas nama orang lain
    pelaku_id = auth.uid()
  );

comment on policy audit_tambah on public.audit_logs is
  'Setiap pengguna yang sudah masuk dapat menambah catatan audit atas namanya sendiri. Membaca tetap terbatas pada pengurus inti dan Super Admin.';

-- Periksa
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'audit_logs'
order by cmd;
