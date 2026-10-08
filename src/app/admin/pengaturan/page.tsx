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
      <FormPengaturanTampilan temaAwal={tema} />
    </KerangkaAdmin>
  );
}
