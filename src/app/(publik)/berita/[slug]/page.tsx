import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTanggal } from "@/lib/kegiatan";
import { beritaSlug, urlPublik } from "@/lib/publik";


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

export default function HalamanDetailBerita({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<KerangkaBerita />}>
      <IsiBerita params={params} />
    </Suspense>
  );
}

/**
 * Cangkang halaman: tampil duluan supaya perpindahan halaman terasa langsung,
 * isi berita menyusul sekejap kemudian.
 */
function KerangkaBerita() {
  return (
    <article className="max-w-3xl mx-auto space-y-6" aria-busy="true">
      <div className="h-[44px]" />
      <div className="space-y-3 border-b border-n-200 pb-5">
        <div className="h-4 w-24 rounded-token bg-n-100" />
        <div className="h-8 w-3/4 rounded-token bg-n-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded-token bg-n-100" />
        <div className="h-4 w-5/6 rounded-token bg-n-100" />
        <div className="h-4 w-2/3 rounded-token bg-n-100" />
      </div>
    </article>
  );
}

async function IsiBerita({
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
        <div className="rounded-[18px] overflow-hidden border border-n-200 bg-n-100 shadow-xs">
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
