-- ============================================================
-- PERBAIKAN: keputusan lama tidak terhapus saat kegiatan revisi diajukan ulang.
--
-- Temuan: setelah revisi dan diajukan ulang, keputusan lama MASIH ADA
-- (sekretaris:setuju, bendahara:revisi). Pemilik memutuskan perubahan data
-- wajib disetujui ulang oleh SELURUH jenjang dari awal — bukan melanjutkan
-- persetujuan yang diberikan atas data yang sudah berubah.
--
-- Akar: tabel `approvals` hanya punya izin SELECT dan INSERT. Tidak ada izin
-- DELETE, sehingga `delete` dari aplikasi DITOLAK — dan PostgREST menjawab
-- sukses tanpa menghapus satu baris pun (gagal senyap).
--
-- Perbaikan: fungsi berpemilik hak yang memeriksa sendiri siapa pemanggilnya
-- dan status kegiatannya, lalu mengosongkan keputusan untuk kegiatan itu.
-- ============================================================

create or replace function public.reset_persetujuan_kegiatan(p_activity uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid := auth.uid();
  v_pemilik uuid;
  v_status text;
  v_jumlah integer;
begin
  if v_id is null then
    raise exception 'Sesi Anda sudah berakhir.';
  end if;

  select dibuat_oleh, status into v_pemilik, v_status
  from public.activities where id = p_activity;

  if v_pemilik is null then
    raise exception 'Kegiatan tidak ditemukan.';
  end if;

  -- Hanya pengusul (atau super admin) yang boleh mengajukan ulang.
  if not (v_pemilik = v_id or public.apakah_super()) then
    raise exception 'Hanya pengusul kegiatan ini yang dapat mengajukan ulang.';
  end if;

  -- Hanya saat kegiatan berstatus revisi/ditolak — bukan saat masih berjalan.
  if v_status not in ('revisi', 'ditolak') then
    raise exception 'Kegiatan berstatus % tidak dapat diajukan ulang.', v_status;
  end if;

  delete from public.approvals where activity_id = p_activity;
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$function$;

revoke all on function public.reset_persetujuan_kegiatan(uuid) from public;
grant execute on function public.reset_persetujuan_kegiatan(uuid) to authenticated;
