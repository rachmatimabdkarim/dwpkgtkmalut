-- ============================================================
-- PERUBAHAN ALUR PERSETUJUAN PELAPORAN
--
-- ATURAN PEMILIK (baru):
--   Persetujuan pelaporan HANYA: Wakil Ketua -> Ketua.
--   Bendahara & Sekretaris TIDAK menyetujui, hanya menerima NOTIFIKASI progres.
--
-- Catatan: perencanaan TIDAK berubah (Bendahara bila ada RAB -> Wakil Ketua -> Ketua).
-- ============================================================

-- 1. Hapus dua langkah lama (bendahara & sekretaris) dari alur pelaporan.
delete from public.approval_steps
where flow_id = '494c818b-9093-41a4-8c8e-234274e9fbe5'
  and peran in ('bendahara', 'sekretaris');

-- 2. Susun ulang nomor urut: Wakil Ketua = 1, Ketua = 2.
--    Dilakukan dua langkah karena ada batasan keunikan (flow_id, urutan).
update public.approval_steps
set urutan = 90
where flow_id = '494c818b-9093-41a4-8c8e-234274e9fbe5' and peran = 'wakil_ketua';

update public.approval_steps
set urutan = 91
where flow_id = '494c818b-9093-41a4-8c8e-234274e9fbe5' and peran = 'ketua';

update public.approval_steps
set urutan = 1
where flow_id = '494c818b-9093-41a4-8c8e-234274e9fbe5' and peran = 'wakil_ketua';

update public.approval_steps
set urutan = 2
where flow_id = '494c818b-9093-41a4-8c8e-234274e9fbe5' and peran = 'ketua';

-- 3. Tampilkan hasil.
select f.nama as alur, s.urutan, s.peran
from public.approval_steps s
join public.approval_flows f on f.id = s.flow_id
order by f.nama, s.urutan;
