-- ============================================================
-- MIGRASI 0032 — Ketua Bidang hanya menyetujui kegiatan bidangnya sendiri
--
-- Masalah: tahap 1 alur perencanaan adalah "ketua_seksi". Karena ketiga Ketua
-- Bidang (Pendidikan, Ekonomi, Sosial Budaya) punya peran yang sama, SEMUANYA
-- akan bisa menyetujui kegiatan bidang apa pun. Itu tidak tepat: Ketua Bidang
-- Ekonomi tidak seharusnya menyetujui usulan Bidang Pendidikan.
--
-- Perbaikan: hanya Ketua Bidang dari bidang kegiatan itu yang boleh menilai.
-- Pengurus Harian dan Super Admin tetap bebas (mereka mengawasi semua bidang).
-- ============================================================

create or replace function public.boleh_menilai_tahap(
  p_activity uuid,
  p_peran text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_bidang_kegiatan text;
  v_bidang_saya text;
  v_pengurus_harian boolean;
begin
  -- Super Admin bebas
  if public.apakah_super() then
    return true;
  end if;

  -- Peran pengguna harus cocok dengan peran tahap
  if not public.peran_saya() && array[p_peran] then
    return false;
  end if;

  -- Tahap selain Ketua Bidang: tidak ada pembatasan bidang
  if p_peran <> 'ketua_seksi' then
    return true;
  end if;

  -- Pengurus Harian bebas (tidak terikat bidang)
  select exists (
    select 1 from public.officers o
    where o.profile_id = auth.uid() and o.bidang = 'Pengurus Harian'
  ) into v_pengurus_harian;
  if v_pengurus_harian then
    return true;
  end if;

  -- Bandingkan bidang kegiatan dengan bidang Ketua Bidang yang bersangkutan
  select s.nama into v_bidang_kegiatan
  from public.activities a
  left join public.sections s on s.id = a.section_id
  where a.id = p_activity;

  v_bidang_saya := public.bidang_saya();

  return v_bidang_kegiatan is not null
     and v_bidang_saya is not null
     and v_bidang_kegiatan = v_bidang_saya;
end;
$$;

comment on function public.boleh_menilai_tahap(uuid, text) is
  'Benar bila pengguna yang masuk boleh menilai pada tahap tertentu untuk kegiatan tertentu. Ketua Bidang hanya untuk kegiatan bidangnya sendiri.';

select 'aturan penilai per bidang siap' as hasil;
