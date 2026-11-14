"use client";

/* Pemilih Gambar Sampul Berita
 *
 * ATURAN PEMILIK: gambar sampul berita HANYA boleh berasal dari foto
 * dokumentasi yang sudah diunggah pada laporan kegiatan. Tidak ada jalan
 * mengunggah gambar bebas dari menu Konten — supaya gambar yang tampil di
 * web publik selalu punya sumber yang bisa dipertanggungjawabkan.
 *
 * Karena itu komponen ini menampilkan daftar foto (bukan kotak unggah), dan
 * menandai foto milik kegiatan asal berita sebagai "Foto kegiatan ini".
 */
import { useState } from "react";

export type FotoLaporan = {
  path: string;
  url: string | null;
  keterangan: string | null;
  /** Judul kegiatan asal foto */
  kegiatan: string;
  /** Penanda kegiatan asal foto (dipakai menyaring foto kegiatan ini) */
  kegiatanId?: string | null;
  /** true = foto dari kegiatan asal berita ini */
  dariKegiatanIni: boolean;
};

export function PilihFotoKegiatan({
  daftar,
  terpilih,
  sedang,
  onPilih,
  onKosongkan,
}: {
  daftar: FotoLaporan[];
  terpilih: string | null;
  sedang?: boolean;
  onPilih: (path: string) => void;
  onKosongkan: () => void;
}) {
  const [hanyaKegiatanIni, setHanyaKegiatanIni] = useState(true);

  const adaKegiatanIni = daftar.some((f) => f.dariKegiatanIni);
  const tersaring =
    hanyaKegiatanIni && adaKegiatanIni ? daftar.filter((f) => f.dariKegiatanIni) : daftar;

  if (daftar.length === 0) {
    return (
      <div className="rounded-token border border-dashed border-n-300 bg-n-50 px-4 py-5 text-center">
        <p className="text-[14px] font-medium text-n-700">Belum ada foto dokumentasi</p>
        <p className="teks-3 text-n-500 mt-1">
          Tambahkan foto pada bagian Dokumentasi di laporan kegiatan lebih dulu,
          lalu centang &ldquo;Tampilkan di laporan &amp; web publik&rdquo;. Foto itu
          yang akan bisa dipakai sebagai gambar berita.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Penyaring: kegiatan ini / semua kegiatan */}
      {adaKegiatanIni && (
        <div className="flex flex-wrap gap-2">
          <TombolPilih
            aktif={hanyaKegiatanIni}
            onClick={() => setHanyaKegiatanIni(true)}
            disabled={sedang}
          >
            Foto kegiatan ini
          </TombolPilih>
          <TombolPilih
            aktif={!hanyaKegiatanIni}
            onClick={() => setHanyaKegiatanIni(false)}
            disabled={sedang}
          >
            Semua foto kegiatan
          </TombolPilih>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tersaring.map((foto) => {
          const aktif = terpilih === foto.path;
          return (
            <button
              key={foto.path}
              type="button"
              disabled={sedang}
              onClick={() => onPilih(foto.path)}
              className="text-left rounded-token overflow-hidden bg-n-0 transition-shadow"
              style={{
                border: aktif ? "3px solid var(--dasar-700)" : "1px solid var(--n-200)",
                boxShadow: aktif ? "0 4px 14px rgba(0,0,0,0.10)" : undefined,
              }}
            >
              <div className="relative h-24 bg-n-100">
                {foto.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={foto.url}
                    alt={foto.keterangan ?? "Foto dokumentasi kegiatan"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-n-500">
                    Foto tidak dapat dimuat
                  </div>
                )}
                {aktif && (
                  <span
                    className="absolute top-1.5 left-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
                  >
                    Dipakai
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[12px] font-medium text-n-700 leading-snug line-clamp-2">
                  {foto.kegiatan}
                </p>
                {foto.keterangan && (
                  <p className="text-[11px] text-n-500 mt-0.5 leading-snug line-clamp-2">
                    {foto.keterangan}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {terpilih && (
        <button
          type="button"
          onClick={onKosongkan}
          disabled={sedang}
          className="self-start min-h-[44px] px-3 text-[13px] font-medium text-bahaya-700 hover:underline"
        >
          Kosongkan gambar sampul
        </button>
      )}
    </div>
  );
}

function TombolPilih({
  aktif,
  onClick,
  disabled,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] px-3.5 rounded-token text-[13px] font-medium transition-colors"
      style={
        aktif
          ? { backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }
          : { backgroundColor: "var(--n-0)", color: "var(--n-700)", border: "1px solid var(--n-200)" }
      }
    >
      {children}
    </button>
  );
}
