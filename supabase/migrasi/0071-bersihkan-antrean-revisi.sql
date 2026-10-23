-- ============================================================
-- PEMBERSIHAN ANTREAN SETELAH REVISI / PENOLAKAN
--
-- TEMUAN PEMILIK: setelah Wakil Ketua menekan "Minta Revisi", pengusul
-- tidak bisa mengedit dan tidak bisa mengajukan ulang.
--
-- SEBAB: keputusan "revisi" tetap tersimpan di tabel approvals. Halaman
-- menganggap laporan masih diperiksa, sehingga form terkunci. Aplikasi mencoba
-- menghapusnya, TETAPI kebijakan keamanan approvals_hapus hanya mengizinkan
-- pengusul atau Super Admin — Wakil Ketua tidak, dan penolakan itu tidak
-- menghasilkan galat.
--
-- PERBAIKAN: sediakan fungsi berpemilik hak yang memeriksa sendiri siapa yang
-- berhak, lalu membersihkan antrean tahap tersebut. Dipakai setelah keputusan
-- revisi/tolak tersimpan.
-- ============================================================

create or replace function public.bersihkan_antrean_setelah_keputusan(
  p_activity uuid,
  p_tahap text
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid := auth.uid();
  v_penyetuju boolean;
  v_pengusul boolean;
  v_jumlah integer;
begin
  if v_id is null then
    raise exception 'Sesi Anda sudah berakhir.';
  end if;

  -- Yang boleh membersihkan: penyetuju pada alur tersebut (pengurus inti),
  -- pengusul kegiatan, atau Super Admin.
  v_penyetuju :=
    public.apakah_super()
    or public.apakah_salah_satu(
         array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
       );

  select (dibuat_oleh = v_id) into v_pengusul
  from public.activities where id = p_activity;

  if not (v_penyetuju or coalesce(v_pengusul, false)) then
    raise exception 'Anda tidak berhak membersihkan antrean persetujuan kegiatan ini.';
  end if;

  delete from public.approvals
  where activity_id = p_activity and tahap = p_tahap;

  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$function$;

grant execute on function public.bersihkan_antrean_setelah_keputusan(uuid, text) to authenticated;

select 'fungsi siap' as status;
