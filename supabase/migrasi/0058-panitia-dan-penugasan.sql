-- ============================================================
-- PANITIA KEGIATAN & PENUGASAN PENGELOLA PRESENSI/DOKUMENTASI
-- Aturan pemilik aplikasi.
--
-- 1. Hanya PENANGGUNG JAWAB kegiatan yang boleh menambah/menghapus panitia
--    dan menugaskan tugas. (Dijaga di server, lihat aksi-pelaksanaan.ts.)
--
-- 2. Peran panitia dipilih dari daftar tetap:
--      ketua_panitia, sekretaris_panitia, bendahara_panitia, anggota_panitia
--    Panitia boleh orang di luar pengurus (nama bebas).
--    Satu kegiatan hanya boleh punya SATU Ketua Panitia.
--
-- 3. Pengelola PRESENSI dan DOKUMENTASI ditunjuk oleh penanggung jawab dari
--    daftar panitia. Tidak otomatis — harus ditugaskan.
--    Penanggung jawab & Super Admin tetap bisa membuka tab itu sebagai
--    cadangan bila pengelola berhalangan.
-- ============================================================

-- ---------- 1. Batasi peran panitia pada daftar tetap ----------
alter table public.committees
  drop constraint if exists committees_peran_valid;

alter table public.committees
  add constraint committees_peran_valid
  check (peran in ('ketua_panitia', 'sekretaris_panitia', 'bendahara_panitia', 'anggota_panitia'));

-- Ubah peran lama (teks bebas) ke daftar tetap supaya tidak ada data yang
-- melanggar batasan di atas. Peran yang mengandung "ketua" dianggap ketua.
update public.committees
set peran = case
  when peran ilike '%ketua%' then 'ketua_panitia'
  when peran ilike '%sekretaris%' then 'sekretaris_panitia'
  when peran ilike '%bendahara%' then 'bendahara_panitia'
  else 'anggota_panitia'
end
where peran not in ('ketua_panitia', 'sekretaris_panitia', 'bendahara_panitia', 'anggota_panitia');

-- ---------- 2. Satu kegiatan hanya boleh punya satu Ketua Panitia ----------
create unique index if not exists idx_committees_satu_ketua_panitia
  on public.committees (activity_id)
  where peran = 'ketua_panitia';

-- ---------- 3. Penugasan pengelola ----------
create table if not exists public.penugasan_pengelola (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  committee_id uuid not null references public.committees(id) on delete cascade,
  bagian text not null check (bagian in ('presensi', 'dokumentasi')),
  ditugaskan_oleh uuid references public.profiles(id),
  dibuat_pada timestamptz not null default now(),
  unique (activity_id, bagian)
);

alter table public.penugasan_pengelola enable row level security;

-- Baca: siapa pun yang boleh melihat kegiatan boleh melihat penugasannya.
drop policy if exists penugasan_baca on public.penugasan_pengelola;
create policy penugasan_baca on public.penugasan_pengelola
  for select using (auth.uid() is not null);

-- Tulis: HANYA penanggung jawab kegiatan atau Super Admin.
drop policy if exists penugasan_tulis on public.penugasan_pengelola;
create policy penugasan_tulis on public.penugasan_pengelola
  for all
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id
        and (a.penanggung_jawab = auth.uid() or public.apakah_super())
    )
  )
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_id
        and (a.penanggung_jawab = auth.uid() or public.apakah_super())
    )
  );

grant select, insert, update, delete on public.penugasan_pengelola to authenticated;

-- ---------- 4. Fungsi bantu: bolehkah pengguna mengelola bagian ini? ----------
create or replace function public.boleh_kelola_bagian(p_activity uuid, p_bagian text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    -- Penanggung jawab & Super Admin selalu boleh (cadangan bila pengelola
    -- berhalangan).
    exists (
      select 1 from public.activities a
      where a.id = p_activity
        and (a.penanggung_jawab = auth.uid() or public.apakah_super())
    )
    -- Pengelola yang ditugaskan.
    or exists (
      select 1
      from public.penugasan_pengelola pp
      join public.committees c on c.id = pp.committee_id
      where pp.activity_id = p_activity
        and pp.bagian = p_bagian
        and c.profile_id = auth.uid()
    );
$function$;

-- Boleh mengurus panitia (tambah/hapus/tugas): hanya penanggung jawab & Super Admin.
create or replace function public.boleh_urus_panitia(p_activity uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.activities a
    where a.id = p_activity
      and (a.penanggung_jawab = auth.uid() or public.apakah_super())
  );
$function$;

grant execute on function public.boleh_kelola_bagian(uuid, text) to authenticated;
grant execute on function public.boleh_urus_panitia(uuid) to authenticated;

select 'selesai' as status;
