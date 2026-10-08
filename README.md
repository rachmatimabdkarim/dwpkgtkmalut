# Sistem Informasi DWP GTK Malut

Aplikasi web Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara:
web publik + panel admin untuk siklus kegiatan (perencanaan → pelaksanaan → pelaporan).

## Teknologi
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres, Auth, Storage, RLS)
- Vercel paket gratis

## Menjalankan di komputer
```
npm install
npm run dev -- --host 0.0.0.0 --port 4000
```
Buka http://localhost:4000

## Perintah penting
- `npm run dev` — jalankan mode pengembangan
- `npm run build` — build produksi
- `npm run start` — jalankan hasil build
- `npm run lint` — periksa gaya kode
- `npx tsc --noEmit` — periksa tipe

## Akun contoh (sementara, sebelum tersambung database)
Semua akun memakai kata sandi `DwpContoh2026!`:
- admin@dwp.local — Super Admin
- sekretaris@dwp.local — Sekretaris
- bendahara@dwp.local — Bendahara
- editor@dwp.local — Editor Konten

## Susunan berkas penting
- `src/lib/tema.ts` — design tokens & perhitungan warna otomatis
- `src/lib/peran.ts` — daftar peran, menu admin, menu publik
- `src/components/dasar.tsx` — tombol, kartu, lencana, form
- `src/components/kerangka-admin.tsx` — sidebar + header panel
- `docs/LAPORAN-TAHAP-1.md` — laporan tahap 1

## Aturan
Lihat `AGENTS.md`: dilarang push/rilis tanpa izin tertulis pemilik proyek.
