-- ============================================================
-- PERBAIKAN: tahap_dilewati_daftar SALAH ALUR
--
-- Temuan (penyisiran alur pelaporan):
--   Linimasa menampilkan "Bendahara · Anda — Dilewati: Tahap ini tidak
--   diperlukan untuk kegiatan ini" pada tahap PELAPORAN, padahal Bendahara
--   adalah jenjang PERTAMA pelaporan (Bendahara -> Sekretaris -> Wakil -> Ketua).
--   Akibatnya laporan tidak bisa disetujui siapa pun: tahap yang seharusnya
--   menjadi giliran dilewati, sementara aksi server menolak memberi keputusan.
--
-- Akar:
--   `tahap_dilewati_daftar` hanya membaca `approval_flows` dengan nama
--   'perencanaan', lalu mengembalikan NOMOR URUT jenjang perencanaan. Nomor
--   urut itu dipakai halaman untuk menandai jenjang pada alur yang sedang
--   berjalan — jadi pada tahap pelaporan, urutan 3 (Bendahara di perencanaan)
--   ikut ditandai dilewati.
--
-- Perbaikan:
--   Fungsi menerima nama alur, dan mengembalikan nomor urut dari alur ITU.
--   Pelewatan (tahap_terlewati) tetap hanya berlaku untuk peran ketua_seksi,
--   sehingga pada alur pelaporan tidak ada jenjang yang dilewati.
-- ============================================================

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
    and public.tahap_terlewati(p_activity, s.peran);
$function$;

-- Pastikan hanya pengguna yang sudah masuk yang boleh memanggilnya.
revoke all on function public.tahap_dilewati_daftar(uuid, text) from public;
grant execute on function public.tahap_dilewati_daftar(uuid, text) to authenticated;
