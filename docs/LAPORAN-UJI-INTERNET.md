# LAPORAN UJI MENYELURUH DI INTERNET (Tahap 10 — lanjutan)

Alamat: **https://dwpkgtkmalut.vercel.app**
Tanggal: 8 Oktober 2026

---

## 1. Masuk semua peran di internet

| Peran diuji | Masuk | Menu yang terlihat | Buka Pengaturan |
|---|---|---|---|
| Super Admin | berhasil | Beranda, Kegiatan, Konten, Pengurus, Pengaturan, Profil | **bisa** |
| Ketua | berhasil | Beranda, Kegiatan, Pengurus, Profil | dialihkan |
| Wakil Ketua | berhasil | Beranda, Kegiatan, Pengurus, Profil | dialihkan |
| Sekretaris | berhasil | Beranda, Kegiatan, Konten, Pengurus, Profil | dialihkan |
| Bendahara | berhasil | Beranda, Kegiatan, Profil | dialihkan |
| Ketua Bidang | berhasil | Beranda, Kegiatan, Profil | dialihkan |
| Anggota | berhasil | Beranda, Kegiatan, Profil | dialihkan |

Hasil di internet **sama persis** dengan hasil uji di server. Tujuh akun diuji masuk
lewat lapisan masuk yang sama: semuanya berhasil.

## 2. Alur kegiatan penuh (internet)

**a. Persiapan sampai disetujui (DWP-2026-005)**
Ketua Bidang membuat kegiatan lewat formulir 3 langkah → diajukan →
Sekretaris ✔ → Bendahara ✔ → Wakil Ketua ✔ → **Disetujui**.

**b. Minta Revisi (DWP-2026-003)**
Sekretaris menekan "Minta Revisi", catatan wajib diisi → status jadi **Perlu revisi** →
pengusul melihat tombol "Ajukan" untuk mengirim ulang, linimasa menampilkan "Minta revisi".

**c. Tolak (DWP-2026-004)**
Tiga tahap disetujui berurutan → Ketua menekan "Tolak" dengan catatan → status **Ditolak**,
catatan tersimpan lengkap.

**d. Delegasi**
Dibuat pelimpahan wewenang Ketua → Wakil Ketua (tanggal berlaku). Wakil Ketua menyetujui
tahap 3, lalu **tetap bisa menilai tahap 4 (Ketua)** karena pelimpahan aktif → kegiatan
berstatus **Disetujui**.

**e. Pengusul tidak bisa menyetujui usulannya sendiri** — terbukti: pengusul membuka
kegiatannya sendiri dan **hanya** melihat tombol "Kembali", tanpa tombol Setujui.

## 3. Unggah berkas (internet)

| Uji | Hasil |
|---|---|
| Kompresi foto | 83 KB → 34 KB (WebP), hemat 59% |
| Thumbnail | dibuat otomatis 400 px (6 KB) |
| Pengesahan foto | berhasil setelah perbaikan (lihat bagian 5) |
| Tanda "boleh publik" | berhasil, foto muncul di Galeri publik |
| Dokumen (AD/ART) | terunggah, bisa diunduh publik tanpa login |

## 4. Penyapu berkas & penjadwal (internet)

- Penyapu menolak akses tanpa kunci: **"Akses tidak diizinkan"** ✔
- Mode uji coba: memeriksa 11 berkas, menemukan 2 berkas tak terpakai, **tidak menghapus
  apa pun** ✔
- Keep-alive: berjalan ✔
- Pengingat persetujuan: berjalan (0 kegiatan terlambat saat diuji) ✔

## 5. Kebocoran/kesalahan besar yang ditemukan dan ditutup

**Kesalahan kritis: berkas selalu tercatat tanpa pemilik.**
Kolom pemilik berkas tidak pernah diisi oleh kode. Akibatnya foto/dokumen **bisa diunggah
tetapi tidak pernah bisa disahkan** — hanya nyangkut berstatus "sementara" dan tidak muncul
di dokumentasi maupun galeri. Ditemukan karena uji foto di internet gagal meski kompresi
berhasil.

Perbaikan: pengisian pemilik secara otomatis di database (bawaan + pemicu), sekaligus
**memperkuat pengamanan** karena pemilik tidak bisa dipalsukan dari aplikasi. Diuji ulang:
foto tersimpan permanen, muncul di galeri publik.

8 berkas lama tanpa pemilik ditandai dibatalkan; 2 berkas di antaranya menunggu dibersihkan
penyapu (dengan catatan di log).

## 6. Tampilan

- HP (390 px): satu kolom, kelima menu publik muat rata (perbaikan menu Galeri terpotong).
- Tablet (820 px): dua kolom, menu lengkap, tanpa menu ganda.
- Desktop (1366 px): nyaman dibaca.

## 7. Yang belum diuji

- Alur pelaporan lengkap di internet (diuji di server, belum diulang di internet).
- Dua orang menyetujui pada saat yang sama.
- Pemulihan dari cadangan (belum ada prosedurnya).
