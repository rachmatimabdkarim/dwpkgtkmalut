-- ============================================================
-- PERUBAHAN ALUR PERSETUJUAN KEGIATAN (perencanaan)
-- Diminta pemilik aplikasi.
--
-- LAMA:
--   Ketua Bidang -> Sekretaris -> Bendahara -> Wakil Ketua -> Ketua
--
-- BARU:
--   * Kegiatan ADA RAB   : Bendahara -> Wakil Ketua -> Ketua
--   * Kegiatan TANPA RAB : Wakil Ketua -> Ketua   (Bendahara dilewati)
--
-- Ketua Bidang dan Sekretaris TIDAK lagi menyetujui. Keduanya tetap
-- menerima notifikasi setiap tahap (diatur di sisi aplikasi, lihat
-- src/lib/notifikasi.ts).
--
-- Alur PELAPORAN tidak diubah.
-- ============================================================

-- 1. Hapus jenjang Ketua Bidang & Sekretaris dari alur perencanaan,
--    lalu susun ulang urutannya.
delete from public.approval_steps
where flow_id = (select id from public.approval_flows where nama = 'perencanaan')
  and peran in ('ketua_seksi', 'sekretaris');

-- Nomor urut punya aturan unik (satu alur tidak boleh punya nomor kembar),
-- jadi dinomori ulang lewat nilai sementara dulu, baru nomor akhir.
update public.approval_steps
set urutan = urutan + 100
where flow_id = (select id from public.approval_flows where nama = 'perencanaan');

update public.approval_steps s
set urutan = v.urutan_baru
from (
  values
    ('bendahara', 1),
    ('wakil_ketua', 2),
    ('ketua', 3)
) as v(peran, urutan_baru)
where s.flow_id = (select id from public.approval_flows where nama = 'perencanaan')
  and s.peran = v.peran;

-- 2. Tahap Bendahara DILEWATI bila kegiatan tidak punya RAB.
--    Ini menggantikan aturan lama "tanpa bidang" / "pengusul Ketua Bidang"
--    yang tidak lagi dipakai pada alur perencanaan.
create or replace function public.tahap_terlewati(p_activity uuid, p_peran text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ada_rab boolean;
begin
  -- Hanya tahap Bendahara yang punya syarat isi: harus ada RAB.
  if p_peran = 'bendahara' then
    select exists (
      select 1 from public.budget_items b where b.activity_id = p_activity
    ) into v_ada_rab;
    return not v_ada_rab;
  end if;

  return false;
end;
$function$;

create or replace function public.alasan_tahap_dilewati(p_activity uuid, p_peran text)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ada_rab boolean;
begin
  if p_peran = 'bendahara' then
    select exists (
      select 1 from public.budget_items b where b.activity_id = p_activity
    ) into v_ada_rab;
    if not v_ada_rab then
      return 'Kegiatan ini tidak memiliki rincian anggaran (RAB), jadi tidak ada yang perlu diperiksa Bendahara.';
    end if;
  end if;

  return null;
end;
$function$;

-- 3. Susunan jenjang perencanaan yang berlaku, untuk dipakai aplikasi.
create or replace function public.jenjang_perencanaan(p_activity uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(s.peran order by s.urutan), '{}'::text[])
  from public.approval_steps s
  join public.approval_flows f on f.id = s.flow_id
  where f.nama = 'perencanaan'
    and not public.tahap_terlewati(p_activity, s.peran);
$function$;

grant execute on function public.jenjang_perencanaan(uuid) to authenticated;

-- 4. Tampilkan hasilnya
select f.nama as alur, s.urutan, s.peran
from public.approval_steps s
join public.approval_flows f on f.id = s.flow_id
order by f.nama, s.urutan;
