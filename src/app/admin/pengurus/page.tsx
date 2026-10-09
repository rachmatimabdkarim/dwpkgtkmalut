import Link from "next/link";
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
  /** Kosong = belum pernah mengganti sandi sendiri */
  sandi_diganti_pada?: string | null;
  sandi_diatur_ulang_pada?: string | null;
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

  // Status sandi tiap akun — diambil terpisah supaya daftar tetap tampil walau gagal
  const { data: statusSandi } = await sb
    .from("profiles")
    .select("id, sandi_diganti_pada, sandi_diatur_ulang_pada");
  const peta: Record<string, { ganti: string | null; atur: string | null }> = {};
  for (const s of (statusSandi ?? []) as {
    id: string;
    sandi_diganti_pada: string | null;
    sandi_diatur_ulang_pada: string | null;
  }[]) {
    peta[s.id] = { ganti: s.sandi_diganti_pada, atur: s.sandi_diatur_ulang_pada };
  }
  const daftarLengkap: BarisPengurus[] = daftar.map((d) => ({
    ...d,
    sandi_diganti_pada: d.profile_id ? (peta[d.profile_id]?.ganti ?? null) : null,
    sandi_diatur_ulang_pada: d.profile_id ? (peta[d.profile_id]?.atur ?? null) : null,
  }));

  // Jumlah pesan masuk yang belum dibaca — dipakai sebagai penanda di tautan
  const { count: pesanBaru } = await sb
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "baru");

  const bolehUbah = pengguna.peran.some((p) =>
    ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
  );
  const bolehResetSandi = pengguna.peran.includes("super_admin");

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Pengurus">
      {/* Tautan ke pesan masuk — bagian dari komunikasi pengurus, bukan menu baru */}
      <Link
        href="/admin/kontak"
        className="mb-5 flex items-center justify-between gap-3 rounded-token border border-n-200 bg-n-0 px-4 min-h-[52px] hover:bg-n-50 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-n-500" aria-hidden="true">
            ✉️
          </span>
          <span className="text-n-800 font-medium text-[15px]">Pesan Masuk</span>
        </span>
        {(pesanBaru ?? 0) > 0 && <Lencana nada="warn">{pesanBaru} baru</Lencana>}
      </Link>

      {/* Satu daftar saja — dikelola dari komponen kelola */}
      <KelolaPengurus
        daftar={daftarLengkap}
        bolehUbah={bolehUbah}
        bolehResetSandi={bolehResetSandi}
      />

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
