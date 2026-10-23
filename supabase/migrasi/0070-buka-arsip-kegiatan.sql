-- ============================================================
-- MEMBUKA KEMBALI KEGIATAN YANG SUDAH DIARSIPKAN
--
-- ATURAN PEMILIK: "Arsip bisa dibuka kembali."
--
-- Ketentuan yang dijaga:
--  * Hanya Super Admin atau pengusul kegiatan itu yang boleh membuka.
--  * WAJIB menuliskan alasan — tersimpan di riwayat kegiatan.
--  * Status kembali ke 'laporan_disetujui' (keadaan sebelum dikunci),
--    sehingga kegiatan dapat dilihat dan diperbaiki bila perlu.
-- ============================================================

create or replace function public.buka_arsip_kegiatan(
  p_activity uuid,
  p_alasan text
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid := auth.uid();
  v_pemilik uuid;
  v_status text;
  v_nama text;
  v_alasan text := btrim(coalesce(p_alasan, ''));
begin
  if v_id is null then
    raise exception 'Sesi Anda sudah berakhir.';
  end if;

  select dibuat_oleh, status into v_pemilik, v_status
  from public.activities where id = p_activity;

  if v_status is null then
    raise exception 'Kegiatan tidak ditemukan.';
  end if;

  -- Hanya Super Admin atau pengusul kegiatan.
  if not (v_pemilik = v_id or public.apakah_super()) then
    raise exception 'Hanya pengusul kegiatan ini atau Super Admin yang dapat membuka arsip.';
  end if;

  if v_status <> 'arsip' then
    raise exception 'Kegiatan ini tidak sedang diarsipkan (status: %).', v_status;
  end if;

  -- Alasan wajib: supaya jelas mengapa arsip dibuka.
  if length(v_alasan) < 10 then
    raise exception 'Alasan wajib ditulis minimal 10 huruf.';
  end if;

  update public.activities
  set status = 'laporan_disetujui'
  where id = p_activity;

  select nama into v_nama from public.profiles where id = v_id;

  insert into public.activity_logs (activity_id, aksi, keterangan, pelaku_id, pelaku_nama)
  values (
    p_activity,
    'buka_arsip',
    'Arsip kegiatan dibuka kembali. Alasan: ' || v_alasan,
    v_id,
    coalesce(v_nama, 'Pengguna')
  );

  return 'laporan_disetujui';
end;
$function$;

grant execute on function public.buka_arsip_kegiatan(uuid, text) to authenticated;

select 'fungsi siap' as status;
