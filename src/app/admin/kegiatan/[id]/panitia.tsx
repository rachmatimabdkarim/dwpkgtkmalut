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
  bolehBeriTugas,
  bolehCentangTugas,
  apakahPenanggungJawab,
  type KonteksPengguna,
  type PeranPanitiaKode,
} from "@/lib/aturan-panitia";
import {
  tambahPanitia,
  hapusPanitia,
  tambahTugas,
  ubahStatusTugas,
  hapusTugas,
  tugaskanPengelola,
  cabutPenugasan,
} from "../aksi-pelaksanaan";

/**
 * Peran kepanitiaan — DAFTAR TETAP, bukan teks bebas.
 *
 * Aturan pemilik: panitia terdiri dari Ketua Panitia dan Anggota Panitia.
 * Sekretaris dan Bendahara panitia tetap disediakan karena susunan
 * kepanitiaan lazim memuat keduanya. Nilai disimpan dalam bentuk kode
 * (huruf kecil bergaris bawah); label dipakai untuk tampilan.
 */
export const PERAN_PANITIA = [
  { nilai: "ketua_panitia", label: "Ketua Panitia" },
  { nilai: "sekretaris_panitia", label: "Sekretaris Panitia" },
  { nilai: "bendahara_panitia", label: "Bendahara Panitia" },
  { nilai: "anggota_panitia", label: "Anggota Panitia" },
] as const;

/** Mengubah kode peran menjadi label yang terbaca. */
export function labelPeranPanitia(nilai: string): string {
  return PERAN_PANITIA.find((p) => p.nilai === nilai)?.label ?? "Anggota Panitia";
}

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

export type PenugasanItem = {
  bagian: "presensi" | "dokumentasi";
  committee_id: string;
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
  daftarPenugasan = [],
  bolehUbahPanitia = false,
  konteks,
  terkunci = false,
}: {
  activityId: string;
  daftarPanitia: PanitiaItem[];
  daftarPengurus: PengurusOpsi[];
  daftarPenugasan?: PenugasanItem[];
  /**
   * Hanya PENANGGUNG JAWAB kegiatan (atau Super Admin) yang boleh menyusun
   * panitia dan menugaskan pekerjaan. Tab Panitia tetap boleh DIBACA orang
   * lain, tetapi tanpa tombol apa pun — supaya tidak ada tombol yang
   * ditekan lalu ditolak server (membingungkan).
   */
  bolehUbahPanitia?: boolean;
  /**
   * Keterangan siapa pengguna pada kegiatan ini (penanggung jawab? ketua
   * panitia?). Dipakai memutuskan tombol tugas mana yang boleh tampil.
   */
  konteks?: KonteksPengguna;
  /** Laporan sudah diajukan: susunan panitia tidak boleh diubah lagi. */
  terkunci?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog & formulir panitia
  const [bukaFormPanitia, setBukaFormPanitia] = useState(false);
  const [tipeSumber, setTipeSumber] = useState<"pengurus" | "luar">("pengurus");
  const [pilihanProfileId, setPilihanProfileId] = useState(daftarPengurus[0]?.id || "");
  const [namaLuar, setNamaLuar] = useState("");
  const [peran, setPeran] = useState("");

  // Satu kegiatan hanya boleh punya satu Ketua Panitia (dijaga juga di pusat
  // data lewat indeks unik). Pilihan Ketua Panitia dimatikan bila sudah ada.
  const sudahAdaKetua = daftarPanitia.some((p) => p.peran === "ketua_panitia");
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
          {bolehUbahPanitia && !terkunci && !bukaFormPanitia && totalPanitia > 0 && (
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
        {bolehUbahPanitia && bukaFormPanitia && (
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
              label="Peran dalam Kepanitiaan"
              bantuan={
                sudahAdaKetua
                  ? "Ketua Panitia sudah ada. Pilih Sekretaris, Bendahara, atau Anggota Panitia."
                  : "Pilih satu. Satu kegiatan hanya boleh punya satu Ketua Panitia."
              }
              galat={galatPanitia}
            >
              <Pilihan value={peran} onChange={(e) => setPeran(e.target.value)}>
                <option value="">— Pilih peran —</option>
                {PERAN_PANITIA.map((p) => (
                  <option
                    key={p.nilai}
                    value={p.nilai}
                    disabled={p.nilai === "ketua_panitia" && sudahAdaKetua}
                  >
                    {p.label}
                  </option>
                ))}
              </Pilihan>
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

      {/* PENUGASAN PENGELOLA PRESENSI & DOKUMENTASI
          Aturan pemilik: penanggung jawab menugaskan; hanya yang ditugaskan
          boleh membuka dan mengelola tab presensi/dokumentasi.
          Penanggung jawab & Super Admin tetap bisa sebagai cadangan. */}
      {/* Panel ini TAMPIL UNTUK SEMUA orang yang membuka tab Panitia.
          Aturan pemilik: semua berhak MENGETAHUI siapa pengelola presensi dan
          dokumentasi; yang dibatasi hanya MENGUBAH penugasannya (penanggung
          jawab saja). Sebelumnya panel ini disembunyikan seluruhnya sehingga
          Ketua Panitia pun tidak tahu siapa pengelolanya. */}
      {totalPanitia > 0 && (
        <Kartu className="p-4 sm:p-5">
          <JudulSeksi>Pengelola Presensi &amp; Dokumentasi</JudulSeksi>
          <p className="teks-3 text-n-600 mt-1">
            Tunjuk satu panitia untuk mengurus kehadiran peserta dan satu untuk dokumentasi.
            Hanya yang ditunjuk yang dapat membuka tab tersebut.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["presensi", "dokumentasi"] as const).map((bagian) => {
              const aktif = daftarPenugasan.find((p) => p.bagian === bagian);
              const panitiaAktif = daftarPanitia.find((p) => p.id === aktif?.committee_id);
              const namaAktif =
                panitiaAktif?.profiles?.nama || panitiaAktif?.nama_luar || null;
              const label = bagian === "presensi" ? "Presensi" : "Dokumentasi";

              return (
                <div key={bagian} className="rounded-token border border-n-200 p-3">
                  <p className="text-[14px] font-medium text-n-800">{label}</p>
                  {namaAktif ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="teks-3 text-n-700">{namaAktif}</span>
                      {bolehUbahPanitia && !terkunci && (
                        <TombolHalus
                          type="button"
                          ukuran="kecil"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              const r = await cabutPenugasan(activityId, bagian);
                              if (r.galat) setGalatPanitia(r.galat);
                            });
                          }}
                          className="min-h-[44px]"
                        >
                          Cabut
                        </TombolHalus>
                      )}
                    </div>
                  ) : (
                    <p className="teks-3 text-n-400 mt-2">Belum ditugaskan</p>
                  )}

                  <div className="mt-3">
                    {!bolehUbahPanitia || terkunci ? null : (
                    <Pilihan
                      value=""
                      disabled={isPending}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        startTransition(async () => {
                          const r = await tugaskanPengelola(activityId, id, bagian);
                          if (r.galat) setGalatPanitia(r.galat);
                        });
                      }}
                    >
                      <option value="">— Pilih panitia —</option>
                      {daftarPanitia
                        .filter((p) => p.profile_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.profiles?.nama || p.nama_luar} ({labelPeranPanitia(p.peran)})
                          </option>
                        ))}
                    </Pilihan>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="teks-3 text-n-500 mt-3">
            {bolehUbahPanitia && !terkunci
              ? "Hanya panitia yang punya akun SI-ANGGUN yang bisa ditugaskan. Penanggung jawab kegiatan tetap dapat membuka kedua tab bila pengelola berhalangan."
              : "Hanya penanggung jawab kegiatan yang dapat mengubah penugasan ini. Penanggung jawab juga tetap dapat membuka kedua tab bila pengelola berhalangan."}
          </p>
        </Kartu>
      )}

      {!bolehUbahPanitia && (
        <div className="rounded-token border border-n-200 bg-n-50 p-3">
          <p className="teks-3 text-n-600">
            Hanya penanggung jawab kegiatan yang dapat menyusun panitia dan menugaskan
            pengelola presensi atau dokumentasi. Anda dapat melihat susunannya di sini.
          </p>
        </div>
      )}

      {/* Daftar Panitia */}
      {daftarPanitia.length === 0 ? (
        <Kosong
          pesan="Belum ada susunan panitia untuk kegiatan ini."
          aksi={
            bolehUbahPanitia && !terkunci && !bukaFormPanitia ? (
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

            // Ketua Panitia menilai pekerjaan anggota, dan penanggung jawab
            // menilai pekerjaan Ketua Panitia. Jadi Ketua Panitia TIDAK bisa
            // mencentang tugas miliknya sendiri — sama seperti aturan di server.
            const iniTugasSendiri =
              panitia.peran === "ketua_panitia" &&
              !!konteks &&
              bolehCentangTugas(konteks) &&
              panitia.profile_id === konteks.id &&
              !apakahPenanggungJawab(konteks) &&
              !konteks.superAdmin;

            return (
              <Kartu key={panitia.id} className="p-4 sm:p-5">
                {/* Bagian Profil Panitia */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-n-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-n-800 text-[16px]">{nama}</h3>
                      <Lencana nada="brand">{labelPeranPanitia(panitia.peran)}</Lencana>
                      {panitia.nama_luar && (
                        <Lencana nada="netral">Luar</Lencana>
                      )}
                    </div>
                    {jabatan && (
                      <p className="teks-3 text-n-500 mt-0.5">{jabatan}</p>
                    )}
                  </div>

                  {/* ATURAN PEMILIK: menghapus panitia HANYA boleh penanggung
                      jawab kegiatan. Sebelumnya tombol ini tidak dibungkus syarat
                      apa pun sehingga muncul untuk semua orang — termasuk anggota
                      panitia yang ingin menghapus dirinya sendiri. */}
                  {bolehUbahPanitia && !terkunci ? (
                    <TombolHalus
                      type="button"
                      ukuran="kecil"
                      disabled={isPending}
                      onClick={() => setPanitiaDihapus(panitia)}
                      className="text-bad-fg hover:bg-bad-bg"
                    >
                      Hapus
                    </TombolHalus>
                  ) : (
                    <span className="teks-3 text-n-400">—</span>
                  )}
                </div>

                {/* Bagian Tugas Panitia */}
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[13px] font-medium text-n-700">
                      Tugas ({tugasList.filter((t) => t.selesai).length}/{tugasList.length})
                    </span>
                    {/* ATURAN PEMILIK:
                        tugas untuk KETUA PANITIA -> hanya penanggung jawab;
                        tugas untuk anggota lain  -> penanggung jawab atau ketua panitia. */}
                    {!adaFormTugas &&
                      konteks &&
                      bolehBeriTugas(konteks, panitia.peran as PeranPanitiaKode) && (
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
                            {/* ATURAN PEMILIK: mencentang tugas hanya boleh
                                penanggung jawab atau Ketua Panitia. Anggota
                                panitia tidak mencentang tugasnya sendiri. */}
                            <input
                              type="checkbox"
                              checked={tugas.selesai}
                              disabled={
                                isPending ||
                                !konteks ||
                                !bolehCentangTugas(konteks) ||
                                iniTugasSendiri ||
                                terkunci
                              }
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
                              {tugas.batas && (() => {
                                // Tenggat tugas SEBELUMNYA hanya ditampilkan tanpa
                                // memeriksa apa pun, sehingga tugas yang lewat batas
                                // terlihat sama saja dengan yang masih longgar.
                                // Sekarang diberi tanda: lewat batas (merah) atau
                                // mendekati batas dalam 3 hari (kuning).
                                const hariIni = new Date();
                                hariIni.setHours(0, 0, 0, 0);
                                const tenggat = new Date(`${tugas.batas}T00:00:00`);
                                const sisaHari = Math.round(
                                  (tenggat.getTime() - hariIni.getTime()) / 86400000,
                                );
                                const lewat = !tugas.selesai && sisaHari < 0;
                                const mepet = !tugas.selesai && sisaHari >= 0 && sisaHari <= 3;
                                return (
                                  <p
                                    className={`teks-3 mt-0.5 ${
                                      lewat
                                        ? "text-bad-fg font-medium"
                                        : mepet
                                          ? "text-warn-fg font-medium"
                                          : "text-n-500"
                                    }`}
                                  >
                                    Batas: {formatTanggal(tugas.batas)}
                                    {lewat && " — lewat batas"}
                                    {mepet && ` — sisa ${sisaHari} hari`}
                                  </p>
                                );
                              })()}
                            </div>
                          </label>

                          {konteks && bolehCentangTugas(konteks) && !iniTugasSendiri && !terkunci && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleHapusTugas(tugas.id)}
                              className="text-n-400 hover:text-bad-fg p-1.5 rounded-token transition-colors"
                              title="Hapus tugas"
                            >
                              ×
                            </button>
                          )}
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
              ({labelPeranPanitia(panitiaDihapus.peran)})? Semua tugas yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
