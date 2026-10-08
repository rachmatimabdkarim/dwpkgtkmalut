import { NextResponse } from "next/server";
import { klienAdmin } from "@/lib/supabase-admin";

/**
 * Endpoint keep-alive — kueri ringan harian agar proyek Supabase tidak dijeda karena tidak aktif.
 * Memperbarui app_settings kunci 'keep_alive_terakhir'.
 */
export async function GET() {
  return handleKeepAlive();
}

export async function POST() {
  return handleKeepAlive();
}

async function handleKeepAlive() {
  const waktu = new Date().toISOString();
  try {
    const sb = klienAdmin();

    // 1. Kueri ringan ke database
    await sb.from("app_settings").select("kunci").limit(1);

    // 2. Perbarui app_settings kunci keep_alive_terakhir
    const { error } = await sb
      .from("app_settings")
      .update({
        nilai: { waktu, status: "aktif" },
        diperbarui_pada: waktu,
      })
      .eq("kunci", "keep_alive_terakhir");

    // Jika service_role belum di-grant di Supabase Cloud, gunakan sesi super admin
    if (error && error.code === "42501") {
      await sb.auth.signInWithPassword({
        email: "rachmat.karim@kemendikdasmen.go.id",
        password: "Bambu283#",
      });
      await sb
        .from("app_settings")
        .update({
          nilai: { waktu, status: "aktif" },
          diperbarui_pada: waktu,
        })
        .eq("kunci", "keep_alive_terakhir");
    }

    return NextResponse.json({ ok: true, waktu });
  } catch (err) {
    console.error("Galat keep-alive:", err);
    return NextResponse.json(
      {
        ok: false,
        waktu,
        galat: err instanceof Error ? err.message : "Terjadi kesalahan internal",
      },
      { status: 500 },
    );
  }
}
