-- ============================================================
-- MIGRASI 0019 — Keterangan (sub-judul) tiap halaman publik
-- Supaya kalimat di bawah judul halaman Agenda/Berita/Galeri/Unduhan
-- dapat diubah dari panel, bukan ditulis mati di kode.
-- ============================================================

alter table public.site_settings
  add column if not exists sub_judul_agenda text,
  add column if not exists sub_judul_berita text,
  add column if not exists sub_judul_galeri text,
  add column if not exists sub_judul_unduhan text;

update public.site_settings set
  sub_judul_agenda  = coalesce(sub_judul_agenda,  'Jadwal pelaksanaan program kerja dan kegiatan organisasi.'),
  sub_judul_berita  = coalesce(sub_judul_berita,  'Kabar terbaru seputar kegiatan dan program Dharma Wanita Persatuan.'),
  sub_judul_galeri  = coalesce(sub_judul_galeri,  'Album dokumentasi visual dari berbagai kegiatan dan program organisasi.'),
  sub_judul_unduhan = coalesce(sub_judul_unduhan, 'Dokumen resmi yang dapat diunduh oleh pengurus dan masyarakat umum.')
where id = (select id from public.site_settings limit 1);

drop view if exists public.public_site_settings cascade;
create view public.public_site_settings as
  select nama_aplikasi, nama_unit, nama_organisasi, warna_utama,
         logo_path, favicon_path, alamat, telepon, email,
         sambutan, profil_singkat,
         sub_judul_agenda, sub_judul_berita, sub_judul_galeri, sub_judul_unduhan
    from public.site_settings;

grant select on public.public_site_settings to anon, authenticated;

select sub_judul_agenda, sub_judul_berita from public.public_site_settings;
