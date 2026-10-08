# LAPORAN TAHAP 1 — Fondasi Aplikasi Sistem Informasi DWP GTK Malut

Tanggal: 7 Oktober 2026 · Status: **menunggu persetujuan pemilik proyek**

---

## 1. Apa yang sudah selesai

| Bagian | Hasil |
|---|---|
| Kerangka aplikasi | Dibangun baru dari nol (Next.js + TypeScript + Tailwind), terpisah dari aplikasi lama |
| Warna & huruf | Patuh aturan "design tokens": semua warna satu sumber, bisa diganti tanpa ubah kode |
| Skala warna otomatis | Satu warna utama diturunkan otomatis menjadi 10 tingkat (50–900) |
| Warna status | Hijau/kuning/merah dibiarkan tetap agar artinya konsisten |
| Peran pengguna | 8 peran sesuai spesifikasi; satu orang boleh punya beberapa peran |
| Akun contoh | 4 akun dengan peran berbeda untuk mencoba perbedaan wewenang |
| Halaman masuk | Bentuk dua-panel di desktop, satu kolom di HP |
| Kerangka panel | Sidebar 6 menu yang menyesuaikan peran; di HP jadi menu geser |
| Pagar akses | Tanpa masuk otomatis dialihkan; halaman Pengaturan hanya untuk Super Admin |
| Pusat Komponen | Halaman pratinjau warna, tombol, kartu, lencana, form |
| Pengaturan → Tampilan | Bentuk halaman (belum tersambung penyimpanan) |

## 2. Hasil pengujian (sungguhan, bukan klaim)

Aplikasi dijalankan dan diuji langsung di peramban.

| Uji | Hasil |
|---|---|
| Pemeriksaan tipe kode | Lolos, nol galat |
| Pemeriksaan gaya kode | Lolos, nol peringatan |
| Build produksi | Berhasil, 11 halaman terbentuk |
| Buka panel tanpa masuk | Dialihkan ke halaman masuk ✔ |
| Masuk sebagai Super Admin | Berhasil, menu tampil lengkap 6 buah ✔ |
| Menu Editor Konten | Beranda · Kegiatan · Konten · Profil (tanpa Pengaturan) ✔ |
| Menu Sekretaris | Beranda · Kegiatan · Pengurus · Profil ✔ |
| Menu Bendahara | Beranda · Kegiatan · Profil ✔ |
| Sekretaris memaksa buka Pengaturan | Dialihkan kembali ke Beranda panel ✔ |
| Tombol Keluar | Sesi terhapus, kembali ke halaman masuk ✔ |
| Tampilan HP (390 px) | Sidebar jadi menu geser, daftar kegiatan jadi kartu ✔ |
| Tampilan desktop (1280 px) | Sidebar tetap, daftar kegiatan berbentuk baris ✔ |

## 3. Cara Bapak menguji sendiri

1. Buka: `http://192.168.8.119:4100` (dari perangkat yang tersambung ke jaringan yang sama).
   Alternatif: minta saya kirimkan gambar tiap halaman.
2. Masuk dengan salah satu akun (kata sandi untuk semua akun sama):
   - `admin@dwp.local` — kata sandi `DwpContoh2026!`
   - `sekretaris@dwp.local`
   - `bendahara@dwp.local`
   - `editor@dwp.local`
3. Bandingkan menu antar akun.
4. Buka **Konten → Konten · Pusat Komponen** untuk melihat semua komponen dasar.
5. Buka **Pengaturan → Tampilan** untuk melihat bentuk halaman pengaturan warna/logo/ikon.

## 4. Yang belum teruji / belum selesai (jujur)

- **Login belum ke database.** Masih memakai akun contoh di dalam aplikasi. Proyek database khusus aplikasi baru ini belum dibuat. Ini langkah pertama batch berikutnya.
- **Pengaturan Tampilan belum menyimpan.** Warna/logo/ikon baru tampil bentuknya; penyimpanan butuh modul berkas (tahap 3) dan koneksi database.
- **Menu Kegiatan/ Konten/ Pengurus baru sebagian.** Konten hanya berisi Pusat Komponen; Pengurus masih kosong.
- **Notifikasi (ikon lonceng) belum berfungsi** — baru tampilan.
- Belum ada notifikasi otomatis, penyapu berkas, dan riwayat aktivitas.

## 5. Catatan batas layanan gratis (hasil pengecekan dokumentasi resmi)

- Penyimpanan berkas gratis: **1 GB** per proyek. Batas maksimum satu berkas di paket gratis **50 MB** — jauh di atas kebutuhan kita (foto maksimal 200 KB).
- Ukuran database gratis: **500 MB** — perlu dijaga karena data kegiatan bukan berkas.
- Kuota data keluar-masuk: **5 GB per bulan** (+5 GB dari cache).
- Proyek gratis otomatis dijeda bila tidak ada aktivitas sekitar **7 hari** → pengingat otomatis harian wajib; Bapak juga perlu memantau email peringatan dari Supabase.
- Vercel paket gratis: jadwal otomatis **hanya sekali sehari** dan waktunya tidak persis; maksimum 100 jadwal per proyek. Jadi sinkronisasi lebih sering dari sekali sehari **tidak mungkin** di paket gratis.

## 6. Keputusan yang menunggu Bapak

1. Apakah tampilan (warna teal tua, bentuk tombol/kartu, susunan sidebar) disetujui?
2. Apakah warna utama bawaan dipakai, atau Bapak sudah punya warna khas DWP?
3. Apakah delapan peran dan urutan jenjang persetujuan di atas sudah benar?
