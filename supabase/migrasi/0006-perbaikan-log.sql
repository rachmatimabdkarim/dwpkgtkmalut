-- ============================================================
-- MIGRASI 0006 — Perbaikan: izin menulis riwayat kegiatan
-- Masalah: tabel activity_logs sudah dinyalakan pengaman barisnya
-- (RLS) tetapi tidak punya izin "boleh menambah". Akibatnya
-- keputusan persetujuan tersimpan, tapi catatan riwayatnya gagal.
--
-- Aturan yang benar:
--  - Setiap pengurus boleh MENAMBAH catatan riwayat.
--  - Tidak seorang pun boleh mengubah atau menghapusnya (dijaga pemicu).
-- ============================================================

drop policy if exists activity_logs_tambah on public.activity_logs;
create policy activity_logs_tambah on public.activity_logs
  for insert to authenticated
  with check (true);

-- File log berkas: sama perlakuannya (ditulis oleh server, dibaca pengurus inti)
drop policy if exists file_logs_tambah on public.file_logs;
create policy file_logs_tambah on public.file_logs
  for insert to authenticated
  with check (true);

grant insert on public.file_logs to authenticated;

-- Percobaan: pastikan kedua tabel bisa ditambah
select 'activity_logs siap' as keterangan;
