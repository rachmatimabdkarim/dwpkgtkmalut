"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  Lencana,
  TombolUtama,
  TombolSekunder,
  TombolBahaya,
  TombolHalus,
  Kolom,
  Isian,
  AreaTeks,
  Pilihan,
  Kosong,
} from "@/components/dasar";
import { formatTanggal } from "@/lib/kegiatan";
import { unggahDokumen, jadikanResmi, hapusBerkas, type BerkasTerunggah } from "@/lib/berkas-unggah";
import {
  aksiSimpanDokumen,
  aksiUbahKeteranganDokumen,
  aksiUbahStatusDokumen,
  aksiHapusDokumen,
} from "./aksi";
import { urlPublik } from "./antrean";

export type ItemDokumen = {
  id: string;
  judul: string;
  keterangan: string | null;
  path: string;
  ukuran_byte: number | null;
  jenis: "pdf" | "gambar" | "lain";
  published: boolean;
  diunggah_oleh: string | null;
  dibuat_pada: string;
};

function formatUkuran(byte: number | null | undefined): string {
  if (!byte || byte <= 0) return "—";
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export function PanelUnduhan({ daftar }: { daftar: ItemDokumen[] }) {
  const router = useRouter();
  const [bukaForm, setBukaForm] = useState(false);
  const [judul, setJudul] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [jenis, setJenis] = useState<"pdf" | "gambar" | "lain">("pdf");
  const [berkasPilihan, setBerkasPilihan] = useState<File | null>(null);

  const [sedangUnggah, setSedangUnggah] = useState(false);
  const [pesanGalat, setPesanGalat] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");

  // Dialog sunting keterangan
  const [itemSunting, setItemSunting] = useState<ItemDokumen | null>(null);
  const [keteranganBaru, setKeteranganBaru] = useState("");

  // Dialog konfirmasi hapus
  const [itemHapus, setItemHapus] = useState<ItemDokumen | null>(null);

  const [isPending, startTransition] = useTransition();

  async function handleUnggahDanSimpan(e: React.FormEvent) {
    e.preventDefault();
    setPesanGalat("");
    setPesanSukses("");

    if (!judul.trim()) {
      setPesanGalat("Judul dokumen wajib diisi.");
      return;
    }
    if (!berkasPilihan) {
      setPesanGalat("Pilih berkas PDF terlebih dahulu.");
      return;
    }

    setSedangUnggah(true);
    let terunggah: BerkasTerunggah | null = null;

    try {
      // 1. Unggah berkas ke tmp/ di wadah publik (maks 2 MB)
      terunggah = await unggahDokumen(berkasPilihan, "publik", 2, "dokumen");

      // 2. Pindahkan ke folder resmi "dokumen/"
      const resmi = await jadikanResmi(terunggah, "dokumen", "documents", "umum");

      // 3. Simpan catatan ke tabel documents
      const res = await aksiSimpanDokumen({
        judul: judul.trim(),
        keterangan: keterangan.trim(),
        path: resmi.path,
        ukuranByte: resmi.ukuran,
        jenis,
      });

      if (res.galat) {
        throw new Error(res.galat);
      }

      setPesanSukses("Dokumen berhasil diunggah dan ditambahkan ke daftar unduhan.");
      setJudul("");
      setKeterangan("");
      setBerkasPilihan(null);
      setBukaForm(false);
      router.refresh();
    } catch (err: unknown) {
      // Bersihkan berkas sementara bila ada
      if (terunggah) {
        try {
          await hapusBerkas({ id: terunggah.id, bucket: terunggah.bucket, path: terunggah.path });
        } catch {
          // Abaikan
        }
      }
      setPesanGalat(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    } finally {
      setSedangUnggah(false);
    }
  }

  function handleUbahKeterangan(e: React.FormEvent) {
    e.preventDefault();
    if (!itemSunting) return;

    startTransition(async () => {
      const res = await aksiUbahKeteranganDokumen(itemSunting.id, keteranganBaru);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses("Keterangan dokumen berhasil diperbarui.");
        setItemSunting(null);
        router.refresh();
      }
    });
  }

  function handleToggleStatus(doc: ItemDokumen) {
    setPesanGalat("");
    setPesanSukses("");
    startTransition(async () => {
      const statusTarget = !doc.published;
      const res = await aksiUbahStatusDokumen(doc.id, statusTarget);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses(
          statusTarget
            ? "Dokumen kini ditampilkan di web publik."
            : "Dokumen disembunyikan dari web publik.",
        );
        router.refresh();
      }
    });
  }

  function handleHapusDokumen() {
    if (!itemHapus) return;
    setPesanGalat("");
    setPesanSukses("");

    startTransition(async () => {
      const res = await aksiHapusDokumen(itemHapus.id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses("Dokumen dan berkas fisiknya berhasil dihapus.");
        setItemHapus(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Baris judul & tombol tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <JudulSeksi>Daftar Dokumen Publik</JudulSeksi>
          <p className="teks-3 text-n-500">
            Kelola berkas resmi (PDF maks 2 MB) yang dapat diunduh publik di halaman Unduhan.
          </p>
        </div>
        {!bukaForm && (
          <TombolUtama
            ukuran="sedang"
            onClick={() => {
              setBukaForm(true);
              setPesanGalat("");
              setPesanSukses("");
            }}
          >
            + Unggah Dokumen
          </TombolUtama>
        )}
      </div>

      {pesanGalat && (
        <div className="rounded-token border border-bad-line bg-bad-bg p-3 text-bad-fg text-[14px]">
          {pesanGalat}
        </div>
      )}

      {pesanSukses && (
        <div className="rounded-token border border-ok-line bg-ok-bg p-3 text-ok-fg text-[14px]">
          {pesanSukses}
        </div>
      )}

      {/* Formulir unggah dokumen baru */}
      {bukaForm && (
        <Kartu className="p-4 sm:p-5">
          <form onSubmit={handleUnggahDanSimpan} className="space-y-4">
            <h3 className="font-semibold text-n-900 text-[16px]">Unggah Dokumen Baru</h3>

            <Kolom label="Judul Dokumen" bantuan="Contoh: SK Susunan Pengurus DWP Kantor GTK Malut 2026-2029">
              <Isian
                type="text"
                placeholder="Tuliskan judul dokumen resmi..."
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                disabled={sedangUnggah}
              />
            </Kolom>

            <Kolom label="Jenis Dokumen">
              <Pilihan
                value={jenis}
                onChange={(e) => setJenis(e.target.value as "pdf" | "gambar" | "lain")}
                disabled={sedangUnggah}
              >
                <option value="pdf">Dokumen PDF (.pdf)</option>
                <option value="gambar">Berkas Gambar / Poster</option>
                <option value="lain">Lainnya</option>
              </Pilihan>
            </Kolom>

            <Kolom
              label="Pilih Berkas (Maksimal 2 MB)"
              bantuan="Pilih berkas PDF atau dokumen resmi yang akan dipublikasikan."
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={sedangUnggah}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setBerkasPilihan(f);
                }}
                className="block w-full text-[14px] text-n-700 file:mr-3 file:py-2 file:px-4 file:rounded-token file:border-0 file:text-[13px] file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
              {berkasPilihan && (
                <p className="teks-3 text-n-500 mt-1">
                  Ukuran berkas: {formatUkuran(berkasPilihan.size)}
                </p>
              )}
            </Kolom>

            <Kolom label="Keterangan Tambahan (Pilihan)" bantuan="Ringkasan isi dokumen atau panduan penggunaan.">
              <AreaTeks
                rows={3}
                placeholder="Contoh: Berkas salinan resmi yang ditandatangani untuk keperluan arsip anggota..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                disabled={sedangUnggah}
              />
            </Kolom>

            <div className="flex items-center gap-3 pt-2">
              <TombolUtama type="submit" disabled={sedangUnggah}>
                {sedangUnggah ? "Mengunggah berkas…" : "Simpan & Publikasikan"}
              </TombolUtama>
              <TombolHalus
                type="button"
                disabled={sedangUnggah}
                onClick={() => {
                  setBukaForm(false);
                  setBerkasPilihan(null);
                }}
              >
                Batal
              </TombolHalus>
            </div>
          </form>
        </Kartu>
      )}

      {/* Daftar Dokumen */}
      {daftar.length === 0 ? (
        <Kosong
          pesan="Belum ada dokumen yang diunggah."
          aksi={
            !bukaForm ? (
              <TombolUtama type="button" onClick={() => setBukaForm(true)}>
                + Unggah Dokumen
              </TombolUtama>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Tampilan Desktop: Tabel */}
          <div className="hidden sm:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Kartu className="overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-n-500 teks-3 text-left border-b border-n-200 bg-n-50">
                    <th className="py-3 px-4 font-medium">Judul Dokumen</th>
                    <th className="py-3 px-3 font-medium">Jenis</th>
                    <th className="py-3 px-3 font-medium">Ukuran</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-3 font-medium">Tanggal</th>
                    <th className="py-3 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n-100">
                  {daftar.map((doc) => {
                    const unduhUrl = urlPublik(doc.path);
                    return (
                      <tr key={doc.id} className="hover:bg-n-50/50">
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-medium text-n-900 leading-snug">{doc.judul}</p>
                          {doc.keterangan && (
                            <p className="teks-3 text-n-500 line-clamp-1 mt-0.5">
                              {doc.keterangan}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[12px] font-semibold text-brand-700 uppercase">
                            {doc.jenis}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-n-600 whitespace-nowrap text-[13px]">
                          {formatUkuran(doc.ukuran_byte)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Lencana nada={doc.published ? "ok" : "netral"}>
                            {doc.published ? "Publik" : "Tersembunyi"}
                          </Lencana>
                        </td>
                        <td className="py-3 px-3 text-n-500 whitespace-nowrap teks-3">
                          {formatTanggal(doc.dibuat_pada.slice(0, 10))}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          {unduhUrl && (
                            <a
                              href={unduhUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center rounded-token border border-n-300 bg-n-0 px-2.5 text-[12px] font-medium text-n-700 hover:bg-n-50"
                              title="Buka / Unduh Berkas"
                            >
                              Unduh
                            </a>
                          )}
                          <TombolSekunder
                            ukuran="kecil"
                            onClick={() => {
                              setItemSunting(doc);
                              setKeteranganBaru(doc.keterangan || "");
                            }}
                          >
                            Ubah Ket.
                          </TombolSekunder>
                          <TombolSekunder
                            ukuran="kecil"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(doc)}
                          >
                            {doc.published ? "Sembunyikan" : "Tampilkan"}
                          </TombolSekunder>
                          <TombolHalus
                            ukuran="kecil"
                            className="text-bad-fg hover:bg-bad-bg"
                            onClick={() => setItemHapus(doc)}
                          >
                            Hapus
                          </TombolHalus>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Kartu>
          </div>

          {/* Tampilan HP: Kartu-kartu */}
          <div className="sm:hidden flex flex-col gap-3">
            {daftar.map((doc) => {
              const unduhUrl = urlPublik(doc.path);
              return (
                <Kartu key={doc.id} className="p-4 space-y-3 text-[14px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-brand-700 uppercase">
                      {doc.jenis}
                    </span>
                    <Lencana nada={doc.published ? "ok" : "netral"}>
                      {doc.published ? "Publik" : "Tersembunyi"}
                    </Lencana>
                  </div>

                  <div>
                    <h4 className="font-semibold text-n-900 leading-snug">{doc.judul}</h4>
                    {doc.keterangan && (
                      <p className="teks-3 text-n-600 mt-1">{doc.keterangan}</p>
                    )}
                  </div>

                  <div className="teks-3 text-n-500 flex items-center justify-between pt-1 border-t border-n-100">
                    <span>{formatUkuran(doc.ukuran_byte)}</span>
                    <span>{formatTanggal(doc.dibuat_pada.slice(0, 10))}</span>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    {unduhUrl && (
                      <a
                        href={unduhUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-token border border-n-300 bg-n-0 px-3 text-[13px] font-medium text-n-700"
                      >
                        Unduh Berkas
                      </a>
                    )}
                    <TombolSekunder
                      ukuran="kecil"
                      className="flex-1 min-h-[44px]"
                      onClick={() => {
                        setItemSunting(doc);
                        setKeteranganBaru(doc.keterangan || "");
                      }}
                    >
                      Ubah Ket.
                    </TombolSekunder>
                    <TombolSekunder
                      ukuran="kecil"
                      className="flex-1 min-h-[44px]"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(doc)}
                    >
                      {doc.published ? "Sembunyikan" : "Tampilkan"}
                    </TombolSekunder>
                    <TombolBahaya
                      ukuran="kecil"
                      className="min-h-[44px] px-3"
                      onClick={() => setItemHapus(doc)}
                    >
                      Hapus
                    </TombolBahaya>
                  </div>
                </Kartu>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Sunting Keterangan */}
      {itemSunting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-token-lg bg-n-0 border border-n-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-n-900 text-[16px]">Ubah Keterangan Dokumen</h3>
            <p className="teks-3 text-n-600 font-medium">{itemSunting.judul}</p>

            <form onSubmit={handleUbahKeterangan} className="space-y-4">
              <Kolom label="Keterangan">
                <AreaTeks
                  rows={3}
                  value={keteranganBaru}
                  onChange={(e) => setKeteranganBaru(e.target.value)}
                  placeholder="Keterangan baru untuk dokumen..."
                />
              </Kolom>

              <div className="flex justify-end gap-3 pt-2">
                <TombolHalus type="button" onClick={() => setItemSunting(null)}>
                  Batal
                </TombolHalus>
                <TombolUtama type="submit" disabled={isPending}>
                  {isPending ? "Menyimpan…" : "Simpan Perubahan"}
                </TombolUtama>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {itemHapus && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-token-lg bg-n-0 border border-n-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-bad-fg text-[16px]">Konfirmasi Hapus Dokumen</h3>
            <p className="text-n-700 text-[14px]">
              Apakah Anda yakin ingin menghapus dokumen <strong>&ldquo;{itemHapus.judul}&rdquo;</strong>?
              Berkas fisik di penyimpanan juga akan dihapus permanen.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <TombolHalus type="button" onClick={() => setItemHapus(null)}>
                Batal
              </TombolHalus>
              <TombolBahaya type="button" disabled={isPending} onClick={handleHapusDokumen}>
                {isPending ? "Menghapus…" : "Ya, Hapus Dokumen"}
              </TombolBahaya>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
