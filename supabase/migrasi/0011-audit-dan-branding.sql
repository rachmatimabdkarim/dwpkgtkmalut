-- ============================================================
-- MIGRASI 0011 — Catatan aktivitas (audit) + dukungan branding
-- Dipakai oleh halaman Pengaturan → Tampilan untuk mencatat
-- setiap perubahan warna, logo, favicon, dan identitas.
-- Catatan bersifat TAMBAH-SAJA: tidak dapat diubah atau dihapus.
-- ============================================================

create table if not exists public.audit_logs (
  id          bigserial primary key,
  jenis       text not null,             -- contoh: 'tampilan', 'peran', 'berkas'
  aksi        text not null,             -- contoh: 'ubah_warna', 'ganti_logo'
  keterangan  text,
  nilai_lama  jsonb,
  nilai_baru  jsonb,
  pelaku_id   uuid,
  pelaku_nama text,
  waktu       timestamptz not null default now()
);

create index if not exists idx_audit_waktu on public.audit_logs(waktu desc);
create index if not exists idx_audit_jenis on public.audit_logs(jenis, waktu desc);

alter table public.audit_logs enable row level security;

-- Dibaca pengurus inti; tidak ada izin ubah/hapus untuk siapa pun.
drop policy if exists audit_baca on public.audit_logs;
create policy audit_baca on public.audit_logs for select to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

drop policy if exists audit_tambah on public.audit_logs;
create policy audit_tambah on public.audit_logs for insert to authenticated
  with check (public.apakah_super());

grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

-- Catatan aktivitas tidak boleh diubah atau dihapus
create or replace function public.audit_hanya_tambah()
returns trigger language plpgsql as $$
begin
  raise exception 'Catatan aktivitas bersifat tambah-saja.';
end;
$$;

drop trigger if exists trg_audit_ubah on public.audit_logs;
create trigger trg_audit_ubah before update or delete on public.audit_logs
  for each row execute function public.audit_hanya_tambah();

-- ---------- Wadah penyimpanan: folder branding ----------
-- Folder branding/ dipakai untuk logo dan ikon situs (satu sumber untuk semua tempat).
drop policy if exists dwp_branding_baca on storage.objects;
create policy dwp_branding_baca on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'publik' and (storage.foldername(name))[1] = 'branding');

drop policy if exists dwp_branding_tulis on storage.objects;
create policy dwp_branding_tulis on storage.objects for insert
  to authenticated
  with check (bucket_id = 'publik' and (storage.foldername(name))[1] = 'branding');

drop policy if exists dwp_branding_ubah on storage.objects;
create policy dwp_branding_ubah on storage.objects for update
  to authenticated
  using (bucket_id = 'publik' and (storage.foldername(name))[1] = 'branding')
  with check (bucket_id = 'publik' and (storage.foldername(name))[1] = 'branding');

select 'catatan aktivitas siap' as keterangan;
