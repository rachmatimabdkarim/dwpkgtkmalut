-- ============================================================
-- PERBAIKAN TUNTAS: arsipkan lewat fungsi berpemilik hak.
--
-- Gejala: tombol "Kunci & Arsipkan" memanggil server, dijawab 200, TANPA galat,
-- tetapi status kegiatan tidak berubah. Ini gejala khas "pembaruan tidak kena
-- baris": PostgREST menjawab sukses untuk pembaruan yang tidak mengenai baris
-- mana pun, sehingga layar tidak pernah menampilkan sebabnya.
--
-- Sebab: kebijakan UPDATE tabel `activities` menilai peran lewat `apakah_salah_satu`
-- yang membaca keanggotaan peran pemanggil. Pengusul (pemegang peran `pengurus`)
-- tidak lolos penilaian itu, jadi barisnya tidak tersentuh.
--
-- Perbaikan: pindahkan penerapan ke fungsi database berpemilik hak yang
-- memeriksa sendiri tiga hal — pengguna sudah masuk, dia memang PEMILIK catatan,
-- dan statusnya memang sudah `laporan_disetujui`. Fungsi ini sah menembus
-- kebijakan baris, karena itu pengamannya HARUS ada di dalam fungsinya.
-- ============================================================

create or replace function public.arsipkan_kegiatan(p_activity uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pemilik uuid;
  v_status text;
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'Sesi Anda sudah berakhir.';
  end if;

  select dibuat_oleh, status into v_pemilik, v_status
  from public.activities where id = p_activity;

  if v_pemilik is null then
    raise exception 'Kegiatan tidak ditemukan.';
  end if;

  -- Yang boleh mengunci & mengarsipkan: pemilik catatan itu sendiri atau super admin.
  if not (v_pemilik = v_id or public.apakah_super()) then
    raise exception 'Hanya pengusul kegiatan ini yang dapat mengunci dan mengarsipkannya.';
  end if;

  -- Hanya setelah laporan disetujui penuh oleh seluruh jenjang.
  if v_status <> 'laporan_disetujui' then
    raise exception 'Kegiatan belum siap diarsipkan (status sekarang: %).', v_status;
  end if;

  update public.activities set status = 'arsip' where id = p_activity;

  return 'arsip';
end;
$function$;

revoke all on function public.arsipkan_kegiatan(uuid) from public;
grant execute on function public.arsipkan_kegiatan(uuid) to authenticated;
