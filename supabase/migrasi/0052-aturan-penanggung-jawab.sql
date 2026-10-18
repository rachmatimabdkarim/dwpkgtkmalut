-- ============================================================
-- ATURAN PENANGGUNG JAWAB KEGIATAN — DITETAPKAN PEMILIK APLIKASI
--
-- Sebelumnya (aturan lama, sekarang DIBATALKAN):
--   * Super Admin & Pengurus Harian BEBAS menunjuk siapa saja
--   * siapa pun boleh menunjuk DIRINYA SENDIRI
--   * asal satu bidang, boleh
--
-- Aturan baru:
--   1. Diajukan ANGGOTA BIASA
--      -> penanggung jawab TERKUNCI: Ketua Bidang dari bidang anggota itu.
--
--   2. Diajukan KETUA BIDANG
--      -> penanggung jawab otomatis DIRINYA SENDIRI.
--
--   3. Diajukan PENGURUS HARIAN
--      -> penanggung jawab HANYA salah satu Pengurus Harian (tidak boleh
--         anggota biasa, tidak boleh Ketua Bidang).
--
-- Fungsi ini dipakai server saat menyimpan kegiatan, jadi aturan tetap
-- berlaku walaupun form diakali. Alasan tiap penolakan dikembalikan sebagai
-- kalimat manusiawi supaya pengguna tahu apa yang salah.
-- ============================================================

create or replace function public.alasan_penanggung_jawab(orang uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_saya_jabatan text;
  v_saya_bidang  text;
  v_dia_jabatan  text;
  v_dia_bidang   text;
  v_ketua_bidang uuid;
begin
  if orang is null then
    return 'Penanggung jawab wajib dipilih.';
  end if;

  select o.jabatan, o.bidang into v_saya_jabatan, v_saya_bidang
  from public.officers o where o.profile_id = auth.uid() limit 1;

  select o.jabatan, o.bidang into v_dia_jabatan, v_dia_bidang
  from public.officers o where o.profile_id = orang limit 1;

  if v_dia_jabatan is null then
    return 'Calon penanggung jawab tidak terdaftar sebagai pengurus.';
  end if;

  -- Super Admin boleh mewakili siapa pun (untuk keperluan administrasi).
  if public.apakah_super() then
    return null;
  end if;

  -- ---- Kasus 2: pengusul KETUA BIDANG -> hanya dirinya sendiri ----
  if v_saya_jabatan ilike 'ketua bidang' then
    if orang <> auth.uid() then
      return 'Sebagai Ketua Bidang, penanggung jawab kegiatan Anda adalah diri Anda sendiri.';
    end if;
    return null;
  end if;

  -- ---- Kasus 1: pengusul ANGGOTA BIASA -> harus Ketua Bidang-nya ----
  if coalesce(v_saya_bidang, '') ilike 'bidang%'
     and v_saya_jabatan not ilike 'ketua bidang' then
    select o.profile_id into v_ketua_bidang
    from public.officers o
    where o.bidang = v_saya_bidang and o.jabatan ilike 'ketua bidang'
    limit 1;

    if v_ketua_bidang is null then
      return 'Bidang Anda belum memiliki Ketua Bidang. Mintakan pengurus harian menetapkannya lebih dulu.';
    end if;
    if orang <> v_ketua_bidang then
      return 'Penanggung jawab kegiatan yang Anda ajukan adalah Ketua ' || v_saya_bidang || '.';
    end if;
    return null;
  end if;

  -- ---- Kasus 3: pengusul PENGURUS HARIAN -> hanya sesama pengurus harian ----
  if v_dia_bidang is distinct from 'Pengurus Harian' then
    return 'Sebagai Pengurus Harian, penanggung jawab hanya boleh salah satu Pengurus Harian.';
  end if;
  return null;
end;
$function$;

-- Fungsi lama tetap ada (dipakai di tempat lain) tetapi sekarang mengikuti
-- aturan baru lewat alasan_penanggung_jawab.
create or replace function public.boleh_penanggung_jawab(orang uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.alasan_penanggung_jawab(orang) is null;
$function$;

-- Siapa pun yang punya hak memanggil, tidak ada perubahan izin.
grant execute on function public.alasan_penanggung_jawab(uuid) to authenticated;
grant execute on function public.boleh_penanggung_jawab(uuid) to authenticated;
