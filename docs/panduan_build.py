#!/usr/bin/env python3
"""Menyusun panduan pengurus DWP (PDF bergambar) dari halaman HTML.

Tiap halaman dirender ke PNG 1240x1754 (A4 @150dpi) lalu disusun jadi PDF.
"""
import glob, json, os, sys

OUT = "/root/projects/dwp-app-baru/docs"
GAMBAR = OUT + "/panduan-gambar"
HTML = OUT + "/panduan-halaman"
os.makedirs(HTML, exist_ok=True)
os.makedirs(GAMBAR, exist_ok=True)

W, H = 1240, 1754  # A4 @150 dpi

DASAR = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: __W__px; height: __H__px; font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
       background: #ffffff; color: #1f2937; display: flex; flex-direction: column; }
.hal { width: __W__px; height: __H__px; padding: 60px 76px; display: flex; flex-direction: column; }
.kepala { display: flex; align-items: center; gap: 18px; padding-bottom: 22px; border-bottom: 3px solid #0f766e; }
.kepala .kotak { width: 58px; height: 58px; border-radius: 14px; background: #0f766e; color: #fff;
                 display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; }
.kepala h1 { font-size: 25px; color: #0f766e; line-height: 1.2; }
.kepala p { font-size: 15px; color: #6b7280; margin-top: 2px; }
.kaki { margin-top: auto; padding-top: 20px; border-top: 1px solid #e5e7eb;
        display: flex; justify-content: space-between; font-size: 13px; color: #9ca3af; }
h2 { font-size: 20px; color: #0f766e; margin-bottom: 10px; }
p { font-size: 16px; line-height: 1.5; color: #374151; }
p + p { margin-top: 10px; }
.langkah { display: flex; gap: 14px; margin-top: 12px; }
.nomor { flex: 0 0 40px; height: 40px; border-radius: 50%; background: #ccfbf1; color: #0f766e;
         display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.isi { flex: 1; }
.isi b { color: #111827; }
.catatan { margin-top: 14px; padding: 12px 16px; border-left: 5px solid #f59e0b; background: #fffbeb;
           border-radius: 8px; font-size: 16px; line-height: 1.55; color: #78350f; }
.catatan b { color: #92400e; }
.penting { border-left-color: #0ea5e9; background: #f0f9ff; color: #075985; }
.penting b { color: #0369a1; }
.tabel { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 16px; }
.tabel th, .tabel td { text-align: left; padding: 11px 14px; border-bottom: 1px solid #e5e7eb; }
.tabel th { background: #f0fdfa; color: #0f766e; font-size: 15px; }
.sampul { justify-content: center; align-items: center; text-align: center; background: #0f766e; color: #fff; }
.sampul .lambang { width: 120px; height: 120px; border-radius: 28px; background: rgba(255,255,255,.16);
                   display: flex; align-items: center; justify-content: center; font-size: 54px; font-weight: 700; margin-bottom: 34px; }
.sampul h1 { font-size: 42px; line-height: 1.25; margin-bottom: 14px; }
.sampul h2 { font-size: 22px; color: #99f6e4; font-weight: 500; }
.sampul .garis { width: 120px; height: 4px; background: #5eead4; margin: 30px auto; border-radius: 2px; }
.sampul p { color: #ccfbf1; font-size: 18px; }
"""


def hal(judul, anak, nomor, total=8):
    return f"""
<div class="hal">
  <div class="kepala">
    <div class="kotak">DWP</div>
    <div><h1>{judul[0]}</h1><p>{judul[1]}</p></div>
  </div>
  {anak}
  <div class="kaki"><span>Sistem Informasi DWP · Kantor GTK Malut</span><span>Halaman {nomor} dari {total}</span></div>
</div>"""


GAYA_GAMBAR = 'margin:12px 0 0 0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#f9fafb;width:230px;flex:0 0 230px;line-height:0'


def langkah(n, judul, isi, gambar=None, sempit=False):
    g = f'<div style="{GAYA_GAMBAR}"><img src="file://{GAMBAR}/{gambar}" width="230" style="width:230px !important;max-width:230px;height:auto;display:block"></div>' if gambar else ""
    return f'<div class="langkah"><div class="nomor">{n}</div><div class="isi"><p><b>{judul}</b></p><p>{isi}</p>{g}</div></div>'


halaman = []

# ---------- 1. Sampul ----------
halaman.append("""
<div class="hal sampul">
  <div class="lambang">DWP</div>
  <h1>Panduan Pengurus</h1>
  <div class="garis"></div>
  <h2>Sistem Informasi DWP<br>Kantor GTK Provinsi Maluku Utara</h2>
  <p style="margin-top:46px">Alamat: dwpkgtkmalut.vercel.app</p>
</div>""")

# ---------- 2. Cara masuk ----------
halaman.append(hal(("1. Cara Masuk", "Langkah pertama sebelum memakai aplikasi"), f"""
<h2>Buka aplikasi, lalu masuk</h2>
<p>Gunakan <b>email</b> dan <b>kata sandi</b> yang diberikan pengurus pusat. Alamat email itu juga
dipakai sebagai nama pengguna.</p>
{langkah(1, "Buka alamat aplikasi", "Tulis <b>dwpkgtkmalut.vercel.app</b> di peramban ponsel atau laptop Bapak/Ibu.", "1-masuk.png", sempit=True)}
{langkah(2, "Isi email dan kata sandi", "Masukkan email yang terdaftar, lalu kata sandi masing-masing. Tekan <b>Masuk</b>.")}
<div class="catatan"><b>Penting:</b> jangan bagikan kata sandi Bapak/Ibu kepada siapa pun, termasuk
sesama pengurus. Setiap orang punya kata sandi sendiri.</div>
""", 2))

# ---------- 3. Mengenal tampilan ----------
halaman.append(hal(("2. Mengenal Tampilan", "Menu yang muncul menyesuaikan peran Anda"), f"""
<h2>Sesudah masuk</h2>
<p>Yang tampil berbeda sesuai peran. Semakin banyak tanggung jawab, semakin banyak menunya.</p>
<table class="tabel">
  <tr><th>Peran</th><th>Menu yang terlihat</th></tr>
  <tr><td>Ketua, Wakil Ketua, Sekretaris</td><td>Beranda · Kegiatan · Pengurus · Profil</td></tr>
  <tr><td>Sekretaris (tambahan)</td><td>+ Konten</td></tr>
  <tr><td>Bendahara, Ketua Bidang, Anggota</td><td>Beranda · Kegiatan · Profil</td></tr>
  <tr><td>Editor Konten</td><td>Beranda · Kegiatan · Konten · Profil</td></tr>
  <tr><td>Super Admin</td><td>Semua menu, termasuk Pengaturan</td></tr>
</table>
<div style="{GAYA_GAMBAR}"><img src="file://{GAMBAR}/2-beranda-admin.png" width="230" style="width:230px !important;max-width:230px;height:auto;display:block"></div>
<p style="margin-top:14px">Di <b>ponsel</b>, menu berubah menjadi baris di bagian atas. Bila ingin
keluar, tekan tombol <b>Keluar</b> di panel kirim.</p>
""", 3))

# ---------- 4. Mengajukan kegiatan ----------
halaman.append(hal(("3. Mengajukan Kegiatan", "Hanya untuk Ketua Seksi/Bidang dan pengurus yang berhak"), f"""
<h2>Membuat pengajuan baru</h2>
{langkah(1, "Buka menu Kegiatan", "Tekan menu <b>Kegiatan</b>, lalu tombol <b>+ Kegiatan Baru</b> di kanan atas.", "3-daftar-kegiatan.png", sempit=True)}
{langkah(2, "Isi data kegiatan", "Langkah 1 dari 3: nama kegiatan, tujuan, sasaran, tanggal, dan tempat. Draf tersimpan otomatis.", "4-formulir-baru.png", sempit=True)}
{langkah(3, "Isi anggaran", "Langkah 2 dari 3: rincian biaya. Boleh dilewati bila kegiatan tanpa anggaran.")}
{langkah(4, "Tinjau lalu ajukan", "Langkah 3 dari 3: periksa ringkasan, lalu tekan <b>Ajukan</b>.")}
<div class="catatan penting"><b>Setelah diajukan:</b> kegiatan berjalan berurutan lewat
Sekretaris → Bendahara → Wakil Ketua → Ketua. Bapak/Ibu akan menerima pemberitahuan di ikon lonceng
bila ada yang perlu dikerjakan.</div>
""", 4))

# ---------- 5. Menyetujui ----------
halaman.append(hal(("4. Menyetujui Kegiatan", "Untuk Sekretaris, Bendahara, Wakil Ketua, dan Ketua"), f"""
<h2>Memberi keputusan</h2>
{langkah(1, "Buka Beranda", "Di bagian <b>Perlu tindakan saya</b> akan terlihat kegiatan yang menunggu keputusan Anda. Tekan <b>Tinjau</b>.")}
{langkah(2, "Baca ringkasan dan lampiran", "Periksa tujuan, tanggal, tempat, dan anggaran sebelum memutuskan.")}
{langkah(3, "Pilih salah satu", "Tersedia tiga pilihan: <b>Setujui</b>, <b>Minta Revisi</b>, atau <b>Tolak</b>.")}
{langkah(4, "Tekan Kirim", "Bila memilih Minta Revisi atau Tolak, <b>catatan wajib diisi</b> supaya pengusul tahu apa yang harus diperbaiki.")}
<div class="catatan"><b>Perlu diketahui:</b> pengusul <b>tidak bisa</b> menyetujui usulannya sendiri.
Bila Ketua berhalangan, wewenangnya dapat dilimpahkan lewat <b>delegasi</b>.</div>
""", 5))

# ---------- 6. Pelaksanaan ----------
halaman.append(hal(("5. Saat Kegiatan Berjalan", "Panitia, tugas, presensi, dan dokumentasi foto"), f"""
<h2>Mengelola pelaksanaan</h2>
{langkah(1, "Mulai kegiatan", "Setelah perencanaan disetujui penuh, tekan <b>Mulai Kegiatan</b> di halaman kegiatan.")}
{langkah(2, "Susun panitia dan tugas", "Isi nama panitia beserta tugasnya lewat tab <b>Panitia</b>.")}
{langkah(3, "Catat kehadiran", "Isi daftar hadir peserta lewat tab <b>Presensi</b>.")}
{langkah(4, "Unggah foto", "Lewat tab <b>Dokumentasi</b>. Foto otomatis diperkecil agar hemat ruang. Centang <b>Boleh tampil di web publik</b> untuk foto yang boleh dilihat umum.")}
<div class="catatan penting"><b>Anggaran foto:</b> maksimal 20 foto per kegiatan, dan paling banyak
10 di antaranya boleh dipublikasikan.</div>
""", 6))

# ---------- 7. Pelaporan ----------
halaman.append(hal(("6. Melaporkan Kegiatan", "Langkah terakhir sebelum kegiatan diarsipkan"), f"""
<h2>Menyusun laporan</h2>
{langkah(1, "Isi laporan", "Tulis ringkasan kegiatan, hasil yang dicapai, kendala, serta <b>realisasi biaya</b> dibanding anggaran.")}
{langkah(2, "Lampirkan bukti", "Unggah foto dan bukti pendukung. Bukti biaya bersifat <b>internal</b> dan tidak terlihat publik.")}
{langkah(3, "Ajukan laporan", "Laporan berjalan berurutan lewat Bendahara → Sekretaris → Wakil Ketua → Ketua.")}
{langkah(4, "Setelah disetujui", "Laporan <b>terkunci</b> dan kegiatan masuk arsip. Berita kegiatan otomatis muncul di web publik setelah ditinjau Editor.")}
<div class="catatan"><b>Perubahan setelah disetujui?</b> Bila ada perubahan tanggal, tempat, atau
anggaran, ajukan lewat <b>Pengajuan Perubahan</b> — jangan mengubah langsung.</div>
""", 7))

# ---------- 8. Web publik + bantuan ----------
halaman.append(hal(("7. Web Publik & Bantuan", "Apa yang dilihat masyarakat umum"), f"""
<h2>Situs publik</h2>
<p>Masyarakat umum bisa melihat: <b>Beranda, Profil Pengurus, Agenda, Berita, Galeri</b>, serta
Unduhan dan Kontak di bagian bawah. Yang <b>tidak</b> pernah tampil: anggaran, catatan persetujuan,
presensi peserta, dan bukti biaya.</p>
<div style="{GAYA_GAMBAR}"><img src="file://{GAMBAR}/5-publik-beranda.png" width="230" style="width:230px !important;max-width:230px;height:auto;display:block"></div>
<h2 style="margin-top:18px">Hal yang sering ditanyakan</h2>
<table class="tabel">
  <tr><th>Pertanyaan</th><th>Jawaban</th></tr>
  <tr><td>Lupa kata sandi</td><td>Hubungi Super Admin untuk dibuatkan yang baru</td></tr>
  <tr><td>Menu tidak muncul</td><td>Menunya menyesuaikan peran — hubungi Super Admin bila dirasa kurang</td></tr>
  <tr><td>Foto tidak muncul di galeri</td><td>Pastikan sudah dicentang "Boleh tampil di web publik"</td></tr>
  <tr><td>Ingin mengubah setelah disetujui</td><td>Lewat Pengajuan Perubahan di halaman kegiatan</td></tr>
</table>
<div class="catatan penting"><b>Simpan panduan ini.</b> Bila ada yang belum jelas, tanyakan langsung
kepada Super Admin agar tidak salah langkah.</div>
""", 8))

# ---------- tulis HTML & render ----------
berkas = []
for i, isi in enumerate(halaman, start=1):
    p = f"{HTML}/hal-{i:02d}.html"
    with open(p, "w") as f:
        f.write(f"<!doctype html><html lang='id'><meta charset='utf-8'><style>{DASAR.replace('__W__', str(W)).replace('__H__', str(H))}</style><body>{isi}</body></html>")
    berkas.append(p)
print("halaman HTML:", len(berkas))

# render
from playwright.sync_api import sync_playwright
from PIL import Image
chrome = glob.glob("/root/.cache/ms-playwright/chromium-*/chrome-linux*/chrome")[0]
pngs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome)
    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
    for p_ in berkas:
        nama = p_.replace(".html", ".png")
        pg.goto("file://" + p_); pg.wait_for_timeout(700)
        pg.screenshot(path=nama, full_page=True)
        pngs.append(nama)
        print("  render:", os.path.basename(nama))
    b.close()

hasil = OUT + "/Panduan-Pengurus-DWP.pdf"
ims = [Image.open(x).convert("RGB") for x in pngs]
ims[0].save(hasil, save_all=True, append_images=ims[1:], resolution=150.0, quality=95)
print("PDF:", hasil, "|", round(os.path.getsize(hasil) / 1024), "KB")
print("jumlah halaman:", len(ims))
