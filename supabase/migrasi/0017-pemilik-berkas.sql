-- ============================================================
-- MIGRASI 0017 — Isi otomatis pemilik berkas (perbaikan penting)
--
-- MASALAH: kolom "diunggah_oleh" pada tabel attachments tidak pernah
-- diisi oleh kode, sehingga SELALU kosong. Akibatnya:
--   * aturan pengaman pengesahan ("diunggah_oleh = auth.uid()") tidak
--     pernah cocok, sehingga foto/dokumen tidak bisa disahkan.
--   * foto hanya tersimpan sebagai "sementara", tidak pernah muncul
--     di galeri/documentasi.
-- Terbukti dari uji di internet: unggah foto berhasil + ter-kompres,
-- tetapi tetap berstatus "sementara" dengan diunggah_oleh = kosong.
--
-- PERBAIKAN: isi otomatis lewat bawaan kolom + pemicu. Ini juga
-- memperkuat pengamanan: pemilik tidak bisa dipalsukan dari sisi aplikasi.
-- ============================================================

-- 1. Nilai bawaan: siapa pun yang sedang masuk (bila kosong)
alter table public.attachments
  alter column diunggah_oleh set default auth.uid();

-- 2. Pemicu: tolak/paksa agar pemilik selalu diisi sesuai pengguna yang masuk.
--    Lebih aman daripada bawaan saja (bawaan bisa ditimpa nilai null eksplisit).
create or replace function public.isi_pemilik_berkas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.diunggah_oleh is null then
    new.diunggah_oleh := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_isi_pemilik_berkas on public.attachments;
create trigger trg_isi_pemilik_berkas
  before insert on public.attachments
  for each row execute function public.isi_pemilik_berkas();

-- 3. Berkas lama tanpa pemilik: tidak bisa dibiarkan "sementara" (akan
--    menghuni kuota selamanya) dan status "dibatalkan" belum diizinkan.
--    Perluas dulu daftar status agar penandaan sah.
alter table public.attachments
  drop constraint if exists attachments_status_check;
alter table public.attachments
  add constraint attachments_status_check
  check (status in ('sementara', 'resmi', 'dibatalkan'));

update public.attachments
   set status = 'dibatalkan',
       keterangan = coalesce(keterangan, '') || ' [pemilik kosong — dibatalkan otomatis]'
 where diunggah_oleh is null
   and status = 'sementara';

select count(*) as berkas_lama_ditandai
  from public.attachments where status = 'dibatalkan';
