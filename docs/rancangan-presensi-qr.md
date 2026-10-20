# RANCANGAN — PRESENSI LEWAT QR CODE

Diminta pemilik. Ditulis dulu agar tidak tumpang tindih dengan aturan yang sudah ada.

## Masalah yang dipecahkan

Saat ini presensi dicatat manual satu per satu oleh pengelola presensi. Pada
kegiatan dengan banyak peserta, ini lambat dan rawan salah catat.

## Alur yang diusulkan

```
1. Pengelola presensi membuat QR  →  tampil di layar / dicetak / ditayangkan
2. Peserta memindai dengan HP    →  membuka halaman presensi
3. Peserta mengisi nama / masuk  →  tercatat sebagai "Menunggu konfirmasi"
4. Petugas memeriksa fisik       →  menekan "Hadir" atau "Tidak hadir"
5. Yang dikonfirmasi petugas     →  dihitung sebagai hadir sah
```

**Penting:** absen lewat QR saja **belum dihitung hadir**. Harus ada konfirmasi
petugas — sesuai permintaan pemilik ("konfirmasi kehadiran secara fisik").

## Tiga status presensi (tidak bertambah tabel baru)

Memakai tabel `attendances` yang sudah ada, dengan kolom `keterangan`:

| Keterangan | Arti | Dihitung hadir? |
|---|---|---|
| `Menunggu` | Absen lewat QR, belum diperiksa petugas | **Belum** |
| `Hadir` | Dikonfirmasi petugas (atau dicatat manual) | Ya |
| `Izin` / `Sakit` | Tidak hadir, dengan alasan | Tidak |

`Menunggu` adalah status BARU. Status lama tidak berubah.

## Tampilan

### A. Tab Presensi — dua bagian, bukan dua tab

```
┌─ Presensi ────────────────────────────────────────────┐
│  Hadir 12 · Menunggu 5 · Izin 1 · Sakit 0             │
│                                                        │
│  [ Tampilkan QR ]   [ + Tambah Peserta Manual ]        │
│                                                        │
│  ⚠ 5 peserta menunggu konfirmasi                       │
│  ┌──────────────────────────────────────────────┐     │
│  │ Budi Santoso      09.14  [Hadir] [Tidak]     │     │
│  │ Siti Aminah       09.16  [Hadir] [Tidak]     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  Daftar hadir sah (12)                                 │
│  ✓ Aida Ibrahim    Hadir   09.02                       │
│  ✓ Ny. Nur         Hadir   09.05                       │
└────────────────────────────────────────────────────────┘
```

- **Satu tempat**, bukan tab baru → tidak menambah kerumitan.
- Yang **menunggu konfirmasi** diletakkan paling atas, karena itu pekerjaan
  petugas hari itu.
- Setelah dikonfirmasi, baris berpindah ke daftar hadir sah.

### B. Halaman QR (dibuka peserta)

`/presensi/[kode]` — halaman publik, tanpa login.

```
┌──────────────────────────────┐
│  DWP KGTK Malut              │
│  Presensi Kegiatan           │
│                              │
│   Seminar peran perempuan    │
│   28 Oktober 2026            │
│   Aula Kantor GTK Malut      │
│                              │
│   ┌────────────────┐         │
│   │  [Nama lengkap]│         │
│   └────────────────┘         │
│   [ Saya Hadir ]             │
│                              │
│   Sudah absen? Lihat status  │
└──────────────────────────────┘
```

- Nama wajib diisi. Kalau nama cocok dengan akun pengurus, ditautkan otomatis.
- Setelah menekan, muncul: **"Terima kasih. Kehadiran Anda menunggu
  konfirmasi petugas."**
- Bisa dibuka berulang; nama yang sama tidak tercatat dua kali.

### C. Layar QR untuk ditayangkan

Tombol **"Tampilkan QR"** membuka layar penuh berisi QR besar + nama kegiatan —
untuk ditayangkan lewat proyektor atau dicetak.

## Keamanan yang perlu dijaga

| Risiko | Penjagaan |
|---|---|
| Kode QR disebar ke orang luar | Kode hanya bisa dibuat pengelola presensi; kegiatannya tetap harus berstatus berjalan; kode bisa **ditutup** kapan saja |
| Satu orang absen berkali-kali | Nama sama (tanpa beda huruf besar/spasi) ditolak |
| Absen di luar jam kegiatan | Presensi ditutup otomatis saat kegiatan bukan "berjalan" |
| Peserta mengaku sudah hadir padahal tidak | **Konfirmasi petugas wajib** — absen QR saja tidak dihitung |

## Yang TIDAK diubah

- Aturan pengelola presensi: hanya yang ditugaskan (plus penanggung jawab &
  Super Admin) yang bisa membuka dan mengisi.
- Pencatatan manual tetap ada — QR hanya menambah jalan, tidak menggantikan.
- Syarat "Tandai Selesai": tetap butuh presensi. Yang dihitung adalah hadir **sah**
  (dikonfirmasi), bukan yang masih menunggu.
- Tampilan tab Presensi tetap terlihat untuk semua; hanya alat ubah yang dibatasi.

## Yang perlu diputuskan pemilik

1. **Tombol "Tutup presensi"** — perlu atau tidak? (supaya kode tidak bisa dipakai
   setelah acara selesai)
2. **Peserta luar** (bukan pengurus) boleh absen lewat QR? Atau hanya pengurus?
3. Apakah nama yang sudah absen boleh **memperbaiki nama sendiri** (salah ketik)?
   Usulan saya: tidak — petugas yang memperbaiki.

## Urutan pengerjaan

1. Migrasi: status `Menunggu` + tabel kode QR kegiatan
2. Halaman publik presensi + aksi absen
3. Panel konfirmasi di tab Presensi
4. Layar QR untuk ditayangkan
5. Uji: absen ganda, kode ditutup, kegiatan bukan berjalan, anggota tak berhak
