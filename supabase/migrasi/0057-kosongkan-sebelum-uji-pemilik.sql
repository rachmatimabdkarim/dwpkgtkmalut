-- ============================================================
-- MENGOSONGKAN SELURUH KEGIATAN SEBELUM PENGUJIAN PEMILIK
--
-- Diminta langsung oleh pemilik ("hapus dulu semua kegiatan agar bersih").
-- Yang dihapus HANYA data kegiatan beserta turunannya:
--   laporan, RAB, keputusan, notifikasi, riwayat, panitia, tugas,
--   presensi, lampiran, pengajuan perubahan, agenda/berita publik.
--
-- Yang TIDAK disentuh: akun pengurus, peran, pengaturan situs, pesan kontak,
-- pengaturan tema, dan semua view publik.
--
-- Pelindung "riwayat bersifat tambah-saja" dimatikan sementara karena
-- penghapusan memang perlu, lalu dipasang kembali di akhir.
-- ============================================================

do $$
declare r record;
begin
  for r in select tgname from pg_trigger
           where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('alter table public.activity_logs disable trigger %I', r.tgname);
  end loop;
end $$;

delete from public.activity_reports;
delete from public.budget_items;
delete from public.approvals;
delete from public.change_requests;
delete from public.attendances;
delete from public.tasks;
delete from public.committees;
delete from public.activity_plans;
delete from public.attachments;
delete from public.notifications where activity_id is not null;
delete from public.activity_logs;
delete from public.posts;
delete from public.documents;
delete from public.activities;

do $$
declare r record;
begin
  for r in select tgname from pg_trigger
           where tgrelid = 'public.activity_logs'::regclass and not tgisinternal
  loop
    execute format('alter table public.activity_logs enable trigger %I', r.tgname);
  end loop;
end $$;

-- Pastikan pelindung riwayat kembali menyala
select count(*) as pelindung_aktif
from pg_trigger
where not tgisinternal and tgenabled = 'O'
  and tgrelid in ('public.activity_logs'::regclass, 'public.file_logs'::regclass, 'public.audit_logs'::regclass);

select
  (select count(*) from public.activities)      as kegiatan,
  (select count(*) from public.approvals)       as keputusan,
  (select count(*) from public.budget_items)    as rab,
  (select count(*) from public.activity_reports) as laporan,
  (select count(*) from public.notifications)   as notifikasi,
  (select count(*) from public.attachments)     as lampiran,
  (select count(*) from public.activity_logs)   as riwayat,
  (select count(*) from public.attendances)     as presensi,
  (select count(*) from public.committees)      as panitia,
  (select count(*) from public.profiles)        as akun_utuh,
  (select count(*) from public.contact_messages) as pesan_utuh;
