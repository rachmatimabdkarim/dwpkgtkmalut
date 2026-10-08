import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { ambilTema } from "@/lib/pengaturan";
import { FormPengaturanTampilan } from "./tampilan";

export const metadata = { title: "Pengaturan · Tampilan" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

/**
 * Halaman Pengaturan → Tampilan.
 * Hanya dapat dibuka dan disimpan oleh pengguna berperan Super Admin.
 */
export default async function PengaturanTampilanPage() {
  const pengguna = await sesiWajibPeran(["super_admin"]);
  const tema = await ambilTema();

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Pengaturan · Tampilan"
      logoUrl={tema.logoUrl}
    >
      {/* Subnavigasi Pengaturan */}
      <div className="mb-6 flex items-center gap-6 border-b border-n-200">
        <span className="pb-3 text-[14px] font-semibold text-brand-600 border-b-2 border-brand-600 -mb-px">
          Tampilan &amp; Branding
        </span>
        <Link
          href="/admin/pengaturan/penyimpanan"
          className="pb-3 text-[14px] font-medium text-n-600 hover:text-brand-600 transition-colors"
        >
          Penggunaan Penyimpanan
        </Link>
      </div>

      <FormPengaturanTampilan temaAwal={tema} />
    </KerangkaAdmin>
  );
}
