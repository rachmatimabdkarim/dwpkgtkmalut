-- ============================================================
-- PERBAIKAN: Ketua Panitia boleh menandai kegiatan selesai
--
-- TEMUAN PEMILIK: "Sudah tandai selesai kegiatan tapi tidak ada reaksi."
-- Riwayat mencatat "Kegiatan selesai dilaksanakan", tetapi status tetap
-- 'berjalan'.
--
-- SEBAB: kebijakan keamanan (RLS) tabel activities hanya mengizinkan pengurus
-- inti (ketua, wakil, sekretaris, bendahara, ketua_seksi) mengubah baris.
-- Ketua Panitia kegiatan bukan pengurus inti, sehingga UPDATE-nya tidak
-- mengenai baris mana pun — dan Supabase tidak mengembalikan galat, sehingga
-- aplikasi menganggap berhasil.
--
-- ATURAN PEMILIK yang harus berlaku:
--   "Tandai Selesai" boleh oleh PENANGGUNG JAWAB, KETUA PANITIA, dan Super Admin.
--
-- Perbaikan: tambahkan jalur khusus — Ketua Panitia pada kegiatan tersebut
-- boleh mengubah kegiatan itu, TETAPI hanya dari status 'berjalan' ke
-- 'selesai'. Tidak lebih.
-- ============================================================

-- Fungsi bantu: apakah pengguna adalah Ketua Panitia kegiatan ini?
create or replace function public.apakah_ketua_panitia(p_activity uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.committees c
    where c.activity_id = p_activity
      and c.profile_id = auth.uid()
      and c.peran = 'ketua_panitia'
  );
$function$;

grant execute on function public.apakah_ketua_panitia(uuid) to authenticated;

-- Perbarui kebijakan ubah kegiatan.
drop policy if exists activities_ubah on public.activities;

create policy activities_ubah on public.activities
  for update
  using (
    apakah_super()
    -- Pengurus inti: boleh mengubah kegiatan yang belum diarsipkan.
    or (status <> 'arsip' and apakah_salah_satu(
          array['ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
        ))
    -- Pengusul: boleh menyunting kegiatannya sendiri setelah laporan disetujui.
    or (dibuat_oleh = auth.uid() and status = 'laporan_disetujui')
    -- Penanggung jawab: boleh mengelola kegiatannya sendiri.
    or (penanggung_jawab = auth.uid() and status <> 'arsip')
    -- Ketua Panitia: HANYA menandai selesai (berjalan -> selesai).
    or (
      status = 'berjalan'
      and public.apakah_ketua_panitia(id)
    )
  );

select 'kebijakan diperbarui' as status;
