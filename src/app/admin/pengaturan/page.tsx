import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { TEMA_BAWAAN } from "@/lib/tema";
import {
  Kartu,
  JudulSeksi,
  Isian,
  AreaTeks,
  Pilihan,
  Kolom,
  TombolUtama,
  TombolSekunder,
} from "@/components/dasar";
import { Lencana } from "@/components/dasar";

export const metadata = { title: "Pengaturan · Tampilan" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

/**
 * Pengaturan tampilan (contoh bentuk halaman). Penyimpanan warna, logo,
 * dan favicon menyusul setelah modul berkas dibangun.
 */
export default async function PengaturanTampilan() {
  const pengguna = await sesiWajibPeran(["super_admin"]);

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Pengaturan · Tampilan"
    >
      <p className="text-n-500 mb-6">
        Atur identitas dan warna aplikasi dari satu halaman. Perubahan berlaku di panel, situs
        publik, halaman masuk, dan kop berkas PDF.
      </p>

      {/* Identitas */}
      <section className="mb-7">
        <JudulSeksi>Identitas</JudulSeksi>
        <Kartu className="p-4 flex flex-col gap-4">
          <Kolom label="Baris 1 — nama sistem" bantuan="Tampil di baris atas, contoh: Sistem Informasi DWP.">
            <Isian defaultValue={TEMA_BAWAAN.namaAplikasi} />
          </Kolom>
          <Kolom label="Baris 2 — nama unit" bantuan="Tampil di bawahnya, contoh: Kantor GTK Malut.">
            <Isian defaultValue={TEMA_BAWAAN.namaUnit} />
          </Kolom>
          <Kolom label="Nama organisasi" bantuan="Dipakai pada kop berkas PDF dan footer situs.">
            <Isian defaultValue={TEMA_BAWAAN.namaOrganisasi} />
          </Kolom>
        </Kartu>
      </section>

      {/* Warna */}
      <section className="mb-7">
        <JudulSeksi>Warna utama</JudulSeksi>
        <Kartu className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <span className="block text-[13px] font-medium text-n-700 mb-1.5">Pilih warna</span>
              <div
                className="h-11 w-[88px] rounded-token border border-n-300"
                style={{ background: "var(--brand-600)" }}
              />
            </div>
            <div className="w-[140px]">
              <Kolom label="Kode warna" bantuan="Contoh: #0f766e">
                <Isian defaultValue="#0f766e" />
              </Kolom>
            </div>
            <TombolSekunder>Kembalikan ke bawaan</TombolSekunder>
          </div>

          <div className="rounded-token border border-warn-line bg-warn-bg px-3 py-2 text-[13px] text-warn-fg">
            Peringatan kontras akan tampil di sini bila warna terlalu terang sehingga tulisan sulit
            dibaca.
          </div>

          <div>
            <span className="block text-[13px] font-medium text-n-700 mb-2">Pratinjau</span>
            <div className="flex flex-wrap items-center gap-3">
              <TombolUtama>Ajukan</TombolUtama>
              <Lencana nada="brand">Berjalan</Lencana>
              <a href="#" className="text-brand-700 underline underline-offset-2 text-[14px]">
                Tautan contoh
              </a>
            </div>
          </div>
        </Kartu>
      </section>

      {/* Logo & favicon */}
      <section className="mb-7">
        <JudulSeksi>Logo dan ikon situs</JudulSeksi>
        <Kartu className="p-4 grid sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-[13px] font-medium text-n-700 mb-1.5">Logo</span>
            <div className="rounded-token border border-dashed border-n-300 bg-n-50 px-4 py-6 text-center">
              <p className="text-n-600 text-[14px]">
                Seret berkas ke sini atau pilih dari perangkat
              </p>
              <p className="teks-3 text-n-500 mt-1">PNG, WebP, atau SVG · maksimal 100 KB</p>
              <div className="mt-3 flex justify-center">
                <TombolSekunder ukuran="kecil">Pilih berkas</TombolSekunder>
              </div>
            </div>
          </div>
          <div>
            <span className="block text-[13px] font-medium text-n-700 mb-1.5">Ikon situs</span>
            <div className="rounded-token border border-dashed border-n-300 bg-n-50 px-4 py-6 text-center">
              <p className="text-n-600 text-[14px]">
                Seret berkas persegi ke sini, disarankan 512×512 piksel
              </p>
              <p className="teks-3 text-n-500 mt-1">PNG, WebP, atau SVG · maksimal 50 KB</p>
              <div className="mt-3 flex justify-center">
                <TombolSekunder ukuran="kecil">Pilih berkas</TombolSekunder>
              </div>
            </div>
          </div>
        </Kartu>
      </section>

      <div className="flex flex-wrap gap-3">
        <TombolUtama>Simpan</TombolUtama>
        <TombolSekunder>Batal</TombolSekunder>
      </div>

      <p className="teks-3 text-n-500 mt-3">
        Catatan: penyimpanan warna, logo, dan ikon situs belum aktif — menunggu modul berkas.
      </p>

      <div className="mt-8">
        <JudulSeksi>Catatan kerja</JudulSeksi>
        <AreaTeks placeholder="Catatan untuk pengurus lain (contoh isian)" />
        <div className="mt-3 w-full sm:w-[240px]">
          <Pilihan defaultValue="semua">
            <option value="semua">Semua pengurus</option>
            <option value="pengurus_inti">Pengurus inti</option>
          </Pilihan>
        </div>
      </div>
    </KerangkaAdmin>
  );
}
