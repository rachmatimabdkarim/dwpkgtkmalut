"use client";

import { useRef, useState } from "react";
import { TombolSekunder, Lencana } from "@/components/dasar";
import { Ikon } from "@/components/ikon";
import { ukuranTerbaca } from "@/lib/berkas-kompres";

export type BerkasTerpilih = {
  id: string;
  nama: string;
  ukuranAsli: number;
  ukuranHasil: number;
  url: string;
  bolehPublik?: boolean;
};

/**
 * Kotak unggah sederhana: pilih berkas → dikompres di peramban →
 * ditampilkan perbandingan ukuran sebelum dan sesudah.
 */
export function KotakUnggah({
  label,
  keterangan,
  terima = "image/*",
  banyak = false,
  onPilih,
  sedang,
}: {
  label: string;
  keterangan?: string;
  terima?: string;
  banyak?: boolean;
  onPilih: (berkas: File[]) => void | Promise<void>;
  sedang?: boolean;
}) {
  const masukan = useRef<HTMLInputElement>(null);
  const [seret, setSeret] = useState(false);

  function kirim(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    onPilih(Array.from(daftar));
    if (masukan.current) masukan.current.value = "";
  }

  return (
    <div>
      <span className="block text-[13px] font-medium text-n-700 mb-1.5">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSeret(true);
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSeret(false);
          kirim(e.dataTransfer.files);
        }}
        className={`rounded-token border border-dashed px-4 py-6 text-center transition-colors ${
          seret ? "border-brand-500 bg-brand-50" : "border-n-300 bg-n-50"
        }`}
      >
        <div className="flex justify-center text-n-400 mb-2">
          <Ikon nama="konten" ukuran={22} />
        </div>
        <p className="text-n-600 text-[14px]">
          Seret berkas ke sini, atau pilih dari perangkat
        </p>
        {keterangan && <p className="teks-3 text-n-500 mt-1">{keterangan}</p>}
        <div className="mt-3 flex justify-center">
          <TombolSekunder
            type="button"
            ukuran="kecil"
            disabled={sedang}
            onClick={() => masukan.current?.click()}
          >
            {sedang ? "Memproses…" : "Pilih berkas"}
          </TombolSekunder>
        </div>
        <input
          ref={masukan}
          type="file"
          accept={terima}
          multiple={banyak}
          className="hidden"
          onChange={(e) => kirim(e.target.files)}
        />
      </div>
    </div>
  );
}

/** Menampilkan hasil kompresi: ukuran sebelum dan sesudah. */
export function RingkasanKompresi({ daftar }: { daftar: BerkasTerpilih[] }) {
  if (daftar.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {daftar.map((b) => {
        const turun = b.ukuranAsli > 0 ? Math.round((1 - b.ukuranHasil / b.ukuranAsli) * 100) : 0;
        return (
          <div
            key={b.id}
            className="flex items-center gap-3 rounded-token border border-n-200 bg-n-0 px-3 py-2"
          >
            <div className="h-10 w-10 rounded-token bg-n-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-n-800 truncate">{b.nama}</p>
              <p className="teks-3 text-n-500">
                {ukuranTerbaca(b.ukuranAsli)} → <span className="text-ok-fg">{ukuranTerbaca(b.ukuranHasil)}</span>
                {turun > 0 && ` (hemat ${turun}%)`}
              </p>
            </div>
            {b.bolehPublik !== undefined && (
              <Lencana nada={b.bolehPublik ? "ok" : "netral"}>
                {b.bolehPublik ? "Boleh publik" : "Internal"}
              </Lencana>
            )}
          </div>
        );
      })}
    </div>
  );
}
