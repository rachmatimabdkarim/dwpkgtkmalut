"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  TombolSekunder,
  TombolBahaya,
  TombolHalus,
  Lencana,
  Isian,
  Kosong,
} from "@/components/dasar";
import { KotakUnggah, RingkasanKompresi, type BerkasTerpilih } from "@/components/kotak-unggah";
import { unggahFoto, unggahThumb, jadikanResmi } from "@/lib/berkas-unggah";
import { klienPeramban } from "@/lib/supabase-peramban";
import {
  simpanKeteranganFoto,
  ubahVisibilitasFoto,
  hapusFoto,
  sahkanFoto,
} from "../aksi-pelaksanaan";

export type FotoItem = {
  id: string;
  bucket: string;
  path: string;
  nama_asli: string;
  visibilitas: "publik" | "privat" | string;
  status: string;
  keterangan: string | null;
  ukuran_byte: number;
};

export function PanelDokumentasi({
  activityId,
  daftarFoto,
  bolehUbahPublik,
}: {
  activityId: string;
  daftarFoto: FotoItem[];
  bolehUbahPublik: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Status proses unggah
  const [sedangUnggah, setSedangUnggah] = useState(false);
  const [pesanTahap, setPesanTahap] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");
  const [hasilUnggah, setHasilUnggah] = useState<BerkasTerpilih[]>([]);

  // Dialog konfirmasi hapus foto
  const [fotoDihapus, setFotoDihapus] = useState<FotoItem | null>(null);

  // Keterangan foto lokal (attachment_id -> text)
  const [keteranganLokal, setKeteranganLokal] = useState<Record<string, string>>({});
  const [sedangSimpanKet, setSedangSimpanKet] = useState<Record<string, boolean>>({});

  // Hitung jumlah foto
  const totalFoto = daftarFoto.length;
  const fotoPublik = daftarFoto.filter((f) => f.visibilitas === "publik").length;

  const batasFotoMaks = 20;
  const batasPublikMaks = 10;

  function ambilUrl(foto: FotoItem): string {
    const sb = klienPeramban();
    return sb.storage.from(foto.bucket).getPublicUrl(foto.path).data.publicUrl;
  }

  // Menangani pemilihan foto dari KotakUnggah
  async function handlePilihBerkas(berkasList: File[]) {
    setPesanGalat("");
    if (berkasList.length === 0) return;

    // Periksa batas total foto
    if (totalFoto + berkasList.length > batasFotoMaks) {
      setPesanGalat(
        `Jumlah foto melebihi batas. Maksimal ${batasFotoMaks} foto per kegiatan (saat ini sudah ada ${totalFoto} foto, Anda memilih ${berkasList.length} foto).`,
      );
      return;
    }

    setSedangUnggah(true);
    const ringkasanBaru: BerkasTerpilih[] = [];
    const idTerunggah: string[] = [];

    try {
      for (let i = 0; i < berkasList.length; i++) {
        const berkas = berkasList[i];
        setPesanTahap(`Memproses foto ${i + 1} dari ${berkasList.length}: ${berkas.name}…`);

        // 1. Unggah foto utama (otomatis dikompres)
        const item = await unggahFoto(
          berkas,
          "foto_kegiatan",
          "publik",
          activityId,
          (tahap) => setPesanTahap(`Foto ${i + 1}/${berkasList.length}: ${tahap}`),
        );

        // 2. Buat thumbnail
        await unggahThumb(berkas, "publik");

        // 3. Pindahkan ke lokasi resmi
        const resmi = await jadikanResmi(
          item,
          `kegiatan/${activityId}`,
          "activities",
          activityId,
        );

        idTerunggah.push(resmi.id);
        ringkasanBaru.push({
          id: resmi.id,
          nama: berkas.name,
          ukuranAsli: berkas.size,
          ukuranHasil: resmi.ukuran,
          url: resmi.url,
          bolehPublik: false,
        });
      }

      // 4. Sahkan dan catat di activity_logs via server action
      if (idTerunggah.length > 0) {
        setPesanTahap("Mengesahkan berkas foto…");
        const res = await sahkanFoto(activityId, idTerunggah);
        if (res.galat) {
          setPesanGalat(res.galat);
        }
      }

      setHasilUnggah((prev) => [...ringkasanBaru, ...prev]);
      setPesanTahap("");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto.";
      setPesanGalat(pesan);
    } finally {
      setSedangUnggah(false);
      setPesanTahap("");
    }
  }

  // Mengubah saklar visibilitas foto
  function handleUbahPublik(foto: FotoItem, publikBaru: boolean) {
    setPesanGalat("");
    if (publikBaru && fotoPublik >= batasPublikMaks) {
      setPesanGalat(
        `Maksimal ${batasPublikMaks} foto yang boleh ditampilkan ke publik. Silakan nonaktifkan foto lain terlebih dahulu.`,
      );
      return;
    }

    startTransition(async () => {
      const res = await ubahVisibilitasFoto(activityId, foto.id, publikBaru);
      if (res.galat) {
        setPesanGalat(res.galat);
      } else {
        router.refresh();
      }
    });
  }

  // Menyimpan keterangan foto
  async function handleSimpanKeterangan(fotoId: string) {
    const teks = keteranganLokal[fotoId];
    if (teks === undefined) return;

    setSedangSimpanKet((prev) => ({ ...prev, [fotoId]: true }));
    setPesanGalat("");

    const res = await simpanKeteranganFoto(activityId, fotoId, teks);
    setSedangSimpanKet((prev) => ({ ...prev, [fotoId]: false }));

    if (res.galat) {
      setPesanGalat(res.galat);
    } else {
      router.refresh();
    }
  }

  // Menghapus foto
  function handleHapusFoto() {
    if (!fotoDihapus) return;
    startTransition(async () => {
      const res = await hapusFoto(activityId, fotoDihapus.id);
      if (res.galat) {
        setPesanGalat(res.galat);
      }
      setFotoDihapus(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Kartu Ringkasan & Status Batas */}
      <Kartu className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <JudulSeksi>Dokumentasi Kegiatan</JudulSeksi>
            <p className="teks-3 text-n-600">
              {totalFoto} dari {batasFotoMaks} foto · {fotoPublik} dari {batasPublikMaks} boleh publik
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Lencana nada={totalFoto >= batasFotoMaks ? "warn" : "brand"}>
              {totalFoto >= batasFotoMaks ? "Kapasitas Penuh" : `${batasFotoMaks - totalFoto} Sisa Slot`}
            </Lencana>
          </div>
        </div>

        {pesanGalat && (
          <div className="mt-3 p-3 rounded-token bg-bad-bg border border-bad-line text-bad-fg text-[14px]">
            {pesanGalat}
          </div>
        )}

        {/* Kotak Unggah Foto */}
        {totalFoto < batasFotoMaks ? (
          <div className="mt-4">
            <KotakUnggah
              label="Pilih Foto Kegiatan"
              keterangan={`Boleh banyak sekaligus. Foto otomatis diperkecil sebelum diunggah agar hemat ruang penyimpanan. Maksimal total ${batasFotoMaks} foto.`}
              terima="image/*"
              banyak={true}
              sedang={sedangUnggah}
              onPilih={handlePilihBerkas}
            />
            {pesanTahap && (
              <p className="teks-3 text-brand-600 mt-2 font-medium animate-pulse">
                {pesanTahap}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-token bg-warn-bg border border-warn-line text-warn-fg text-[14px]">
            Batas maksimal {batasFotoMaks} foto per kegiatan telah tercapai. Anda dapat menghapus beberapa foto bila ingin mengganti dengan yang baru.
          </div>
        )}

        {/* Ringkasan Hasil Kompresi yang Baru Diunggah */}
        {hasilUnggah.length > 0 && (
          <div className="mt-4 pt-4 border-t border-n-200">
            <span className="text-[13px] font-medium text-n-700 block mb-1">
              Hasil Kompresi Berkas Terakhir
            </span>
            <RingkasanKompresi daftar={hasilUnggah} />
          </div>
        )}
      </Kartu>

      {/* Galeri Foto yang Sudah Ada */}
      {daftarFoto.length === 0 ? (
        <Kosong pesan="Belum ada dokumentasi foto yang diunggah untuk kegiatan ini." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {daftarFoto.map((foto) => {
            const url = ambilUrl(foto);
            const isPublik = foto.visibilitas === "publik";
            const nilaiKet =
              keteranganLokal[foto.id] !== undefined
                ? keteranganLokal[foto.id]
                : foto.keterangan || "";
            const sedangSimpan = sedangSimpanKet[foto.id] || false;

            return (
              <Kartu key={foto.id} className="p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Gambar Thumbnail */}
                  <div className="relative aspect-[4/3] w-full rounded-token bg-n-100 overflow-hidden mb-3 border border-n-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={foto.keterangan || foto.nama_asli}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2">
                      <Lencana nada={isPublik ? "ok" : "netral"}>
                        {isPublik ? "Publik" : "Internal"}
                      </Lencana>
                    </div>
                  </div>

                  {/* Pengaturan Boleh Tampil Publik */}
                  <div className="mb-3">
                    {bolehUbahPublik ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={isPublik}
                          disabled={isPending}
                          onChange={(e) => handleUbahPublik(foto, e.target.checked)}
                          className="accent-brand-600 h-5 w-5 rounded-token shrink-0"
                        />
                        <span className="text-[13px] text-n-800 font-medium">
                          Boleh tampil di web publik
                        </span>
                      </label>
                    ) : (
                      <p className="teks-3 text-n-500 py-1">
                        Visibilitas:{" "}
                        <strong className="text-n-700">
                          {isPublik ? "Web Publik" : "Hanya Internal"}
                        </strong>
                      </p>
                    )}
                  </div>

                  {/* Keterangan Singkat Foto */}
                  <div className="mb-3">
                    <span className="block teks-3 text-n-600 mb-1 font-medium">
                      Keterangan Foto
                    </span>
                    <div className="flex gap-2">
                      <Isian
                        type="text"
                        placeholder="Tulis keterangan foto…"
                        value={nilaiKet}
                        onChange={(e) =>
                          setKeteranganLokal((prev) => ({
                            ...prev,
                            [foto.id]: e.target.value,
                          }))
                        }
                        className="text-[13px] h-9"
                      />
                      <TombolSekunder
                        type="button"
                        ukuran="kecil"
                        disabled={sedangSimpan || nilaiKet === (foto.keterangan || "")}
                        onClick={() => handleSimpanKeterangan(foto.id)}
                      >
                        {sedangSimpan ? "…" : "Simpan"}
                      </TombolSekunder>
                    </div>
                  </div>
                </div>

                {/* Bagian Bawah: Aksi Hapus */}
                <div className="pt-2 border-t border-n-100 flex items-center justify-between gap-2">
                  <span className="teks-3 text-n-500 truncate max-w-[180px]">
                    {foto.nama_asli}
                  </span>
                  <TombolHalus
                    type="button"
                    ukuran="kecil"
                    disabled={isPending}
                    onClick={() => setFotoDihapus(foto)}
                    className="text-bad-fg hover:bg-bad-bg min-h-[44px]"
                  >
                    Hapus
                  </TombolHalus>
                </div>
              </Kartu>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Foto */}
      {fotoDihapus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-n-900/40 p-4">
          <div className="w-full max-w-md rounded-token-lg bg-n-0 p-5 border border-n-200 shadow-lg">
            <h3 className="judul-2 text-n-800 mb-2">Hapus Foto?</h3>
            <p className="text-[14px] text-n-600 mb-4">
              Apakah Anda yakin ingin menghapus foto{" "}
              <strong className="text-n-800">{fotoDihapus.nama_asli}</strong>?
              Berkas foto dan riwayatnya akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <TombolSekunder
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={() => setFotoDihapus(null)}
              >
                Batal
              </TombolSekunder>
              <TombolBahaya
                type="button"
                ukuran="sedang"
                disabled={isPending}
                onClick={handleHapusFoto}
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
