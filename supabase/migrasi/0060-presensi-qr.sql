-- ============================================================
-- PRESENSI LEWAT QR CODE
--
-- ATURAN PEMILIK:
--  * Presensi punya JENDELA WAKTU:
--      - tanggal MULAI otomatis = tanggal_mulai kegiatan
--      - tanggal SELESAI otomatis = tanggal_selesai kegiatan
--      - JAM mulai & JAM selesai diatur manual oleh pengelola presensi
--    (mis. kegiatan 12–15 Juni 2026, absen dibuka 12 Juni jam 07.30 dan
--     ditutup 15 Juni jam 15.00)
--  * Terbuka otomatis saat kegiatan mulai, tertutup otomatis saat kegiatan
--    selesai.
--  * Bisa dibuka kembali di luar jendela — WAJIB menuliskan alasan, dan
--    alasannya tercatat di riwayat kegiatan.
--  * Peserta LUAR boleh absen (tidak perlu punya akun).
--  * Absen lewat QR berstatus "Menunggu" — belum dihitung hadir sampai
--    dikonfirmasi petugas secara fisik.
--  * Perbaikan nama/data peserta dilakukan PETUGAS, bukan peserta.
-- ============================================================

-- ---------- 1. Jendela presensi per kegiatan ----------
create table if not exists public.presensi_jendela (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  /** Jam mulai absen (HH:MM). Tanggalnya mengikuti tanggal_mulai kegiatan. */
  jam_mulai time not null default '08:00',
  /** Jam tutup absen (HH:MM). Tanggalnya mengikuti tanggal_selesai kegiatan. */
  jam_selesai time not null default '16:00',
  /**
   * Dibuka paksa di luar jendela. Bila aktif, absen tetap diterima walau di
   * luar jam — dan alasannya wajib tercatat.
   */
  dibuka_paksa boolean not null default false,
  alasan_buka_paksa text,
  dibuka_paksa_oleh uuid references public.profiles(id),
  dibuka_paksa_pada timestamptz,
  kode_qr text unique,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

alter table public.presensi_jendela enable row level security;

-- Baca: semua pengguna yang masuk boleh melihat (kegiatan & jendelanya).
drop policy if exists presensi_jendela_baca on public.presensi_jendela;
create policy presensi_jendela_baca on public.presensi_jendela
  for select using (auth.uid() is not null);

-- Tulis: HANYA pengelola presensi yang ditugaskan, penanggung jawab, Super Admin.
drop policy if exists presensi_jendela_tulis on public.presensi_jendela;
create policy presensi_jendela_tulis on public.presensi_jendela
  for all
  using (public.boleh_kelola_bagian(activity_id, 'presensi'))
  with check (public.boleh_kelola_bagian(activity_id, 'presensi'));

grant select, insert, update, delete on public.presensi_jendela to authenticated;

-- ---------- 2. Status "Menunggu" pada presensi ----------
-- Keterangan yang sudah ada: Hadir / Izin / Sakit.
-- "Menunggu" = absen lewat QR, belum dikonfirmasi petugas.
alter table public.attendances
  drop constraint if exists attendances_keterangan_valid;

alter table public.attendances
  add constraint attendances_keterangan_valid
  check (keterangan in ('Hadir', 'Izin', 'Sakit', 'Menunggu'));

-- Asal pencatatan: manual oleh petugas, atau lewat QR oleh peserta sendiri.
alter table public.attendances
  add column if not exists sumber text not null default 'manual'
  check (sumber in ('manual', 'qr'));

-- Bila absen lewat QR, simpan kapan peserta memindai (untuk bukti urutan).
alter table public.attendances
  add column if not exists dicatat_via_qr boolean not null default false;

-- ---------- 3. Fungsi: apakah presensi sedang terbuka? ----------
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
begin
  select status, tanggal_mulai, tanggal_selesai
    into v_status, v_mulai, v_selesai
  from public.activities where id = p_activity;

  if v_status is null then
    return json_build_object('terbuka', false, 'sebab', 'Kegiatan tidak ditemukan.');
  end if;

  select * into v_jendela from public.presensi_jendela where activity_id = p_activity;

  -- Belum diatur: pakai bawaan 08:00–16:00.
  if v_jendela.activity_id is null then
    v_buka  := (v_mulai::timestamp + time '08:00');
    v_tutup := (v_selesai::timestamp + time '16:00');
  else
    v_buka  := (v_mulai::timestamp + v_jendela.jam_mulai);
    v_tutup := (v_selesai::timestamp + v_jendela.jam_selesai);
  end if;

  -- Dibuka paksa: selalu terbuka, dengan catatan.
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

  -- Kegiatan harus berjalan. Sebelum mulai / sesudah selesai -> tertutup.
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
      'sebab', 'Presensi belum dibuka. Dibuka ' || to_char(v_buka, 'DD Mon YYYY HH24:MI') || '.',
      'buka', v_buka, 'tutup', v_tutup
    );
  end if;

  if v_sekarang > v_tutup then
    return json_build_object(
      'terbuka', false,
      'sebab', 'Presensi sudah ditutup sejak ' || to_char(v_tutup, 'DD Mon YYYY HH24:MI') || '.',
      'buka', v_buka, 'tutup', v_tutup
    );
  end if;

  return json_build_object(
    'terbuka', true,
    'sebab', 'Presensi dibuka sampai ' || to_char(v_tutup, 'DD Mon YYYY HH24:MI') || '.',
    'buka', v_buka, 'tutup', v_tutup
  );
end;
$function$;

grant execute on function public.status_presensi(uuid) to authenticated, anon;

-- ---------- 4. Kode QR ----------
create or replace function public.buat_kode_qr(p_activity uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select kode_qr from public.presensi_jendela where activity_id = p_activity;
$function$;

grant execute on function public.buat_kode_qr(uuid) to authenticated;

-- ---------- 5. Halaman publik butuh nama kegiatan untuk QR ----------
create or replace view public.public_presensi as
select
  j.kode_qr,
  a.id            as activity_id,
  a.judul,
  a.tempat,
  a.tanggal_mulai,
  a.tanggal_selesai,
  a.status
from public.presensi_jendela j
join public.activities a on a.id = j.activity_id
where a.status = 'berjalan';

grant select on public.public_presensi to anon, authenticated;

select 'selesai' as status;
