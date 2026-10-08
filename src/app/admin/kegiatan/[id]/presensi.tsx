"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  TombolUtama,
  TombolSekunder,
  TombolBahaya,
  TombolHalus,
  Lencana,
  Kolom,
  Isian,
  Pilihan,
  Kosong,
  type NadaStatus,
} from "@/components/dasar";
import { formatTanggal } from "@/lib/kegiatan";
import {
  tambahPeserta,
  hapusPeserta,
  tandaiSemuaHadir,
} from "../aksi-pelaksanaan";

export type PengurusOpsi = {
  id: string;
  nama: string;
  jabatan: string | null;
};

export type PesertaItem = {
  id: string;
  profile_id: string | null;
  nama: string;
  keterangan: string | null;
  dibuat_pada: string;
};

export function PanelPresensi({
  activityId,
  daftarPeserta,
  daftarPengurus,
}: {
  activityId: string;
  daftarPeserta: PesertaItem[];
  daftarPengurus: PengurusOpsi[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Formulir tambah peserta
  const [bukaForm, setBukaForm] = useState(false);
  const [tipeSumber, setTipeSumber] = useState<"pengurus" | "bebas">("pengurus");
  const [pilihanProfileId, setPilihanProfileId] = useState(daftarPengurus[0]?.id || "");
  const [namaBebas, setNamaBebas] = useState("");
  const [keterangan, setKeterangan] = useState<"Hadir" | "Izin" | "Sakit">("Hadir");
  const [galat, setGalat] = useState("");

  // Dialog konfirmasi hapus
  const [pesertaDihapus, setPesertaDihapus] = useState<PesertaItem | null>(null);

  // Hitung ringkasan
  const hadir = daftarPeserta.filter((p) => (p.keterangan || "Hadir") === "Hadir").length;
  const izin = daftarPeserta.filter((p) => p.keterangan === "Izin").length;
  const sakit = daftarPeserta.filter((p) => p.keterangan === "Sakit").length;

  function nadaKeterangan(ket: string | null): NadaStatus {
    if (ket === "Hadir") return "ok";
    if (ket === "Izin") return "warn";
    if (ket === "Sakit") return "bad";
    return "netral";
  }

  function handleTambahPeserta(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");

    if (tipeSumber === "bebas" && !namaBebas.trim()) {
      setGalat("Nama peserta wajib diisi.");
      return;
    }
    if (tipeSumber === "pengurus" && !pilihanProfileId) {
      setGalat("Pilih pengurus dari daftar.");
      return;
    }

    startTransition(async () => {
      const res = await tambahPeserta(activityId, {
        profileId: tipeSumber === "pengurus" ? pilihanProfileId : null,
        nama: tipeSumber === "bebas" ? namaBebas.trim() : null,
        keterangan,
      });

      if (res.galat) {
        setGalat(res.galat);
      } else {
        setNamaBebas("");
        setKeterangan("Hadir");
        setBukaForm(false);
        router.refresh();
      }
    });
  }

  function handleTandaiSemuaHadir() {
    startTransition(async () => {
      const res = await tandaiSemuaHadir(activityId);
      if (!res.galat) {
        router.refresh();
      }
    });
  }

  function handleHapusPeserta() {
    if (!pesertaDihapus) return;
    startTransition(async () => {
      await hapusPeserta(activityId, pesertaDihapus.id);
      setPesertaDihapus(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Ringkasan & Tombol Aksi */}
      <Kartu className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <JudulSeksi>Presensi Peserta</JudulSeksi>
            <p className="teks-3 text-n-600">
              Hadir {hadir} · Izin {izin} · Sakit {sakit}
              {daftarPeserta.length > 0 && ` (Total ${daftarPeserta.length} peserta)`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {daftarPeserta.length > 0 && (
              <TombolHalus
                type="button"
                ukuran="kecil"
                disabled={isPending}
                onClick={handleTandaiSemuaHadir}
              >
                Tandai Semua Hadir
              </TombolHalus>
            )}
            {!bukaForm && (
              <TombolUtama
                type="button"
                ukuran="kecil"
                disabled={isPending}
                onClick={() => {
                  setGalat("");
                  setBukaForm(true);
                }}
              >
                + Tambah Peserta
              </TombolUtama>
            )}
          </div>
        </div>

        {/* Formulir Tambah Peserta */}
        {bukaForm && (
          <form
            onSubmit={handleTambahPeserta}
            className="mt-4 border-t border-n-200 pt-4 flex flex-col gap-4"
          >
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-n-800">
                <input
                  type="radio"
                  name="tipePeserta"
                  checked={tipeSumber === "pengurus"}
                  onChange={() => setTipeSumber("pengurus")}
                  className="accent-brand-600 h-4 w-4"
                />
                Pengurus DWP
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-n-800">
                <input
                  type="radio"
                  name="tipePeserta"
                  checked={tipeSumber === "bebas"}
                  onChange={() => setTipeSumber("bebas")}
                  className="accent-brand-600 h-4 w-4"
                />
                Nama Bebas
              </label>
            </div>

            {tipeSumber === "pengurus" ? (
              <Kolom label="Pilih Pengurus" bantuan="Pilih anggota yang hadir">
                <Pilihan
                  value={pilihanProfileId}
                  onChange={(e) => setPilihanProfileId(e.target.value)}
                >
                  {daftarPengurus.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.jabatan ? `(${p.jabatan})` : ""}
                    </option>
                  ))}
                </Pilihan>
              </Kolom>
            ) : (
              <Kolom label="Nama Peserta" bantuan="Tulis nama lengkap peserta">
                <Isian
                  type="text"
                  placeholder="Contoh: Rahmawati, S.Pd."
                  value={namaBebas}
                  onChange={(e) => setNamaBebas(e.target.value)}
                />
              </Kolom>
            )}

            <Kolom label="Status Kehadiran" galat={galat}>
              <Pilihan
                value={keterangan}
                onChange={(e) =>
                  setKeterangan(e.target.value as "Hadir" | "Izin" | "Sakit")
                }
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
              </Pilihan>
            </Kolom>

            <div className="flex items-center gap-2 pt-1">
              <TombolUtama type="submit" ukuran="sedang" disabled={isPending}>
                {isPending ? "Menyimpan…" : "Simpan Peserta"}
              </TombolUtama>
              <TombolSekunder
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={() => {
                  setBukaForm(false);
                  setGalat("");
                }}
              >
                Batal
              </TombolSekunder>
            </div>
          </form>
        )}
      </Kartu>

      {/* Keadaan Kosong */}
      {daftarPeserta.length === 0 ? (
        <Kosong
          pesan="Belum ada data presensi peserta untuk kegiatan ini."
          aksi={
            !bukaForm ? (
              <TombolUtama
                type="button"
                ukuran="sedang"
                onClick={() => setBukaForm(true)}
              >
                + Tambah Peserta
              </TombolUtama>
            ) : null
          }
        />
      ) : (
        <Kartu className="p-4 sm:p-5">
          {/* Tampilan Desktop: Tabel */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-n-500 teks-3 text-left border-b border-n-200">
                  <th className="pb-2.5 font-medium">Nama Peserta</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Waktu Dicatat</th>
                  <th className="pb-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarPeserta.map((peserta) => (
                  <tr key={peserta.id} className="border-b border-n-100 last:border-0">
                    <td className="py-3 text-n-800 font-medium">{peserta.nama}</td>
                    <td className="py-3">
                      <Lencana nada={nadaKeterangan(peserta.keterangan)}>
                        {peserta.keterangan || "Hadir"}
                      </Lencana>
                    </td>
                    <td className="py-3 text-n-500 teks-3">
                      {formatTanggal(peserta.dibuat_pada.slice(0, 10))}
                    </td>
                    <td className="py-3 text-right">
                      <TombolHalus
                        type="button"
                        ukuran="kecil"
                        disabled={isPending}
                        onClick={() => setPesertaDihapus(peserta)}
                        className="text-bad-fg hover:bg-bad-bg"
                      >
                        Hapus
                      </TombolHalus>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tampilan Mobile: Kartu */}
          <div className="md:hidden flex flex-col gap-3">
            {daftarPeserta.map((peserta) => (
              <div
                key={peserta.id}
                className="flex items-center justify-between gap-3 p-3 rounded-token bg-n-50 border border-n-200 min-h-[44px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-n-800 break-words">
                    {peserta.nama}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Lencana nada={nadaKeterangan(peserta.keterangan)}>
                      {peserta.keterangan || "Hadir"}
                    </Lencana>
                    <span className="teks-3 text-n-500">
                      {formatTanggal(peserta.dibuat_pada.slice(0, 10))}
                    </span>
                  </div>
                </div>

                <TombolHalus
                  type="button"
                  ukuran="kecil"
                  disabled={isPending}
                  onClick={() => setPesertaDihapus(peserta)}
                  className="text-bad-fg hover:bg-bad-bg min-h-[44px] min-w-[44px] shrink-0"
                >
                  Hapus
                </TombolHalus>
              </div>
            ))}
          </div>

          <p className="teks-3 text-n-500 mt-4">
            Data presensi peserta ini bersifat internal dan tidak ditampilkan di web publik.
          </p>
        </Kartu>
      )}

      {/* Modal Dialog Konfirmasi Hapus */}
      {pesertaDihapus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-n-900/40 p-4">
          <div className="w-full max-w-md rounded-token-lg bg-n-0 p-5 border border-n-200 shadow-lg">
            <h3 className="judul-2 text-n-800 mb-2">Hapus Peserta?</h3>
            <p className="text-[14px] text-n-600 mb-4">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-n-800">{pesertaDihapus.nama}</strong> dari daftar presensi kegiatan ini?
            </p>
            <div className="flex justify-end gap-2">
              <TombolSekunder
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={() => setPesertaDihapus(null)}
              >
                Batal
              </TombolSekunder>
              <TombolBahaya
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={handleHapusPeserta}
              >
                {isPending ? "Menghapus…" : "Ya, Hapus"}
              </TombolBahaya>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
