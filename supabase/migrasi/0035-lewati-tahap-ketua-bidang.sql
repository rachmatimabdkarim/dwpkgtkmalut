-- ============================================================
-- MIGRASI 0035 — Tahap Ketua Bidang dilewati otomatis bila tidak relevan
--
-- MASALAH: kegiatan yang diusulkan Ketua Bidang sendiri tetap menunggu tahap
-- Ketua Bidang di urutan 1. Karena pengusul tidak boleh menyetujui usulannya
-- sendiri, tahap itu tidak ada yang bisa mengisi -> kegiatan menggantung.
-- Kegiatan Bidang tanpa Ketua Bidang juga bisa menggantung karena alasan sama.
--
-- PERBAIKAN: fungsi penentu giliran penyetuju `berikut_untuk` menandai tahap
-- Ketua Bidang sebagai TERLEWATI (dianggap sudah beres) bila:
--   1. kegiatan tidak punya bidang (mis. kegiatan Pengurus Harian), ATAU
--   2. pengusul kegiatan itu sendiri termasuk Ketua Bidang pada bidang tersebut.
--
-- Dengan begitu giliran langsung berpindah ke Sekretaris.
-- ============================================================

create or replace function public.tahap_terlewati(p_activity uuid, p_peran text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_bidang_kegiatan text;
  v_pengusul uuid;
  v_pengusul_ketua_bidang boolean;
begin
  -- Hanya tahap Ketua Bidang yang punya aturan pelewatan.
  if p_peran <> 'ketua_seksi' then
    return false;
  end if;

  select s.nama, a.dibuat_oleh
    into v_bidang_kegiatan, v_pengusul
  from public.activities a
  left join public.sections s on s.id = a.section_id
  where a.id = p_activity;

  -- 1. Kegiatan tanpa bidang (mis. Pengurus Harian): tidak ada Ketua Bidang
  --    yang bertanggung jawab, jadi tahap ini dilewati.
  if v_bidang_kegiatan is null or v_bidang_kegiatan = 'Pengurus Harian' then
    return true;
  end if;

  -- 2. Pengusulnya sendiri Ketua Bidang pada bidang itu: tidak boleh
  --    menyetujui usulannya sendiri, jadi tahap ini dilewati.
  select exists (
    select 1 from public.officers o
    where o.profile_id = v_pengusul
      and o.bidang = v_bidang_kegiatan
      and o.jabatan = 'Ketua Bidang'
  ) into v_pengusul_ketua_bidang;

  return v_pengusul_ketua_bidang;
end;
$$;

comment on function public.tahap_terlewati(uuid, text) is
  'Benar bila tahap tersebut otomatis dilewati untuk kegiatan itu: tahap Ketua Bidang dilewati pada kegiatan tanpa bidang, atau bila pengusulnya sendiri Ketua Bidang bidang tersebut.';

select 'aturan pelewatan tahap siap' as hasil;
