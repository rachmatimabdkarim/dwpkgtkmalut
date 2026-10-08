import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { Lencana, Kartu } from "@/components/dasar";
import { daftarKegiatanContoh } from "@/lib/data-contoh";

export const metadata = { title: "Kegiatan" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

/**
 * Halaman lihat-tampilan: bentuk daftar kegiatan + filter tahap.
 * Tabel berubah menjadi kartu di layar HP.
 */
export default async function HalamanKegiatan() {
  const pengguna = await sesiWajib();
  const kegiatan = daftarKegiatanContoh();
  const tahapAktif = "Semua";

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Kegiatan"
      aksi={
        <Link
          href="/admin/kegiatan/baru"
          className="inline-flex h-11 items-center rounded-token bg-brand-600 px-4 font-medium text-brand-contrast hover:bg-brand-700"
        >
          + Kegiatan Baru
        </Link>
      }
    >
      {/* Filter ringkas: satu baris, digeser mendatar di HP */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {["Semua", "Perencanaan", "Pelaksanaan", "Pelaporan"].map((t) => (
          <span
            key={t}
            className={`shrink-0 inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] ${
              t === tahapAktif
                ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                : "border-n-300 bg-n-0 text-n-600"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Desktop: daftar berbentuk baris */}
      <div className="hidden sm:block">
        <Kartu>
          <div className="grid grid-cols-[1fr_150px_130px_100px] gap-3 px-4 h-11 items-center border-b border-n-200 teks-3 font-medium text-n-500">
            <span>Nama kegiatan</span>
            <span>Tanggal</span>
            <span>Status</span>
            <span className="text-right">Aksi</span>
          </div>
          {kegiatan.map((k) => (
            <div
              key={k.id}
              className="grid grid-cols-[1fr_150px_130px_100px] gap-3 px-4 py-3 items-center border-b border-n-100 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-n-800 truncate">{k.judul}</p>
                <p className="teks-3 text-n-500 truncate">{k.tempat}</p>
              </div>
              <span className="text-[14px] text-n-600">{k.tanggal}</span>
              <span>
                <Lencana nada={k.nada}>{k.status}</Lencana>
              </span>
              <span className="text-right">
                <Link href="/admin/kegiatan" className="text-[14px] text-brand-700 underline underline-offset-2">
                  Buka
                </Link>
              </span>
            </div>
          ))}
        </Kartu>
      </div>

      {/* HP: kartu */}
      <div className="sm:hidden flex flex-col gap-2">
        {kegiatan.map((k) => (
          <Kartu key={k.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-n-800">{k.judul}</p>
                <p className="teks-3 text-n-500 mt-0.5">
                  {k.tanggal} · {k.tempat}
                </p>
              </div>
              <Lencana nada={k.nada}>{k.status}</Lencana>
            </div>
          </Kartu>
        ))}
      </div>
    </KerangkaAdmin>
  );
}
