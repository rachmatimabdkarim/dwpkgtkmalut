import type { Metadata } from "next";
import { klienAdmin } from "@/lib/supabase-admin";
import { formatTanggal } from "@/lib/kegiatan";
import { FormPresensi } from "./form-presensi";

export const metadata: Metadata = {
  title: "Presensi Kegiatan · Dharma Wanita Persatuan KGTK Malut",
  robots: { index: false, follow: false },
};
export const instant = false;

/**
 * HALAMAN PRESENSI PESERTA — dibuka dengan memindai QR di lokasi kegiatan.
 *
 * Tanpa masuk: peserta luar pun boleh absen (aturan pemilik). Halaman ini
 * sengaja tidak dapat diindeks mesin pencari karena bersifat sementara.
 */
export default async function HalamanPresensi({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const admin = klienAdmin();

  const { data: jendela } = await admin
    .from("presensi_jendela")
    .select("activity_id")
    .eq("kode_qr", kode)
    .maybeSingle<{ activity_id: string }>();

  if (!jendela) {
    return (
      <Bingkai>
        <div className="rounded-token-lg border border-warn-line bg-warn-bg p-6 text-center">
          <p className="text-[16px] font-semibold text-warn-fg">Kode presensi tidak dikenali</p>
          <p className="mt-2 text-[14px] text-n-700">
            Mintakan kode terbaru kepada petugas presensi di lokasi kegiatan.
          </p>
        </div>
      </Bingkai>
    );
  }

  const { data: keg } = await admin
    .from("activities")
    .select("judul, tempat, tanggal_mulai, tanggal_selesai")
    .eq("id", jendela.activity_id)
    .maybeSingle<{
      judul: string;
      tempat: string | null;
      tanggal_mulai: string | null;
      tanggal_selesai: string | null;
    }>();

  const { data: statusData } = await admin.rpc("status_presensi", {
    p_activity: jendela.activity_id,
  });
  const status = statusData as { terbuka?: boolean; sebab?: string } | null;

  const tanggal =
    keg?.tanggal_mulai
      ? keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
        ? `${formatTanggal(keg.tanggal_mulai)} – ${formatTanggal(keg.tanggal_selesai)}`
        : formatTanggal(keg.tanggal_mulai)
      : "Tanggal belum diatur";

  return (
    <Bingkai>
      <FormPresensi
        kode={kode}
        judul={keg?.judul ?? "Kegiatan DWP"}
        tempat={keg?.tempat ?? null}
        tanggal={tanggal}
        terbuka={status?.terbuka === true}
        sebab={status?.sebab ?? "Status presensi tidak dapat dibaca."}
      />
    </Bingkai>
  );
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-n-50 px-4 py-8">
      <div className="mx-auto w-full max-w-[440px]">
        <p className="text-center text-[12.5px] font-semibold tracking-wide text-n-500 uppercase mb-4">
          Dharma Wanita Persatuan KGTK Malut
        </p>
        {children}
        <p className="mt-6 text-center teks-3 text-n-400">
          SI-ANGGUN · Sistem Informasi Anggota dan Kegiatan Unggulan DWP
        </p>
      </div>
    </main>
  );
}
