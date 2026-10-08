-- ============================================================
-- SEED — SUSUNAN PENGURUS DWP GTK MALUKU UTARA
-- Masa bakti 2024–2029 (sesuai dokumen yang dikirim pemilik proyek)
-- ============================================================

-- 1. Periode
insert into public.periods (nama, mulai, selesai, aktif, catatan)
values ('2024–2029', '2024-01-01', '2029-12-31', true,
        'Sesuai dokumen Susunan Pengurus DWP Kantor GTK Provinsi Maluku Utara')
on conflict do nothing;

-- 2. Jabatan per orang (tanpa akun login dulu — akun dibuat menyusul)
with p as (select id from public.periods where aktif limit 1),
     s as (select id, nama from public.sections)
insert into public.positions (nama, seksi, urutan, section_id, periode_id)
select v.jabatan, s.nama, v.urutan, s.id, p.id
from (values
  ('Ketua',                         'Pengurus Harian',     1),
  ('Wakil Ketua',                   'Pengurus Harian',     2),
  ('Sekretaris',                    'Pengurus Harian',     3),
  ('Wakil Sekretaris',              'Pengurus Harian',     4),
  ('Bendahara',                     'Pengurus Harian',     5),
  ('Ketua Bidang Pendidikan',       'Bidang Pendidikan',   10),
  ('Anggota Bidang Pendidikan',     'Bidang Pendidikan',   11),
  ('Ketua Bidang Ekonomi',          'Bidang Ekonomi',      20),
  ('Anggota Bidang Ekonomi',        'Bidang Ekonomi',      21),
  ('Ketua Bidang Sosial Budaya',    'Bidang Sosial Budaya',30),
  ('Anggota Bidang Sosial Budaya',  'Bidang Sosial Budaya',31)
) as v(jabatan, seksi, urutan)
join s on s.nama = v.seksi
cross join p
where not exists (
  select 1 from public.positions x
  where x.nama = v.jabatan and x.section_id = s.id and x.periode_id = p.id
);

-- 3. Daftar orang (disimpan sebagai jabatan pada tabel positions lewat nama,
--    lalu dipindahkan ke tabel pengurus saat akun dibuat).
create table if not exists public.officers (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  bidang      text not null,
  jabatan     text not null,
  urutan      smallint not null default 99,
  periode_id  uuid references public.periods(id) on delete set null,
  profile_id  uuid references public.profiles(id) on delete set null,
  email       text,
  catatan     text,
  dibuat_pada timestamptz not null default now(),
  unique (nama, jabatan, bidang)
);

alter table public.officers enable row level security;

drop policy if exists officers_baca on public.officers;
create policy officers_baca on public.officers for select to authenticated using (true);

drop policy if exists officers_tulis on public.officers;
create policy officers_tulis on public.officers for all to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']))
  with check (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

grant select, insert, update, delete on public.officers to authenticated;

insert into public.officers (nama, bidang, jabatan, urutan, periode_id)
select v.nama, v.bidang, v.jabatan, v.urutan, (select id from public.periods where aktif limit 1)
from (values
  ('Ny. Washliyatul Qodari',        'Pengurus Harian',     'Ketua',            1),
  ('Ny. Wahyuni Balussy',           'Pengurus Harian',     'Wakil Ketua',      2),
  ('Ny. Fadila Assagaf',            'Pengurus Harian',     'Sekretaris',       3),
  ('Ny. Hastizia Ismira',           'Pengurus Harian',     'Wakil Sekretaris', 4),
  ('Ny. Jumaini',                   'Pengurus Harian',     'Bendahara',        5),
  ('Ny. Jusna',                     'Bidang Pendidikan',   'Ketua Bidang',     10),
  ('Ny. Nurlaela A. Barmawi',       'Bidang Pendidikan',   'Anggota',          11),
  ('Ny. Nur',                       'Bidang Pendidikan',   'Anggota',          12),
  ('Ny. Nining Suaib',              'Bidang Pendidikan',   'Anggota',          13),
  ('Ny. Yayuk Setiyawati',          'Bidang Ekonomi',      'Ketua Bidang',     20),
  ('Ny. Sahdia Abukasim',           'Bidang Ekonomi',      'Anggota',          21),
  ('Ny. Jumiarti Audina',           'Bidang Ekonomi',      'Anggota',          22),
  ('Ny. Risna Kanurua Sopalatu',    'Bidang Sosial Budaya','Ketua Bidang',     30),
  ('Ny. Aida Ibrahim',              'Bidang Sosial Budaya','Anggota',          31),
  ('Ny. Siti Masita Muhammad',      'Bidang Sosial Budaya','Anggota',          32),
  ('Ny. Nur Alisnawati Anas',       'Bidang Sosial Budaya','Anggota',          33)
) as v(nama, bidang, jabatan, urutan)
where not exists (
  select 1 from public.officers o where o.nama = v.nama and o.jabatan = v.jabatan and o.bidang = v.bidang
);
