import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { ambilTema } from "@/lib/pengaturan";
import { ambilDataPenyimpanan } from "./aksi";
import { PanelPenyimpanan } from "./panel";

export const metadata = { title: "Pengaturan · Penggunaan Penyimpanan" };

// Halaman ini membaca data login pengguna, jadi memang harus selalu segar.
export const instant = false;

/**
 * Halaman Pengaturan → Penggunaan Penyimpanan.
 * Hanya dapat dibuka oleh pengguna dengan peran Super Admin.
 */
export default async function HalamanPenggunaanPenyimpanan() {
  const pengguna = await sesiWajibPeran(["super_admin"]);
  const [tema, dataPenyimpanan] = await Promise.all([
    ambilTema(),
    ambilDataPenyimpanan(),
  ]);

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Pengaturan · Penyimpanan"
      logoUrl={tema.logoUrl}
    >
      {/* Subnavigasi Pengaturan */}
      <div className="mb-6 flex items-center gap-6 border-b border-n-200">
        <Link
          href="/admin/pengaturan"
          className="pb-3 text-[14px] font-medium text-n-600 hover:text-brand-600 transition-colors"
        >
          Tampilan &amp; Branding
        </Link>
        <span className="pb-3 text-[14px] font-semibold text-brand-600 border-b-2 border-brand-600 -mb-px">
          Penggunaan Penyimpanan
        </span>
      </div>

      <PanelPenyimpanan dataAwal={dataPenyimpanan} />
    </KerangkaAdmin>
  );
}
