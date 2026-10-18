-- PERBAIKAN: jenjang_perencanaan gagal setelah tahap_terlewati menerima p_alur.
--
-- Fungsi lama memanggil tahap_terlewati(p_activity, s.peran) — dua argumen.
-- Setelah parameter ketiga (p_alur) ditambahkan, PostgreSQL tidak lagi dapat
-- memilih fungsi yang tepat dan mengembalikan galat. Sekarang dipanggil dengan
-- tiga argumen secara eksplisit.
--
-- Ini bukan sekadar kerapian: fungsi ini dipakai untuk menampilkan urutan
-- persetujuan yang berlaku, dan bila gagal, layar kehilangan informasi jenjang.

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
    and not public.tahap_terlewati(p_activity, s.peran, 'perencanaan');
$function$;

grant execute on function public.jenjang_perencanaan(uuid) to authenticated;

-- Periksa pada kegiatan berRAB dan kegiatan tanpa RAB
select a.kode,
       (select count(*) from public.budget_items b where b.activity_id = a.id) as rab,
       array_to_string(public.jenjang_perencanaan(a.id), ' -> ') as alur
from public.activities a
order by a.kode;
