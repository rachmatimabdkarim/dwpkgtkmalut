import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { Kartu, Kosong, Lencana } from "@/components/dasar";
import { labelPeran } from "@/lib/peran";
import { daftarPerluTindakan, kegiatanMendatang } from "@/lib/data-contoh";

export const metadata = { title: "Beranda" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

export default async function BerandaAdmin() {
  const pengguna = await sesiWajib();
  const perluTindakan = daftarPerluTindakan(pengguna.peran);
  const mendatang = kegiatanMendatang();

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul={`Selamat datang, ${pengguna.nama.split(" ")[0]}`}
    >
      <p className="text-n-500 -mt-1 mb-5">
        Peran Anda: <span className="text-n-700 font-medium">{labelPeran(pengguna.peran)}</span>
      </p>

      {/* Blok 1: Perlu tindakan saya */}
      <section className="mb-7">
        <h2 className="judul-2 text-n-800 mb-3">Perlu tindakan saya</h2>
        {perluTindakan.length === 0 ? (
          <Kosong
            pesan="Belum ada yang menunggu tindakan Anda."
            aksi={
              <Link
                href="/admin/kegiatan"
                className="inline-flex h-11 items-center rounded-token bg-brand-600 px-4 font-medium text-brand-contrast hover:bg-brand-700"
              >
                Lihat semua kegiatan
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {perluTindakan.map((t) => (
              <Kartu key={t.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-n-800 truncate">{t.judul}</p>
                  <p className="teks-3 text-n-500 mt-0.5">
                    {t.tahap} · {t.keterangan}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Lencana nada={t.nada}>{t.statusLencana}</Lencana>
                  <Link
                    href="/admin/kegiatan"
                    className="inline-flex h-9 items-center rounded-token bg-brand-600 px-3 text-[13px] font-medium text-brand-contrast hover:bg-brand-700"
                  >
                    {t.aksi}
                  </Link>
                </div>
              </Kartu>
            ))}
          </div>
        )}
      </section>

      {/* Blok 2: Kegiatan mendatang (maks 3) */}
      <section>
        <h2 className="judul-2 text-n-800 mb-3">Kegiatan mendatang</h2>
        <div className="flex flex-col gap-2">
          {mendatang.map((k) => (
            <Kartu key={k.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-n-800 truncate">{k.judul}</p>
                <p className="teks-3 text-n-500 mt-0.5">
                  {k.tanggal} · {k.tempat}
                </p>
              </div>
              <Lencana nada={k.nada}>{k.status}</Lencana>
            </Kartu>
          ))}
        </div>
      </section>
    </KerangkaAdmin>
  );
}
