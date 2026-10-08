-- ============================================================
-- MIGRASI 0012 — Tabel Notifikasi di Dalam Aplikasi
-- Digunakan untuk notifikasi lonceng: pengingat review kelamaan,
-- antrean berita, dan pemberitahuan sistem (mis. penyapu dijeda).
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  jenis       text not null,                 -- contoh: 'review_menunggu', 'antrean_berita', 'penyapu_dijeda'
  judul       text not null,
  pesan       text,
  tautan      text,                          -- alamat di dalam aplikasi (contoh: '/admin/kegiatan/...')
  activity_id uuid references public.activities(id) on delete set null,
  dibaca      boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

-- Indeks untuk kueri cepat daftar notifikasi per pengguna
create index if not exists idx_notifications_user_dibaca
  on public.notifications (user_id, dibaca, dibuat_pada desc);

-- Aktifkan Row Level Security (RLS)
alter table public.notifications enable row level security;

-- Penerima hanya bisa melihat notifikasinya sendiri
drop policy if exists notifications_baca on public.notifications;
create policy notifications_baca on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Penerima hanya bisa menandai dibaca notifikasinya sendiri
drop policy if exists notifications_ubah on public.notifications;
create policy notifications_ubah on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Izin peran aplikasi
grant select, update on public.notifications to authenticated;

-- Izin peran server (service_role) untuk membuat dan mengelola notifikasi
grant select, insert, update, delete on public.notifications to service_role;

select 'tabel notifikasi siap' as keterangan;
