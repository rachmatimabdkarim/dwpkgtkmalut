# LAPORAN UJI MENYELURUH PER PERAN (Tahap 10)

Tanggal: 8 Oktober 2026 · Status: **lolos, siap dilanjutkan ke pemasangan**

---

## 1. Hasil uji wewenang (lewat jalur data langsung)

Delapan peran diuji satu per satu: boleh membaca apa, dan boleh mengubah apa.

| Peran | Hasil |
|---|---|
| Super Admin | 0 penyimpangan |
| Ketua | 0 penyimpangan |
| Wakil Ketua | 0 penyimpangan |
| Sekretaris | 0 penyimpangan |
| Bendahara | 0 penyimpangan |
| Ketua Seksi/Bidang | 0 penyimpangan |
| Pengurus/Anggota | 0 penyimpangan |
| Editor Konten | 0 penyimpangan |

Data yang boleh dibaca pengurus: kegiatan, anggaran (RAB), catatan persetujuan, daftar
pengurus, profil pengguna, pengaturan aplikasi, tampilan situs, berita, presensi.
Data yang dibatasi: **catatan aktivitas** — hanya Super Admin, Ketua, Wakil Ketua, dan
Sekretaris; empat peran lain terbukti **tidak** menerima data apa pun.

Yang diuji untuk pengubahan: mengubah tampilan situs (telepon). Hasil: **hanya Super Admin
yang berhasil mengubah; tujuh peran lain datanya tidak berubah** walaupun jawabannya
"berhasil" (perilaku aturan pengaman yang benar).

## 2. Hasil uji tampilan per peran (menu & pagar akses halaman)

| Peran | Menu yang terlihat | Coba buka Pengaturan | Coba buka Pengurus |
|---|---|---|---|
| Super Admin | Beranda, Kegiatan, Konten, Pengurus, Pengaturan, Profil | bisa | bisa |
| Ketua | Beranda, Kegiatan, Pengurus, Profil | dialihkan ke Beranda | bisa |
| Bendahara | Beranda, Kegiatan, Profil | dialihkan | dialihkan |
| Ketua Seksi/Bidang | Beranda, Kegiatan, Profil | dialihkan | dialihkan |
| Pengurus/Anggota | Beranda, Kegiatan, Profil | dialihkan | dialihkan |
| Editor Konten | Beranda, Kegiatan, Konten, Profil | dialihkan | dialihkan |

## 3. Kebocoran yang ditemukan dan sudah ditutup

**Temuan:** pengurus biasa berhasil **mengubah data tampilan situs** (warna/identitas),
padahal seharusnya hanya Super Admin. Nilai uji benar-benar tersimpan di database.

**Penyebab:** ada aturan pengaman lama yang membuka akses untuk semua pengurus, sehingga
meniadakan pembatasan yang sudah ditulis.

**Perbaikan:** seluruh aturan lama dihapus dan ditulis ulang; hanya Super Admin yang boleh
mengubah. Diuji ulang: delapan peran, semuanya benar.

## 4. Catatan penting tentang cara menguji

Selama pengujian sempat muncul penilaian yang **salah**: perubahan yang ditolak tetap
mengembalikan jawaban "berhasil" tanpa mengubah data, sehingga tampak ada kebocoran padahal
tidak. Pelajaran: **yang menentukan adalah apakah datanya benar-benar berubah**, bukan kode
jawaban. Cara uji sudah diperbaiki (baca nilai sebelum, coba ubah, baca lagi sesudah).

## 5. Yang belum diuji

- Uji tampilan di ukuran layar sungguhan (HP/tablet) untuk seluruh halaman per peran —
  baru pada beberapa halaman utama.
- Alur bersamaan beberapa pengurus menyetujui pada waktu yang sama.
- Pemulihan dari cadangan (belum ada prosedurnya).
