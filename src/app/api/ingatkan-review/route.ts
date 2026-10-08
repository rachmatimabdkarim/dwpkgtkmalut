import { NextRequest, NextResponse } from "next/server";
import { periksaDanBuatNotifikasi } from "@/lib/notifikasi";

export const maxDuration = 60;

/**
 * Endpoint pengingat review kelamaan — dipanggil oleh penjadwal harian (Vercel Cron).
 * Menerima Authorization: Bearer <CRON_SECRET> bila CRON_SECRET disetel.
 */
export async function GET(req: NextRequest) {
  return handleIngatkan(req);
}

export async function POST(req: NextRequest) {
  return handleIngatkan(req);
}

async function handleIngatkan(req: NextRequest) {
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

  try {
    const hasil = await periksaDanBuatNotifikasi();
    return NextResponse.json({
      sukses: true,
      dibuat: hasil.dibuat,
      totalDiperiksa: hasil.totalDiperiksa,
      waktu: new Date().toISOString(),
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    console.error("Galat rute ingatkan-review:", err);
    return NextResponse.json(
      {
        sukses: false,
        galat: pesan,
      },
      { status: 500 },
    );
  }
}
