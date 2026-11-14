"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Kartu,
  Kolom,
  Isian,
  AreaTeks,
  TombolUtama,
  TombolSekunder,
  TombolHalus,
  TombolBahaya,
  Lencana,
  Kosong,
} from "@/components/dasar";
import { PilihFotoKegiatan, type FotoLaporan } from "@/components/pilih-foto-kegiatan";
import { formatTanggal } from "@/lib/kegiatan";
import { simpanBerita, aksiTerbitkanBerita, aksiTarikBerita, aksiHapusBerita } from "./aksi";
import { urlPublik } from "./antrean";

export type DataBeritaAwal = {
  id?: string;
  judul?: string;
  ringkasan?: string | null;
  isi?: string | null;
  gambar_path?: string | null;
  status?: string;
  /** Kegiatan asal berita ini; menentukan foto mana yang boleh dipakai */
  activity_id?: string | null;
};

export function FormulirBerita({
  awal,
  fotoTersedia = [],
  onSelesai,
  onBatal,
}: {
  awal?: DataBeritaAwal;
  /** Foto dokumentasi dari laporan kegiatan — SATU-SATUNYA sumber gambar
   *  sampul berita. Tidak ada unggahan gambar bebas di formulir ini. */
  fotoTersedia?: FotoLaporan[];
  onSelesai?: () => void;
  onBatal?: () => void;
}) {
  const [judul, setJudul] = useState(awal?.judul ?? "");
  const [ringkasan, setRingkasan] = useState(awal?.ringkasan ?? "");
  const [isi, setIsi] = useState(awal?.isi ?? "");
  const [gambarPath, setGambarPath] = useState<string | null>(awal?.gambar_path ?? null);

  const [pesanGalat, setPesanGalat] = useState("");
  const [isPending, startTransition] = useTransition();

  /** Mengosongkan pilihan foto sampul. Berkas TIDAK dihapus dari
   *  penyimpanan — foto itu milik laporan kegiatan dan tetap tercatat di sana. */
  function kosongkanGambar() {
    setGambarPath(null);
  }

  function kirim(terbitkan: boolean) {
    setPesanGalat("");
    if (!judul.trim()) {
      setPesanGalat("Judul berita wajib diisi.");
      return;
    }
    if (!isi.trim()) {
      setPesanGalat("Isi berita wajib diisi.");
      return;
    }

    // Gambar sampul HANYA boleh berasal dari foto laporan kegiatan.
    // Tidak ada unggahan gambar bebas di formulir ini, jadi tidak ada lagi
    // langkah memindahkan berkas ke folder berita.
    if (gambarPath && !fotoTersedia.some((f) => f.path === gambarPath)) {
      setPesanGalat("Foto sampul harus dipilih dari dokumentasi kegiatan.");
      return;
    }

    startTransition(async () => {
      const finalGambarPath = gambarPath;

      const hasil = await simpanBerita({
        id: awal?.id,
        judul,
        ringkasan,
        isi,
        gambar_path: finalGambarPath,
        status: awal?.status === "terbit" ? "terbit" : terbitkan ? "terbit" : "draf",
        terbitkan,
      });

      if (hasil.galat) {
        setPesanGalat(hasil.galat);
        return;
      }

      onSelesai?.();
    });
  }

  return (
    <Kartu className="p-4 sm:p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-n-200">
        <h2 className="judul-2 text-n-800">
          {awal?.id ? "Sunting Berita" : "Tulis Berita Baru"}
        </h2>
        {onBatal && (
          <TombolHalus ukuran="kecil" type="button" onClick={onBatal}>
            Tutup
          </TombolHalus>
        )}
      </div>

      {pesanGalat && (
        <div className="mb-4 rounded-token border border-bad-line bg-bad-bg p-3 text-bad-fg text-[14px]">
          {pesanGalat}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="flex flex-col gap-4"
      >
        <Kolom label="Judul Berita" bantuan="Gunakan judul yang jelas dan informatif.">
          <Isian
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Peringatan Hari Kartini DWP GTK Malut Berlangsung Khidmat"
            disabled={isPending}
            required
          />
        </Kolom>

        <Kolom
          label="Ringkasan (Opsional)"
          bantuan="1–2 kalimat pembuka untuk pratinjau kartu berita di beranda publik."
        >
          <AreaTeks
            value={ringkasan}
            onChange={(e) => setRingkasan(e.target.value)}
            rows={2}
            placeholder="Ringkasan singkat berita..."
            disabled={isPending}
          />
        </Kolom>

        <Kolom label="Isi Berita" bantuan="Tuliskan berita lengkap dalam beberapa paragraf.">
          <AreaTeks
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            rows={8}
            placeholder="Tuliskan isi berita di sini..."
            disabled={isPending}
            required
          />
        </Kolom>

        <div>
          <span className="block text-[13px] font-medium text-n-700 mb-1.5">
            Gambar Sampul Berita
          </span>
          <p className="teks-3 text-n-500 mb-2.5">
            Dipilih dari foto dokumentasi laporan kegiatan. Berkas di luar
            dokumentasi kegiatan tidak dapat dipakai.
          </p>
          <PilihFotoKegiatan
            daftar={fotoTersedia}
            terpilih={gambarPath}
            sedang={isPending}
            onPilih={(path) => setGambarPath(path)}
            onKosongkan={kosongkanGambar}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-n-200 mt-2">
          {onBatal && (
            <TombolSekunder type="button" onClick={onBatal} disabled={isPending}>
              Batal
            </TombolSekunder>
          )}

          <TombolSekunder
            type="button"
            disabled={isPending}
            onClick={() => kirim(false)}
          >
            {isPending ? "Menyimpan…" : awal?.id ? "Simpan Perubahan" : "Simpan Draf"}
          </TombolSekunder>

          <TombolUtama
            type="button"
            disabled={isPending}
            onClick={() => kirim(true)}
          >
            {isPending ? "Menerbitkan…" : "Terbitkan Sekarang"}
          </TombolUtama>
        </div>
      </form>
    </Kartu>
  );
}

export type ItemBerita = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  isi: string | null;
  sumber: "manual" | "otomatis";
  gambar_path: string | null;
  status: "draf" | "antrean" | "terbit" | "arsip";
  terbit_pada: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
  activity_id: string | null;
};

export function DaftarBerita({
  semuaBerita,
  bukaFormAwal = false,
  onSelesai,
  fotoLaporan = [],
}: {
  semuaBerita: ItemBerita[];
  bukaFormAwal?: boolean;
  onSelesai?: () => void;
  /** Seluruh foto dokumentasi kegiatan; formulir menyaring sendiri menurut
   *  kegiatan asal berita yang sedang disunting. */
  fotoLaporan?: FotoLaporan[];
}) {
  const [bukaForm, setBukaForm] = useState(bukaFormAwal);
  const [dataSunting, setDataSunting] = useState<ItemBerita | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [konfirmasiHapusId, setKonfirmasiHapusId] = useState<string | null>(null);
  const [pesanGalat, setPesanGalat] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");
  const [isPending, startTransition] = useTransition();

  const disaring = semuaBerita.filter((b) => {
    if (filterStatus === "semua") return true;
    return b.status === filterStatus;
  });

  function mulaiTambah() {
    setDataSunting(null);
    setBukaForm(true);
    setPesanGalat("");
    setPesanSukses("");
  }

  function mulaiSunting(item: ItemBerita) {
    setDataSunting(item);
    setBukaForm(true);
    setPesanGalat("");
    setPesanSukses("");
  }

  function tanganiTerbitkan(id: string) {
    setPesanGalat("");
    setPesanSukses("");
    startTransition(async () => {
      const res = await aksiTerbitkanBerita(id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses("Berita berhasil diterbitkan ke web publik.");
        onSelesai?.();
      }
    });
  }

  function tanganiTarik(id: string) {
    setPesanGalat("");
    setPesanSukses("");
    startTransition(async () => {
      const res = await aksiTarikBerita(id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses("Berita ditarik dari web publik dan dikembalikan ke draf.");
        onSelesai?.();
      }
    });
  }

  function tanganiHapus(id: string) {
    setPesanGalat("");
    setPesanSukses("");
    startTransition(async () => {
      const res = await aksiHapusBerita(id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setKonfirmasiHapusId(null);
        setPesanSukses("Berita berhasil dihapus.");
        onSelesai?.();
      }
    });
  }

  const statusPills = [
    { key: "semua", label: "Semua" },
    { key: "terbit", label: "Terbit" },
    { key: "antrean", label: "Antrean" },
    { key: "draf", label: "Draf" },
    { key: "arsip", label: "Arsip" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {bukaForm && (
        <div className="mb-2">
          <FormulirBerita
            awal={
              dataSunting
                ? {
                    id: dataSunting.id,
                    judul: dataSunting.judul,
                    ringkasan: dataSunting.ringkasan,
                    isi: dataSunting.isi,
                    gambar_path: dataSunting.gambar_path,
                    status: dataSunting.status,
                    activity_id: dataSunting.activity_id,
                  }
                : undefined
            }
            fotoTersedia={fotoLaporan.map((f) => ({
              ...f,
              dariKegiatanIni: Boolean(
                dataSunting?.activity_id && f.kegiatanId === dataSunting.activity_id,
              ),
            }))}
            onSelesai={() => {
              setBukaForm(false);
              setDataSunting(null);
              setPesanSukses("Berita berhasil disimpan.");
              onSelesai?.();
            }}
            onBatal={() => {
              setBukaForm(false);
              setDataSunting(null);
            }}
          />
        </div>
      )}

      {/* Baris aksi utama & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter status */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          {statusPills.map((p) => {
            const aktif = filterStatus === p.key;
            const jumlah =
              p.key === "semua"
                ? semuaBerita.length
                : semuaBerita.filter((b) => b.status === p.key).length;

            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilterStatus(p.key)}
                className={`shrink-0 inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors ${
                  aktif
                    ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                    : "border-n-300 bg-n-0 text-n-600 hover:bg-n-50"
                }`}
              >
                <span>{p.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    aktif ? "bg-white/20 text-white" : "bg-n-100 text-n-500"
                  }`}
                >
                  {jumlah}
                </span>
              </button>
            );
          })}
        </div>

        {!bukaForm && (
          <TombolUtama
            ukuran="sedang"
            type="button"
            onClick={mulaiTambah}
            className="shrink-0 self-start sm:self-auto"
          >
            + Berita Baru
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

      {disaring.length === 0 ? (
        <Kosong
          pesan={
            filterStatus === "semua"
              ? "Belum ada berita. Mulai dengan membuat berita baru atau tinjau laporan kegiatan yang disetujui."
              : `Tidak ada berita dengan status "${filterStatus}".`
          }
          aksi={
            !bukaForm ? (
              <TombolUtama type="button" onClick={mulaiTambah}>
                + Berita Baru
              </TombolUtama>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {disaring.map((post) => {
            const fotoUrl = urlPublik(post.gambar_path);
            const sedangHapus = konfirmasiHapusId === post.id;

            return (
              <Kartu key={post.id} className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {fotoUrl && (
                    <div className="relative w-full sm:w-40 h-28 rounded-token overflow-hidden border border-n-200 bg-n-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotoUrl} alt={post.judul} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {/* Lencana status */}
                      {post.status === "terbit" && <Lencana nada="ok">Terbit</Lencana>}
                      {post.status === "antrean" && <Lencana nada="warn">Antrean</Lencana>}
                      {post.status === "draf" && <Lencana nada="netral">Draf</Lencana>}
                      {post.status === "arsip" && <Lencana nada="netral">Arsip</Lencana>}

                      {/* Penanda sumber yang terlihat HANYA di panel */}
                      {post.sumber === "otomatis" ? (
                        <Lencana nada="brand">Otomatis</Lencana>
                      ) : (
                        <Lencana nada="netral">Manual</Lencana>
                      )}

                      <span className="teks-3 text-n-500">
                        {post.status === "terbit" && post.terbit_pada
                          ? `Terbit: ${formatTanggal(post.terbit_pada.slice(0, 10))}`
                          : `Dibuat: ${formatTanggal(post.dibuat_pada.slice(0, 10))}`}
                      </span>
                    </div>

                    <h3 className="font-semibold text-n-900 text-[16px] mb-1 leading-snug">
                      {post.judul}
                    </h3>

                    {post.ringkasan && (
                      <p className="text-n-600 text-[14px] line-clamp-2 mb-2">
                        {post.ringkasan}
                      </p>
                    )}

                    {post.status === "terbit" && (
                      <div className="mt-1">
                        <Link
                          href={`/berita/${post.slug}`}
                          target="_blank"
                          className="teks-3 text-brand-600 hover:underline inline-flex items-center gap-1"
                        >
                          Lihat tampilan publik ↗
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {sedangHapus ? (
                  <div className="mt-3 p-3 rounded-token border border-bad-line bg-bad-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="teks-3 text-bad-fg font-medium">
                      Hapus berita ini secara permanen? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <TombolSekunder
                        ukuran="kecil"
                        type="button"
                        onClick={() => setKonfirmasiHapusId(null)}
                        disabled={isPending}
                      >
                        Batal
                      </TombolSekunder>
                      <TombolBahaya
                        ukuran="kecil"
                        type="button"
                        onClick={() => tanganiHapus(post.id)}
                        disabled={isPending}
                      >
                        {isPending ? "Memproses…" : "Ya, Hapus"}
                      </TombolBahaya>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-n-200 flex flex-wrap items-center justify-end gap-2">
                    {post.activity_id && (
                      <a
                        href={`/api/laporan/${post.activity_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1 rounded-token border border-n-300 bg-n-0 px-3 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors"
                        title="Unduh Laporan PDF kegiatan terkait"
                      >
                        Unduh PDF
                      </a>
                    )}

                    <TombolHalus
                      ukuran="kecil"
                      type="button"
                      className="text-bad-fg hover:bg-bad-bg"
                      onClick={() => setKonfirmasiHapusId(post.id)}
                      disabled={isPending}
                    >
                      Hapus
                    </TombolHalus>

                    <TombolSekunder
                      ukuran="kecil"
                      type="button"
                      onClick={() => mulaiSunting(post)}
                      disabled={isPending}
                    >
                      Sunting
                    </TombolSekunder>

                    {post.status === "terbit" ? (
                      <TombolSekunder
                        ukuran="kecil"
                        type="button"
                        onClick={() => tanganiTarik(post.id)}
                        disabled={isPending}
                      >
                        Tarik ke Draf
                      </TombolSekunder>
                    ) : (
                      <TombolUtama
                        ukuran="kecil"
                        type="button"
                        onClick={() => tanganiTerbitkan(post.id)}
                        disabled={isPending}
                      >
                        Terbitkan
                      </TombolUtama>
                    )}
                  </div>
                )}
              </Kartu>
            );
          })}
        </div>
      )}
    </div>
  );
}

