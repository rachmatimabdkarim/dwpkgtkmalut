-- ============================================================
-- PERBAIKAN: jam presensi dihitung dengan WAKTU MALUKU UTARA (WIT / +09:00)
--
-- Kesalahan sebelumnya: tanggal + jam digabung sebagai "timestamp tanpa zona",
-- lalu dibandingkan dengan now() (UTC). Akibatnya jam 08.00 yang diisi petugas
-- dianggap 08.00 UTC = 17.00 WIT — presensi terlambat 9 jam.
--
-- Perbaikan: gabungan tanggal + jam diberi zona Asia/Jayapura secara eksplisit,
-- sehingga 08.00 berarti 08.00 WIT.
-- ============================================================

create or replace function public.status_presensi(p_activity uuid)
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
  v_mulai date;
  v_selesai date;
  v_jendela public.presensi_jendela%rowtype;
  v_buka timestamptz;
  v_tutup timestamptz;
  v_sekarang timestamptz := now();
  ZONA constant text := 'Asia/Jayapura';
begin
  select status, tanggal_mulai, tanggal_selesai
    into v_status, v_mulai, v_selesai
  from public.activities where id = p_activity;

  if v_status is null then
    return json_build_object('terbuka', false, 'sebab', 'Kegiatan tidak ditemukan.');
  end if;

  select * into v_jendela from public.presensi_jendela where activity_id = p_activity;

  -- Tanggal dari kegiatan, JAM dari pengaturan petugas — ditafsirkan sebagai WIT.
  if v_jendela.activity_id is null then
    v_buka  := ((v_mulai::timestamp  + time '08:00') at time zone ZONA);
    v_tutup := ((v_selesai::timestamp + time '16:00') at time zone ZONA);
  else
    v_buka  := ((v_mulai::timestamp  + v_jendela.jam_mulai)   at time zone ZONA);
    v_tutup := ((v_selesai::timestamp + v_jendela.jam_selesai) at time zone ZONA);
  end if;

  if coalesce(v_jendela.dibuka_paksa, false) then
    return json_build_object(
      'terbuka', true,
      'sebab', 'Dibuka kembali oleh pengelola presensi di luar jadwal.',
      'paksa', true,
      'alasan', v_jendela.alasan_buka_paksa,
      'buka', v_buka,
      'tutup', v_tutup
    );
  end if;

  if v_status <> 'berjalan' then
    return json_build_object(
      'terbuka', false,
      'sebab',
        case v_status
          when 'disetujui' then 'Kegiatan belum dimulai.'
          when 'selesai' then 'Kegiatan sudah selesai.'
          else 'Kegiatan belum berada pada tahap pelaksanaan.'
        end,
      'buka', v_buka, 'tutup', v_tutup
    );
  end if;

  if v_sekarang < v_buka then
    return json_build_object(
      'terbuka', false,
      'sebab', 'Presensi belum dibuka. Dibuka ' ||
               to_char(v_buka at time zone ZONA, 'DD Mon YYYY HH24:MI') || ' WIT.',
      'buka', v_buka, 'tutup', v_tutup
    );
  end if;

  if v_sekarang > v_tutup then
    return json_build_object(
      'terbuka', false,
      'sebab', 'Presensi sudah ditutup sejak ' ||
               to_char(v_tutup at time zone ZONA, 'DD Mon YYYY HH24:MI') || ' WIT.',
      'buka', v_buka, 'tutup', v_tutup
    );
  end if;

  return json_build_object(
    'terbuka', true,
    'sebab', 'Presensi dibuka sampai ' ||
             to_char(v_tutup at time zone ZONA, 'DD Mon YYYY HH24:MI') || ' WIT.',
    'buka', v_buka, 'tutup', v_tutup
  );
end;
$function$;

grant execute on function public.status_presensi(uuid) to authenticated, anon, service_role;

select public.status_presensi('81da42e3-ad0e-4069-9c54-bf7105d428f5') as uji;
