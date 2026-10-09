import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { PanelKontak, type PesanMasuk, type Penerima } from "./panel";
import { TEMA_BAWAAN } from "@/lib/tema";

export const metadata = { title: "Pesan Masuk" };
export const instant = false;

export default async function HalamanKontakAdmin() {
  const pengguna = await sesiWajibPeran(["super_admin", "ketua", "wakil_ketua", "sekretaris"]);
  const sb = await klienServer();

  const { data: pesanData } = await sb
    .from("contact_messages")
    .select("id, nama, email, pesan, status, catatan, dibuat_pada")
    .order("dibuat_pada", { ascending: false });
  const daftarPesan: PesanMasuk[] = (pesanData ?? []) as PesanMasuk[];

  const { data: penerimaData } = await sb
    .from("contact_recipients")
    .select("id, email, nama, aktif")
    .order("dibuat_pada");
  const daftarPenerima: Penerima[] = (penerimaData ?? []) as Penerima[];

  const bolehHapus = pengguna.peran.includes("super_admin");
  const bolehAturPenerima = pengguna.peran.includes("super_admin");
  const emailResmi = TEMA_BAWAAN.email ?? "";

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Pesan Masuk">
      <PanelKontak
        daftarPesan={daftarPesan}
        daftarPenerima={daftarPenerima}
        bolehHapus={bolehHapus}
        bolehAturPenerima={bolehAturPenerima}
        emailResmi={emailResmi}
      />
    </KerangkaAdmin>
  );
}
