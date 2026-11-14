-- ============================================================
-- FOTO PROFIL PENGURUS
--
-- Permintaan pemilik: di menu Pengurus dapat mengunggah foto profil.
-- Foto itu otomatis muncul di beranda web dan di struktur organisasi
-- (halaman Profil publik).
--
-- Rancangan:
--  • Foto disimpan sebagai PATH di penyimpanan (bukan URL penuh), sama
--    seperti logo. Dengan begitu alamatnya bisa berubah tanpa menyentuh data.
--  • Berkas disimpan di bucket 'publik' pada folder pengurus/.
--  • Web publik hanya boleh membaca lewat view public_officers, jadi
--    kolom foto_path WAJIB ikut di view — kalau tidak, foto tidak akan
--    pernah tampil walau unggahannya berhasil (kegagalan senyap).
--  • Setiap unggahan tetap terdaftar di tabel attachments (aturan aplikasi).
-- ============================================================

alter table public.officers
  add column if not exists foto_path text;

comment on column public.officers.foto_path is
  'Path berkas foto profil di penyimpanan Supabase (bucket publik). Kosong = tanpa foto, tampil inisial.';

-- View publik dibangun ulang dengan penambahan foto_path.
-- Dibuat ulang (bukan CREATE OR REPLACE) karena urutan kolom berubah.
drop view if exists public.public_officers cascade;

create view public.public_officers as
select
  o.id,
  o.nama,
  o.bidang,
  o.jabatan,
  o.email,
  o.urutan,
  o.foto_path
from public.officers o
where o.jabatan is not null;

-- Hanya data untuk ditampilkan; publik tidak boleh menulis.
revoke all on public.public_officers from anon, authenticated;
grant select on public.public_officers to anon, authenticated, service_role;

-- Pastikan service_role bisa menulis kolom baru pada tabel dasarnya.
grant select, insert, update, delete on public.officers to service_role;

select 'foto profil pengurus siap' as status;
