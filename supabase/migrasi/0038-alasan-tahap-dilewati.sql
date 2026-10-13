-- ============================================================
-- MIGRASI 0038 — Keterangan tahap dilewati yang jelas sebabnya
--
-- MASALAH: linimasa menulis satu kalimat untuk semua kasus:
--   "Tidak ada Ketua Bidang yang perlu menyetujui tahap ini."
-- Padahal ada DUA sebab berbeda, dan kalimat itu tidak tepat untuk keduanya:
--   (a) pengusulnya sendiri Ketua Bidang bidang itu -> tidak boleh menyetujui
--       usulannya sendiri;
--   (b) kegiatan tidak punya bidang (mis. Pengurus Harian) -> memang tidak ada
--       Ketua Bidang yang bertanggung jawab.
--
-- PERBAIKAN: fungsi baru `alasan_tahap_dilewati` mengembalikan ALASANNYA dalam
-- bahasa manusia, sehingga linimasa bisa menampilkan keterangan yang tepat.
-- ============================================================

create or replace function public.alasan_tahap_dilewati(p_activity uuid, p_peran text)
returns text
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
    return null;
  end if;

  select s.nama, a.dibuat_oleh
    into v_bidang_kegiatan, v_pengusul
  from public.activities a
  left join public.sections s on s.id = a.section_id
  where a.id = p_activity;

  -- (b) Kegiatan tanpa bidang: tidak ada Ketua Bidang yang bertanggung jawab.
  if v_bidang_kegiatan is null or v_bidang_kegiatan = 'Pengurus Harian' then
    return 'Kegiatan ini tidak dilaksanakan oleh satu bidang, jadi tidak ada Ketua Bidang yang menyetujui.';
  end if;

  -- (a) Pengusulnya sendiri Ketua Bidang bidang itu.
  select exists (
    select 1 from public.officers o
    where o.profile_id = v_pengusul
      and o.bidang = v_bidang_kegiatan
      and o.jabatan = 'Ketua Bidang'
  ) into v_pengusul_ketua_bidang;

  if v_pengusul_ketua_bidang then
    return 'Yang mengusulkan adalah Ketua Bidangnya sendiri, dan setiap orang tidak dapat menyetujui usulannya sendiri.';
  end if;

  return null;
end;
$$;

comment on function public.alasan_tahap_dilewati(uuid, text) is
  'Mengembalikan alasan (dalam bahasa manusia) mengapa sebuah tahap dilewati untuk kegiatan tertentu; null bila tahap itu tidak dilewati.';

-- Periksa untuk kegiatan contoh
select 'contoh' as keterangan,
       public.alasan_tahap_dilewati('806b26aa-e707-460c-9827-5dee488ca5d5', 'ketua_seksi') as alasan;
