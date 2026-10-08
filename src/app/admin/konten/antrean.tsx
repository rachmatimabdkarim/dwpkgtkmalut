"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Kartu,
  Lencana,
  TombolUtama,
  TombolSekunder,
  TombolBahaya,
  TombolHalus,
  Kosong,
  Kolom,
  Isian,
  AreaTeks,
} from "@/components/dasar";
import { formatTanggal } from "@/lib/kegiatan";
export function urlPublik(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/publik/${path}`;
}
import {
  aksiTerbitkanBerita,
  aksiTolakAntrean,
  aksiSuntingAntrean,
  aksiSimpanKeteranganGaleri,
  aksiCabutPublikGaleri,
} from "./aksi";

export type ItemAntrean = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  isi: string | null;
  gambar_path: string | null;
  status: string;
  sumber: string;
  activity_id: string | null;
  kegiatan?: {
    judul: string;
    tanggal_mulai: string | null;
    tempat: string | null;
  } | null;
  dibuat_pada: string;
};

export function AntreanBerita({
  daftar,
  onSelesai,
}: {
  daftar: ItemAntrean[];
  onSelesai?: () => void;
}) {
  const [sedangSuntingId, setSedangSuntingId] = useState<string | null>(null);
  const [konfirmasiTolakId, setKonfirmasiTolakId] = useState<string | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");
  const [isPending, startTransition] = useTransition();

  // State untuk form penyuntingan
  const [judulEdit, setJudulEdit] = useState("");
  const [ringkasanEdit, setRingkasanEdit] = useState("");
  const [isiEdit, setIsiEdit] = useState("");

  function mulaiSunting(item: ItemAntrean) {
    setPesanGalat("");
    setSedangSuntingId(item.id);
    setJudulEdit(item.judul);
    setRingkasanEdit(item.ringkasan ?? "");
    setIsiEdit(item.isi ?? "");
  }

  function batalkanSunting() {
    setSedangSuntingId(null);
    setPesanGalat("");
  }

  function tanganiTerbitkan(id: string) {
    setPesanGalat("");
    startTransition(async () => {
      const res = await aksiTerbitkanBerita(id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        onSelesai?.();
      }
    });
  }

  function tanganiTolak(id: string) {
    setPesanGalat("");
    startTransition(async () => {
      const res = await aksiTolakAntrean(id, alasanTolak);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setKonfirmasiTolakId(null);
        setAlasanTolak("");
        onSelesai?.();
      }
    });
  }

  function simpanSuntingan(id: string, langsungTerbit: boolean) {
    setPesanGalat("");
    if (!judulEdit.trim()) {
      setPesanGalat("Judul berita tidak boleh kosong.");
      return;
    }
    if (!isiEdit.trim()) {
      setPesanGalat("Isi berita tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await aksiSuntingAntrean(id, {
        judul: judulEdit,
        ringkasan: ringkasanEdit,
        isi: isiEdit,
        terbitkan: langsungTerbit,
      });

      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setSedangSuntingId(null);
        onSelesai?.();
      }
    });
  }

  if (daftar.length === 0) {
    return (
      <Kosong
        pesan="Tidak ada berita di antrean tinjauan. Berita otomatis dari kegiatan yang laporannya disetujui akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pesanGalat && (
        <div className="rounded-token border border-bad-line bg-bad-bg p-3 text-bad-fg text-[14px]">
          {pesanGalat}
        </div>
      )}

      {daftar.map((item) => {
        const fotoUrl = urlPublik(item.gambar_path);
        const sedangSunting = sedangSuntingId === item.id;
        const sedangTolak = konfirmasiTolakId === item.id;

        return (
          <Kartu key={item.id} className="p-4 sm:p-5">
            {sedangSunting ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-n-200">
                  <h3 className="font-semibold text-n-800">Sunting Berita Sebelum Terbit</h3>
                  <Lencana nada="brand">Mesin Otomatis</Lencana>
                </div>

                <p className="teks-3 text-n-500">
                  Perubahan di sini hanya mengubah naskah publikasi berita dan TIDAK akan mengubah
                  isi laporan kegiatan aslinya.
                </p>

                <Kolom label="Judul Berita">
                  <Isian
                    value={judulEdit}
                    onChange={(e) => setJudulEdit(e.target.value)}
                    disabled={isPending}
                  />
                </Kolom>

                <Kolom label="Ringkasan">
                  <AreaTeks
                    value={ringkasanEdit}
                    onChange={(e) => setRingkasanEdit(e.target.value)}
                    rows={2}
                    disabled={isPending}
                  />
                </Kolom>

                <Kolom label="Isi Berita">
                  <AreaTeks
                    value={isiEdit}
                    onChange={(e) => setIsiEdit(e.target.value)}
                    rows={6}
                    disabled={isPending}
                  />
                </Kolom>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-n-200">
                  <TombolSekunder type="button" onClick={batalkanSunting} disabled={isPending}>
                    Batal
                  </TombolSekunder>
                  <TombolSekunder
                    type="button"
                    onClick={() => simpanSuntingan(item.id, false)}
                    disabled={isPending}
                  >
                    Simpan Draf di Antrean
                  </TombolSekunder>
                  <TombolUtama
                    type="button"
                    onClick={() => simpanSuntingan(item.id, true)}
                    disabled={isPending}
                  >
                    Simpan & Terbitkan Langsung
                  </TombolUtama>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {fotoUrl && (
                    <div className="relative w-full sm:w-44 h-32 rounded-token overflow-hidden border border-n-200 bg-n-100 shrink-0">
                      <Image
                        src={fotoUrl}
                        alt={item.judul}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Lencana nada="warn">Menunggu Tinjauan</Lencana>
                      <Lencana nada="brand">Otomatis</Lencana>
                      {item.kegiatan?.tanggal_mulai && (
                        <span className="teks-3 text-n-500">
                          Kegiatan: {formatTanggal(item.kegiatan.tanggal_mulai)}
                          {item.kegiatan.tempat ? ` · ${item.kegiatan.tempat}` : ""}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-n-900 text-[16px] sm:text-[17px] mb-2 leading-snug">
                      {item.judul}
                    </h3>

                    {item.ringkasan && (
                      <p className="text-n-600 text-[14px] line-clamp-2 mb-2">{item.ringkasan}</p>
                    )}

                    <div className="text-n-500 text-[13px] line-clamp-3 bg-n-50 p-2.5 rounded-token border border-n-200">
                      {item.isi}
                    </div>
                  </div>
                </div>

                {sedangTolak ? (
                  <div className="mt-4 p-3.5 rounded-token border border-bad-line bg-bad-bg flex flex-col gap-3">
                    <p className="text-[14px] font-medium text-bad-fg">
                      Tolak berita otomatis ini? Status akan diubah menjadi draf dan dihapus dari
                      antrean publikasi.
                    </p>
                    <Kolom label="Catatan penolakan (opsional)">
                      <Isian
                        value={alasanTolak}
                        onChange={(e) => setAlasanTolak(e.target.value)}
                        placeholder="Alasan penolakan..."
                        disabled={isPending}
                      />
                    </Kolom>
                    <div className="flex justify-end gap-2">
                      <TombolSekunder
                        ukuran="kecil"
                        type="button"
                        onClick={() => {
                          setKonfirmasiTolakId(null);
                          setAlasanTolak("");
                        }}
                        disabled={isPending}
                      >
                        Batal
                      </TombolSekunder>
                      <TombolBahaya
                        ukuran="kecil"
                        type="button"
                        onClick={() => tanganiTolak(item.id)}
                        disabled={isPending}
                      >
                        {isPending ? "Memproses…" : "Ya, Tolak Berita"}
                      </TombolBahaya>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-n-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="teks-3 text-n-500">
                      Disusun otomatis dari laporan kegiatan yang telah disetujui
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <TombolBahaya
                        ukuran="kecil"
                        type="button"
                        onClick={() => {
                          setKonfirmasiTolakId(item.id);
                          setAlasanTolak("");
                        }}
                        disabled={isPending}
                      >
                        Tolak
                      </TombolBahaya>
                      <TombolSekunder
                        ukuran="kecil"
                        type="button"
                        onClick={() => mulaiSunting(item)}
                        disabled={isPending}
                      >
                        Sunting dulu
                      </TombolSekunder>
                      <TombolUtama
                        ukuran="kecil"
                        type="button"
                        onClick={() => tanganiTerbitkan(item.id)}
                        disabled={isPending}
                      >
                        {isPending ? "Memproses…" : "Terbitkan"}
                      </TombolUtama>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Kartu>
        );
      })}
    </div>
  );
}

export type ItemFotoGaleri = {
  id: string;
  bucket: string;
  path: string;
  nama_asli: string;
  keterangan: string | null;
  diunggah_pada: string;
  activity_id: string;
  activity_judul: string;
};

export type KelompokGaleri = {
  activity_id: string;
  activity_judul: string;
  items: ItemFotoGaleri[];
};

export function PanelGaleri({
  kelompok,
  onSelesai,
}: {
  kelompok: KelompokGaleri[];
  onSelesai?: () => void;
}) {
  const [keteranganMap, setKeteranganMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    kelompok.forEach((g) => {
      g.items.forEach((item) => {
        init[item.id] = item.keterangan ?? "";
      });
    });
    return init;
  });

  const [konfirmasiCabutId, setKonfirmasiCabutId] = useState<string | null>(null);
  const [sedangSimpanId, setSedangSimpanId] = useState<string | null>(null);
  const [pesanGalat, setPesanGalat] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalFoto = kelompok.reduce((acc, g) => acc + g.items.length, 0);

  function simpanKeterangan(id: string) {
    setPesanGalat("");
    setPesanSukses("");
    setSedangSimpanId(id);
    startTransition(async () => {
      const teks = keteranganMap[id] ?? "";
      const res = await aksiSimpanKeteranganGaleri(id, teks);
      setSedangSimpanId(null);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setPesanSukses("Keterangan foto berhasil disimpan.");
        onSelesai?.();
      }
    });
  }

  function cabutPublik(id: string) {
    setPesanGalat("");
    setPesanSukses("");
    startTransition(async () => {
      const res = await aksiCabutPublikGaleri(id);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        setKonfirmasiCabutId(null);
        setPesanSukses("Tanda publik dicabut. Foto kini bersifat privat.");
        onSelesai?.();
      }
    });
  }

  if (totalFoto === 0) {
    return (
      <Kosong
        pesan="Belum ada foto kegiatan yang ditandai boleh tampil di galeri publik. Foto dapat ditandai dari halaman dokumentasi kegiatan masing-masing."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="teks-3 text-n-500">
          Menampilkan <strong className="text-n-700">{totalFoto}</strong> foto publik yang
          dikelompokkan dalam <strong className="text-n-700">{kelompok.length}</strong> kegiatan.
        </p>
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

      {kelompok.map((g) => (
        <section key={g.activity_id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-n-200 pb-2">
            <h3 className="font-semibold text-n-800 text-[16px]">{g.activity_judul}</h3>
            <span className="teks-3 text-n-500">{g.items.length} foto</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {g.items.map((foto) => {
              const fotoUrl = urlPublik(foto.path);
              const sedangCabut = konfirmasiCabutId === foto.id;
              const sedangSimpan = sedangSimpanId === foto.id;

              return (
                <Kartu key={foto.id} className="p-3 flex flex-col justify-between">
                  <div>
                    <div className="relative w-full aspect-video rounded-token overflow-hidden border border-n-200 bg-n-100 mb-3">
                      {fotoUrl && (
                        <Image
                          src={fotoUrl}
                          alt={foto.keterangan || foto.nama_asli}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="mb-2">
                      <span className="block text-[12px] font-medium text-n-600 mb-1">
                        Keterangan Foto:
                      </span>
                      <Isian
                        value={keteranganMap[foto.id] ?? ""}
                        onChange={(e) =>
                          setKeteranganMap((prev) => ({ ...prev, [foto.id]: e.target.value }))
                        }
                        placeholder="Tulis keterangan foto..."
                        className="text-[13px] h-9"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-n-200 flex flex-col gap-2">
                    {sedangCabut ? (
                      <div className="p-2.5 rounded-token border border-bad-line bg-bad-bg flex flex-col gap-2">
                        <p className="teks-3 text-bad-fg font-medium">
                          Cabut foto ini dari galeri publik?
                        </p>
                        <div className="flex justify-end gap-1.5">
                          <TombolSekunder
                            ukuran="kecil"
                            type="button"
                            onClick={() => setKonfirmasiCabutId(null)}
                            disabled={isPending}
                          >
                            Batal
                          </TombolSekunder>
                          <TombolBahaya
                            ukuran="kecil"
                            type="button"
                            onClick={() => cabutPublik(foto.id)}
                            disabled={isPending}
                          >
                            {isPending ? "Memproses…" : "Ya, Cabut"}
                          </TombolBahaya>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <TombolHalus
                          ukuran="kecil"
                          type="button"
                          className="text-bad-fg hover:bg-bad-bg px-2"
                          onClick={() => setKonfirmasiCabutId(foto.id)}
                          disabled={isPending}
                        >
                          Cabut Publik
                        </TombolHalus>
                        <TombolSekunder
                          ukuran="kecil"
                          type="button"
                          onClick={() => simpanKeterangan(foto.id)}
                          disabled={isPending || sedangSimpan}
                        >
                          {sedangSimpan ? "Menyimpan…" : "Simpan Keterangan"}
                        </TombolSekunder>
                      </div>
                    )}
                  </div>
                </Kartu>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
