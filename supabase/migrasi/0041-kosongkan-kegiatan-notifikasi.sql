-- ============================================================
-- KOSONGKAN KEGIATAN (permintaan pemilik proyek) + notifikasi tertinggal
--
-- Menghapus seluruh kegiatan beserta data turutannya, termasuk notifikasi
-- yang menggantung. Pengurus, peran, pengaturan situs, bidang, dan periode
-- TIDAK disentuh.
-- ============================================================

do $$
declare
  nama_pemicu text;
begin
  -- 1. Matikan pelindung riwayat sementara (nama pemicunya dicari, tidak ditebak)
  for nama_pemicu in
    select tgname from pg_trigger
    where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('drop trigger if exists %I on public.activity_logs', nama_pemicu);
  end loop;

  -- 2. Data turunan kegiatan
  delete from public.activity_logs    where activity_id is not null;
  delete from public.approvals        where activity_id is not null;
  delete from public.budget_items     where activity_id is not null;
  delete from public.notifications    where activity_id is not null;
  delete from public.attendances      where activity_id is not null;
  delete from public.committees       where activity_id is not null;
  delete from public.change_requests  where activity_id is not null;
  delete from public.tasks            where activity_id is not null;
  delete from public.attachments      where entitas_id is not null;

  -- 3. Kegiatannya
  delete from public.activities;

  -- 4. Notifikasi lain yang mungkin tertinggal (tanpa kegiatan)
  delete from public.notifications;

  -- 5. Pasang kembali pelindung riwayat
  execute 'create trigger trg_activity_logs_ubah
             before update or delete on public.activity_logs
             for each row execute function public.activity_logs_hanya_tambah()';
end $$;

select 'kegiatan' as keterangan, count(*) as jumlah from public.activities
union all select 'notifikasi', count(*) from public.notifications
union all select 'persetujuan', count(*) from public.approvals
union all select 'riwayat', count(*) from public.activity_logs
union all select 'berita', count(*) from public.posts;
