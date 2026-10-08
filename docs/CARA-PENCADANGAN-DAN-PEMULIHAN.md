# CARA MENYELAMATKAN DAN MEMULIHKAN DATA — SISTEM INFORMASI DWP

Berlaku untuk aplikasi **https://dwpkgtkmalut.vercel.app**

---

## 1. Ringkasan singkat

| Hal | Keterangan |
|---|---|
| Apa yang dicadangkan | Seluruh isi database: 28 tabel (kegiatan, anggaran, pengurus, persetujuan, berita, pengaturan, dsb.) |
| Kapan otomatis | Setiap hari pukul **01.00 WIT** |
| Di mana disimpan | Folder `/root/cadangan-dwp/` di server ini |
| Berapa banyak disimpan | 10 cadangan terbaru (yang lebih tua dihapus otomatis) |
| Ukuran satu cadangan | ± 14 KB (sangat kecil, tidak membebani penyimpanan) |
| Sifat | Cadangan menyalin seluruh data, jadi pemulihan mengembalikan keadaan persis saat pencadangan |

---

## 2. Melihat daftar cadangan

```
/root/.venv-dwp/bin/python /root/bin/dwp-cadangkan.py --daftar
```

Contoh hasil:

```
== 3 cadangan tersimpan di /root/cadangan-dwp ==
  dwp-20261008-1743.json.gz  14 KB
  dwp-20261008-1737.json.gz  14 KB
  dwp-20261008-1734.json.gz  13 KB
```

Nama berkas memuat tanggal dan jam: `dwp-TAHUNBULANHARI-JAMMENIT`.

---

## 3. Membuat cadangan tambahan (kapan saja)

Lakukan **sebelum** tindakan berisiko, misalnya sebelum mengubah pengaturan besar
atau membersihkan data:

```
/root/.venv-dwp/bin/python /root/bin/dwp-cadangkan.py
```

Catatan: perintah ini juga menimpa cadangan "terakhir" (`terakhir.json.gz`)
yang dipakai untuk pemulihan cepat.

---

## 4. Memulihkan data dari cadangan

**PERHATIAN:** pemulihan **mengganti seluruh isi** database dengan isi cadangan.
Data yang dibuat setelah cadangan itu akan hilang.

Langkah:

1. Lihat daftar cadangan (bagian 2) dan pilih berkas yang ingin dipakai.
2. Jalankan:

```
/root/.venv-dwp/bin/python /root/bin/dwp-cadangkan.py --pulihkan /root/cadangan-dwp/dwp-20261008-1743.json.gz
```

3. Baca bagian akhir keluaran. Yang **wajib** diperhatikan:

```
== pemulihan selesai: 241 baris dikirim, 241 baris benar-benar tersimpan (diharapkan 241) ==
```

Ketiga angka itu **harus sama**. Bila ada selisih, program akan menampilkan
tabel mana yang kurang — jangan dianggap selesai.

4. Periksa hasilnya di aplikasi: buka https://dwpkgtkmalut.vercel.app dan
   pastikan kegiatan serta pengurus tampil normal.

---

## 5. Bila terjadi hal-hal khusus

### a. Aplikasi menampilkan data kosong padahal tadi ada
Jangan panik dan **jangan menimpa cadangan**. Cadangan harian masih ada di
`/root/cadangan-dwp/`. Pulihkan dari cadangan terbaru (bagian 4).

### b. Ingin mengembalikan ke keadaan sehari sebelumnya
Pilih berkas cadangan dari tanggal yang diinginkan (bagian 2), lalu pulihkan.

### c. Pemulihan terhenti di tengah
Jalankan ulang perintah yang sama. Pemulihan bersifat mengganti seluruh isi,
jadi menjalankannya dua kali tidak membuat data berganda.

### d. Aplikasi tidak bisa diakses sama sekali
Cek alamatnya dari tempat lain. Bila memang mati, yang perlu diperiksa:
- Apakah proyek di Vercel masih aktif
- Apakah database masih hidup (proyek gratis bisa dijeda bila lama tidak aktif)

Pencadangan harian di server ini tetap berjalan selama servernya hidup, dan
berkasnya tetap aman di `/root/cadangan-dwp/`.

---

## 6. Yang perlu dijaga

1. **Salinan di luar server.** Cadangan sekarang hanya ada di server ini.
   Sebaiknya sesekali salin folder `/root/cadangan-dwp/` ke tempat lain
   (flashdisk, Google Drive, atau komputer kantor). Bila server rusak,
   cadangan di dalamnya ikut hilang.
2. **Jangan hapus folder `/root/cadangan-dwp/`** tanpa menggantinya.
3. **Pantau otomatisnya berjalan.** Sesekali periksa:

   ```
   tail -5 /root/cadangan-dwp/catatan.log
   ```

   Bila tanggal terakhirnya sudah lama, berarti pencadangan otomatis berhenti
   dan perlu diperiksa.

---

## 7. UJI TERAKHIR: 8 Oktober 2026

Pemulihan sudah diuji sungguhan, bukan hanya dipastikan "berjalan":

| Uji | Hasil |
|---|---|
| Cadangkan seluruh data | 28 tabel, 241 baris, 14 KB |
| Rusak data sengaja (ubah nama kegiatan) | berhasil dirusak |
| Pulihkan dari cadangan | **241 dari 241 baris tersimpan** |
| Data kembali utuh | kegiatan 5, pengguna 17, peran 8, penunjukan peran 18, pengaturan 9, persetujuan 22 |
| Aplikasi internet setelah pemulihan | normal (halaman terbuka) |

Dua kesalahan pada prosedur ini ditemukan **saat pengujian** dan sudah diperbaiki:
kegagalan menyimpan hasil sebelum perintah pelengkap, dan perlakuan salah pada
kolom bertipe khusus. Keduanya membuat pemulihan tampak berhasil padahal
database berakhir kosong. Kini program **membuktikan sendiri** jumlah baris
yang benar-benar tersimpan dan menampilkan selisihnya bila ada.
