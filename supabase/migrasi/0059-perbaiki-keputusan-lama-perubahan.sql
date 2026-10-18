-- ============================================================
-- PERBAIKAN: keputusan lama tidak bisa dibersihkan saat perubahan diajukan.
--
-- Gejala: setelah kegiatan disetujui penuh, pengusul mengajukan perubahan.
-- Status kembali "diajukan", tetapi keputusan LAMA masih tersimpan. Akibatnya
-- sistem menganggap semua jenjang sudah setuju, sehingga tidak ada tombol
-- persetujuan untuk siapa pun — kegiatan macet selamanya.
--
-- Akar: tabel approvals hanya punya izin SELECT dan INSERT. Penghapusan
-- keputusan lama ditolak oleh aturan keamanan, dan galatnya tidak
-- ditampilkan sehingga tidak ada yang menyadarinya.
--
-- Perbaikan:
--   1. Penghapusan keputusan dilakukan lewat fungsi berpemilik hak yang
--      memeriksa sendiri siapa yang berhak (pengusul kegiatan / Super Admin).
--   2. Beri juga kebijakan DELETE yang setara, agar jalur lain konsisten.
-- ============================================================

-- ---------- 1. Fungsi resmi: bersihkan keputusan saat perubahan diajukan ----------
create or replace function public.reset_keputusan_perubahan(p_activity uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pengusul uuid;
  v_status   text;
  v_hapus    int;
begin
  select dibuat_oleh, status into v_pengusul, v_status
  from public.activities where id = p_activity;

  if v_pengusul is null then
    return json_build_object('ok', false, 'galat', 'Kegiatan tidak ditemukan.');
  end if;

  -- Hanya pengusul kegiatan atau Super Admin.
  if not (v_pengusul = auth.uid() or public.apakah_super()) then
    return json_build_object('ok', false, 'galat', 'Hanya pengusul kegiatan yang dapat mengajukan perubahan.');
  end if;

  delete from public.approvals where activity_id = p_activity;
  get diagnostics v_hapus = row_count;

  return json_build_object('ok', true, 'dihapus', v_hapus);
end;
$function$;

grant execute on function public.reset_keputusan_perubahan(uuid) to authenticated;

-- ---------- 2. Kebijakan DELETE yang setara ----------
drop policy if exists approvals_hapus on public.approvals;

create policy approvals_hapus on public.approvals
  for delete
  using (
    exists (
      select 1 from public.activities a
      where a.id = approvals.activity_id
        and (a.dibuat_oleh = auth.uid() or public.apakah_super())
    )
  );

-- ---------- 3. Rapikan kegiatan yang sudah macet ----------
-- Kegiatan berstatus 'diajukan' namun SEMUA keputusan lamanya adalah 'setuju'
-- dan belum ada perubahan yang benar-benar dinilai: keputusan lama dibersihkan
-- supaya alur persetujuan berjalan dari awal.
do $$
declare
  r record;
  v_jumlah_setuju int;
  v_jumlah_total int;
begin
  for r in
    select a.id, a.kode, a.judul
    from public.activities a
    where a.status = 'diajukan'
      and exists (
        select 1 from public.activity_logs l
        where l.activity_id = a.id and l.aksi = 'perubahan_diajukan'
      )
  loop
    select count(*) filter (where keputusan = 'setuju'), count(*)
      into v_jumlah_setuju, v_jumlah_total
    from public.approvals
    where activity_id = r.id and tahap = 'perencanaan';

    -- Semua keputusan lama "setuju" = sisa dari putaran sebelumnya.
    if v_jumlah_total > 0 and v_jumlah_setuju = v_jumlah_total then
      delete from public.approvals where activity_id = r.id;
      raise notice 'Keputusan lama dibersihkan untuk % (%)', r.kode, r.judul;
    end if;
  end loop;
end $$;

-- ---------- 4. Periksa hasilnya ----------
select a.kode, a.judul, a.status,
       (select count(*) from public.approvals ap where ap.activity_id = a.id) as jumlah_keputusan
from public.activities a
order by a.kode;
