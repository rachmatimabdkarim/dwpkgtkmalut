import Link from "next/link";
import { TEMA_BAWAAN } from "@/lib/tema";

/** Halaman sementara — web publik dibangun pada fase 8. */
export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-[520px] text-center">
        <h1 className="judul-1 text-n-800">{TEMA_BAWAAN.namaAplikasi}</h1>
        <p className="mt-3 text-n-600">
          Halaman publik sedang disiapkan. Sementara ini panel pengurus sudah dapat dipakai.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-12 items-center rounded-token bg-brand-600 px-5 font-medium text-brand-contrast hover:bg-brand-700"
        >
          Masuk panel pengurus
        </Link>
      </div>
    </main>
  );
}
