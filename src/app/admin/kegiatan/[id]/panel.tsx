"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu, JudulSeksi, TombolUtama, TombolSekunder, TombolBahaya, TombolHalus,
  Kolom, AreaTeks, Isian,
} from "@/components/dasar";
import { beriKeputusan, ubahTahap, simpanLaporan } from "./aksi";

type BarisRab = {
  id: string;
  uraian: string;
  satuan: string | null;
  jumlah: number;
  harga_satuan: number;
  realisasi: number | null;
};

type LangkahPersetujuan = { urutan: number; peran: string; sudah: "setuju" | "revisi" | "tolak" | null };
type Riwayat = { id: number; aksi: string; keterangan: string | null; pelaku_nama: string | null; waktu: string };

const NAMA_PERAN: Record<string, string> = {
  super_admin: "Super Admin",
  ketua: "Ketua",
  wakil_ketua: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  ketua_seksi: "Ketua Seksi/Bidang",
  pengurus: "Pengurus/Anggota",
  editor: "Editor Konten",
};

export function PanelTindakan({
  activityId,
  status,
  tahap,
  jenjang,
  bolehMenilai,
  pesanTunggu,
  peranSaya,
}: {
  activityId: string;
  status: string;
  tahap: "perencanaan" | "pelaksanaan" | "pelaporan";
  jenjang: LangkahPersetujuan[];
  bolehMenilai: boolean;
  pesanTunggu: string;
  peranSaya: string[];
}) {
  const router = useRouter();
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pilihan, setPilihan] = useState<"setuju" | "revisi" | "tolak" | null>(null);

  async function kirimKeputusan() {
    if (!pilihan) return;
    setGalat("");
    setSedang(true);
    const r = await beriKeputusan(activityId, tahap === "pelaporan" ? "pelaporan" : "perencanaan", pilihan, catatan);
    setSedang(false);
    if (r.galat) return setGalat(r.galat);
    setCatatan("");
    setPilihan(null);
    router.refresh();
  }

  async function jalankan(aksi: "mulai" | "selesai" | "ajukan_laporan" | "arsipkan") {
    setGalat("");
    setSedang(true);
    const r = await ubahTahap(activityId, aksi);
    setSedang(false);
    if (r.galat) return setGalat(r.galat);
    router.refresh();
  }

  /* ---------- Satu aksi utama sesuai konteks ---------- */

  let aksiUtama: React.ReactNode = null;

  if (status === "draf" || status === "revisi") {
    aksiUtama = (
      <TombolUtama onClick={() => jalankan("ajukan_laporan")} disabled={sedang} className="hidden">
        Ajukan
      </TombolUtama>
    );
  }
  if (status === "disetujui") {
    aksiUtama = (
      <TombolUtama onClick={() => jalankan("mulai")} disabled={sedang}>
        Mulai Kegiatan
      </TombolUtama>
    );
  } else if (status === "berjalan") {
    aksiUtama = (
      <TombolUtama onClick={() => jalankan("selesai")} disabled={sedang}>
        Tandai Selesai
      </TombolUtama>
    );
  } else if (status === "laporan_disetujui") {
    aksiUtama = (
      <TombolUtama onClick={() => jalankan("arsipkan")} disabled={sedang}>
        Kunci & Arsipkan
      </TombolUtama>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Aksi utama sesuai tahap */}
      {(aksiUtama || bolehMenilai) && (
        <Kartu className="p-4">
          <JudulSeksi>Tindakan</JudulSeksi>

          {bolehMenilai && (
            <div>
              <p className="teks-3 text-n-500 mb-3">
                Kegiatan ini menunggu keputusan Anda pada tahap {tahap}.
              </p>
              <div className="flex flex-wrap gap-3">
                <TombolUtama
                  onClick={() => setPilihan("setuju")}
                  className={pilihan === "setuju" ? "ring-2 ring-brand-300" : ""}
                >
                  Setujui
                </TombolUtama>
                <TombolSekunder
                  onClick={() => setPilihan("revisi")}
                  className={pilihan === "revisi" ? "ring-2 ring-warn-line" : ""}
                >
                  Minta Revisi
                </TombolSekunder>
                <TombolBahaya
                  onClick={() => setPilihan("tolak")}
                  className={pilihan === "tolak" ? "ring-2 ring-bad-line" : ""}
                >
                  Tolak
                </TombolBahaya>
              </div>

              {/* Kolom catatan muncul hanya saat Revisi/Tolak */}
              {pilihan && pilihan !== "setuju" && (
                <div className="mt-4">
                  <Kolom label="Catatan" bantuan="Wajib diisi agar pengusul tahu apa yang harus diperbaiki.">
                    <AreaTeks
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Contoh: RAB konsumsi terlalu besar, mohon disesuaikan."
                    />
                  </Kolom>
                </div>
              )}

              {pilihan && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <TombolUtama onClick={kirimKeputusan} disabled={sedang}>
                    {sedang ? "Menyimpan…" : pilihan === "setuju" ? "Kirim Persetujuan" : pilihan === "revisi" ? "Kirim Permintaan Revisi" : "Kirim Penolakan"}
                  </TombolUtama>
                  <TombolHalus
                    onClick={() => {
                      setPilihan(null);
                      setCatatan("");
                    }}
                  >
                    Batal
                  </TombolHalus>
                </div>
              )}
            </div>
          )}

          {aksiUtama}
          {!bolehMenilai && !aksiUtama && pesanTunggu && (
            <p className="text-n-600">{pesanTunggu}</p>
          )}
        </Kartu>
      )}

      {galat && (
        <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}

      {/* Linimasa persetujuan (vertikal sederhana) */}
      {jenjang.length > 0 && (
        <Kartu className="p-4">
          <JudulSeksi>Persetujuan {tahap}</JudulSeksi>
          <ol className="flex flex-col">
            {jenjang.map((l, i) => (
              <li key={l.urutan} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                      l.sudah === "setuju"
                        ? "bg-ok-bg text-ok-fg border border-ok-line"
                        : l.sudah === "revisi" || l.sudah === "tolak"
                          ? "bg-bad-bg text-bad-fg border border-bad-line"
                          : "bg-n-100 text-n-500 border border-n-200"
                    }`}
                  >
                    {l.sudah === "setuju" ? "✓" : l.urutan}
                  </span>
                  {i < jenjang.length - 1 && <span className="w-px flex-1 bg-n-200 my-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-[14px] text-n-800">
                    {NAMA_PERAN[l.peran] ?? l.peran}
                    {peranSaya.includes(l.peran) && (
                      <span className="teks-3 text-brand-700"> · Anda</span>
                    )}
                  </p>
                  <p className="teks-3 text-n-500">
                    {l.sudah === "setuju"
                      ? "Disetujui"
                      : l.sudah === "revisi"
                        ? "Minta revisi"
                        : l.sudah === "tolak"
                          ? "Ditolak"
                          : "Menunggu"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Kartu>
      )}
    </div>
  );
}

/** Panel isi laporan saat tahap pelaporan. */
export function PanelLaporan({
  activityId,
  isi,
  bisaUbah,
  rab,
}: {
  activityId: string;
  isi: {
    ringkasan: string;
    hasil: string;
    kendala: string;
    rekomendasi: string;
    jumlahHadir: number;
  };
  bisaUbah: boolean;
  rab: BarisRab[];
}) {
  const router = useRouter();
  const [ringkasan, setRingkasan] = useState(isi.ringkasan);
  const [hasil, setHasil] = useState(isi.hasil);
  const [kendala, setKendala] = useState(isi.kendala);
  const [rekomendasi, setRekomendasi] = useState(isi.rekomendasi);
  const [jumlahHadir, setJumlahHadir] = useState(isi.jumlahHadir);
  const [sedang, setSedang] = useState(false);
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");

  const total = rab.reduce((j, b) => j + b.jumlah * b.harga_satuan, 0);
  const realisasi = rab.reduce((j, b) => j + (b.realisasi ?? 0), 0);

  async function simpan() {
    setGalat("");
    setPesan("");
    setSedang(true);
    const r = await simpanLaporan(activityId, { ringkasan, hasil, kendala, rekomendasi, jumlahHadir });
    setSedang(false);
    if (r.galat) return setGalat(r.galat);
    setPesan("Laporan tersimpan.");
    router.refresh();
  }

  return (
    <Kartu className="p-4 sm:p-5">
      <JudulSeksi>Isi laporan</JudulSeksi>

      <div className="flex flex-col gap-4">
        <Kolom label="Ringkasan pelaksanaan">
          <AreaTeks value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} disabled={!bisaUbah} />
        </Kolom>
        <Kolom label="Hasil yang dicapai">
          <AreaTeks value={hasil} onChange={(e) => setHasil(e.target.value)} disabled={!bisaUbah} />
        </Kolom>
        <Kolom label="Jumlah peserta hadir">
          <Isian
            type="number"
            min={0}
            value={jumlahHadir}
            onChange={(e) => setJumlahHadir(Number(e.target.value))}
            disabled={!bisaUbah}
          />
        </Kolom>
        <Kolom label="Kendala">
          <AreaTeks value={kendala} onChange={(e) => setKendala(e.target.value)} disabled={!bisaUbah} />
        </Kolom>
        <Kolom label="Rekomendasi">
          <AreaTeks value={rekomendasi} onChange={(e) => setRekomendasi(e.target.value)} disabled={!bisaUbah} />
        </Kolom>

        <div className="rounded-token border border-n-200 bg-n-50 p-3">
          <p className="teks-3 text-n-500">Perbandingan anggaran</p>
          <div className="flex flex-wrap gap-6 mt-1">
            <span className="text-[14px] text-n-800">
              Rencana: <strong>Rp {Math.round(total).toLocaleString("id-ID")}</strong>
            </span>
            <span className="text-[14px] text-n-800">
              Realisasi: <strong>Rp {Math.round(realisasi).toLocaleString("id-ID")}</strong>
            </span>
          </div>
          {realisasi > total && total > 0 && (
            <p className="teks-3 text-bad-fg mt-1">
              Realisasi melebihi rencana. Perubahan anggaran perlu pengajuan perubahan.
            </p>
          )}
        </div>

        {galat && (
          <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
            {galat}
          </p>
        )}
        {pesan && (
          <p className="rounded-token border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok-fg">
            {pesan}
          </p>
        )}

        {bisaUbah && (
          <div>
            <TombolUtama onClick={simpan} disabled={sedang}>
              {sedang ? "Menyimpan…" : "Simpan Laporan"}
            </TombolUtama>
          </div>
        )}
      </div>
    </Kartu>
  );
}

/** Linimasa riwayat kegiatan. */
export function LinimasaRiwayat({ riwayat }: { riwayat: Riwayat[] }) {
  if (riwayat.length === 0) {
    return <p className="text-n-500">Belum ada riwayat.</p>;
  }
  return (
    <ol className="flex flex-col">
      {riwayat.map((r, i) => (
        <li key={r.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-600 mt-1.5" />
            {i < riwayat.length - 1 && <span className="w-px flex-1 bg-n-200" />}
          </div>
          <div className="pb-4">
            <p className="text-[14px] text-n-800">{r.keterangan ?? r.aksi}</p>
            <p className="teks-3 text-n-500">
              {r.pelaku_nama ?? "Sistem"} ·{" "}
              {new Date(r.waktu).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}


/** Tombol mengajukan laporan untuk mulai diperiksa berjenjang. */
export function TombolUtamaAjukan({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    setGalat("");
    setSedang(true);
    const r = await ubahTahap(activityId, "ajukan_laporan");
    setSedang(false);
    if (r.galat) return setGalat(r.galat);
    router.refresh();
  }

  return (
    <div>
      {galat && (
        <p className="mb-3 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      <TombolUtama onClick={kirim} disabled={sedang}>
        {sedang ? "Mengirim…" : "Ajukan Laporan"}
      </TombolUtama>
    </div>
  );
}
