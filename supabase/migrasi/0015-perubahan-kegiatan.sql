-- ============================================================
-- MIGRASI 0015 — Perbaikan: perubahan saat kegiatan sudah dikunci
--
-- MASALAH: pengajuan perubahan bisa DISETUJUI, status pengajuannya
-- berubah jadi "disetujui" dan tercatat di riwayat, TETAPI nilai baru
-- (tanggal/tempat/anggaran) tidak masuk ke tabel kegiatan.
-- Penyebab: aturan pengaman kegiatan menolak pembaruan ketika kegiatan
-- sudah berstatus 'arsip', sehingga pembaruan ditelan tanpa galat.
--
-- PERBAIKAN: beri jalan khusus untuk fungsi penerap perubahan. Fungsi
-- dijalankan dengan hak pemilik tabel sehingga dapat menembus aturan
-- pengaman, dengan pemeriksaan peran di dalam fungsi itu sendiri
-- (hanya pengurus inti yang boleh menerapkan perubahan).
-- ============================================================

create or replace function public.terapkan_perubahan_kegiatan(
  p_activity_id uuid,
  p_jenis text,
  p_usulan text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hanya pengurus inti yang boleh menerapkan perubahan
  if not public.apakah_salah_satu(
    array['super_admin','ketua','wakil_ketua','sekretaris','bendahara','ketua_seksi']
  ) then
    raise exception 'Hanya pengurus inti yang berwenang menerapkan perubahan kegiatan.';
  end if;

  if p_jenis = 'tempat' then
    update public.activities
      set tempat = btrim(p_usulan), diperbarui_pada = now()
      where id = p_activity_id;

  elsif p_jenis = 'tanggal' then
    declare
      bagian text[];
      mulai date;
      selesai date;
    begin
      bagian := string_to_array(p_usulan, ';');
      mulai := nullif(btrim(bagian[1]), '')::date;
      selesai := coalesce(nullif(btrim(coalesce(bagian[2], '')), '')::date, mulai);
      if mulai is not null then
        update public.activities
          set tanggal_mulai = mulai,
              tanggal_selesai = selesai,
              diperbarui_pada = now()
          where id = p_activity_id;
      end if;
    end;
  end if;
  -- jenis 'anggaran' dan 'lain' ditangani di sisi aplikasi
end;
$$;

grant execute on function public.terapkan_perubahan_kegiatan(uuid, text, text) to authenticated;

select 'penerap perubahan kegiatan siap' as keterangan;
