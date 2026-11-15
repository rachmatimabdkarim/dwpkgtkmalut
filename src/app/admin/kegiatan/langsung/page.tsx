import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { PERAN_PENCATAT_LANGSUNG } from "@/lib/peran";
import { FormLaporanLangsung } from "./form-langsung";

export const metadata = { title: "Catat Laporan Kegiatan · SI-ANGGUN" };
export const instant = false;

export default async function HalamanLaporanLangsung() {
  const pengguna = await sesiWajib();

  // ATURAN PEMILIK: hanya Sekretaris dan Ketua Bidang yang boleh mencatat.
  const boleh = pengguna.peran.some((p) =>
    (PERAN_PENCATAT_LANGSUNG as readonly string[]).includes(p),
  );
  if (!boleh) {
    return (
      <KerangkaAdmin pengguna={pengguna} judul="Catat Laporan Kegiatan">
        <div className="rounded-token-lg border border-warn-line bg-warn-bg p-6">
          <p className="text-[16px] font-semibold text-warn-fg">Halaman ini bukan untuk peran Anda</p>
          <p className="mt-2 text-[14px] text-n-700">
            Laporan kegiatan langsung hanya dapat dicatat oleh Sekretaris dan Ketua Bidang.
            Hubungi Sekretaris bila ada kegiatan yang perlu dicatat.
          </p>
          <Link
            href="/admin/kegiatan"
            className="mt-4 inline-flex h-10 items-center rounded-token border border-n-300 bg-n-0 px-4 text-[13.5px] font-medium text-n-700"
          >
            Kembali ke daftar kegiatan
          </Link>
        </div>
      </KerangkaAdmin>
    );
  }

  const sb = await klienServer();
  const { data: bidang } = await sb.from("sections").select("id, nama").order("urutan");

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Catat Laporan Kegiatan">
      <div className="mb-4 rounded-token border border-n-200 bg-n-0 px-4 py-3">
        <p className="text-[13.5px] text-n-700">
          Jalur ini untuk kegiatan yang <strong>sudah terlaksana</strong> dan tidak perlu diajukan
          lebih dulu — misalnya kegiatan pusat yang diikuti Ketua atau anggota, atau kegiatan lama
          sebelum sistem ini ada. Laporan langsung tersimpan; Ketua memvalidasi sebelum tayang.
        </p>
      </div>

      <FormLaporanLangsung bidang={(bidang ?? []) as { id: string; nama: string }[]} />

      <div className="mt-6">
        <Link href="/admin/kegiatan" className="text-[13.5px] text-brand-700 hover:underline">
          ← Kembali ke daftar kegiatan
        </Link>
      </div>
    </KerangkaAdmin>
  );
}
