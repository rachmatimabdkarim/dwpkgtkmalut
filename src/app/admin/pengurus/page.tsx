import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { Lencana } from "@/components/dasar";
import { KelolaPengurus } from "./kelola";
import { klienServer } from "@/lib/supabase-server";

export const metadata = { title: "Pengurus" };
export const instant = false;

type BarisPengurus = {
  id: string;
  nama: string;
  bidang: string;
  jabatan: string;
  urutan: number;
  email: string | null;
  profile_id: string | null;
};

export default async function HalamanPengurus() {
  const pengguna = await sesiWajibPeran(["super_admin", "ketua", "wakil_ketua", "sekretaris"]);
  const sb = await klienServer();

  const { data: periode } = await sb
    .from("periods")
    .select("nama, mulai, selesai")
    .eq("aktif", true)
    .maybeSingle<{ nama: string; mulai: string; selesai: string | null }>();

  const { data } = await sb
    .from("officers")
    .select("id, nama, bidang, jabatan, urutan, email, profile_id")
    .order("urutan");
  const daftar: BarisPengurus[] = data ?? [];

  const bolehUbah = pengguna.peran.some((p) =>
    ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
  );

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Pengurus">
      {/* Satu daftar saja — dikelola dari komponen kelola */}
      <KelolaPengurus daftar={daftar} bolehUbah={bolehUbah} />

      {/* Keterangan masa bakti, satu tempat */}
      {periode && (
        <div className="mt-5">
          <Lencana nada="brand">Masa bakti {periode.nama}</Lencana>
        </div>
      )}

      <p className="teks-3 text-n-500 mt-5">
        Data pengurus dipakai di halaman publik (Profil) dan sebagai pilihan panitia pada kegiatan.
      </p>
    </KerangkaAdmin>
  );
}
