import type { Metadata } from "next";
import { klienAdmin } from "@/lib/supabase-admin";
import { formatTanggal } from "@/lib/kegiatan";

export const metadata: Metadata = {
  title: "Validasi Laporan · Dharma Wanita Persatuan KGTK Malut",
  robots: { index: false, follow: false },
};
export const instant = false;

/**
 * HALAMAN PEMERIKSAAN KEASLIAN LAPORAN — dibuka dengan memindai QR pada area
 * tanda tangan. Tanpa masuk, supaya siapa pun bisa memastikan laporan itu asli.
 *
 * Hanya menampilkan data yang memang layak publik: nama kegiatan, tanggal,
 * tempat, penandatangan, dan waktu validasi. Isi laporan tidak dibuka.
 */
export default async function HalamanValidasi({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const admin = klienAdmin();

  const { data } = await admin
    .from("laporan_validasi")
    .select("kode, divalidasi_pada, activity_id, divalidasi_oleh")
    .eq("kode", kode)
    .maybeSingle<{
      kode: string;
      divalidasi_pada: string;
      activity_id: string;
      divalidasi_oleh: string | null;
    }>();

  if (!data) {
    return (
      <Bingkai>
        <div className="rounded-token-lg border border-warn-line bg-warn-bg p-6 text-center">
          <p className="text-[16px] font-semibold text-warn-fg">
            Kode validasi tidak dikenali
          </p>
          <p className="mt-2 text-[14px] text-n-700">
            Laporan dengan kode ini tidak terdaftar atau validasinya sudah dicabut.
          </p>
        </div>
      </Bingkai>
    );
  }

  const [{ data: keg }, { data: penanda }] = await Promise.all([
    admin
      .from("activities")
      .select("judul, kode, tempat, tanggal_mulai, tanggal_selesai")
      .eq("id", data.activity_id)
      .maybeSingle<{
        judul: string;
        kode: string | null;
        tempat: string | null;
        tanggal_mulai: string | null;
        tanggal_selesai: string | null;
      }>(),
    data.divalidasi_oleh
      ? admin
          .from("profiles")
          .select("nama")
          .eq("id", data.divalidasi_oleh)
          .maybeSingle<{ nama: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const tanggal =
    keg?.tanggal_mulai
      ? keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
        ? `${formatTanggal(keg.tanggal_mulai)} – ${formatTanggal(keg.tanggal_selesai)}`
        : formatTanggal(keg.tanggal_mulai)
      : "—";

  return (
    <Bingkai>
      <div className="rounded-token-lg border border-ok-line bg-ok-bg p-4 text-center">
        <p className="text-[15px] font-semibold text-ok-fg">
          ✓ Laporan ini sah dan terverifikasi
        </p>
        <p className="teks-3 text-n-700 mt-1">
          Divalidasi oleh Ketua Dharma Wanita Persatuan KGTK Maluku Utara.
        </p>
      </div>

      <div className="mt-4 rounded-token-lg border border-n-200 bg-n-0 p-5">
        <p className="teks-3 text-n-500 font-medium">Laporan Pelaksanaan Kegiatan</p>
        <h1 className="mt-1 text-[18px] font-bold text-n-900 leading-snug">
          {keg?.judul ?? "Kegiatan"}
        </h1>

        <dl className="mt-4 flex flex-col gap-2 text-[14px]">
          <Baris label="Nomor kegiatan" nilai={keg?.kode ?? "—"} />
          <Baris label="Tanggal" nilai={tanggal} />
          <Baris label="Tempat" nilai={keg?.tempat ?? "—"} />
          <Baris label="Penandatangan" nilai={penanda?.nama ?? "Ketua DWP"} />
          <Baris
            label="Divalidasi"
            nilai={new Date(data.divalidasi_pada).toLocaleString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <Baris label="Kode keaslian" nilai={data.kode} />
        </dl>
      </div>
    </Bingkai>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-n-100 pb-1.5 last:border-0">
      <dt className="text-n-500 shrink-0">{label}</dt>
      <dd className="text-n-900 font-medium text-right break-words">{nilai}</dd>
    </div>
  );
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-n-50 px-4 py-8">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="text-center text-[12.5px] font-semibold tracking-wide text-n-500 uppercase mb-4">
          Dharma Wanita Persatuan KGTK Malut
        </p>
        {children}
        <p className="mt-6 text-center teks-3 text-n-400">
          SI-ANGGUN · Pemeriksaan keaslian laporan
        </p>
      </div>
    </main>
  );
}
