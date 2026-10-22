-- ============================================================
-- PERBAIKAN: penanggung jawab & Ketua Seksi boleh mengubah visibilitas foto
--
-- TEMUAN PEMILIK: "Klik pilih foto tapi tidak ter-select."
--
-- SEBAB: kebijakan UPDATE tabel attachments hanya mengizinkan:
--   - Super Admin
--   - PENGUNGGAH foto itu sendiri
--   - ketua / wakil_ketua / sekretaris
--
-- Penanggung jawab kegiatan yang BUKAN pengunggah tidak termasuk, sehingga
-- perubahan ditolak. Supabase tidak mengembalikan galat untuk penolakan RLS
-- seperti ini, jadi aplikasi menganggap berhasil dan kotak centang tidak berubah.
--
-- ATURAN PEMILIK yang harus berlaku:
--   foto laporan & web publik ditentukan oleh pengelola dokumentasi yang
--   ditugaskan, penanggung jawab kegiatan, Ketua Seksi, atau pengurus inti.
-- ============================================================

drop policy if exists attachments_ubah on public.attachments;

create policy attachments_ubah on public.attachments
  for update
  using (
    apakah_super()
    -- Pengunggah tetap boleh mengubah berkasnya sendiri.
    or diunggah_oleh = auth.uid()
    -- Pengurus inti.
    or apakah_salah_satu(
         array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
       )
    -- Penanggung jawab kegiatan yang memiliki foto tersebut.
    or exists (
      select 1 from public.activities a
      where a.id = attachments.entitas_id
        and a.penanggung_jawab = auth.uid()
    )
  )
  with check (
    apakah_super()
    or diunggah_oleh = auth.uid()
    or apakah_salah_satu(
         array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
       )
    or exists (
      select 1 from public.activities a
      where a.id = attachments.entitas_id
        and a.penanggung_jawab = auth.uid()
    )
  );

select policyname, with_check is not null as punya_with_check
from pg_policies where tablename = 'attachments' and cmd = 'UPDATE';
