import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTanggal } from "@/lib/kegiatan";
import { beritaSlug, urlPublik } from "@/lib/publik";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const berita = await beritaSlug(slug);

  if (!berita) {
    return {
      title: "Berita Tidak Ditemukan",
    };
  }

  return {
    title: berita.judul,
    description: berita.ringkasan ?? undefined,
  };
}

export default async function HalamanDetailBerita({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const berita = await beritaSlug(slug);

  if (!berita) {
    notFound();
  }

  const gambar = urlPublik(berita.gambar_path);

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      {/* Tautan Kembali */}
      <div>
        <Link
          href="/berita"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-brand-700 hover:text-brand-800 text-[14px] font-medium transition-colors"
        >
          <span>←</span>
          <span>Kembali ke Berita</span>
        </Link>
      </div>

      {/* Header Berita */}
      <header className="space-y-3 border-b border-n-200 pb-5">
        <p className="teks-3 text-n-500">{formatTanggal(berita.terbit_pada)}</p>
        <h1 className="judul-1 text-n-900 leading-tight">{berita.judul}</h1>
        {berita.ringkasan && (
          <p className="text-[16px] text-n-600 font-medium leading-relaxed italic">
            {berita.ringkasan}
          </p>
        )}
      </header>

      {/* Gambar Utama (Bila ada) */}
      {gambar && (
        <div className="rounded-token-lg overflow-hidden border border-n-200 bg-n-100 shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gambar}
            alt={berita.judul}
            className="w-full max-h-[450px] object-cover"
          />
        </div>
      )}

      {/* Isi Berita */}
      <div className="space-y-4 text-n-800 text-[16px] leading-relaxed pt-2">
        {berita.isi ? (
          berita.isi
            .split("\n\n")
            .filter((p) => p.trim().length > 0)
            .map((paragraf, i) => (
              <p key={i} className="whitespace-pre-line">
                {paragraf.trim()}
              </p>
            ))
        ) : (
          <p className="text-n-500 italic">Konten berita belum tersedia.</p>
        )}
      </div>

      {/* Footer Navigasi Bawah */}
      <div className="pt-8 border-t border-n-200 flex justify-between items-center">
        <Link
          href="/berita"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-token border border-n-300 text-n-700 hover:bg-n-100 font-medium text-[14px] transition-colors"
        >
          <span>←</span>
          <span>Daftar Berita Lainnya</span>
        </Link>
      </div>
    </article>
  );
}
