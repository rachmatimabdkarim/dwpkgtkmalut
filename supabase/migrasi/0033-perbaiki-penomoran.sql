-- ============================================================
-- MIGRASI 0033 — Perbaiki penomoran kegiatan (penyebab galat simpan)
--
-- MASALAH: saat menyimpan kegiatan baru muncul galat
--   "duplicate key value violates unique constraint activities_kode_key"
--
-- PENYEBAB: nomor kegiatan diambil dari penghitung otomatis
-- (seq_kegiatan_tahun). Penghitung itu pernah mundur / tidak ikut naik saat
-- ada kegiatan yang dibuat dengan nomor tetap (mis. lewat perbaikan data),
-- sehingga menghasilkan nomor yang sudah terpakai.
--
-- PERBAIKAN: penomoran tidak lagi memakai penghitung. Setiap kali dipanggil,
-- nomor dihitung dari nomor TERBESAR yang sudah terpakai untuk tahun itu.
-- Dengan begitu nomor selalu lanjut dan tidak mungkin bentrok, walau ada
-- kegiatan yang dihapus atau dibuat dengan nomor tetap.
-- ============================================================

create or replace function public.nomor_kegiatan()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  thn text := to_char(now(), 'YYYY');
  terbesar int;
  n int;
begin
  -- Ambil angka terbesar yang sudah terpakai pada tahun ini.
  select coalesce(max(nullif(regexp_replace(kode, '^DWP-\d{4}-', ''), '')::int), 0)
    into terbesar
  from public.activities
  where kode like 'DWP-' || thn || '-%'
    and regexp_replace(kode, '^DWP-\d{4}-', '') ~ '^\d+$';

  n := coalesce(terbesar, 0) + 1;

  -- Kalau (karena satu dan lain hal) nomor itu masih terpakai, tambah terus
  -- sampai dapat nomor yang bebas.
  while exists (
    select 1 from public.activities
    where kode = 'DWP-' || thn || '-' || lpad(n::text, 3, '0')
  ) loop
    n := n + 1;
  end loop;

  return 'DWP-' || thn || '-' || lpad(n::text, 3, '0');
end;
$function$;

comment on function public.nomor_kegiatan() is
  'Membuat nomor kegiatan berikutnya (DWP-TAHUN-NNN) dengan menghitung dari nomor terbesar yang sudah terpakai, supaya tidak pernah bentrok.';

-- Periksa
select 'nomor berikutnya' as keterangan, public.nomor_kegiatan() as kode_next;
