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
