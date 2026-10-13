-- ============================================================
-- MIGRASI 0031 — Persetujuan Ketua Bidang di tahap 1 (paling awal)
--
-- Urutan baru alur PERENCANAAN:
--   1. ketua_seksi  (Ketua Bidang)   <-- BARU
--   2. sekretaris
--   3. bendahara
--   4. wakil_ketua
--   5. ketua
--
-- Catatan teknis: tabel punya batasan unik (flow_id, urutan), jadi penggeseran
-- dilakukan dengan menaikkan urutan dari yang TERBESAR ke terkecil — kalau
-- dari terkecil, urutan yang sudah ada akan bentrok.
-- ============================================================

do $$
declare
  v_flow uuid;
begin
  select id into v_flow from public.approval_flows where nama = 'perencanaan';

  -- 1. Geser urutan lama 4 -> 5, 3 -> 4, 2 -> 3, 1 -> 2 (dari besar ke kecil)
  update public.approval_steps set urutan = 5 where flow_id = v_flow and urutan = 4;
  update public.approval_steps set urutan = 4 where flow_id = v_flow and urutan = 3;
  update public.approval_steps set urutan = 3 where flow_id = v_flow and urutan = 2;
  update public.approval_steps set urutan = 2 where flow_id = v_flow and urutan = 1;

  -- 2. Sisipkan Ketua Bidang di urutan 1
  if not exists (
    select 1 from public.approval_steps
    where flow_id = v_flow and peran = 'ketua_seksi'
  ) then
    insert into public.approval_steps (flow_id, urutan, peran, wajib)
    values (v_flow, 1, 'ketua_seksi', true);
  end if;
end $$;

select f.nama as alur, s.urutan, s.peran, s.wajib
from public.approval_steps s
join public.approval_flows f on f.id = s.flow_id
order by f.nama, s.urutan;
