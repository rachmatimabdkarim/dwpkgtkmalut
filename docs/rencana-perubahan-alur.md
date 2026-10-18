# RENCANA PERUBAHAN ALUR — SI-ANGGUN

Diminta pemilik. Ditulis dulu supaya tidak ada yang tumpang tindih.

## 1. Siapa yang boleh mengusulkan kegiatan

**Sekarang:** Super Admin, Ketua, Wakil Ketua, Sekretaris, Bendahara, Ketua Bidang,
**dan Anggota** (`pengurus`).

**Menjadi:** Anggota **TIDAK BOLEH** mengusulkan.

| Boleh mengusulkan | Tidak boleh |
|---|---|
| Super Admin | Anggota biasa |
| Ketua | |
| Wakil Ketua | |
| Sekretaris | |
| Bendahara | |
| Ketua Bidang | |

Dampak yang harus disesuaikan:
- `PERAN_PENGAJU` di `src/lib/peran.ts`
- Kebijakan INSERT tabel `activities` di basis data (sebelumnya saya tambahkan
  `pengurus`; sekarang harus dicabut lagi)
- Penyembunyian tombol "Kegiatan Baru" di daftar kegiatan
- Halaman `/admin/kegiatan/baru` — anggota yang membuka langsung harus dialihkan

## 2. Urutan persetujuan kegiatan (perencanaan)

**Sekarang:** Ketua Bidang → Sekretaris → Bendahara → Wakil Ketua → Ketua

**Menjadi:**

| Kondisi | Urutan |
|---|---|
| Kegiatan **ADA RAB** | Bendahara → Wakil Ketua → Ketua |
| Kegiatan **TANPA RAB** | Wakil Ketua → Ketua |

- **Ketua Bidang tidak lagi menyetujui.** Tahap ini dihapus.
- **Sekretaris tidak lagi menyetujui.** Dia hanya menerima notifikasi.
- Tahap Bendahara **dilewati otomatis** bila kegiatan tidak punya RAB.

Dampak:
- Isi `approval_steps` untuk alur `perencanaan`
- Fungsi `tahap_terlewati` / `alasan_tahap_dilewati` — alasan "tanpa bidang" dan
  "pengusul Ketua Bidang" tidak dipakai lagi untuk perencanaan; diganti alasan
  "tidak ada RAB"
- Tampilan linimasa (5 jenjang → 3 jenjang bila ada RAB, 2 jenjang bila tanpa RAB)

## 3. Notifikasi

Sekretaris dan Bendahara **menerima notifikasi setiap tahap** (bukan penyetuju).

Dampak:
- Daftar penerima notifikasi di `src/lib/notifikasi.ts` — tambahkan Sekretaris &
  Bendahara sebagai **pengawas** di setiap keputusan, terpisah dari penyetuju
- Notifikasi tidak boleh dianggap "perlu tindakan" bagi mereka (karena mereka
  bukan pemutus) — hanya pemberitahuan

## 4. Fitur "Ajukan Perubahan"

**Sekarang:** panel tersendiri di bawah ringkasan → formulir baru (jenis, usulan,
alasan) → diputuskan pengurus inti mana pun.

**Menjadi:** **DIHAPUS** sebagai fitur tersendiri.

Perubahan setelah kegiatan disetujui/dijalankan memakai **FORM KEGIATAN YANG SUDAH
ADA** (`form-kegiatan.tsx`, mode ubah), dengan alur persetujuan:

| Kondisi | Urutan persetujuan perubahan |
|---|---|
| Ada RAB | Bendahara → Wakil Ketua → Ketua |
| Tanpa RAB | Wakil Ketua → Ketua |

Hanya **pengusul kegiatan** yang boleh mengusulkan perubahan.

Dampak:
- Hapus `perubahan.tsx` dan seluruh kaitannya di `page.tsx`
- `ubahKegiatan` (mode ubah) harus: menyimpan perubahan → mengembalikan status
  ke alur persetujuan (`diajukan`) → mencatat riwayat "perubahan diajukan" →
  mengirim notifikasi ke penyetuju pertama
- Tombol "Perbaiki Data" (yang sekarang hanya untuk draf/revisi) diganti menjadi
  "Usulkan Perubahan" yang memakai form yang sama, tersedia saat status
  `disetujui` atau `berjalan`
- Tabel `change_requests` tidak dipakai lagi (dibiarkan, tidak dihapus, agar
  riwayat lama tidak hilang)

## 5. Yang TIDAK berubah

- Alur pelaporan: Bendahara → Sekretaris → Wakil Ketua → Ketua (tidak diminta ubah)
- Aturan penanggung jawab (anggota → Ketua Bidang, Ketua Bidang → diri sendiri,
  pengurus harian → sesama pengurus harian)
- Tombol pelaksanaan hanya untuk penanggung jawab + Super Admin
- Aturan "satu jenjang satu keputusan"
- Pengingat 3 hari (persetujuan) dan 7 hari (laporan)

## 6. Urutan pengerjaan

1. `approval_steps` + fungsi tahap terlewati (basis data)
2. `PERAN_PENGAJU` + kebijakan INSERT (anggota tidak boleh mengusulkan)
3. Notifikasi untuk Sekretaris & Bendahara
4. Ubah mode ubah kegiatan menjadi "usulkan perubahan" berjenjang
5. Hapus panel perubahan tersendiri
6. Build, uji menyeluruh, laporkan

## 7. Yang harus diuji setelah selesai

- Anggota tidak melihat tombol "Kegiatan Baru" dan ditolak server
- Kegiatan dengan RAB: Bendahara → Wakil → Ketua
- Kegiatan tanpa RAB: tahap Bendahara dilewati, langsung Wakil → Ketua
- Sekretaris & Bendahara menerima notifikasi tiap tahap
- Pengusul mengubah data setelah disetujui → masuk antrean persetujuan lagi
- Bukan pengusul tidak bisa mengusulkan perubahan
- Panel "Ajukan Perubahan" hilang sepenuhnya
- Alur pelaporan tetap berjalan seperti sebelumnya
