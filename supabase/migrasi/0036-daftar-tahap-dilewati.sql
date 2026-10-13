-- ============================================================
-- Fungsi bantu: daftar urutan tahap yang otomatis dilewati
-- untuk sebuah kegiatan pada alur perencanaan.
--
-- Dipakai halaman kegiatan agar tahu giliran yang sebenarnya, bukan yang
-- menggantung karena tidak ada penyetujunya.
-- ============================================================

create or replace function public.tahap_dilewati_daftar(p_activity uuid)
returns int[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(array_agg(s.urutan order by s.urutan), '{}'::int[])
  from public.approval_steps s
  join public.approval_flows f on f.id = s.flow_id
  where f.nama = 'perencanaan'
    and public.tahap_terlewati(p_activity, s.peran);
$$;

comment on function public.tahap_dilewati_daftar(uuid) is
  'Daftar urutan tahap yang otomatis dilewati pada alur perencanaan untuk kegiatan tertentu.';

select 'daftar tahap dilewati siap' as hasil,
       public.tahap_dilewati_daftar('806b26aa-e707-460c-9827-5dee488ca5d5') as contoh_urutan;
