# PANDUAN KERJA — Aplikasi Sistem Informasi DWP GTK Malut

Aturan yang mengikat semua pekerjaan kode pada repositori ini.

## 1. Aturan Mutlak Rilis
- DILARANG push ke GitHub atau memicu rilis publik tanpa izin tertulis pemilik proyek.
- Semua pekerjaan diuji di localhost lebih dahulu, diperiksa visual, baru diajukan untuk persetujuan.
- Jangan menyentuh branch utama saat pekerjaan belum diverifikasi pemilik proyek.

## 2. Alur Kerja
1. Kerja di branch fitur, bukan langsung di branch utama.
2. Sebelum mengajukan rilis: jalankan build, pastikan tidak ada galat tipe dan lint.
3. Ajukan persetujuan: apa yang selesai, cara mengujinya, apa yang belum teruji.
4. Push hanya setelah pemilik proyek menyetujui.

## 3. Teknologi
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres, Auth, Storage, Row Level Security)
- Vercel paket gratis

## 4. Aturan Tampilan (ringkas, rujuk dokumen spesifikasi)
- Warna utama hanya lewat design tokens (CSS variables), tidak ditulis mati di komponen.
- Satu layar satu aksi utama; tidak ada menu/tombol/informasi ganda.
- Wajib nyaman di HP (mobile-first), area sentuh minimal 44 px.
- Web publik hanya membaca dari view khusus publik.

## 5. Bahasa
- Antarmuka, pesan commit, dan dokumentasi memakai Bahasa Indonesia.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
