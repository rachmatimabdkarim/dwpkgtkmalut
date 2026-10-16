-- ============================================================
-- KOSONGKAN KEGIATAN (permintaan pemilik proyek, untuk uji coba dari awal)
--
-- Menghapus seluruh kegiatan beserta data turutannya. Pengurus, peran,
-- pengaturan situs, bidang, dan periode TIDAK disentuh.
--
-- Catatan: riwayat kegiatan dilindungi aturan "tambah-saja", jadi pelindungnya
-- dimatikan sementara (nama pemicunya dicari langsung, tidak ditebak), lalu
-- dipasang kembali.
-- ============================================================

do $$
declare
  nama_pemicu text;
  jml int;
begin
  select count(*) into jml from public.activities;
  raise notice 'kegiatan sebelum: %', jml;

  -- 1. Matikan pelindung riwayat sementara
  for nama_pemicu in
    select tgname from pg_trigger
    where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('drop trigger if exists %I on public.activity_logs', nama_pemicu);
  end loop;

  -- 2. Data turunan
  delete from public.activity_logs   where activity_id is not null;
  delete from public.approvals       where activity_id is not null;
  delete from public.budget_items    where activity_id is not null;
  delete from public.notifications   where activity_id is not null;
  delete from public.attendances     where activity_id is not null;
  delete from public.committees      where activity_id is not null;
  delete from public.change_requests where activity_id is not null;
  delete from public.tasks           where activity_id is not null;
  delete from public.attachments     where entitas_id is not null;

  -- 3. Kegiatannya
  delete from public.activities;

  -- 4. Pasang kembali pelindung riwayat
  execute 'create trigger trg_activity_logs_ubah
             before update or delete on public.activity_logs
             for each row execute function public.activity_logs_hanya_tambah()';
end $$;

select 'kegiatan' as keterangan, count(*) as jumlah from public.activities
union all select 'rincian anggaran', count(*) from public.budget_items
union all select 'persetujuan', count(*) from public.approvals
union all select 'riwayat', count(*) from public.activity_logs
union all select 'berkas kegiatan', count(*) from public.attachments where entitas_id is not null
union all select 'berita', count(*) from public.posts;
