-- ============================================================
-- MIGRASI 0002 — MODUL BERKAS (Storage + Pendaftaran Berkas)
-- Prinsip: setiap berkas yang diunggah WAJIB terdaftar di tabel
-- attachments. Berkas tanpa rujukan apa pun akan disapu dan
-- dihapus permanen, tetapi catatannya tetap tersimpan di log.
-- ============================================================

-- ---------- 1. Tabel berkas ----------
create table if not exists public.attachments (
  id               uuid primary key default gen_random_uuid(),
  bucket           text not null check (bucket in ('publik','internal')),
  path             text not null,
  nama_asli        text not null,
  tipe_mime        text not null,
  ukuran_byte      bigint not null,
  hash_sha256      text not null,
  visibilitas      text not null default 'privat' check (visibilitas in ('publik','privat')),
  status           text not null default 'sementara' check (status in ('sementara','resmi')),
  entitas          text,                    -- contoh: 'kegiatan_foto', 'site_settings', 'berita'
  entitas_id       uuid,                    -- id baris yang merujuk (boleh kosong saat sementara)
  kategori         text,                    -- contoh: 'logo', 'favicon', 'foto_kegiatan', 'dokumen'
  keterangan       text,
  lebar            integer,
  tinggi           integer,
  hash_kompresi    text,                    -- sidik jari isi setelah dikompres (untuk deteksi duplikat)
  diunggah_oleh    uuid references public.profiles(id) on delete set null,
  diunggah_pada    timestamptz not null default now(),
  resmi_pada       timestamptz,
  unique (bucket, path)
);

create index if not exists idx_attachments_status   on public.attachments(status, diunggah_pada);
create index if not exists idx_attachments_entitas  on public.attachments(entitas, entitas_id);
create index if not exists idx_attachments_hash     on public.attachments(hash_sha256);
create index if not exists idx_attachments_diunggah on public.attachments(diunggah_pada);

-- ---------- 2. Log berkas (tambah-saja, tidak dapat diubah/dihapus) ----------
create table if not exists public.file_logs (
  id            bigserial primary key,
  attachment_id uuid,                       -- sengaja tanpa foreign key: catatan tetap ada walau berkasnya dihapus
  aksi          text not null check (aksi in ('unggah','resmi','ganti','hapus','bersih_otomatis','sapu')),
  bucket        text,
  path          text,
  nama_asli     text,
  ukuran_byte   bigint,
  hash_sha256   text,
  alasan        text,                       -- diganti / dibatalkan / dilepas / data dihapus / yatim
  pemicu        text not null default 'pengguna' check (pemicu in ('pengguna','sistem','penyapu')),
  pelaku_id     uuid,                       -- null = sistem
  pelaku_nama   text,
  waktu         timestamptz not null default now()
);

create index if not exists idx_file_logs_waktu on public.file_logs(waktu desc);
create index if not exists idx_file_logs_aksi  on public.file_logs(aksi, waktu desc);

-- Log hanya boleh ditambah
create or replace function public.file_logs_hanya_tambah()
returns trigger language plpgsql as $$
begin
  raise exception 'Catatan log bersifat tambah-saja: tidak dapat diubah atau dihapus.';
end;
$$;

drop trigger if exists trg_file_logs_ubah on public.file_logs;
create trigger trg_file_logs_ubah before update or delete on public.file_logs
  for each row execute function public.file_logs_hanya_tambah();

-- ---------- 3. Tambahan pengaturan ----------
insert into public.app_settings (kunci, nilai, keterangan) values
  ('batas_penyapu', '{"maks_berkas":50,"maks_persen":20,"masa_tenggang_menit":60}'::jsonb,
   'Pengaman penyapu berkas yatim'),
  ('penyimpanan_terpakai', '{"total_byte":0,"diperbarui":null}'::jsonb,
   'Ringkasan penggunaan penyimpanan'),
  ('pemberitahuan_penyapu', '{"dijeda":null,"pesan":null}'::jsonb,
   'Penanda bila penyapu berhenti karena melewati batas')
on conflict (kunci) do nothing;

-- ---------- 4. RLS ----------
alter table public.attachments enable row level security;
alter table public.file_logs   enable row level security;

-- attachments: semua pengurus boleh melihat; pengguna boleh menulis miliknya sendiri;
-- Super Admin mengelola semuanya
drop policy if exists attachments_baca on public.attachments;
create policy attachments_baca on public.attachments for select to authenticated using (true);

drop policy if exists attachments_tulis_sendiri on public.attachments;
create policy attachments_tulis_sendiri on public.attachments for insert to authenticated
  with check (
    public.apakah_super()
    or status = 'sementara'
    or diunggah_oleh = auth.uid()
  );

drop policy if exists attachments_ubah on public.attachments;
create policy attachments_ubah on public.attachments for update to authenticated
  using (public.apakah_super() or diunggah_oleh = auth.uid())
  with check (public.apakah_super() or diunggah_oleh = auth.uid());

drop policy if exists attachments_hapus on public.attachments;
create policy attachments_hapus on public.attachments for delete to authenticated
  using (public.apakah_super() or diunggah_oleh = auth.uid());

-- file_logs: semua pengurus boleh membaca; hanya fungsi server (memakai kunci rahasia) yang menulis.
-- Tidak ada kebijakan insert/update/delete untuk pengguna biasa.
drop policy if exists file_logs_baca on public.file_logs;
create policy file_logs_baca on public.file_logs for select to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

grant select, insert, update, delete on public.attachments to authenticated;
grant select on public.file_logs to authenticated;
grant usage, select on sequence public.file_logs_id_seq to authenticated;

-- ---------- 5. Ringkasan penggunaan penyimpanan ----------
create or replace view public.penggunaan_penyimpanan as
select
  count(*)                                              as jumlah_berkas,
  coalesce(sum(ukuran_byte), 0)                         as total_byte,
  count(*) filter (where bucket = 'publik')             as jumlah_publik,
  coalesce(sum(ukuran_byte) filter (where bucket = 'publik'), 0)   as byte_publik,
  count(*) filter (where bucket = 'internal')           as jumlah_internal,
  coalesce(sum(ukuran_byte) filter (where bucket = 'internal'), 0) as byte_internal,
  count(*) filter (where status = 'sementara')          as jumlah_sementara,
  count(*) filter (where diunggah_pada > now() - interval '30 days') as unggah_30hari
from public.attachments;

grant select on public.penggunaan_penyimpanan to authenticated;

-- ---------- 6. Fungsi bantu: cek apakah berkas masih dirujuk data mana pun ----------
create or replace function public.berkas_masih_dirujuk(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.attachments a
    where a.id = p_id and a.status = 'resmi'
  );
$$;
