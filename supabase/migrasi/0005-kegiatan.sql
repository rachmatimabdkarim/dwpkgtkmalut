-- ============================================================
-- MIGRASI 0005 — MODUL KEGIATAN (Perencanaan → Pelaksanaan → Pelaporan)
-- Alur status utama:
--   Draf → Diajukan → Dalam Review → (Revisi | Ditolak | Disetujui)
--   → Berjalan → Selesai → Laporan Diajukan → Laporan Dalam Review
--   → Laporan Disetujui → Arsip
-- ============================================================

-- ---------- 1. Kegiatan ----------
create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  kode              text unique,                 -- contoh: DWP-2026-001
  judul             text not null,
  ringkasan         text,                        -- dipakai untuk agenda publik
  tujuan            text,
  sasaran           text,
  tanggal_mulai     date,
  tanggal_selesai   date,
  tempat            text,
  section_id        uuid references public.sections(id) on delete set null,
  penanggung_jawab  uuid references public.profiles(id) on delete set null,
  status            text not null default 'draf' check (status in (
                      'draf','diajukan','dalam_review','revisi','ditolak','disetujui',
                      'berjalan','selesai','laporan_diajukan','laporan_dalam_review',
                      'laporan_disetujui','arsip')),
  publish_mode      text not null default 'otomatis_dengan_tinjauan'
                      check (publish_mode in ('otomatis_dengan_tinjauan','otomatis_penuh','manual')),
  is_hidden         boolean not null default false,   -- "Sembunyikan dari publik"
  periode_id        uuid references public.periods(id) on delete set null,
  dibuat_oleh       uuid references public.profiles(id) on delete set null,
  dibuat_pada       timestamptz not null default now(),
  diperbarui_pada   timestamptz not null default now()
);

drop trigger if exists trg_activities_ubah on public.activities;
create trigger trg_activities_ubah before update on public.activities
  for each row execute function public.set_diperbarui();

create index if not exists idx_activities_status   on public.activities(status, tanggal_mulai);
create index if not exists idx_activities_public   on public.activities(is_hidden, status);

-- ---------- 2. Rincian perencanaan ----------
create table if not exists public.activity_plans (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null references public.activities(id) on delete cascade,
  latar_belakang  text,
  target_peserta  integer,
  jumlah_peserta_hadir integer,
  hasil           text,
  kendala         text,
  catatan         text,
  dibuat_pada     timestamptz not null default now(),
  unique (activity_id)
);

-- ---------- 3. Rincian anggaran (RAB) ----------
create table if not exists public.budget_items (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities(id) on delete cascade,
  uraian       text not null,
  satuan       text,
  jumlah       numeric(12,2) not null default 1,
  harga_satuan numeric(14,2) not null default 0,
  realisasi    numeric(14,2),               -- diisi saat pelaporan
  urutan       smallint not null default 99,
  dibuat_pada  timestamptz not null default now()
);

create index if not exists idx_budget_activity on public.budget_items(activity_id, urutan);

-- ---------- 4. Panitia ----------
create table if not exists public.committees (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null,
  nama_luar    text,                        -- bila bukan pengurus
  peran        text not null,               -- contoh: Ketua Panitia, Seksi Acara
  dibuat_pada  timestamptz not null default now()
);

create index if not exists idx_committees_activity on public.committees(activity_id);

-- ---------- 5. Tugas panitia ----------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities(id) on delete cascade,
  committee_id  uuid references public.committees(id) on delete set null,
  judul         text not null,
  selesai       boolean not null default false,
  batas         date,
  dibuat_pada   timestamptz not null default now()
);

-- ---------- 6. Presensi ----------
create table if not exists public.attendances (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null,
  nama         text not null,
  keterangan   text,                        -- Hadir / Izin / Sakit
  dibuat_pada  timestamptz not null default now()
);

-- ---------- 7. Laporan kegiatan ----------
create table if not exists public.activity_reports (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null references public.activities(id) on delete cascade,
  ringkasan         text,
  hasil             text,
  kendala           text,
  rekomendasi       text,
  total_anggaran    numeric(14,2),
  total_realisasi   numeric(14,2),
  jumlah_hadir      integer,
  disusun_oleh      uuid references public.profiles(id) on delete set null,
  dibuat_pada       timestamptz not null default now(),
  diperbarui_pada   timestamptz not null default now(),
  unique (activity_id)
);

-- ---------- 8. Pengajuan perubahan setelah disetujui ----------
create table if not exists public.change_requests (
  id             uuid primary key default gen_random_uuid(),
  activity_id    uuid not null references public.activities(id) on delete cascade,
  jenis          text not null check (jenis in ('tanggal','tempat','anggaran','lain')),
  usulan         text not null,
  alasan         text,
  status         text not null default 'diajukan'
                   check (status in ('diajukan','dalam_review','disetujui','ditolak')),
  diajukan_oleh  uuid references public.profiles(id) on delete set null,
  dibuat_pada    timestamptz not null default now(),
  diputuskan_pada timestamptz
);

-- ---------- 9. Mesin persetujuan berjenjang ----------
create table if not exists public.approval_flows (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,                 -- 'perencanaan' | 'pelaporan'
  aktivitas   boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  unique (nama)
);

create table if not exists public.approval_steps (
  id          uuid primary key default gen_random_uuid(),
  flow_id     uuid not null references public.approval_flows(id) on delete cascade,
  urutan      smallint not null,
  peran       text not null references public.roles(kode),
  wajib       boolean not null default true,
  unique (flow_id, urutan)
);

create table if not exists public.approvals (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities(id) on delete cascade,
  tahap         text not null check (tahap in ('perencanaan','pelaporan','perubahan')),
  step_urutan   smallint,
  peran         text not null,
  keputusan     text not null check (keputusan in ('setuju','revisi','tolak')),
  catatan       text,
  oleh          uuid references public.profiles(id) on delete set null,
  atas_nama     uuid references public.profiles(id) on delete set null,  -- bila lewat delegasi
  dibuat_pada   timestamptz not null default now()
);

create index if not exists idx_approvals_activity on public.approvals(activity_id, tahap, dibuat_pada);

create table if not exists public.delegations (
  id          uuid primary key default gen_random_uuid(),
  dari_peran  text not null references public.roles(kode),
  ke_peran    text not null references public.roles(kode),
  mulai       date not null,
  selesai     date not null,
  alasan      text,
  dibuat_oleh uuid references public.profiles(id) on delete set null,
  dibuat_pada timestamptz not null default now()
);

-- ---------- 10. Linimasa (riwayat aktivitas, tambah-saja) ----------
create table if not exists public.activity_logs (
  id           bigserial primary key,
  activity_id  uuid not null,
  aksi         text not null,
  keterangan   text,
  pelaku_id    uuid,
  pelaku_nama  text,
  waktu        timestamptz not null default now()
);

create index if not exists idx_activity_logs on public.activity_logs(activity_id, waktu desc);

create or replace function public.activity_logs_hanya_tambah()
returns trigger language plpgsql as $$
begin
  raise exception 'Riwayat kegiatan bersifat tambah-saja.';
end;
$$;

drop trigger if exists trg_activity_logs_ubah on public.activity_logs;
create trigger trg_activity_logs_ubah before update or delete on public.activity_logs
  for each row execute function public.activity_logs_hanya_tambah();

-- ---------- 11. Isi alur persetujuan bawaan ----------
insert into public.approval_flows (nama) values ('perencanaan'), ('pelaporan')
on conflict (nama) do nothing;

insert into public.approval_steps (flow_id, urutan, peran)
select f.id, v.urutan, v.peran
from public.approval_flows f
join (values ('perencanaan',1,'sekretaris'),('perencanaan',2,'bendahara'),
             ('perencanaan',3,'wakil_ketua'),('perencanaan',4,'ketua'),
             ('pelaporan',1,'bendahara'),('pelaporan',2,'sekretaris'),
             ('pelaporan',3,'wakil_ketua'),('pelaporan',4,'ketua')) as v(nama,urutan,peran)
  on f.nama = v.nama
where not exists (select 1 from public.approval_steps s where s.flow_id = f.id and s.urutan = v.urutan);

-- ---------- 12. Nomor kegiatan otomatis ----------
create sequence if not exists public.seq_kegiatan_tahun;

create or replace function public.nomor_kegiatan()
returns text language plpgsql as $$
declare
  thn text := to_char(now(), 'YYYY');
  n bigint;
begin
  n := nextval('public.seq_kegiatan_tahun');
  return 'DWP-' || thn || '-' || lpad(n::text, 3, '0');
end;
$$;

-- ---------- 13. Keamanan (RLS) ----------
alter table public.activities        enable row level security;
alter table public.activity_plans    enable row level security;
alter table public.budget_items      enable row level security;
alter table public.committees        enable row level security;
alter table public.tasks             enable row level security;
alter table public.attendances       enable row level security;
alter table public.activity_reports  enable row level security;
alter table public.change_requests   enable row level security;
alter table public.approval_flows    enable row level security;
alter table public.approval_steps    enable row level security;
alter table public.approvals         enable row level security;
alter table public.delegations       enable row level security;
alter table public.activity_logs     enable row level security;

-- Kegiatan: semua pengurus boleh melihat; hanya pengusul/Super Admin boleh mengubah draf
drop policy if exists activities_baca on public.activities;
create policy activities_baca on public.activities for select to authenticated using (true);

drop policy if exists activities_buat on public.activities;
create policy activities_buat on public.activities for insert to authenticated
  with check (
    public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi'])
    and dibuat_oleh = auth.uid()
  );

drop policy if exists activities_ubah on public.activities;
create policy activities_ubah on public.activities for update to authenticated
  using (
    public.apakah_super()
    or (dibuat_oleh = auth.uid() and status in ('draf','revisi'))
    or (public.apakah_salah_satu(array['ketua','wakil_ketua','sekretaris','bendahara']))
  )
  with check (true);

drop policy if exists activities_hapus on public.activities;
create policy activities_hapus on public.activities for delete to authenticated
  using (public.apakah_super() or (dibuat_oleh = auth.uid() and status = 'draf'));

-- Tabel anak: dilihat semua pengurus; diubah pengurus inti atau pengusul kegiatan
do $$
declare t text;
begin
  foreach t in array array['activity_plans','budget_items','committees','tasks','attendances',
                           'activity_reports','change_requests']
  loop
    execute format('drop policy if exists %I_baca on public.%I', t, t);
    execute format('create policy %I_baca on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_tulis on public.%I', t, t);
    execute format(
      'create policy %I_tulis on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- Persetujuan: semua boleh melihat; yang berhak boleh menulis;
-- TIDAK boleh menyetujui usulan sendiri
drop policy if exists approvals_baca on public.approvals;
create policy approvals_baca on public.approvals for select to authenticated using (true);

drop policy if exists approvals_tulis on public.approvals;
create policy approvals_tulis on public.approvals for insert to authenticated
  with check (
    oleh = auth.uid()
    and not exists (
      select 1 from public.activities a
      where a.id = activity_id and a.dibuat_oleh = auth.uid()
    )
  );

drop policy if exists flows_baca on public.approval_flows;
create policy flows_baca on public.approval_flows for select to authenticated using (true);
drop policy if exists flows_tulis on public.approval_flows;
create policy flows_tulis on public.approval_flows for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

drop policy if exists steps_baca on public.approval_steps;
create policy steps_baca on public.approval_steps for select to authenticated using (true);
drop policy if exists steps_tulis on public.approval_steps;
create policy steps_tulis on public.approval_steps for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

drop policy if exists delegations_baca on public.delegations;
create policy delegations_baca on public.delegations for select to authenticated using (true);
drop policy if exists delegations_tulis on public.delegations;
create policy delegations_tulis on public.delegations for all to authenticated
  using (public.apakah_super() or public.apakah('ketua')) with check (true);

drop policy if exists activity_logs_baca on public.activity_logs;
create policy activity_logs_baca on public.activity_logs for select to authenticated using (true);

-- ---------- 14. Hak akses tabel ----------
grant select, insert, update, delete on
  public.activities, public.activity_plans, public.budget_items, public.committees,
  public.tasks, public.attendances, public.activity_reports, public.change_requests,
  public.approvals, public.delegations
  to authenticated;
grant select on public.approval_flows, public.approval_steps, public.activity_logs to authenticated;
grant insert on public.activity_logs to authenticated;
grant all on sequence public.activity_logs_id_seq to authenticated;
grant usage, select on sequence public.seq_kegiatan_tahun to authenticated;
