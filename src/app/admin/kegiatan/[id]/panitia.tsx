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
} from "@/components/dasar";
import { formatTanggal } from "@/lib/kegiatan";
import {
  tambahPanitia,
  hapusPanitia,
  tambahTugas,
  ubahStatusTugas,
  hapusTugas,
} from "../aksi-pelaksanaan";

export type PengurusOpsi = {
  id: string;
  nama: string;
  jabatan: string | null;
};

export type TugasItem = {
  id: string;
  judul: string;
  selesai: boolean;
  batas: string | null;
  committee_id: string | null;
};

export type PanitiaItem = {
  id: string;
  profile_id: string | null;
  nama_luar: string | null;
  peran: string;
  profiles?: {
    id: string;
    nama: string;
    jabatan: string | null;
  } | null;
  tasks?: TugasItem[];
};

export function PanelPanitia({
  activityId,
  daftarPanitia,
  daftarPengurus,
}: {
  activityId: string;
  daftarPanitia: PanitiaItem[];
  daftarPengurus: PengurusOpsi[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog & formulir panitia
  const [bukaFormPanitia, setBukaFormPanitia] = useState(false);
  const [tipeSumber, setTipeSumber] = useState<"pengurus" | "luar">("pengurus");
  const [pilihanProfileId, setPilihanProfileId] = useState(daftarPengurus[0]?.id || "");
  const [namaLuar, setNamaLuar] = useState("");
  const [peran, setPeran] = useState("");
  const [galatPanitia, setGalatPanitia] = useState("");

  // Dialog konfirmasi hapus panitia
  const [panitiaDihapus, setPanitiaDihapus] = useState<PanitiaItem | null>(null);

  // Formulir tugas per panitia (committee_id -> boolean)
  const [formTugasBuka, setFormTugasBuka] = useState<Record<string, boolean>>({});
  const [judulTugas, setJudulTugas] = useState<Record<string, string>>({});
  const [batasTugas, setBatasTugas] = useState<Record<string, string>>({});
  const [galatTugas, setGalatTugas] = useState<Record<string, string>>({});

  // Hitung ringkasan
  const totalPanitia = daftarPanitia.length;
  const semuaTugas = daftarPanitia.flatMap((p) => p.tasks ?? []);
  const totalTugas = semuaTugas.length;
  const tugasSelesai = semuaTugas.filter((t) => t.selesai).length;

  // Aksi simpan panitia
  function handleTambahPanitia(e: React.FormEvent) {
    e.preventDefault();
    setGalatPanitia("");

    if (!peran.trim()) {
      setGalatPanitia("Peran panitia wajib diisi.");
      return;
    }
    if (tipeSumber === "luar" && !namaLuar.trim()) {
      setGalatPanitia("Nama panitia luar wajib diisi.");
      return;
    }
    if (tipeSumber === "pengurus" && !pilihanProfileId) {
      setGalatPanitia("Pilih pengurus dari daftar.");
      return;
    }

    startTransition(async () => {
      const res = await tambahPanitia(activityId, {
        profileId: tipeSumber === "pengurus" ? pilihanProfileId : null,
        namaLuar: tipeSumber === "luar" ? namaLuar.trim() : null,
        peran: peran.trim(),
      });

      if (res.galat) {
        setGalatPanitia(res.galat);
      } else {
        setPeran("");
        setNamaLuar("");
        setBukaFormPanitia(false);
        router.refresh();
      }
    });
  }

  // Aksi hapus panitia
  function handleHapusPanitia() {
    if (!panitiaDihapus) return;
    startTransition(async () => {
      await hapusPanitia(activityId, panitiaDihapus.id);
      setPanitiaDihapus(null);
      router.refresh();
    });
  }

  // Aksi tambah tugas
  function handleTambahTugas(committeeId: string) {
    const judul = judulTugas[committeeId]?.trim();
    if (!judul) {
      setGalatTugas((prev) => ({ ...prev, [committeeId]: "Judul tugas wajib diisi." }));
      return;
    }

    startTransition(async () => {
      const res = await tambahTugas(activityId, {
        committeeId,
        judul,
        batas: batasTugas[committeeId] || null,
      });

      if (res.galat) {
        setGalatTugas((prev) => ({ ...prev, [committeeId]: res.galat }));
      } else {
        setJudulTugas((prev) => ({ ...prev, [committeeId]: "" }));
        setBatasTugas((prev) => ({ ...prev, [committeeId]: "" }));
        setGalatTugas((prev) => ({ ...prev, [committeeId]: "" }));
        setFormTugasBuka((prev) => ({ ...prev, [committeeId]: false }));
        router.refresh();
      }
    });
  }

  // Aksi ubah status tugas
  function handleToggleTugas(taskId: string, selesaiSekarang: boolean) {
    startTransition(async () => {
      await ubahStatusTugas(activityId, taskId, !selesaiSekarang);
      router.refresh();
    });
  }

  // Aksi hapus tugas
  function handleHapusTugas(taskId: string) {
    startTransition(async () => {
      await hapusTugas(activityId, taskId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Ringkasan & Tombol Tambah */}
      <Kartu className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <JudulSeksi>Susunan Panitia</JudulSeksi>
            <p className="teks-3 text-n-600">
              {totalPanitia} panitia · {tugasSelesai} tugas selesai dari {totalTugas}
            </p>
          </div>
          {!bukaFormPanitia && (
            <TombolUtama
              type="button"
              ukuran="kecil"
              disabled={isPending}
              onClick={() => {
                setGalatPanitia("");
                setBukaFormPanitia(true);
              }}
            >
              + Tambah Panitia
            </TombolUtama>
          )}
        </div>

        {/* Formulir Tambah Panitia */}
        {bukaFormPanitia && (
          <form
            onSubmit={handleTambahPanitia}
            className="mt-4 border-t border-n-200 pt-4 flex flex-col gap-4"
          >
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-n-800">
                <input
                  type="radio"
                  name="tipeSumber"
                  checked={tipeSumber === "pengurus"}
                  onChange={() => setTipeSumber("pengurus")}
                  className="accent-brand-600 h-4 w-4"
                />
                Pengurus DWP
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-n-800">
                <input
                  type="radio"
                  name="tipeSumber"
                  checked={tipeSumber === "luar"}
                  onChange={() => setTipeSumber("luar")}
                  className="accent-brand-600 h-4 w-4"
                />
                Panitia Luar
              </label>
            </div>

            {tipeSumber === "pengurus" ? (
              <Kolom label="Pilih Pengurus" bantuan="Pilih anggota pengurus yang ditugaskan">
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
              <Kolom label="Nama Lengkap" bantuan="Nama anggota panitia dari luar pengurus">
                <Isian
                  type="text"
                  placeholder="Contoh: Siti Rahma, S.Pd."
                  value={namaLuar}
                  onChange={(e) => setNamaLuar(e.target.value)}
                />
              </Kolom>
            )}

            <Kolom
              label="Peran / Seksi"
              bantuan="Contoh: Ketua Panitia, Sekretaris, Seksi Acara, Seksi Konsumsi"
              galat={galatPanitia}
            >
              <Isian
                type="text"
                placeholder="Contoh: Ketua Panitia"
                value={peran}
                onChange={(e) => setPeran(e.target.value)}
              />
            </Kolom>

            <div className="flex items-center gap-2 pt-1">
              <TombolUtama type="submit" ukuran="sedang" disabled={isPending}>
                {isPending ? "Menyimpan…" : "Simpan Panitia"}
              </TombolUtama>
              <TombolSekunder
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={() => {
                  setBukaFormPanitia(false);
                  setGalatPanitia("");
                }}
              >
                Batal
              </TombolSekunder>
            </div>
          </form>
        )}
      </Kartu>

      {/* Daftar Panitia */}
      {daftarPanitia.length === 0 ? (
        <Kosong
          pesan="Belum ada susunan panitia untuk kegiatan ini."
          aksi={
            !bukaFormPanitia ? (
              <TombolUtama
                type="button"
                ukuran="sedang"
                onClick={() => setBukaFormPanitia(true)}
              >
                + Tambah Panitia
              </TombolUtama>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {daftarPanitia.map((panitia) => {
            const nama = panitia.profiles?.nama || panitia.nama_luar || "Panitia";
            const jabatan = panitia.profiles?.jabatan;
            const tugasList = panitia.tasks ?? [];
            const adaFormTugas = formTugasBuka[panitia.id] ?? false;

            return (
              <Kartu key={panitia.id} className="p-4 sm:p-5">
                {/* Bagian Profil Panitia */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-n-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-n-800 text-[16px]">{nama}</h3>
                      <Lencana nada="brand">{panitia.peran}</Lencana>
                      {panitia.nama_luar && (
                        <Lencana nada="netral">Luar</Lencana>
                      )}
                    </div>
                    {jabatan && (
                      <p className="teks-3 text-n-500 mt-0.5">{jabatan}</p>
                    )}
                  </div>

                  <TombolHalus
                    type="button"
                    ukuran="kecil"
                    disabled={isPending}
                    onClick={() => setPanitiaDihapus(panitia)}
                    className="text-bad-fg hover:bg-bad-bg"
                  >
                    Hapus
                  </TombolHalus>
                </div>

                {/* Bagian Tugas Panitia */}
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[13px] font-medium text-n-700">
                      Tugas ({tugasList.filter((t) => t.selesai).length}/{tugasList.length})
                    </span>
                    {!adaFormTugas && (
                      <TombolHalus
                        type="button"
                        ukuran="kecil"
                        disabled={isPending}
                        onClick={() =>
                          setFormTugasBuka((prev) => ({ ...prev, [panitia.id]: true }))
                        }
                      >
                        + Tambah Tugas
                      </TombolHalus>
                    )}
                  </div>

                  {/* List Tugas */}
                  {tugasList.length === 0 ? (
                    <p className="teks-3 text-n-500 italic py-1">Belum ada tugas.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {tugasList.map((tugas) => (
                        <div
                          key={tugas.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-token bg-n-50 border border-n-100 min-h-[44px]"
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={tugas.selesai}
                              disabled={isPending}
                              onChange={() => handleToggleTugas(tugas.id, tugas.selesai)}
                              className="accent-brand-600 h-5 w-5 rounded-token shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[14px] leading-snug break-words ${
                                  tugas.selesai
                                    ? "line-through text-n-400"
                                    : "text-n-800"
                                }`}
                              >
                                {tugas.judul}
                              </p>
                              {tugas.batas && (
                                <p className="teks-3 text-n-500 mt-0.5">
                                  Batas: {formatTanggal(tugas.batas)}
                                </p>
                              )}
                            </div>
                          </label>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleHapusTugas(tugas.id)}
                            className="text-n-400 hover:text-bad-fg p-1.5 rounded-token transition-colors"
                            title="Hapus tugas"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulir Tambah Tugas Inline */}
                  {adaFormTugas && (
                    <div className="mt-3 p-3 rounded-token bg-n-50 border border-n-200 flex flex-col gap-3">
                      <Kolom
                        label="Judul Tugas"
                        galat={galatTugas[panitia.id]}
                      >
                        <Isian
                          type="text"
                          placeholder="Contoh: Menyiapkan spanduk kegiatan"
                          value={judulTugas[panitia.id] ?? ""}
                          onChange={(e) =>
                            setJudulTugas((prev) => ({
                              ...prev,
                              [panitia.id]: e.target.value,
                            }))
                          }
                        />
                      </Kolom>

                      <Kolom label="Batas Tanggal (Opsional)">
                        <Isian
                          type="date"
                          value={batasTugas[panitia.id] ?? ""}
                          onChange={(e) =>
                            setBatasTugas((prev) => ({
                              ...prev,
                              [panitia.id]: e.target.value,
                            }))
                          }
                        />
                      </Kolom>

                      <div className="flex items-center gap-2 pt-1">
                        <TombolUtama
                          type="button"
                          ukuran="kecil"
                          disabled={isPending}
                          onClick={() => handleTambahTugas(panitia.id)}
                        >
                          {isPending ? "Menyimpan…" : "Simpan Tugas"}
                        </TombolUtama>
                        <TombolSekunder
                          type="button"
                          ukuran="kecil"
                          disabled={isPending}
                          onClick={() => {
                            setFormTugasBuka((prev) => ({ ...prev, [panitia.id]: false }));
                            setGalatTugas((prev) => ({ ...prev, [panitia.id]: "" }));
                          }}
                        >
                          Batal
                        </TombolSekunder>
                      </div>
                    </div>
                  )}
                </div>
              </Kartu>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Panitia */}
      {panitiaDihapus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-n-900/40 p-4">
          <div className="w-full max-w-md rounded-token-lg bg-n-0 p-5 border border-n-200 shadow-lg">
            <h3 className="judul-2 text-n-800 mb-2">Hapus Panitia?</h3>
            <p className="text-[14px] text-n-600 mb-4">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-n-800">
                {panitiaDihapus.profiles?.nama || panitiaDihapus.nama_luar || "Panitia"}
              </strong>{" "}
              ({panitiaDihapus.peran})? Semua tugas yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <TombolSekunder
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={() => setPanitiaDihapus(null)}
              >
                Batal
              </TombolSekunder>
              <TombolBahaya
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={handleHapusPanitia}
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
