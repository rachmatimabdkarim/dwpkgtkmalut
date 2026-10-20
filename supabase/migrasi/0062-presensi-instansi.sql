-- ============================================================
-- PRESENSI: tambah kolom INSTANSI
--
-- Aturan pemilik: isian presensi minimal memuat NAMA dan INSTANSI.
-- Peserta luar (tamu) wajib menyebut instansi/asalnya; pengurus yang sudah
-- dikenali sistem otomatis memakai instansi lembaga.
-- ============================================================

alter table public.attendances
  add column if not exists instansi text;

comment on column public.attendances.instansi is
  'Asal instansi peserta. Wajib untuk peserta luar (tamu); pengurus otomatis terisi.';

-- Bersihkan spasi berlebih pada data lama (bila ada).
update public.attendances
  set instansi = nullif(btrim(instansi), '')
  where instansi is not null;

select count(*) as peserta from public.attendances;
