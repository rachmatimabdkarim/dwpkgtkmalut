import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { FormKegiatanBaru } from "./form-kegiatan";

export const metadata = { title: "Kegiatan Baru" };
export const instant = false;

export default async function HalamanKegiatanBaru() {
  const pengguna = await sesiWajib();
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
