# RANCANGAN — PILIHAN FOTO DOKUMENTASI DI LAPORAN

Diminta pemilik:
> "Bagian F. Dokumentasi jangan otomatis memasukkan semua foto. Berikan opsi
> pilihan foto mana saja yang mau ditampilkan di laporan. Pilihan itu juga
> menjadi pilihan untuk publikasi di web publik. Jangan sampai tumpang tindih
> atau bertolakbelakang."

---

## 1. Keadaan sekarang

| Hal | Kondisi |
|---|---|
| Centang "Tayangkan di web publik" | **sudah ada** di tab Dokumentasi |
| Kolom penyimpan | `attachments.visibilitas` = `publik` / `privat` |
| Laporan bagian F | mengambil **SEMUA** foto resmi, tanpa pilihan |
| Galeri web publik | mengambil foto `visibilitas = publik` |

**Masalah:** ada dua daftar yang harus dicocokkan manual. Foto bisa tayang di
web tapi tidak di laporan, atau sebaliknya. Itu sumber tumpang tindih.

---

## 2. Asas rancangan

**SATU pilihan untuk DUA tujuan.**

Centang yang sudah ada diubah maknanya menjadi:
> **"Tampilkan di laporan & web publik"**

Tidak ada centang kedua. Tidak ada daftar terpisah. Satu sumber kebenaran:
`attachments.visibilitas`.

```
centang AKTIF   → tampil di LAPORAN  +  tampil di WEB PUBLIK
centang MATI    → tidak tampil di keduanya (arsip internal saja)
```

---

## 3. Tampilan yang diubah

### A. Tab Dokumentasi — label centang

**Sebelum:** "Tayangkan di web publik"
**Sesudah:** "Tampilkan di laporan & web publik"

Ditambah keterangan kecil: *"Satu pilihan untuk keduanya."*

### B. Laporan bagian F — hanya foto terpilih

Foto yang tidak dicentang **tidak muncul** di laporan.

Bila belum ada yang dicentang, bagian F menampilkan:
> *"Belum ada foto yang dipilih untuk laporan."*

### C. Jumlah terpilih ditampilkan

Di atas daftar foto: **"2 dari 5 foto dipilih untuk laporan & web publik"**

Supaya penyusun tahu apa yang akan tercetak.

---

## 4. Alur kerja

```
1. Petugas dokumentasi mengunggah foto
   → otomatis TIDAK terpilih (aman, belum tayang di mana pun)
2. Petugas memeriksa satu per satu, mencentang yang pantas
3. Foto tercentang → langsung tayang di laporan + web publik
4. Penyusun laporan melihat bagian F: hanya foto terpilih
```

---

## 5. Yang TIDAK diubah

- Unggahan baru tetap **belum tayang** sampai diperiksa (aturan lama).
- Batas 10 foto publik tetap berlaku.
- Hanya pengelola dokumentasi / penanggung jawab / pengurus inti yang boleh
  mencentang (aturan yang sudah dirapikan sebelumnya).
- Foto di luar bagian F laporan (mis. galeri beranda) memakai aturan yang sama.

---

## 6. Yang perlu diperbaiki

| Berkas | Perubahan |
|---|---|
| `dokumentasi.tsx` | label centang → "Tampilkan di laporan & web publik" + penghitung |
| `laporan-data.ts` | bagian F hanya ambil `visibilitas = 'publik'` |
| `lembar-laporan.tsx` | teks kosong: "Belum ada foto yang dipilih untuk laporan." |

**Tanpa kolom baru, tanpa tabel baru.** Cuma memakai yang sudah ada.

---

## 7. Uji yang harus lulus

1. Foto belum dicentang → tidak muncul di laporan, tidak di web publik
2. Foto dicentang → muncul di **keduanya**
3. Centang dicabut → hilang dari keduanya
4. Belum ada foto terpilih → laporan menampilkan kalimat kosong yang jelas
5. Jumlah terpilih sesuai kenyataan

---

## 8. Satu hal yang perlu diputuskan pemilik

Foto yang **sudah** tercentang sekarang akan ikut hilang dari laporan bila
aturan ini berlalu? Usulan: **tidak** — foto yang sudah `publik` tetap tampil.
Yang berubah hanya bahwa **foto baru tidak otomatis masuk**.
