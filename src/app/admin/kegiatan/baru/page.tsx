import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { PERAN_PENGAJU } from "@/lib/peran";
import { klienServer } from "@/lib/supabase-server";
import { FormKegiatanBaru } from "./form-kegiatan";

export const metadata = { title: "Kegiatan Baru · SI-ANGGUN" };
export const instant = false;

export default async function HalamanKegiatanBaru() {
  // Hanya pengurus inti yang boleh membuka form ini. Yang tidak berhak
  // langsung dialihkan — tidak perlu mengisi form panjang dulu.
  const pengguna = await sesiWajibPeran(PERAN_PENGAJU);
  const sb = await klienServer();

  const { data: bidang } = await sb.from("sections").select("id, nama").order("urutan");
  const { data: pengurus } = await sb
    .from("profiles")
    .select("id, nama, jabatan")
    .order("nama");

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Kegiatan Baru">
      <FormKegiatanBaru
        bidang={(bidang ?? []) as { id: string; nama: string }[]}
        pengurus={(pengurus ?? []) as { id: string; nama: string; jabatan: string }[]}
      />
    </KerangkaAdmin>
  );
}
