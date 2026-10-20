-- ============================================================
-- LAPORAN PELAKSANAAN — kolom tambahan
--
-- Keputusan pemilik:
--  1. Perlu kolom BIAYA LAIN (pengeluaran di luar RAB).
--  2. Penandatangan cetak = OTOMATIS Ketua DWP (tidak disimpan, diambil
--     langsung dari data pengurus saat mencetak).
--  3. Draf boleh diedit sampai DIAJUKAN.
--
-- Tidak ada tabel baru — cukup kolom tambahan di activity_reports.
-- ============================================================

alter table public.activity_reports
  add column if not exists biaya_lain_keterangan text,
  add column if not exists biaya_lain_jumlah numeric(14,2) not null default 0,
  add column if not exists catatan_penutup text;

comment on column public.activity_reports.biaya_lain_keterangan is
  'Keterangan pengeluaran di luar RAB (mis. sewa tenda). Boleh kosong.';
comment on column public.activity_reports.biaya_lain_jumlah is
  'Nominal pengeluaran di luar RAB. Nol bila tidak ada.';

-- Realisasi per baris RAB sudah ada di budget_items.realisasi — dipakai
-- sekarang untuk laporan. Pastikan tidak negatif.
alter table public.budget_items
  drop constraint if exists budget_items_realisasi_wajar;

alter table public.budget_items
  add constraint budget_items_realisasi_wajar
  check (realisasi is null or realisasi >= 0);

select 'selesai' as status,
       (select count(*) from information_schema.columns
        where table_name='activity_reports') as jumlah_kolom;
