-- ============================================================
-- KOSONGKAN SELURUH DATA KEGIATAN (permintaan pemilik proyek)
--
-- Tujuan: kondisi bersih untuk uji coba dari nol.
--
-- Yang dihapus: kegiatan, foto/berkas, anggaran, persetujuan, riwayat,
-- notifikasi, panitia, presensi, perubahan, laporan, tugas.
-- Yang DIPERTAHANKAN: pengurus, peran, pengaturan situs, bidang, periode.
--
-- Pelindung riwayat "tambah-saja" dimatikan sementara lalu dipasang kembali.
-- ============================================================

do $$
declare
  jml int;
  nama_pemicu text;
begin
  select count(*) into jml from public.activities;
  raise notice 'kegiatan sebelum: %', jml;

  -- 1. Matikan pelindung riwayat (nama pemicunya dicari langsung, bukan
  --    ditebak — pernah gagal karena namanya berbeda).
  for nama_pemicu in
    select tgname from pg_trigger
    where tgrelid = 'public.activity_logs'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on public.activity_logs', nama_pemicu);
    raise notice 'pemicu dimatikan: %', nama_pemicu;
  end loop;

  -- 2. Hapus data turunan
  delete from public.activity_logs    where activity_id is not null;
  delete from public.approvals        where activity_id is not null;
  delete from public.budget_items     where activity_id is not null;
  delete from public.notifications    where activity_id is not null;
  delete from public.attendances      where activity_id is not null;
  delete from public.committees       where activity_id is not null;
  delete from public.change_requests  where activity_id is not null;
  delete from public.tasks            where activity_id is not null;
  delete from public.attachments      where entitas_id is not null;

  -- 3. Hapus kegiatannya
  delete from public.activities;

  -- 4. Pasang kembali pelindung riwayat
  execute 'create trigger trg_activity_logs_ubah
             before update or delete on public.activity_logs
             for each row execute function public.activity_logs_hanya_tambah()';

  raise notice 'selesai';
end $$;

select 'kegiatan tersisa' as keterangan, count(*) as jumlah from public.activities
union all select 'berkas kegiatan tersisa', count(*) from public.attachments where entitas_id is not null
union all select 'riwayat tersisa', count(*) from public.activity_logs
union all select 'persetujuan tersisa', count(*) from public.approvals
union all select 'anggaran tersisa', count(*) from public.budget_items;
