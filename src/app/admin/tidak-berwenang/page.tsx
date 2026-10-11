import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { Kartu } from "@/components/dasar";

export const metadata = { title: "Tidak Berwenang · SI-ANGGUN" };
export const instant = false;

/**
 * Halaman keterangan: dibuka ketika pengurus membuka halaman yang bukan
 * haknya. Tujuannya supaya yang bersangkutan tahu ALASANNYA, bukan hanya
 * dilempar balik tanpa penjelasan.
 */
export default async function HalamanTidakBerwenang() {
  const pengguna = await sesiWajib();

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Tidak Berwenang">
      <div className="max-w-[620px]">
        <Kartu className="p-8 text-center">
          <p className="text-[34px] mb-3" aria-hidden="true">
            🔒
          </p>
          <h1 className="text-[21px] font-extrabold" style={{ color: "var(--dasar-700)" }}>
            Halaman ini bukan untuk peran Anda
          </h1>
          <p className="mt-3 text-[15px] text-n-600 leading-relaxed">
            Anda masuk sebagai <strong>{pengguna.nama}</strong> dengan peran{" "}
            <strong>{pengguna.peran.join(", ")}</strong>. Peran ini hanya dapat
            melihat kegiatan, belum dapat mengajukan atau mengubahnya.
          </p>
          <p className="mt-3 text-[14.5px] text-n-600 leading-relaxed">
            Bila Anda perlu mengajukan kegiatan, silakan hubungi Sekretaris
            atau Ketua Bidang. Bila menurut Anda ini keliru, hubungi Super Admin
            agar peran Anda disesuaikan.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/kegiatan"
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full font-bold text-[14.5px]"
              style={{ backgroundColor: "var(--tombol-600)", color: "var(--tombol-teks)" }}
            >
              Lihat daftar kegiatan
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full font-semibold text-[14.5px] border-2"
              style={{ borderColor: "var(--dasar-300)", color: "var(--dasar-700)" }}
            >
              Kembali ke beranda panel
            </Link>
          </div>
        </Kartu>
      </div>
    </KerangkaAdmin>
  );
}
