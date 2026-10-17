# Skema Perbaikan: Data yang Sudah Disetujui Tidak Boleh Diubah Diam-diam

## Masalah yang dilaporkan pemilik

Kegiatan sudah disetujui Sekretaris (sasaran: 30 orang). Pengusul masih bisa
mengubah sasaran menjadi 20 orang. Perubahan terjadi **tanpa sepengetahuan
penyetuju**.

Ini melanggar prinsip dasar persetujuan: yang disetujui adalah angka tertentu,
bukan "angka apa saja yang nanti dipilih pengusul".

## Analisis aturan sekarang

`perbaikiKegiatan` (aksi.ts:173) mengizinkan pengusul mengubah **seluruh data**
(judul, tujuan, sasaran, tanggal, tempat, ringkasan) dengan syarat tunggal:
status belum masuk tahap pelaporan.

Artinya sepanjang tahap perencanaan — termasuk setelah disetujui 1, 2, 3, atau
4 jenjang — pengusul bebas mengubah apa pun. Tidak ada pemberitahuan, tidak ada
jejak ke penyetuju.

## Prinsip perbaikan

Bedakan dua jenis data menurut **apakah ia bahan keputusan penyetuju**:

| Data | Sifat | Aturan |
|---|---|---|
| **Sasaran, tujuan, judul** | Bahan keputusan — penyetuju menilai kelayakan dari sini | Terkunci sejak status `diajukan`. Wajib lewat **Ajukan Perubahan** resmi |
| **Tanggal, tempat, ringkasan publik** | Teknis/pelengkap — sering baru pasti belakangan, tidak mengubah kelayakan | Boleh diperbaiki langsung, tetapi **wajib tercatat & penyetuju diberi tahu** |

Alasan pemisahan ini: mengubah tanggal atau tempat karena aula bentrok itu wajar
dan tidak mengubah pertimbangan penyetuju. Tetapi mengubah **sasaran 30 → 20**
mengubah dasar penilaian — bisa jadi penyetuju menyetujui karena sasarannya 30.

## Perbaikan yang diterapkan

1. **Kunci kolom bahan keputusan** setelah kegiatan diajukan (status bukan
   `draf`/`revisi`/`ditolak`): `judul`, `tujuan`, `sasaran`.
2. **Beri tahu penyetuju** setiap kali perbaikan langsung dilakukan pada
   kegiatan yang sudah punya keputusan — agar tidak ada perubahan diam-diam.
3. **Pesan jelas** di layar: kolom mana yang terkunci dan harus lewat mana.

## Bukti yang harus dikumpulkan

1. Kegiatan disetujui Sekretaris → pengusul coba ubah sasaran → **DITOLAK**,
   dengan pesan yang menyebut harus lewat Ajukan Perubahan.
2. Kolom tanggal & tempat pada kegiatan yang sama → **BOLEH**, dan penyetuju
   menerima pemberitahuan bahwa datanya diperbaiki.
3. Pada status `draf`/`revisi` (belum ada persetujuan) → semua kolom tetap
   boleh diubah langsung, karena belum ada yang disetujui.
4. Baca ulang basis data setiap langkah — bukan menilai dari pesan di layar.
