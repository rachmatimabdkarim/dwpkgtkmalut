"use client";

/**
 * Panel kelola pengurus — SATU daftar saja.
 * Tiap baris punya satu tombol titik tiga berisi: Ubah data, Buatkan akun, Hapus.
 * Tidak ada informasi yang muncul dua kali di layar.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  Isian,
  Pilihan,
  Kolom,
  TombolUtama,
  TombolSekunder,
  Lencana,
  JudulSeksi,
} from "@/components/dasar";
import { tambahPengurus, ubahPengurus, hapusPengurus, buatkanAkun } from "./aksi";

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

const PERAN = [
  { key: "ketua", label: "Ketua" },
  { key: "wakil_ketua", label: "Wakil Ketua" },
  { key: "sekretaris", label: "Sekretaris" },
  { key: "bendahara", label: "Bendahara" },
  { key: "ketua_seksi", label: "Ketua Seksi/Bidang" },
  { key: "pengurus", label: "Pengurus/Anggota" },
  { key: "editor", label: "Editor Konten" },
];

type Mode =
  | { jenis: "tutup" }
  | { jenis: "tambah" }
  | { jenis: "ubah"; data: BarisPengurus }
  | { jenis: "akun"; data: BarisPengurus };

export function KelolaPengurus({
  daftar,
  bolehUbah,
}: {
  daftar: BarisPengurus[];
  bolehUbah: boolean;
}) {
  const [mode, setMode] = useState<Mode>({ jenis: "tutup" });
  const [pesan, setPesan] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const router = useRouter();

  function tutup() {
    setMode({ jenis: "tutup" });
    setMenu(null);
  }

  function kirim(form: FormData) {
    setPesan(null);
    setSukses(null);
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
      setSukses(mode.jenis === "ubah" ? "Data pengurus tersimpan." : "Pengurus baru ditambahkan.");
      setMode({ jenis: "tutup" });
      router.refresh();
    });
  }

  function kirimAkun(form: FormData) {
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      if (mode.jenis !== "akun") return;
      const hasil = await buatkanAkun({
        officerId: mode.data.id,
        email: String(form.get("email") ?? ""),
        peran: String(form.get("peran") ?? "pengurus"),
      });
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`Akun untuk ${mode.data.nama} berhasil dibuat.`);
      setMode({ jenis: "tutup" });
      router.refresh();
    });
  }

  function konfirmasiHapus(o: BarisPengurus) {
    setMenu(null);
    setPesan(null);
    setSukses(null);
    const lanjut = window.confirm(
      `Keluarkan ${o.nama} (${o.jabatan}) dari daftar pengurus?\n\n` +
        `Catatan: akunnya tidak ikut terhapus, hanya keluar dari daftar.`,
    );
    if (!lanjut) return;
    mulai(async () => {
      const hasil = await hapusPengurus(o.id);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`${o.nama} sudah dikeluarkan dari daftar pengurus.`);
      router.refresh();
    });
  }

  const bidangUrut = Array.from(new Set(daftar.map((d) => d.bidang)));
  const belumBerakun = daftar.filter((d) => !d.profile_id).length;

  return (
    <div>
      {/* Satu tombol aksi utama */}
      {bolehUbah && mode.jenis === "tutup" && (
        <div className="mb-5">
          <TombolUtama
            ukuran="sedang"
            type="button"
            onClick={() => {
              setPesan(null);
              setSukses(null);
              setMode({ jenis: "tambah" });
            }}
          >
            + Tambah Pengurus
          </TombolUtama>
        </div>
      )}

      {/* Form tambah / ubah */}
      {bolehUbah && (mode.jenis === "tambah" || mode.jenis === "ubah") && (
        <Kartu className="p-5 mb-5">
          <h3 className="judul-3 text-n-900 mb-4">
            {mode.jenis === "tambah" ? "Tambah Pengurus" : "Ubah Data Pengurus"}
          </h3>
          <form action={kirim} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <Kolom label="Email pengurus">
              <Isian
                name="email"
                type="email"
                defaultValue={mode.jenis === "ubah" ? mode.data.email ?? "" : ""}
                placeholder="nama@dwpkgtkmalut.com"
              />
            </Kolom>

            <Kolom label="Catatan">
              <Isian name="catatan" placeholder="Contoh: menunggu nama lengkap" />
            </Kolom>

            {pesan && <PesanGalat teks={pesan} />}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Menyimpan…" : "Simpan"}
              </TombolUtama>
              <TombolSekunder type="button" onClick={tutup}>
                Batal
              </TombolSekunder>
            </div>
          </form>
        </Kartu>
      )}

      {/* Form buatkan akun */}
      {bolehUbah && mode.jenis === "akun" && (
        <Kartu className="p-5 mb-5">
          <h3 className="judul-3 text-n-900 mb-1">Buatkan Akun</h3>
          <p className="teks-3 text-n-500 mb-4">
            Untuk {mode.data.nama} — {mode.data.jabatan}
          </p>
          <form action={kirimAkun} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kolom label="Email untuk masuk">
              <Isian
                name="email"
                type="email"
                defaultValue={mode.data.email ?? ""}
                placeholder="nama@dwpkgtkmalut.com"
                required
              />
            </Kolom>

            <Kolom label="Peran dalam aplikasi">
              <Pilihan name="peran" defaultValue="pengurus" required>
                {PERAN.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            {pesan && <PesanGalat teks={pesan} />}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Membuat akun…" : "Buatkan Akun"}
              </TombolUtama>
              <TombolSekunder type="button" onClick={tutup}>
                Batal
              </TombolSekunder>
            </div>
          </form>
        </Kartu>
      )}

      {/* Pesan hasil */}
      {pesan && mode.jenis === "tutup" && <PesanGalat teks={pesan} />}
      {sukses && (
        <p className="mb-4 text-[14px] text-ok-700 bg-ok-50 border border-ok-200 rounded-token px-3 py-2">
          {sukses}
        </p>
      )}

      {/* Ringkasan jumlah — satu tempat saja */}
      <div className="mb-4">
        <span className="text-n-500 teks-3">
          {daftar.length} orang tercatat
          {belumBerakun > 0 && ` · ${belumBerakun} belum punya akun`}
        </span>
      </div>

      {/* SATU daftar, dikelompokkan per bidang */}
      <div className="flex flex-col gap-6">
        {bidangUrut.map((bidang) => (
          <section key={bidang}>
            <JudulSeksi>{bidang}</JudulSeksi>
            <Kartu>
              {daftar
                .filter((d) => d.bidang === bidang)
                .map((o, i) => (
                  <div
                    key={o.id}
                    className={`relative flex items-center gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-n-100" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[13px] font-semibold shrink-0">
                      {o.nama.replace(/^Ny\.\s*/i, "").slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-n-800 font-medium truncate">{o.nama}</p>
                      <p className="teks-3 text-n-500 truncate">{o.jabatan}</p>
                    </div>

                    <Lencana nada={o.profile_id ? "ok" : "netral"}>
                      {o.profile_id ? "Punya akun" : "Belum berakun"}
                    </Lencana>

                    {bolehUbah && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-label={`Aksi untuk ${o.nama}`}
                          aria-expanded={menu === o.id}
                          onClick={() => setMenu(menu === o.id ? null : o.id)}
                          className="h-11 w-11 inline-flex items-center justify-center rounded-token border border-n-200 bg-n-0 text-n-600 hover:bg-n-50 text-[18px] leading-none"
                        >
                          ⋯
                        </button>

                        {menu === o.id && (
                          <>
                            <button
                              type="button"
                              aria-label="Tutup menu"
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={() => setMenu(null)}
                            />
                            <div className="absolute right-0 top-12 z-20 w-48 rounded-token border border-n-200 bg-n-0 shadow-md py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPesan(null);
                                  setSukses(null);
                                  setMenu(null);
                                  setMode({ jenis: "ubah", data: o });
                                }}
                                className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                              >
                                Ubah data
                              </button>

                              {!o.profile_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPesan(null);
                                    setSukses(null);
                                    setMenu(null);
                                    setMode({ jenis: "akun", data: o });
                                  }}
                                  className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                                >
                                  Buatkan akun
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => konfirmasiHapus(o)}
                                className="w-full text-left px-4 min-h-[44px] text-[14px] text-bahaya-700 hover:bg-bahaya-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </Kartu>
          </section>
        ))}
      </div>
    </div>
  );
}

function PesanGalat({ teks }: { teks: string }) {
  return (
    <p className="text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
      {teks}
    </p>
  );
}
