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
  // Daftar pengurus dibawa bersama BIDANGNYA, supaya penanggung jawab dapat
  // dibatasi pada anggota bidang yang sama.
  const { data: pengurus } = await sb
    .from("profiles")
    .select("id, nama, jabatan")
    .order("nama");

  // Bidang berasal dari susunan pengurus (tabel officers).
  const { data: petugas } = await sb.from("officers").select("profile_id, bidang");
  const bidangPerOrang = new Map<string, string>(
    ((petugas ?? []) as { profile_id: string | null; bidang: string }[])
      .filter((o) => o.profile_id)
      .map((o) => [o.profile_id as string, o.bidang]),
  );
  const pengurusDenganBidang = ((pengurus ?? []) as { id: string; nama: string; jabatan: string }[]).map(
    (p2) => ({ ...p2, bidang: bidangPerOrang.get(p2.id) ?? null }),
  );

  const bidangSaya = pengguna.bidang ?? null;
  const pengurusHarian = bidangSaya === "Pengurus Harian" || bidangSaya === null;

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Kegiatan Baru">
      <FormKegiatanBaru
        bidang={(bidang ?? []) as { id: string; nama: string }[]}
        pengurus={pengurusDenganBidang}
        bidangSaya={bidangSaya}
        jabatanSaya={pengguna.jabatan}
        pengurusHarian={pengurusHarian}
        sayaSendiri={{ id: pengguna.id, nama: pengguna.nama }}
      />
    </KerangkaAdmin>
  );
}
