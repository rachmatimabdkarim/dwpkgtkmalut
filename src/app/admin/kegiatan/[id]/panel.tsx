"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu, JudulSeksi, TombolUtama, TombolSekunder, TombolBahaya, TombolHalus,
  Kolom, AreaTeks, Isian,
} from "@/components/dasar";
import { ajukanKegiatan, batalkanAjuan, hapusKegiatan } from "../aksi";
import { beriKeputusan, ubahTahap, simpanLaporan } from "./aksi";

type BarisRab = {
  id: string;
  uraian: string;
  satuan: string | null;
  jumlah: number;
  harga_satuan: number;
  realisasi: number | null;
};

type LangkahPersetujuan = {
  urutan: number;
  peran: string;
  sudah: "setuju" | "revisi" | "tolak" | null;
  /** Catatan penyetuju saat Minta Revisi / Tolak — sebabnya harus terbaca pengusul. */
  catatan?: string | null;
};
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
  urutanDilewati,
  alasanDilewati,
  judul,
  pengusulSendiri,
}: {
  activityId: string;
  status: string;
  tahap: "perencanaan" | "pelaksanaan" | "pelaporan";
  jenjang: LangkahPersetujuan[];
  bolehMenilai: boolean;
  pesanTunggu: string;
  peranSaya: string[];
  /** Urutan tahap yang otomatis dilewati (tidak perlu disetujui). */
  urutanDilewati?: number[];
  /** Alasan pelewatan tiap tahap, dipakai sebagai keterangan di linimasa. */
  alasanDilewati?: Record<number, string>;
  /** Judul kegiatan — dipakai tombol batalkan/hapus. */
  judul: string;
  /** Benar bila pengguna yang masuk adalah pengusul kegiatan ini. */
  pengusulSendiri: boolean;
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
    // Mengajukan KEGIATAN (bukan laporan). Sebelumnya tombol ini tersambung
    // ke fungsi laporan sehingga selalu ditolak dengan pesan "tahap belum
    // memungkinkan".
    aksiUtama = (
      <div className="flex flex-col gap-3">
        <TombolAjukanKegiatan activityId={activityId} />
        {/* Menghapus hanya boleh untuk draf, dan hanya oleh pengusul. */}
        {pengusulSendiri && (
          <div className="pt-1 border-t border-n-100">
            <TombolHapusKegiatan activityId={activityId} judul={judul} />
          </div>
        )}
      </div>
    );
  }
  if (status === "diajukan") {
    // Pengusul dapat menarik ajuannya sendiri selagi belum ada yang menyetujui.
    // Tombol menilai (bila giliran pengguna) diurus di bagian bawah.
    aksiUtama = pengusulSendiri ? (
      <TombolBatalkanAjuan activityId={activityId} judul={judul} />
    ) : null;
  } else if (status === "disetujui") {
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
                  {/* Tombol dimatikan saat catatan kosong untuk Revisi/Tolak.
                      Server memang sudah menolak (catatan wajib), tetapi tombol
                      yang tetap hidup membuat pengguna menekan sesuatu yang pasti
                      gagal tanpa tahu sebabnya. */}
                  <TombolUtama
                    onClick={kirimKeputusan}
                    disabled={sedang || (pilihan !== "setuju" && catatan.trim() === "")}
                  >
                    {sedang ? "Menyimpan…" : pilihan === "setuju" ? "Kirim Persetujuan" : pilihan === "revisi" ? "Kirim Permintaan Revisi" : "Kirim Penolakan"}
                  </TombolUtama>
                  {pilihan !== "setuju" && catatan.trim() === "" && (
                    <p className="teks-3 text-n-500 self-center">
                      Isi catatan di atas dulu agar pengusul tahu apa yang harus diperbaiki.
                    </p>
                  )}
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
                      (urutanDilewati ?? []).includes(l.urutan)
                        ? "bg-n-100 text-n-400 border border-n-200"
                        : l.sudah === "setuju"
                          ? "bg-ok-bg text-ok-fg border border-ok-line"
                          : l.sudah === "revisi" || l.sudah === "tolak"
                            ? "bg-bad-bg text-bad-fg border border-bad-line"
                            : "bg-n-100 text-n-500 border border-n-200"
                    }`}
                  >
                    {(urutanDilewati ?? []).includes(l.urutan)
                      ? "—"
                      : l.sudah === "setuju"
                        ? "✓"
                        : l.urutan}
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
                    {(urutanDilewati ?? []).includes(l.urutan)
                      ? "Dilewati"
                      : l.sudah === "setuju"
                        ? "Disetujui"
                        : l.sudah === "revisi"
                          ? "Minta revisi"
                          : l.sudah === "tolak"
                            ? "Ditolak"
                            : "Menunggu"}
                  </p>
                  {(urutanDilewati ?? []).includes(l.urutan) && (
                    <p className="teks-3 text-n-500 mt-0.5 leading-snug">
                      {alasanDilewati?.[l.urutan] ??
                        "Tahap ini tidak diperlukan untuk kegiatan ini."}
                    </p>
                  )}
                  {/* Catatan penyetuju: sebab revisi/penolakan. Tanpa ini pengusul
                      hanya tahu "perlu revisi" tanpa tahu apa yang harus diperbaiki. */}
                  {l.catatan && (l.sudah === "revisi" || l.sudah === "tolak") && (
                    <div className="mt-1.5 rounded-token border border-warn-line bg-warn-bg px-2.5 py-2">
                      <p className="teks-3 text-warn-fg font-medium mb-0.5">
                        {l.sudah === "tolak" ? "Alasan ditolak" : "Catatan perbaikan"}
                      </p>
                      <p className="text-[13px] text-n-800 leading-snug whitespace-pre-wrap">
                        {l.catatan}
                      </p>
                    </div>
                  )}
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
  bisaAjukan,
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
  bisaAjukan: boolean;
  rab: BarisRab[];
}) {
  const router = useRouter();
  const [ringkasan, setRingkasan] = useState(isi.ringkasan);
  const [hasil, setHasil] = useState(isi.hasil);
  const [kendala, setKendala] = useState(isi.kendala);
  const [rekomendasi, setRekomendasi] = useState(isi.rekomendasi);
  const [jumlahHadir, setJumlahHadir] = useState(isi.jumlahHadir);
  const [sedang, setSedang] = useState(false);
  const [sedangAjukan, setSedangAjukan] = useState(false);
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

  // Simpan isian SEKALIGUS ajukan, supaya laporan yang diperiksa penyetuju
  // tidak pernah kosong.
  async function ajukan() {
    setGalat("");
    setPesan("");
    setSedangAjukan(true);
    const r = await ubahTahap(activityId, "ajukan_laporan", {
      ringkasan, hasil, kendala, rekomendasi, jumlahHadir,
    });
    setSedangAjukan(false);
    if (r.galat) return setGalat(r.galat);
    setPesan("Laporan tersimpan dan diajukan untuk persetujuan berjenjang.");
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
          <div className="flex flex-col gap-3">
            {bisaAjukan && (
              <div>
                <TombolUtama onClick={ajukan} disabled={sedangAjukan}>
                  {sedangAjukan ? "Mengajukan…" : "Simpan & Ajukan Laporan"}
                </TombolUtama>
                <p className="teks-3 text-n-500 mt-2">
                  Isian laporan ikut tersimpan, lalu masuk pemeriksaan berjenjang:
                  Bendahara → Sekretaris → Wakil Ketua → Ketua.
                </p>
              </div>
            )}
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

/**
 * Tombol "Ajukan Kegiatan" untuk draf/revisi.
 *
 * Memanggil fungsi pengajuan KEGIATAN (ajukanKegiatan), bukan fungsi laporan.
 */
export function TombolAjukanKegiatan({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    setGalat("");
    setSedang(true);
    const r = await ajukanKegiatan(activityId);
    setSedang(false);
    if (r?.galat) return setGalat(r.galat);
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
        {sedang ? "Mengirim…" : "Ajukan Kegiatan"}
      </TombolUtama>
      <p className="mt-2 text-[12.5px] text-n-500">
        Kegiatan akan dikirim untuk persetujuan berjenjang.
      </p>
    </div>
  );
}

/**
 * Tombol "Batalkan Ajuan" — menarik kembali kegiatan yang sedang diajukan
 * supaya pengusul bisa memperbaikinya. Alasan wajib diisi.
 *
 * Hanya muncul bagi pengusul (atau Super Admin) dan hanya selama belum ada
 * satu pun persetujuan.
 */
export function TombolBatalkanAjuan({
  activityId,
  judul,
}: {
  activityId: string;
  judul: string;
}) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    setGalat("");
    setSedang(true);
    const r = await batalkanAjuan(activityId, alasan);
    setSedang(false);
    if (r?.galat) return setGalat(r.galat);
    setTerbuka(false);
    router.refresh();
  }

  if (!terbuka) {
    return (
      <TombolSekunder onClick={() => setTerbuka(true)}>
        Batalkan Ajuan
      </TombolSekunder>
    );
  }

  return (
    <div className="rounded-token border border-n-200 bg-n-50 p-4">
      {galat && (
        <p className="mb-3 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      <p className="text-[14px] text-n-700 mb-3">
        Ajuan kegiatan <strong>{judul}</strong> akan ditarik kembali dan
        berstatus draf, supaya Bapak/Ibu dapat memperbaikinya lalu mengajukan ulang.
      </p>
      <Kolom label="Alasan penarikan" bantuan="Wajib diisi — tercatat di riwayat kegiatan.">
        <AreaTeks
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Contoh: tanggal pelaksanaan perlu disesuaikan dengan jadwal kantor."
        />
      </Kolom>
      <div className="mt-3 flex flex-wrap gap-3">
        <TombolBahaya onClick={kirim} disabled={sedang || alasan.trim().length === 0}>
          {sedang ? "Menarik…" : "Ya, Tarik Ajuan"}
        </TombolBahaya>
        <TombolHalus
          onClick={() => {
            setTerbuka(false);
            setGalat("");
          }}
        >
          Batal
        </TombolHalus>
      </div>
    </div>
  );
}

/**
 * Tombol "Hapus Kegiatan" — hanya untuk kegiatan berstatus DRAF.
 *
 * Pengaman: nama kegiatan wajib diketik sama persis, supaya tidak salah hapus.
 * Kegiatan yang sudah diajukan/disetujui tidak dapat dihapus — itu catatan
 * resmi organisasi; pakai "Sembunyikan dari publik" bila tidak ingin tampil.
 */
export function TombolHapusKegiatan({
  activityId,
  judul,
}: {
  activityId: string;
  judul: string;
}) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [ketik, setKetik] = useState("");
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    setGalat("");
    setSedang(true);
    const r = await hapusKegiatan(activityId, ketik);
    setSedang(false);
    if (r?.galat) return setGalat(r.galat);
    router.push("/admin/kegiatan");
    router.refresh();
  }

  if (!terbuka) {
    return (
      <TombolHalus onClick={() => setTerbuka(true)}>
        Hapus Kegiatan
      </TombolHalus>
    );
  }

  return (
    <div className="rounded-token border border-bad-line bg-bad-bg p-4">
      {galat && (
        <p className="mb-3 rounded-token border border-bad-line bg-n-0 px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      <p className="text-[14px] font-semibold text-bad-fg mb-2">
        Kegiatan ini akan dihapus permanen.
      </p>
      <p className="text-[13.5px] text-n-700 mb-3">
        Data yang ikut terhapus: anggaran, lampiran, dan catatan persetujuan.
        Riwayat kegiatan tetap tersimpan sebagai jejak. Tindakan ini tidak dapat
        dibatalkan.
      </p>
      <Kolom
        label="Ketik nama kegiatan untuk memastikan"
        bantuan={`Ketik sama persis: ${judul}`}
      >
        <Isian value={ketik} onChange={(e) => setKetik(e.target.value)} placeholder={judul} />
      </Kolom>
      <div className="mt-3 flex flex-wrap gap-3">
        <TombolBahaya
          onClick={kirim}
          disabled={sedang || ketik.trim() !== judul.trim()}
        >
          {sedang ? "Menghapus…" : "Ya, Hapus Permanen"}
        </TombolBahaya>
        <TombolHalus
          onClick={() => {
            setTerbuka(false);
            setKetik("");
            setGalat("");
          }}
        >
          Batal
        </TombolHalus>
      </div>
    </div>
  );
}
