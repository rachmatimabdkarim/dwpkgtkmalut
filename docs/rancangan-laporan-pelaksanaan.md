# RANCANGAN — LAPORAN PELAKSANAAN KEGIATAN

Diminta pemilik:
> "Laporan diambil dari data yang sudah ada. Ringkasan, anggaran, panitia,
> presensi, dokumentasi semuanya diambil dari data yang sudah ada. Dibuat rapi
> dan terstruktur layaknya laporan resmi. Info lain ditambahkan lewat form
> termasuk realisasi anggaran, kendala dan lainnya. Setelah itu draft utuhnya
> masih bisa diedit."

---

## 1. Keadaan sekarang

| Hal | Kondisi |
|---|---|
| Form laporan | 5 kolom teks saja: ringkasan, hasil, kendala, rekomendasi, jumlah hadir |
| Data panitia/tugas | ada, **tidak pernah masuk laporan** |
| Data presensi | ada, hanya dipakai menghitung angka |
| Foto dokumentasi | ada, hanya dipakai di PDF laporan |
| Anggaran & realisasi | ada di `budget_items`, realisasi **tidak bisa diisi per baris** |
| Cetak PDF | ada, tapi isinya terbatas |
| Edit setelah diajukan | terkunci total |

**Masalahnya:** laporan tidak menggambarkan kegiatannya. Penyusun harus
mengetik ulang hal-hal yang sebenarnya sudah tercatat di aplikasi.

---

## 2. Asas rancangan

1. **Satu sumber data.** Semua yang sudah ada ditarik otomatis, tidak diketik ulang.
2. **Yang tak ada di sistem, diisi lewat form.** Realisasi, kendala, hasil, rekomendasi.
3. **Pratinjau = hasil cetak.** Yang dilihat penyusun adalah yang akan dicetak.
4. **Tidak ada tombol ganda.** Form laporan lama diganti, bukan ditambah.

---

## 3. Isi laporan (7 bagian)

| Bagian | Sumber | Cara |
|---|---|---|
| **A. Identitas kegiatan** | kegiatan | Otomatis: nama, nomor, tanggal, tempat, penanggung jawab, bidang |
| **B. Latar & tujuan** | kegiatan | Otomatis dari uraian perencanaan — boleh disunting |
| **C. Kepanitiaan** | `committees` + `tasks` | Otomatis: tabel nama, jabatan panitia, tugas & status |
| **D. Presensi** | `attendances` | Otomatis: tabel hadir/izin/sakit + asal instansi, jumlah per status |
| **E. Anggaran & realisasi** | `budget_items` | Otomatis dari RAB; **realisasi diisi lewat form per baris** |
| **F. Pelaksanaan & hasil** | form | Diketik: ringkasan, hasil, kendala, rekomendasi |
| **G. Dokumentasi** | `attachments` | Otomatis: foto yang ditayangkan, dengan keterangan |

Bagian A–E dan G **tidak bisa diketik** — ditarik langsung. Bagian F yang diisi.

---

## 4. Tampilan — tab Pelaporan

```
┌─ Laporan Pelaksanaan ─────────────────────────────────┐
│ Kelengkapan sumber data                                │
│ ✅ Kepanitiaan (4 orang)   ✅ Presensi (12 hadir)      │
│ ⚠️ Realisasi belum diisi   ✅ Dokumentasi (2 foto)     │
│                                                        │
│ [ Pratinjau laporan ]   [ Cetak PDF ]                  │
└────────────────────────────────────────────────────────┘

Laporan tersusun (pratinjau)   ← seperti kertas A4, siap cetak
┌────────────────────────────────────────────────────────┐
│  LAPORAN PELAKSANAAN KEGIATAN                          │
│  A. Identitas …                                        │
│  B. Kepanitiaan … (tabel)                              │
│  C. Presensi … (tabel)                                 │
│  D. Anggaran … (tabel, rencana vs realisasi)           │
│  E. Pelaksanaan & hasil …                              │
│  F. Dokumentasi … (foto)                               │
└────────────────────────────────────────────────────────┘

[ Sunting isian laporan ]  ← hanya bagian yang diketik
```

**Satu layar, satu tombol utama.** Pratinjau selalu tampil; form hanya dibuka
bila perlu diisi.

---

## 5. Form isian (ringkas — 5 kolom)

Muncul di atas pratinjau, bisa dilipat.

| Kolom | Wajib | Keterangan |
|---|---|---|
| Ringkasan pelaksanaan | ✅ | 2–3 paragraf |
| Hasil yang dicapai | ✅ | dampak nyata |
| Kendala | – | boleh kosong bila tidak ada |
| Rekomendasi/tindak lanjut | – | boleh kosong |
| Realisasi anggaran | – | per baris RAB + biaya lain |

**Realisasi anggaran** diisi langsung di tabel RAB:

```
Uraian            Satuan  Banyak  Rencana        Realisasi
Konsumsi snack    box     30      Rp 750.000     [   650.000 ]
Spanduk           buah    2       Rp 300.000     [   300.000 ]
                                          Total: Rp 1.050.000 → Rp 950.000
```

Selisih dihitung otomatis. Bila realisasi melebihi rencana, muncul peringatan
(bukan larangan — kadang memang terjadi).

**Biaya lain** (opsional, satu baris keterangan + nominal) untuk pengeluaran
yang tidak masuk RAB.

---

## 6. Alur kerja & hak

```
1. Penyusun membuka tab Pelaporan (status: berjalan/selesai)
2. Sistem menampilkan 7 bagian — A–E,G sudah terisi
3. Penyusun mengisi bagian F + realisasi
4. Pratinjau, periksa, boleh diperbaiki berkali-kali
5. "Simpan draf"          → status tetap, bisa diubah lagi
6. "Ajukan laporan"       → masuk persetujuan berjenjang
7. Disetujui semua         → ARSIP (terkunci)
```

| Peran | Boleh |
|---|---|
| Penyusun (PJ / ketua panitia / pengelola laporan) | isi, sunting draf, ajukan |
| Penyetuju berjenjang | baca + cetak |
| Ketua setelah disetujui | buka kunci sekali untuk perbaikan (dicatat) |

**Draf bisa diedit sebanyak apa pun** sesuai permintaan. Setelah **diajukan**,
terkunci — karena sedang diperiksa penyetuju. Kalau ada yang salah, penyetuju
mengembalikan (sudah ada fiturnya).

---

## 7. Yang perlu ditambahkan ke basis data

```sql
-- Realisasi per baris sudah ada di budget_items (kolom `realisasi`).
-- Yang belum: biaya di luar RAB dan catatan penutup.
alter table activity_reports
  add column biaya_lain_keterangan text,
  add column biaya_lain_jumlah numeric default 0,
  add column catatan_penutup text;
```

Hanya **3 kolom tambahan**. Tidak ada tabel baru — sengaja, supaya sederhana.

---

## 8. Yang dihapus / diganti

- Form laporan lama (5 kotak) → diganti bagian F pada form baru
- Tombol "Simpan Laporan" + "Simpan & Ajukan" tetap, tapi cakupannya kini
  seluruh laporan, bukan hanya teks

---

## 9. Urutan pengerjaan

1. Migrasi 3 kolom + izin isi realisasi per baris
2. Fungsi penarik data laporan (satu fungsi, satu tempat)
3. Halaman pratinjau + form isian
4. Isi PDF mengikuti struktur 7 bagian
5. Uji: data kosong, data lengkap, realisasi lewat rencana, edit draf,
   diajukan → terkunci, kembali → bisa diedit

---

## 10. Yang TIDAK diubah

- Alur persetujuan pelaporan: Bendahara → Sekretaris → Wakil Ketua → Ketua
- Syarat "Tandai Selesai" (tugas tercentang, hadir sah, foto ada)
- Presensi QR dan aturan konfirmasi fisik
- Hak panitia & tugas yang baru dirapikan

---

## 11. Keputusan yang perlu pemilik

1. **Kolom "biaya lain"** — perlu, atau cukup RAB saja?
2. **Nama penandatangan** di lembar cetak — otomatis dari Ketua DWP, atau
   isi manual (nama + jabatan) supaya bisa disesuaikan?
3. **Draf bisa diedit sampai kapan?** Usulan saya: sampai diajukan. Setelah
   disetujui terkunci.
