-- ============================================================
-- KOSONGKAN SELURUH SISA PENGUJIAN
--
-- Menghapus: kegiatan + seluruh data turunannya, pengajuan perubahan,
-- notifikasi, lampiran (termasuk berkas foto uji), dan riwayat.
--
-- Yang TIDAK disentuh: pengurus, peran, pengaturan situs (nama, warna,
-- foto beranda), pengaturan jenjang persetujuan, pesan kontak.
--
-- Pemicu pelindung riwayat dimatikan sementara lalu DIPASANG KEMBALI,
-- dibuktikan terpasang di akhir.
-- ============================================================

do $$
declare
  v_pemicu record;
begin
  -- 1. matikan pemicu pelindung riwayat (kalau ada)
  for v_pemicu in
    select tgname from pg_trigger
    where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('alter table public.activity_logs disable trigger %I', v_pemicu.tgname);
  end loop;
end $$;

-- 2. hapus data turunan (urutan penting: anak dulu, induk kemudian)
delete from public.approvals;
delete from public.change_requests;
delete from public.notifications;
delete from public.activity_logs;
delete from public.attachments;
delete from public.attendances;
delete from public.committees;
delete from public.budget_items;
delete from public.activity_reports;
delete from public.activity_plans;
delete from public.tasks;
delete from public.documents;
delete from public.file_logs;
delete from public.activities;

-- 3. pasang kembali pemicu pelindung riwayat
do $$
declare
  v_pemicu record;
begin
  for v_pemicu in
    select tgname from pg_trigger
    where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('alter table public.activity_logs enable trigger %I', v_pemicu.tgname);
  end loop;
end $$;
