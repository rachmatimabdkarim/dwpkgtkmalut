-- ============================================================
-- MIGRASI 0030 — Bidang & penanggung jawab otomatis dari akun
--
-- Aturan baru (pilihan pemilik proyek):
-- 1. Bidang pelaksana TERKUNCI sesuai bidang akun yang masuk.
--      - Ketua Bidang / Anggota  -> bidangnya sendiri (tidak bisa diganti)
--      - Pengurus Harian         -> bebas memilih (menangani lintas bidang)
-- 2. Penanggung jawab HANYA boleh:
--      - diri sendiri
--      - anggota bidangnya sendiri
-- 3. Anggota biasa BOLEH mengajukan kegiatan (sebelumnya tidak).
--
-- Penghubung pengurus <-> bidang sudah ada di tabel `officers`
-- (kolom `profile_id` dan `bidang`).
-- ============================================================

-- ---------- 1. Bidang milik seseorang ----------
create or replace function public.bidang_saya()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select o.bidang
  from public.officers o
  where o.profile_id = auth.uid()
  order by o.urutan
  limit 1;
$$;

comment on function public.bidang_saya() is
  'Nama bidang milik pengguna yang sedang masuk (dari tabel officers). Kosong bila ia pengurus harian atau tidak terdaftar.';

-- ---------- 2. Apakah pengguna termasuk pengurus harian ----------
create or replace function public.apakah_pengurus_harian()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.officers o
    where o.profile_id = auth.uid()
      and o.bidang = 'Pengurus Harian'
  );
$$;

comment on function public.apakah_pengurus_harian() is
  'Benar bila pengguna yang masuk termasuk Pengurus Harian (Ketua/Wakil/Sekretaris/Bendahara). Mereka menangani lintas bidang.';

-- ---------- 3. Bolehkah saya memakai bidang tertentu? ----------
create or replace function public.boleh_bidang(nama_bidang text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    public.apakah_super()
    or public.apakah_pengurus_harian()
    or public.bidang_saya() is null
    or public.bidang_saya() = nama_bidang;
$$;

comment on function public.boleh_bidang(text) is
  'Benar bila pengguna yang masuk boleh mengajukan kegiatan pada bidang tersebut. Pengurus harian dan Super Admin bebas; ketua bidang dan anggota terkunci pada bidangnya.';

-- ---------- 4. Bolehkah saya menunjuk orang ini sebagai penanggung jawab? ----------
create or replace function public.boleh_penanggung_jawab(orang uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    -- Super Admin dan pengurus harian bebas menunjuk siapa saja
    public.apakah_super()
    or public.apakah_pengurus_harian()
    -- diri sendiri selalu boleh
    or orang = auth.uid()
    -- anggota bidang yang sama
    or exists (
      select 1
      from public.officers saya
      join public.officers dia on dia.bidang = saya.bidang
      where saya.profile_id = auth.uid()
        and dia.profile_id = orang
    );
$$;

comment on function public.boleh_penanggung_jawab(uuid) is
  'Benar bila pengguna yang masuk boleh menunjuk orang tersebut sebagai penanggung jawab kegiatan: dirinya sendiri, atau anggota bidang yang sama. Pengurus harian dan Super Admin bebas.';

-- ---------- 5. Periksa hasilnya ----------
select
  'fungsi aturan bidang siap' as hasil,
  (select count(*) from public.officers where profile_id is not null) as pengurus_terhubung_akun;
