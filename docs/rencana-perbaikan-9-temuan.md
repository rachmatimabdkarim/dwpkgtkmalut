# Rencana Perbaikan — 9 Temuan Pengujian Pemilik

Semua temuan DIVERIFIKASI di kode sebelum diperbaiki. Tidak ada yang tebakan.

| # | Temuan pemilik | Terverifikasi | Rencana |
|---|---|---|---|
| 1 | Kotak "Pengajuan Perubahan Kegiatan" tampil untuk semua akun, tidak ada tombolnya | PanelPerubahan dirender tanpa cek hak | Tampilkan hanya untuk pengusul & peran yang BERHAK memutuskan |
| 2 | Pengusul bisa menyetujui pengajuan perubahannya sendiri | `putuskanPerubahan` hanya cek PERAN_INTI, tidak cek `diajukan_oleh` | Tolak bila pemutus = pengaju; sembunyikan tombolnya |
| 3 | Saat status `berjalan`, tombol "Tandai Selesai" + "Ajukan Perubahan" tampil bersamaan | Dua blok aksi dirender tanpa saling meniadakan | Satu aksi utama: "Tandai Selesai". Ajukan Perubahan dipindah ke tab Anggaran |
| 4 | Peserta presensi bisa dobel | Tidak ada pemeriksaan duplikat | Cegah peserta yang sama dua kali + cegah nama bebas kembar |
| 5 | Laporan masih bisa diedit saat sedang diajukan/direview | `bisaUbah` hanya blokir laporan_disetujui & arsip | Kunci saat status laporan_*; hanya bisa diubah saat `selesai` |
| 6 | Panitia/tugas/presensi/dokumentasi masih bisa diubah saat laporan diajukan | Sama seperti #5 | Kunci seluruh modul pelaksanaan begitu laporan diajukan |
| 7 | Tombol "Simpan Laporan" masih aktif setelah diajukan | Tombol dirender terpisah dari `bisaUbah` | Sembunyikan tombol simpan bila tidak boleh diubah |
| 8 | Foto di PDF laporan hanya nama berkas, gambarnya tidak tampil | Bagian VI hanya menulis `nama_asli` | Gambar thumbnail asli ke PDF + keterangan |
| 9 | "Perbandingan anggaran" tidak bisa diisi | Hanya menampilkan rencana vs realisasi | Realisasi diisi lewat tab Anggaran (jelaskan di layar) |

## Kaidah yang dipakai

- **Satu status = satu aksi utama.** Tombol yang saling meniadakan tidak boleh tampil bersama.
- **Yang mengajukan tidak boleh memutuskan pengajuannya sendiri** — sama seperti aturan persetujuan kegiatan.
- **Sekali laporan diajukan, datanya terkunci.** Yang dinilai penyetuju harus sama dengan yang dilihat pengusul.
- **Panel yang tidak ada tombolnya tidak perlu ditampilkan.** Menampilkan judul + keterangan kosong tanpa aksi hanya membingungkan.
