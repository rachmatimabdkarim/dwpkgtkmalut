# SKENARIO UJI COBA — Sistem Informasi DWP Kantor GTK Malut

**Alamat aplikasi:** https://dwpkgtkmalut.vercel.app
**Waktu yang dibutuhkan:** sekitar 45–60 menit untuk seluruh alur
**Perangkat:** bisa dari HP atau komputer (HP lebih menggambarkan pengalaman pengurus)

---

## Sebelum mulai: siapkan akun uji

Bapak akan berperan bergantian sebagai beberapa orang, karena alur persetujuan
memang melibatkan beberapa jabatan. **Satu orang tidak boleh menyetujui usulannya
sendiri** — jadi memang harus berganti akun.

Siapkan 4 akun ini (sandinya ada di daftar rahasia yang saya simpan):

| Peran | Akun | Kegunaan dalam uji coba |
|---|---|---|
| Ketua Seksi | `yayuk@dwpkgtkmalut.com` | Mengusulkan kegiatan |
| Sekretaris | `fadila@dwpkgtkmalut.com` | Menyetujui tahap 1 |
| Bendahara | `jumaini@dwpkgtkmalut.com` | Menyetujui tahap 2 |
| Wakil Ketua | `wahyuni@dwpkgtkmalut.com` | Menyetujui tahap 3 |
| Ketua | `washliyatul@dwpkgtkmalut.com` | Menyetujui tahap akhir |
| Super Admin | `rachmat.karim@kemendikdasmen.go.id` | Melihat semua + pengaturan |

**Tips:** buka di jendela penyamaran (incognito) supaya bisa masuk-keluar akun
bergantian tanpa keluar dari akun Bapak sendiri.

**Alamat penting:**
- Halaman web publik: `https://dwpkgtkmalut.vercel.app`
- Panel admin: `https://dwpkgtkmalut.vercel.app/masuk`

---

# BAGIAN A — MENGENAL TAMPILAN PUBLIK (10 menit)
*Apa yang dilihat masyarakat umum. Buka tanpa perlu masuk.*

## A1. Beranda
Buka `https://dwpkgtkmalut.vercel.app`

**Yang harus Bapak lihat:**
- Logo DWP di pojok kiri atas
- Menu: Beranda · Profil · Agenda · Berita · Galeri (5 menu, tidak lebih)
- Kalimat sambutan dari Ketua
- Bagian "Agenda Terdekat" berisi kegiatan yang akan datang
- Bagian berita terbaru dengan gambar
- Footer berisi alamat, telepon, email, dan tautan Kontak
- **Ikon di tab peramban** sudah memakai logo DWP (bukan ikon bawaan)

**Yang harus Bapak TIDAK lihat:** angka anggaran (RAB), catatan persetujuan,
daftar hadir, atau nama peserta.

## A2. Empat halaman menu
Klik satu per satu, pastikan isinya masuk akal dan gambarnya termuat:

| Menu | Yang harus ada |
|---|---|
| **Profil** | Sambutan, profil singkat, susunan pengurus dengan jabatan & bidang |
| **Agenda** | Daftar kegiatan mendatang + kegiatan yang sudah lewat |
| **Berita** | Daftar berita; klik satu untuk membuka isi lengkapnya |
| **Galeri** | Foto-foto kegiatan yang ditandai boleh tampil publik |

## A3. Unduhan
Klik tautan **Unduhan** di bagian footer. Harus ada daftar dokumen yang bisa
diunduh oleh masyarakat umum.

## A4. Kontak (halaman baru)
Klik **Kontak** di footer. Halaman ini harus berisi:
- Alamat lengkap kantor
- Nomor telepon yang bisa diklik untuk menelepon
- Email yang bisa diklik
- Peta lokasi (Google Maps) yang bisa digeser dan diperbesar
- **Form kirim pesan**: Nama, Email, Pesan

**UJI:** Isi form itu dengan nama "Uji Coba Bapak", email milik Bapak, pesan
"Mohon informasi jadwal kegiatan DWP." Lalu klik **Kirim Pesan**.
Harus muncul tulisan "Pesan Anda sudah terkirim."

**Cek langsung di peta:** pastikan titiknya menunjukkan kantor yang benar.

---

# BAGIAN B — ALUR KEGIATAN UTAMA (25 menit)
*Inti aplikasi: dari usulan sampai jadi berita publik.*

## Tahap 1 — Ketua Seksi mengusulkan kegiatan

**Masuk sebagai:** `yayuk@dwpkgtkmalut.com`

1. Masuk di `/masuk` dengan email & sandi itu
2. Buka menu **Kegiatan** → klik **+ Kegiatan Baru**
3. Isi form:
   - Nama kegiatan: `Uji Coba — Rapat Koordinasi Bidang`
   - Tujuan: `Menyelaraskan program bidang semester depan`
   - Sasaran: `Seluruh pengurus DWP`
   - Tanggal: pilih tanggal sekitar 2 minggu ke depan
   - Tempat: `Aula Kantor GTK Malut`
   - Penanggung jawab: pilih diri sendiri
4. **Tambahkan RAB**: buat 2–3 baris anggaran (mis. Konsumsi 500.000, ATK 200.000)
5. **Lampirkan dokumen** TOR (boleh foto/PDF apa saja) — perhatikan bahwa
   sebelum terunggah, fotonya **dikecilkan otomatis** di peramban
6. **Ajukan** kegiatan

**Cek:** status kegiatan berubah jadi **"Diajukan"**. Muncul notifikasi lonceng
untuk Sekretaris.

⚠️ **Perhatikan:** setelah diajukan, Bapak **tidak boleh menyetujui sendiri** —
tombol Setuju seharusnya tidak ada untuk pengusul.

## Tahap 2 — Sekretaris menyetujui (jenjang 1)

**Masuk sebagai:** `fadila@dwpkgtkmalut.com` (keluar dulu dari akun sebelumnya)

1. Lihat **ikon lonceng** → harus ada pemberitahuan kegiatan baru menunggu
2. Buka menu **Kegiatan** → buka kegiatan "Uji Coba — Rapat Koordinasi Bidang"
3. Pilih **Setuju** → kegiatan naik ke jenjang berikutnya

**UJI JUGA SALAH SATU INI pada kegiatan lain:**
- Pilih **Minta Revisi** + tulis catatan → kegiatan kembali ke pengusul
  dengan catatan terlihat
- Pilih **Tolak** + tulis catatan → kegiatan berhenti
- ⚠️ **Catatan WAJIB diisi** untuk Revisi dan Tolak — coba kirim tanpa catatan,
  harus ditolak oleh aplikasi

## Tahap 3 — Bendahara menyetujui (jenjang 2)

**Masuk sebagai:** `jumaini@dwpkgtkmalut.com`

1. Buka kegiatan yang sama → **Setuju**
2. Perhatikan: urutan memang Bendahara setelah Sekretaris

## Tahap 4 — Wakil Ketua menyetujui (jenjang 3)

**Masuk sebagai:** `wahyuni@dwpkgtkmalut.com` → buka kegiatan → **Setuju**

## Tahap 5 — Ketua menyetujui (jenjang akhir)

**Masuk sebagai:** `washliyatul@dwpkgtkmalut.com` → buka kegiatan → **Setuju**

**Cek penting:** setelah disetujui akhir, kegiatan **muncul otomatis di halaman
Agenda publik**. Buka `/agenda` di jendela lain dan cari judulnya.

⚠️ Perhatikan bahwa yang muncul di publik hanya: judul, ringkasan tujuan,
tanggal, dan tempat. **RAB dan catatan persetujuan TIDAK muncul.**

## Tahap 6 — Pelaksanaan

**Masuk sebagai:** Ketua Seksi (`yayuk@dwpkgtkmalut.com`) atau Super Admin

1. Buka kegiatan → tandai **Berjalan**
2. **Susun panitia**: tugaskan 2–3 orang dengan tugas masing-masing
3. **Presensi**: catat kehadiran beberapa orang
4. **Unggah dokumentasi foto** — saat mengunggah, ada penanda
   **"boleh tampil publik"**. Nyalakan untuk 2 foto, matikan untuk 1 foto.
5. **Catat realisasi biaya** (isi beberapa angka)
6. Tandai kegiatan **Selesai**

**Cek:** buka `/galeri` publik → harus muncul **hanya foto yang ditandai publik**.
Foto yang ditandai tidak publik **tidak boleh muncul** di mana pun di web publik.

## Tahap 7 — Pengajuan perubahan (penting!)

Saat kegiatan sudah berjalan, coba ubah **tempat** kegiatan:

1. Ajukan perubahan tempat dari "Aula Kantor GTK Malut" ke
   "Aula Kantor GTK Malut, Kota Ternate"
2. **Cek:** perubahan **tidak langsung berlaku** — harus disetujui ulang
3. Setujui perubahan itu lewat jenjang yang sama
4. **Cek:** setelah disetujui, tempatnya **benar-benar berubah** di halaman
   kegiatan dan di agenda publik

*Catatan: ini dulu sempat bermasalah — disetujui tapi tempatnya tidak berubah.
Sekarang sudah diperbaiki, mohon dipastikan kembali.*

## Tahap 8 — Laporan

1. Buka kegiatan → bagian **Laporan** → klik **Ajukan Laporan**
2. Isi: ringkasan hasil, hasil yang dicapai, realisasi vs RAB, kendala,
   unggah foto/bukti
3. Ajukan laporan
4. **Setujui berjenjang** dengan urutan: **Bendahara → Sekretaris → Wakil Ketua
   → Ketua** (perhatikan: urutan laporan BEDA dengan urutan kegiatan)
5. Setelah disetujui akhir → laporan **terkunci** dan kegiatan masuk **Arsip**

**Cek:** berita kegiatan **terakit otomatis** di halaman Berita publik dari
ringkasan + hasil + foto publik. Buka `/berita` dan cari judulnya.

⚠️ Yang **tidak boleh** muncul di berita publik: laporan keuangan, bukti
pengeluaran, dan kendala internal.

---

# BAGIAN C — KONTEN & PENGATURAN (15 menit)
*Masuk sebagai Super Admin: `rachmat.karim@kemendikdasmen.go.id`*

## C1. Kelola Berita (menu Konten)
1. Buka **Konten** → buat berita baru
2. Isi judul, ringkasan, isi lengkap, unggah gambar sampul
3. Terbitkan
4. **Cek:** muncul di `/berita` publik, gambarnya tampil

## C2. Pesan Masuk (menu Pengurus)
1. Buka **Pengurus** → klik tautan **Pesan Masuk**
2. Harus ada pesan uji yang Bapak kirim di Bagian A4
3. Klik **Baca** → klik **Tandai selesai** + tulis catatan
4. **Cek:** jumlah "Baru" berkurang
5. Di bagian bawah, coba isi **daftar penerima email** (satu email per baris)

## C3. Kelola Pengurus
1. Masih di menu **Pengurus**
2. Coba **+ Tambah Pengurus** → isi nama & jabatan
3. Coba **⋯ → Atur ulang sandi** pada salah satu pengurus
   - Sandi baru muncul **sekali** — catat/salin
   - Ada tombol **Kirim lewat WhatsApp** yang otomatis menyusun pesannya
4. Perhatikan penanda jingga **"Belum pernah ganti sandi"**

## C4. Pengaturan & Tampilan
1. Buka **Pengaturan**
2. Ubah **nama aplikasi**, **warna utama**, **alamat/telepon/email**
3. Klik Simpan
4. **Cek:** perubahan langsung terlihat di web publik
5. Coba ganti **logo** dan **favicon** → cek di tab peramban

## C5. Ganti sandi sendiri
1. Buka **Profil** → bagian **Ganti kata sandi**
2. Masukkan sandi lama, sandi baru (minimal 10 karakter, campur huruf
   besar-kecil, angka, dan tanda baca)
3. **Cek:** penanda "Belum pernah ganti sandi" hilang dari daftar Pengurus

---

# BAGIAN D — UJI KEAMANAN (5 menit)
*Membuktikan data internal tidak bocor ke publik.*

1. **Masuk sebagai pengurus biasa** (`aida@dwpkgtkmalut.com`)
   - Menu **Pengaturan** harus **TIDAK ADA**
   - Kalaupun alamat `/admin/pengaturan` dibuka langsung, harus **ditolak**
2. **Masuk sebagai Editor** (`hastizia@dwpkgtkmalut.com`)
   - Hanya boleh melihat **Konten**, tidak boleh mengelola kegiatan
3. **Menguji dari luar:** di jendela penyamaran TANPA masuk, buka
   `https://dwpkgtkmalut.vercel.app/admin` → harus **dialihkan ke halaman masuk**

---

# LEMBAR CATATAN

Isi selama mencoba. Coret yang tidak perlu.

| No | Yang diuji | Berhasil | Gagal | Catatan Bapak |
|----|-----------|:--------:|:-----:|---------------|
| A1 | Beranda lengkap, favicon benar | ☐ | ☐ | |
| A2 | 4 halaman menu berisi & gambar tampil | ☐ | ☐ | |
| A3 | Unduhan ada isinya | ☐ | ☐ | |
| A4 | Kontak: peta + form terkirim | ☐ | ☐ | |
| B1 | Ketua Seksi ajukan kegiatan | ☐ | ☐ | |
| B2 | Sekretaris setuju (jenjang 1) | ☐ | ☐ | |
| B2 | Revisi/Tolak wajib catatan | ☐ | ☐ | |
| B3 | Bendahara setuju (jenjang 2) | ☐ | ☐ | |
| B4 | Wakil Ketua setuju (jenjang 3) | ☐ | ☐ | |
| B5 | Ketua setuju akhir → muncul di Agenda | ☐ | ☐ | |
| B5 | RAB/catatan TIDAK muncul di publik | ☐ | ☐ | |
| B6 | Panitia, presensi, foto, realisasi biaya | ☐ | ☐ | |
| B6 | Foto non-publik tidak muncul di galeri | ☐ | ☐ | |
| B7 | Pengajuan perubahan tempat | ☐ | ☐ | |
| B7 | Tempat benar-benar berubah setelah disetujui | ☐ | ☐ | |
| B8 | Laporan berjenjang (Bendahara dulu) | ☐ | ☐ | |
| B8 | Berita terakit otomatis di publik | ☐ | ☐ | |
| C1 | Kelola berita + gambar | ☐ | ☐ | |
| C2 | Pesan masuk dibaca & ditandai | ☐ | ☐ | |
| C3 | Atur ulang sandi (tampil sekali) | ☐ | ☐ | |
| C4 | Ubah identitas situs → tampil di publik | ☐ | ☐ | |
| C4 | Ganti logo & favicon | ☐ | ☐ | |
| C5 | Ganti sandi sendiri | ☐ | ☐ | |
| D1 | Pengurus biasa ditolak di Pengaturan | ☐ | ☐ | |
| D2 | Editor hanya boleh Konten | ☐ | ☐ | |
| D3 | Tanpa masuk, /admin dialihkan | ☐ | ☐ | |

**Yang paling penting dicatat:** di mana Bapak merasa bingung atau tersendat.
Itu tanda tampilannya masih perlu diperjelas — dan itu bagian yang paling
berguna untuk diperbaiki.

---

# JIKA ADA YANG TIDAK BERJALAN

Catat tiga hal ini, lalu beri tahu saya:

1. **Di halaman mana** kejadiannya
2. **Sedang masuk sebagai siapa** (email-nya)
3. **Apa yang Bapak klik** dan apa yang muncul di layar

Ketiganya cukup untuk saya lacak langsung sampai penyebabnya.

**Batas waktu alur yang berlaku di aplikasi:**
- Pengingat persetujuan: **3 hari**
- Pengingat laporan: **7 hari**

Kalau ada kegiatan yang menunggu lebih lama dari itu, akan muncul peringatan
di panel — itu memang disengaja.
