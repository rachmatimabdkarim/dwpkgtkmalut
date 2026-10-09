-- ============================================================
-- MIGRASI 0020 — Halaman Kontak: form pesan masuk + daftar penerima
--
-- Berisi:
--   1. Tabel `contact_messages`  — pesan dari masyarakat
--   2. Tabel `contact_recipients` — daftar penerima email (diatur di panel)
--   3. Pengaturan koordinat peta lokasi
-- ============================================================

-- ------------------------------------------------------------
-- 1. PESAN MASUK
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null,
  email        text not null,
  pesan        text not null,
  status       text not null default 'baru',   -- baru | dibaca | selesai
  catatan      text,                            -- catatan pengurus
  dibaca_oleh  uuid references public.profiles(id) on delete set null,
  dibaca_pada  timestamptz,
  dibuat_pada  timestamptz not null default now(),
  -- pembatas sederhana: jangan sampai kosong atau kepanjangan
  constraint contact_pesan_panjang check (char_length(pesan) between 10 and 4000),
  constraint contact_nama_panjang  check (char_length(nama) between 2 and 120),
  constraint contact_email_sah     check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contact_status_sah    check (status in ('baru','dibaca','selesai'))
);

create index if not exists contact_messages_dibuat_idx
  on public.contact_messages (dibuat_pada desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);

alter table public.contact_messages enable row level security;

-- SIAPA PUN (termasuk pengunjung tanpa masuk) boleh MENGIRIM pesan
drop policy if exists contact_kirim on public.contact_messages;
create policy contact_kirim on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'baru' and catatan is null and dibaca_oleh is null);

-- Hanya pengurus yang boleh MEMBACA dan MENGELOLA
drop policy if exists contact_baca on public.contact_messages;
create policy contact_baca on public.contact_messages
  for select to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

drop policy if exists contact_ubah on public.contact_messages;
create policy contact_ubah on public.contact_messages
  for update to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']))
  with check (true);

drop policy if exists contact_hapus on public.contact_messages;
create policy contact_hapus on public.contact_messages
  for delete to authenticated
  using (public.apakah_super());

-- ------------------------------------------------------------
-- 2. DAFTAR PENERIMA EMAIL (diatur di panel; pengiriman menyusul)
-- ------------------------------------------------------------
create table if not exists public.contact_recipients (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  nama       text,
  aktif      boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

alter table public.contact_recipients enable row level security;

drop policy if exists penerima_baca on public.contact_recipients;
create policy penerima_baca on public.contact_recipients
  for select to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

drop policy if exists penerima_tulis on public.contact_recipients;
create policy penerima_tulis on public.contact_recipients
  for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

-- ------------------------------------------------------------
-- 3. KOORDINAT PETA LOKASI (diatur Super Admin)
-- ------------------------------------------------------------
alter table public.site_settings
  add column if not exists peta_lintang numeric(10,7),
  add column if not exists peta_bujur   numeric(10,7),
  add column if not exists peta_zoom    smallint default 15;

-- Koordinat awal: Kantor GTK Malut, Kel. Rum, Tidore Utara
update public.site_settings
   set peta_lintang = coalesce(peta_lintang, 0.7245000),
       peta_bujur    = coalesce(peta_bujur, 127.4429000),
       peta_zoom     = coalesce(peta_zoom, 15)
 where id = (select id from public.site_settings limit 1);

-- View publik: hanya yang aman dibaca publik
drop view if exists public.public_site_settings cascade;
create view public.public_site_settings as
  select nama_aplikasi, nama_unit, nama_organisasi, warna_utama,
         logo_path, favicon_path, alamat, telepon, email,
         sambutan, profil_singkat,
         sub_judul_agenda, sub_judul_berita, sub_judul_galeri, sub_judul_unduhan,
         peta_lintang, peta_bujur, peta_zoom
    from public.site_settings;

grant select on public.public_site_settings to anon, authenticated;

-- Ringkasan hasil
select
  (select count(*) from public.contact_messages)   as pesan_masuk,
  (select count(*) from public.contact_recipients) as penerima,
  (select count(*) from public.public_site_settings) as view_publik;
