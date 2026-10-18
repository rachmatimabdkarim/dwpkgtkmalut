-- PERBAIKAN: aturan "Bendahara dilewati bila tanpa RAB" hanya untuk PERENCANAAN.
--
-- Sebelumnya fungsi tahap_terlewati/ alasan_tahap_dilewati tidak membedakan
-- alur, sehingga pada PELAPORAN pun Bendahara ikut dilewati ketika kegiatan
-- tidak punya RAB. Akibatnya laporan tertahan: Bendahara tidak bisa menyetujui
-- padahal pada alur pelaporan dialah jenjang pertama.
--
-- Aturan pemilik hanya menyebut persetujuan KEGIATAN (perencanaan). Alur
-- pelaporan tetap: Bendahara -> Sekretaris -> Wakil Ketua -> Ketua.
--
-- Fungsi kini menerima p_alur (default 'perencanaan' agar pemanggil lama aman).

create or replace function public.tahap_terlewati(
  p_activity uuid,
  p_peran text,
  p_alur text default 'perencanaan'
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ada_rab boolean;
begin
  -- Aturan RAB hanya berlaku pada alur PERENCANAAN.
  if p_alur <> 'perencanaan' then
    return false;
  end if;

  if p_peran = 'bendahara' then
    select exists (
      select 1 from public.budget_items b where b.activity_id = p_activity
    ) into v_ada_rab;
    return not v_ada_rab;
  end if;

  return false;
end;
$function$;

create or replace function public.alasan_tahap_dilewati(
  p_activity uuid,
  p_peran text,
  p_alur text default 'perencanaan'
)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ada_rab boolean;
begin
  if p_alur <> 'perencanaan' then
    return null;
  end if;

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

-- Daftar tahap yang dilewati juga harus menghormati alur.
create or replace function public.tahap_dilewati_daftar(
  p_activity uuid,
  p_alur text default 'perencanaan'
)
returns integer[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(s.urutan order by s.urutan), '{}'::int[])
  from public.approval_steps s
  join public.approval_flows f on f.id = s.flow_id
  where f.nama = p_alur
    and public.tahap_terlewati(p_activity, s.peran, p_alur);
$function$;

grant execute on function public.tahap_terlewati(uuid, text, text) to authenticated;
grant execute on function public.alasan_tahap_dilewati(uuid, text, text) to authenticated;
grant execute on function public.tahap_dilewati_daftar(uuid, text) to authenticated;

-- Periksa hasilnya untuk kegiatan uji
select s.urutan, s.peran,
       public.tahap_terlewati(a.id, s.peran, 'pelaporan') as dilewati_pelaporan,
       public.tahap_terlewati(a.id, s.peran, 'perencanaan') as dilewati_perencanaan
from public.approval_steps s
join public.approval_flows f on f.id = s.flow_id
cross join (select id from public.activities where judul = 'Uji Alur Penuh Baru') a
where f.nama = 'pelaporan'
order by s.urutan;
