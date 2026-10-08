# LAPORAN TAHAP 1 — Bagian Lanjutan (Sambungan Database)

Tanggal: 8 Oktober 2026 · Status: **selesai, menunggu persetujuan**

---

## 1. Apa yang sudah selesai

| Bagian | Hasil |
|---|---|
| Proyek database baru | Dibuat terpisah dari SIM-APEL dan WhatsApp (sesuai permintaan) |
| Tabel organisasi | 6 tabel: peran, profil pengurus, penugasan peran, periode, jabatan, pengaturan aplikasi |
| Peran | 8 peran sesuai spesifikasi sudah terisi |
| Alur persetujuan | Urutan sudah disimpan di database (perencanaan: Sekretaris → Bendahara → Wakil Ketua → Ketua; pelaporan: Bendahara → Sekretaris → Wakil Ketua → Ketua) — dapat diubah Super Admin tanpa ubah kode |
| Batas pengingat | Persetujuan 3 hari, laporan 7 hari (sudah tersimpan) |
| Batas ukuran berkas | Foto 200 KB, dokumen 2 MB, logo 100 KB, ikon 50 KB (sudah tersimpan) |
| Aturan akses database | Aktif di semua tabel (12 aturan); yang paling ketat: pengaturan hanya untuk Super Admin |
| Akun asli | Akun Bapak sudah dibuat sebagai Super Admin |
| Login | Sudah pakai database sungguhan, bukan akun contoh lagi |
| Ganti kata sandi | Tersedia di menu Profil, dengan pemeriksaan kekuatan sandi |
| Akun contoh lama | Seluruhnya dihapus dari aplikasi |

## 2. Hasil pengujian (sungguhan)

| Uji | Hasil |
|---|---|
| Pemeriksaan kode & build | Lolos, nol galat |
| Login sandi salah | Ditolak, muncul pesan "Email atau kata sandi tidak cocok." ✔ |
| Login sandi benar | Berhasil masuk ke panel ✔ |
| Nama & peran terbaca dari database | "Rachmat Im Abd Karim, S.Kom., M.M." — Super Admin ✔ |
| Menu sesuai peran | Super Admin melihat 6 menu lengkap ✔ |
| Ganti kata sandi dengan sandi lemah | Ditolak dengan pesan "Kata sandi minimal 10 karakter." ✔ |
| Kunci rahasia tidak ikut ke peramban | Hanya kunci publik yang dipakai aplikasi; kunci rahasia disimpan di server ✔ |
| Tabel & aturan akses di database | Terverifikasi langsung: 6 tabel, semuanya berpelindung, 12 aturan aktif ✔ |

## 3. Yang belum teruji / belum selesai (jujur)

- **Halaman Pengurus masih kosong.** Menunggu data susunan pengurus dari Bapak.
- **Belum ada akun pengurus lain.** Baru akun Bapak. Saya akan menambahkan akun pengurus lain begitu datanya tersedia (atau kalau Bapak mau, saya buat akun contoh untuk sekretaris/bendahara dulu).
- **Pembagian wewenang masih di tingkat halaman.** Pengaman di tingkat data (siapa boleh melihat/mengubah baris tertentu) baru sebagian — bagian kegiatan menyusul di tahap 4.
- **Belum ada notifikasi, berkas, dan kegiatan.** Sesuai urutan tahap.
- **Kata sandi awal akun Bapak dibuat oleh saya** (`DwpGtkMalut#2026`) — **mohon segera diganti** lewat menu Profil → Ganti kata sandi.

## 4. Yang menunggu Bapak

1. Data susunan pengurus (nama, jabatan, email) untuk saya masukkan.
2. Konfirmasi lanjut ke tahap berikutnya: modul berkas (unggah dua tahap + kompresi + pembersih berkas) atau langsung ke modul Pengurus + Kegiatan.
