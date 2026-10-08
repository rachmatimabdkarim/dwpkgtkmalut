-- ============================================================
-- MIGRASI 0014 — Tabel Dokumen dan View Publik
-- Menyimpan daftar dokumen/berkas yang dapat diunduh publik
-- (mis. SK, panduan, formulir, atau materi kegiatan resmi).
-- ============================================================

-- ---------- 1. Tabel Dokumen ----------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  judul        text not null,
  keterangan   text,
  path         text not null,
  ukuran_byte  bigint default 0,
  jenis        text not null default 'pdf' check (jenis in ('pdf', 'gambar', 'lain')),
  published    boolean not null default true,
  diunggah_oleh uuid references public.profiles(id) on delete set null,
  dibuat_pada  timestamptz not null default now()
);

-- Indeks untuk pencarian dokumen terbit dan pengurutan waktu
create index if not exists idx_documents_published_dibuat
  on public.documents (published, dibuat_pada desc);

-- Aktifkan Row Level Security (RLS)
alter table public.documents enable row level security;

-- Semua pengurus yang masuk (authenticated) boleh membaca seluruh dokumen
drop policy if exists documents_baca on public.documents;
create policy documents_baca on public.documents
  for select to authenticated
  using (true);

-- Pengurus inti dan editor berhak menambah, mengubah, dan menghapus dokumen
drop policy if exists documents_tulis on public.documents;
create policy documents_tulis on public.documents
  for all to authenticated
  using (
    public.apakah_salah_satu(array[
      'super_admin',
      'editor',
      'ketua',
      'wakil_ketua',
      'sekretaris',
      'bendahara',
      'ketua_seksi'
    ])
  )
  with check (
    public.apakah_salah_satu(array[
      'super_admin',
      'editor',
      'ketua',
      'wakil_ketua',
      'sekretaris',
      'bendahara',
      'ketua_seksi'
    ])
  );

-- Hak akses peran pada tabel documents
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.documents to service_role;

-- ---------- 2. View Publik Dokumen ----------
-- Web publik HANYA boleh membaca dari view ini (kolom yang aman dan yang terbit)
create or replace view public.public_documents as
select
  id,
  judul,
  keterangan,
  path,
  ukuran_byte,
  jenis,
  dibuat_pada
from public.documents
where published = true;

-- Izin baca view untuk publik (anon) dan authenticated
grant select on public.public_documents to anon, authenticated;

select 'tabel documents dan view public_documents siap' as keterangan;
