-- ============================================================
-- SISTEM INFORMASI DWP GTK MALUT
-- Migrasi 0001 — Organisasi, Peran, dan Pengaturan Dasar
-- Tabel: profiles, roles, user_roles, periods, positions, app_settings
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1. Utilitas ----------
create or replace function public.set_diperbarui()
returns trigger
language plpgsql
as $$
begin
  new.diperbarui_pada := now();
  return new;
end;
$$;

-- ---------- 2. Peran (master) ----------
create table if not exists public.roles (
  kode            text primary key,
  label           text not null,
  urutan          smallint not null default 99,
  keterangan      text,
  bawaan          boolean not null default true,
  dibuat_pada     timestamptz not null default now()
);

insert into public.roles (kode, label, urutan, keterangan) values
  ('super_admin',  'Super Admin',        0, 'Pengelola penuh sistem dan pengaturan'),
  ('ketua',        'Ketua',              1, 'Pimpinan DWP'),
  ('wakil_ketua',  'Wakil Ketua',        2, 'Menggantikan Ketua saat berhalangan'),
  ('sekretaris',   'Sekretaris',         3, 'Administrasi dan persuratan'),
  ('bendahara',    'Bendahara',          4, 'Anggaran dan keuangan kegiatan'),
  ('ketua_seksi',  'Ketua Seksi/Bidang', 5, 'Mengusulkan dan menjalankan kegiatan'),
  ('pengurus',     'Pengurus/Anggota',   6, 'Anggota pengurus'),
  ('editor',       'Editor Konten',      7, 'Meninjau dan menyunting berita')
on conflict (kode) do update
  set label = excluded.label, urutan = excluded.urutan, keterangan = excluded.keterangan;

-- ---------- 3. Profil pengurus ----------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nama            text not null,
  email           text not null,
  jabatan         text,
  foto_path       text,          -- merujuk berkas di storage (lihat tabel attachments)
  telepon         text,
  aktif           boolean not null default true,
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

drop trigger if exists trg_profiles_ubah on public.profiles;
create trigger trg_profiles_ubah before update on public.profiles
  for each row execute function public.set_diperbarui();

-- ---------- 4. Penugasan peran (satu orang boleh punya banyak peran) ----------
create table if not exists public.user_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  peran           text not null references public.roles(kode),
  mulai           date,
  selesai         date,
  diberikan_oleh  uuid references public.profiles(id),
  dibuat_pada     timestamptz not null default now(),
  unique (user_id, peran)
);

create index if not exists idx_user_roles_user on public.user_roles(user_id);

-- ---------- 5. Periode kepengurusan ----------
create table if not exists public.periods (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null,               -- contoh: "2025–2030"
  mulai           date not null,
  selesai         date,
  aktif           boolean not null default false,
  dibuat_pada     timestamptz not null default now()
);

create unique index if not exists idx_periods_satu_aktif
  on public.periods((aktif)) where aktif;

-- ---------- 6. Jabatan dalam struktur ----------
create table if not exists public.positions (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null,
  seksi           text,                        -- contoh: "Seksi Sosial Budaya"
  urutan          smallint not null default 99,
  dibuat_pada     timestamptz not null default now()
);

-- ---------- 7. Pengaturan aplikasi (kunci–nilai) ----------
create table if not exists public.app_settings (
  kunci           text primary key,
  nilai           jsonb not null,
  keterangan      text,
  hanya_super     boolean not null default true,
  diperbarui_pada timestamptz not null default now(),
  diperbarui_oleh uuid references public.profiles(id)
);

insert into public.app_settings (kunci, nilai, keterangan, hanya_super) values
  ('alur_approval_perencanaan', '["sekretaris","bendahara","wakil_ketua","ketua"]'::jsonb,
   'Urutan persetujuan tahap perencanaan', true),
  ('alur_approval_pelaporan', '["bendahara","sekretaris","wakil_ketua","ketua"]'::jsonb,
   'Urutan persetujuan tahap pelaporan', true),
  ('batas_hari_review', '{"persetujuan":3,"laporan":7}'::jsonb,
   'Batas hari sebelum pengingat muncul', true),
  ('mode_publikasi_berita', '"otomatis_dengan_tinjauan"'::jsonb,
   'Cara berita dari laporan diterbitkan', true),
  ('batas_ukuran', '{"foto_kb":200,"dokumen_mb":2,"logo_kb":100,"favicon_kb":50}'::jsonb,
   'Batas ukuran berkas yang diizinkan', true),
  ('keep_alive_terakhir', 'null'::jsonb,
   'Penanda aktivitas terakhir untuk mencegah proyek dijeda', false)
on conflict (kunci) do nothing;

-- ---------- 8. Keamanan: aktifkan RLS ----------
alter table public.roles        enable row level security;
alter table public.profiles     enable row level security;
alter table public.user_roles   enable row level security;
alter table public.periods      enable row level security;
alter table public.positions    enable row level security;
alter table public.app_settings enable row level security;

-- ---------- 9. Fungsi bantu (dipakai seluruh kebijakan keamanan) ----------
-- Mengambil daftar peran pengguna yang sedang masuk. SECURITY DEFINER agar
-- tidak terjadi perulangan saat diperiksa dari tabel user_roles sendiri.
create or replace function public.peran_saya()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(peran), array[]::text[])
  from public.user_roles
  where user_id = auth.uid()
    and (mulai is null or mulai <= current_date)
    and (selesai is null or selesai >= current_date);
$$;

create or replace function public.apakah_super()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and peran = 'super_admin'
      and (mulai is null or mulai <= current_date)
      and (selesai is null or selesai >= current_date)
  );
$$;

create or replace function public.apakah(peran text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.apakah_super() or peran = any(public.peran_saya());
$$;

create or replace function public.apakah_salah_satu(peran_list text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.apakah_super() or public.peran_saya() && peran_list;
$$;

-- ---------- 10. Hak dasar (grant) ----------
grant usage on schema public to anon, authenticated;
grant select on public.roles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.periods, public.positions to authenticated;
grant select on public.app_settings to authenticated;
grant insert, update on public.app_settings to authenticated;

-- ---------- 11. Kebijakan RLS ----------

-- roles: semua boleh melihat daftar peran; hanya Super Admin mengubah
drop policy if exists roles_baca on public.roles;
create policy roles_baca on public.roles for select to anon, authenticated using (true);
drop policy if exists roles_ubah_super on public.roles;
create policy roles_ubah_super on public.roles for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

-- profiles: pengguna melihat dirinya sendiri; pengurus inti melihat semua;
-- Super Admin mengubah semua; pengguna boleh memperbarui datanya sendiri (kolom terbatas dijaga di aplikasi)
drop policy if exists profiles_baca_sendiri on public.profiles;
create policy profiles_baca_sendiri on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris','bendahara','editor','pengurus','ketua_seksi'])
  );
drop policy if exists profiles_ubah_sendiri on public.profiles;
create policy profiles_ubah_sendiri on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_kelola_super on public.profiles;
create policy profiles_kelola_super on public.profiles for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

-- user_roles: hanya pengurus inti/Super Admin yang melihat semua;
-- hanya Super Admin yang menulis
drop policy if exists user_roles_baca on public.user_roles;
create policy user_roles_baca on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.apakah_salah_satu(array['ketua','wakil_ketua','secretaris','sekretaris']));
drop policy if exists user_roles_tulis_super on public.user_roles;
create policy user_roles_tulis_super on public.user_roles for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

-- periods & positions: semua pengurus boleh melihat; pengurus inti mengubah
drop policy if exists periods_baca on public.periods;
create policy periods_baca on public.periods for select to authenticated using (true);
drop policy if exists periods_tulis on public.periods;
create policy periods_tulis on public.periods for all to authenticated
  using (public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris']))
  with check (public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris']));

drop policy if exists positions_baca on public.positions;
create policy positions_baca on public.positions for select to authenticated using (true);
drop policy if exists positions_tulis on public.positions;
create policy positions_tulis on public.positions for all to authenticated
  using (public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris']))
  with check (public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris']));

-- app_settings: semua pengurus boleh membaca; hanya Super Admin menulis
drop policy if exists app_settings_baca on public.app_settings;
create policy app_settings_baca on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_tulis_super on public.app_settings;
create policy app_settings_tulis_super on public.app_settings for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());
