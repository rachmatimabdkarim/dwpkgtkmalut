-- ============================================================
-- PEMBERSIHAN AKHIR: kosongkan seluruh sisa pengujian.
--
-- Tidak menyentuh: pengurus, peran, pengaturan situs, jenjang persetujuan,
-- dan pesan kontak ASLI (dari Rafael & pemilik) — itu bukan data uji saya.
-- ============================================================

do $$
declare r record; v_tabel text;
begin
  foreach v_tabel in array array['public.activity_logs','public.file_logs','public.audit_logs'] loop
    for r in select tgname from pg_trigger
             where tgrelid = v_tabel::regclass and not tgisinternal
    loop
      execute format('alter table %s disable trigger %I', v_tabel, r.tgname);
    end loop;
  end loop;
end $$;

delete from public.approvals;
delete from public.change_requests;
delete from public.notifications;
delete from public.attachments;
delete from public.attendances;
delete from public.committees;
delete from public.budget_items;
delete from public.activity_reports;
delete from public.activity_plans;
delete from public.tasks;
delete from public.documents;
delete from public.file_logs;
delete from public.activity_logs;
delete from public.activities;

do $$
declare r record; v_tabel text;
begin
  foreach v_tabel in array array['public.activity_logs','public.file_logs','public.audit_logs'] loop
    for r in select tgname from pg_trigger
             where tgrelid = v_tabel::regclass and not tgisinternal
    loop
      execute format('alter table %s enable trigger %I', v_tabel, r.tgname);
    end loop;
  end loop;
end $$;
