-- ============================================================
-- VALIDASI LAPORAN OLEH KETUA DWP LEWAT QR CODE
--
-- ATURAN PEMILIK:
--  * Nama Ketua DWP tetap tertulis di area penandatangan (sudah otomatis).
--  * Ketua memvalidasi laporan; setelah divalidasi, area penandatangan
--    menampilkan QR yang bisa dipindai dengan HP untuk membuktikan keaslian.
--
-- RANCANGAN:
--  * Tabel `laporan_validasi` — satu baris per laporan yang divalidasi.
--  * Kode QR dibuat acak & tak mudah ditebak (bukan nomor urut).
--  * Halaman publik /validasi/<kode> menampilkan ringkasan keaslian:
--    kegiatan, tanggal, penandatangan, waktu validasi.
--  * Validasi hanya boleh oleh KETUA (atau Super Admin sebagai cadangan),
--    dan hanya setelah laporan disetujui.
-- ============================================================

create table if not exists public.laporan_validasi (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references public.activities(id) on delete cascade,
  kode text not null unique,
  divalidasi_oleh uuid references public.profiles(id),
  divalidasi_pada timestamptz not null default now()
);

comment on table public.laporan_validasi is
  'Validasi Ketua DWP atas laporan pelaksanaan. Kode dipakai untuk QR keaslian.';

alter table public.laporan_validasi enable row level security;

drop policy if exists laporan_validasi_baca on public.laporan_validasi;
create policy laporan_validasi_baca on public.laporan_validasi
  for select using (auth.uid() is not null);

drop policy if exists laporan_validasi_tulis on public.laporan_validasi;
create policy laporan_validasi_tulis on public.laporan_validasi
  for all
  using (apakah_super() or apakah_salah_satu(array['ketua']))
  with check (apakah_super() or apakah_salah_satu(array['ketua']));

grant select on public.laporan_validasi to anon, authenticated;
grant insert, update, delete on public.laporan_validasi to authenticated;
grant all on public.laporan_validasi to service_role;

-- ---------- Halaman validasi publik ----------
create or replace view public.public_validasi as
select
  v.kode,
  v.divalidasi_pada,
  a.id           as activity_id,
  a.judul,
  a.kode         as kode_kegiatan,
  a.tempat,
  a.tanggal_mulai,
  a.tanggal_selesai,
  p.nama         as penandatangan
from public.laporan_validasi v
join public.activities a on a.id = v.activity_id
left join public.profiles p on p.id = v.divalidasi_oleh;

grant select on public.public_validasi to anon, authenticated;
grant select on public.public_validasi to service_role;

select 'selesai' as status;
