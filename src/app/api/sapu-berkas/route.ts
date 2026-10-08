import { NextRequest, NextResponse } from "next/server";
import { jalankanPenyapu } from "@/lib/penyapu";

export const maxDuration = 60;

/**
 * Endpoint penyapu berkas otomatis — dipanggil oleh penjadwal harian (Vercel Cron).
 * Menerima Authorization: Bearer <CRON_SECRET> bila CRON_SECRET disetel.
 * Menerima query param ?ujiCoba=1 untuk simulasi tanpa penghapusan fisik.
 */
export async function GET(req: NextRequest) {
  return handleSapu(req);
}

export async function POST(req: NextRequest) {
  return handleSapu(req);
}

async function handleSapu(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token !== cronSecret) {
      return NextResponse.json(
        { galat: "Akses tidak diizinkan. Token otorisasi tidak valid." },
        { status: 401 },
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const ujiCoba = searchParams.get("ujiCoba") === "1";

  try {
    const hasil = await jalankanPenyapu({ ujiCoba });
    return NextResponse.json(hasil);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    console.error("Galat rute penyapu berkas:", err);
    return NextResponse.json(
      {
        sukses: false,
        galat: pesan,
      },
      { status: 500 },
    );
  }
}
