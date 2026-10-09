"use client";

/**
 * Panel kelola pengurus: menambah, mengubah, dan menghapus data pengurus.
 * Satu layar satu tujuan — daftar tetap terlihat, form muncul saat diperlukan.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kartu, Isian, Pilihan, Kolom, TombolUtama, TombolSekunder, Lencana } from "@/components/dasar";
import { tambahPengurus, ubahPengurus, hapusPengurus } from "./aksi";

export type BarisPengurus = {
  id: string;
  nama: string;
  bidang: string;
  jabatan: string;
  urutan: number;
  email: string | null;
  profile_id: string | null;
};

const BIDANG = [
  "Pengurus Harian",
  "Bidang Pendidikan",
  "Bidang Ekonomi",
  "Bidang Sosial Budaya",
];

const JABATAN = [
  "Ketua",
  "Wakil Ketua",
  "Sekretaris",
  "Wakil Sekretaris",
  "Bendahara",
  "Ketua Bidang",
  "Anggota",
];

type Mode = { jenis: "tutup" } | { jenis: "tambah" } | { jenis: "ubah"; data: BarisPengurus };

export function KelolaPengurus({ daftar, bolehUbah }: { daftar: BarisPengurus[]; bolehUbah: boolean }) {
  const [mode, setMode] = useState<Mode>({ jenis: "tutup" });
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const router = useRouter();

  function kirim(form: FormData) {
    setPesan(null);
    mulai(async () => {
      const masukan = {
        nama: String(form.get("nama") ?? ""),
        jabatan: String(form.get("jabatan") ?? ""),
        bidang: String(form.get("bidang") ?? ""),
        bidangBaru: String(form.get("bidangBaru") ?? ""),
        email: String(form.get("email") ?? ""),
        catatan: String(form.get("catatan") ?? ""),
      };
      const hasil =
        mode.jenis === "ubah"
          ? await ubahPengurus({ id: mode.data.id, ...masukan })
          : await tambahPengurus(masukan);

      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setMode({ jenis: "tutup" });
      router.refresh();
    });
  }

  function konfirmasiHapus(o: BarisPengurus) {
    setPesan(null);
    const lanjut = window.confirm(
      `Hapus ${o.nama} (${o.jabatan}) dari daftar pengurus?\n\n` +
        `Catatan: akunnya tidak ikut terhapus, hanya keluar dari daftar.`,
    );
    if (!lanjut) return;
    mulai(async () => {
      const hasil = await hapusPengurus(o.id);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      router.refresh();
    });
  }

  if (!bolehUbah) return null;

  return (
    <div className="mb-5">
      {mode.jenis === "tutup" ? (
        <TombolUtama
          ukuran="sedang"
          type="button"
          onClick={() => {
            setPesan(null);
            setMode({ jenis: "tambah" });
          }}
        >
          + Tambah Pengurus
        </TombolUtama>
      ) : (
        <Kartu className="p-5">
          <h3 className="judul-3 text-n-900 mb-4">
            {mode.jenis === "tambah" ? "Tambah Pengurus" : "Ubah Data Pengurus"}
          </h3>

          <form
            action={kirim}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Kolom label="Nama lengkap">
              <Isian
                name="nama"
                defaultValue={mode.jenis === "ubah" ? mode.data.nama : ""}
                placeholder="Contoh: Ny. Siti Aminah"
                required
              />
            </Kolom>

            <Kolom label="Jabatan">
              <Pilihan
                name="jabatan"
                defaultValue={mode.jenis === "ubah" ? mode.data.jabatan : ""}
                required
              >
                <option value="">Pilih jabatan</option>
                {JABATAN.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            <Kolom label="Bidang">
              <Pilihan
                name="bidang"
                defaultValue={mode.jenis === "ubah" ? mode.data.bidang : ""}
                required
              >
                <option value="">Pilih bidang</option>
                {Array.from(new Set([...BIDANG, ...daftar.map((d) => d.bidang)])).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            <Kolom label="Bidang baru (bila belum ada daftarnya)">
              <Isian name="bidangBaru" placeholder="Contoh: Bidang Humas" />
            </Kolom>

            <Kolom label="Email (bila sudah punya akun)">
              <Isian
                name="email"
                type="email"
                defaultValue={mode.jenis === "ubah" ? mode.data.email ?? "" : ""}
                placeholder="nama@dwpkgtkmalut.com"
              />
            </Kolom>

            <Kolom label="Catatan">
              <Isian
                name="catatan"
                defaultValue={mode.jenis === "ubah" ? "" : ""}
                placeholder="Contoh: menunggu nama lengkap"
              />
            </Kolom>

            {pesan && (
              <p className="sm:col-span-2 text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
                {pesan}
              </p>
            )}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Menyimpan…" : "Simpan"}
              </TombolUtama>
              <TombolSekunder
                type="button"
                onClick={() => {
                  setPesan(null);
                  setMode({ jenis: "tutup" });
                }}
              >
                Batal
              </TombolSekunder>
            </div>
          </form>
        </Kartu>
      )}

      {mode.jenis === "tutup" && pesan && (
        <p className="mt-3 text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
          {pesan}
        </p>
      )}

      {mode.jenis === "tutup" && daftar.length > 0 && (
        <div className="mt-6">
          <p className="teks-3 text-n-500 mb-2">Pilih pengurus untuk diubah atau dihapus:</p>
          <div className="flex flex-wrap gap-2">
            {daftar.map((o) => (
              <span key={o.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPesan(null);
                    setMode({ jenis: "ubah", data: o });
                  }}
                  className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-token border border-n-200 bg-n-0 hover:bg-n-50 text-[14px]"
                >
                  {o.nama}
                  <Lencana nada={o.profile_id ? "ok" : "netral"}>
                    {o.profile_id ? "berakun" : "belum"}
                  </Lencana>
                </button>
                <button
                  type="button"
                  onClick={() => konfirmasiHapus(o)}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-token border border-bahaya-200 text-bahaya-700 hover:bg-bahaya-50 text-[14px]"
                  aria-label={`Hapus ${o.nama}`}
                >
                  Hapus
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
