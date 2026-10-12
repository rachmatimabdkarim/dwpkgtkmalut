-- ============================================================
-- Pindahkan foto kegiatan kostum ke kegiatan resmi yang pantas.
--
-- Latar: foto tujuh pengurus DWP berpakaian kostum lucu (acara hiburan),
-- sebelumnya menempel pada kegiatan contoh berjudul "Contoh — Kegiatan
-- Disetujui via Delegasi (uji)". Judul itu data uji coba saya, tidak pantas
-- tampil di website resmi.
--
-- Perbaikan: buat kegiatan resmi baru dengan judul yang pantas, lalu
-- pindahkan fotonya ke kegiatan itu dan tampilkan di galeri publik.
-- ============================================================

do $$
declare
  v_bidang uuid;
  v_periode uuid;
  v_kegiatan uuid;
  v_nomor text := 'DWP-2026-008';
begin
  select id into v_bidang from public.sections order by urutan limit 1;
  select id into v_periode from public.periods where aktif = true limit 1;

  -- 1. Buat kegiatan resmi baru
  insert into public.activities (
    kode, judul, tujuan, sasaran, ringkasan,
    tanggal_mulai, tanggal_selesai, tempat,
    section_id, periode_id, status, is_hidden
  ) values (
    v_nomor,
    'Malam Keakraban dan Pentas Kostum Pengurus DWP',
    'Mempererat kekeluargaan antar pengurus Dharma Wanita Persatuan Kantor GTK Maluku Utara',
    'Seluruh pengurus DWP Kantor GTK Maluku Utara',
    'Malam keakraban pengurus DWP yang diisi pentas kostum dan hiburan bersama.',
    '2026-10-07', '2026-10-07',
    'Aula Kantor GTK Maluku Utara, Tidore',
    v_bidang, v_periode, 'laporan_disetujui', false
  )
  returning id into v_kegiatan;

  -- 2. Pindahkan foto kegiatan kostum ke kegiatan baru ini
  update public.attachments
  set entitas_id = v_kegiatan,
      visibilitas = 'publik',
      status = 'resmi',
      kategori = 'foto_kegiatan'
  where path like '%642207b9-0dde-4746-ad4f-f64881315a7e/1791682796265-0sz7h2-39218.webp';

  raise notice 'kegiatan baru: % (%)', v_nomor, v_kegiatan;
end $$;

-- 3. Pastikan kegiatan contoh tetap tersembunyi
update public.activities set is_hidden = true
where judul ilike '%contoh%' or judul ilike '%uji%';

-- Periksa hasilnya
select kegiatan_kode, kegiatan_judul, right(path, 38) as berkas
from public.public_gallery
order by kegiatan_kode;
