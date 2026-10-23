import { redirect } from "next/navigation";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { tarikDataLaporan } from "@/lib/laporan-data";
import { LembarLaporan } from "@/components/lembar-laporan";

export const instant = false;

/**
 * HALAMAN CETAK LAPORAN
 *
 * Memakai komponen LembarLaporan yang SAMA dengan pratinjau di layar. Dengan
 * begitu hasil cetak (PDF) mustahil berbeda dengan yang dilihat penyusun —
 * sebelumnya PDF dibuat terpisah dan isinya sempat berbeda jauh.
 *
 * Peramban menyembunyikan menu & panel lewat CSS cetak di bawah.
 */
export default async function CetakLaporan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk");

  const sb = await klienServer();
  const data = await tarikDataLaporan(sb, id);

  return (
    <>
      {/* Pengaturan cetak: ukuran A4, margin rapi, warna latar ikut tercetak. */}
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          html, body { background: #ffffff !important; }
          .tanpa-cetak { display: none !important; }
          article { max-width: none !important; padding: 0 !important; }
          section, figure { break-inside: avoid; }
        }
      `}</style>

      <div className="tanpa-cetak sticky top-0 z-10 bg-n-0 border-b border-n-200 px-4 py-3">
        <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3">
          <p className="teks-3 text-n-600">
            Pratinjau cetak — hasil sama dengan tampilan laporan.
          </p>
          <a
            href={`/admin/kegiatan/${id}?tab=laporan`}
            className="inline-flex h-10 items-center rounded-token border border-n-300 px-3.5 text-[13px] font-medium text-n-700"
          >
            Kembali
          </a>
        </div>
      </div>

      <div className="bg-n-100 py-6 tanpa-cetak-latar">
        <LembarLaporan data={data} />
      </div>
    </>
  );
}
