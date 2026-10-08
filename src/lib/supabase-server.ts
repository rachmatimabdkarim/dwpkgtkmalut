import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SesiPengguna } from "./sesi";
import { cache } from "react";

/**
 * Klien server: membaca sesi pengguna dari kue dan memakai kunci publik.
 * Kunci rahasia TIDAK dipakai di sini agar tidak pernah ikut ke peramban.
 */
export async function klienServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const simpanKue = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return simpanKue.getAll();
      },
      setAll(daftar) {
        try {
          daftar.forEach(({ name, value, options }) => simpanKue.set(name, value, options));
        } catch {
          // Dipanggil dari komponen server (hanya baca) — abaikan.
        }
      },
    },
  });
}

type BarisProfil = {
  id: string;
  nama: string;
  email: string;
  jabatan: string | null;
};

/** Mengambil pengguna yang sedang masuk beserta perannya dari database. */
async function bacaPenggunaSaatIni(): Promise<SesiPengguna | null> {
  const sb = await klienServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  // Dua permintaan dijalankan BERSAMAAN, bukan berurutan.
  const [profilHasil, peranHasil] = await Promise.all([
    sb
      .from("profiles")
      .select("id, nama, email, jabatan")
      .eq("id", user.id)
      .maybeSingle<BarisProfil>(),
    sb.from("user_roles").select("peran").eq("user_id", user.id),
  ]);

  const profil = profilHasil.data;
  const peran = ((peranHasil.data ?? []) as { peran: string }[]).map(
    (p) => p.peran as SesiPengguna["peran"][number],
  );

  return {
    id: user.id,
    nama: profil?.nama ?? (user.user_metadata?.nama as string) ?? user.email ?? "Pengguna",
    email: profil?.email ?? user.email ?? "",
    jabatan: profil?.jabatan ?? "",
    peran,
  };
}

/**
 * Identitas pengguna untuk satu permintaan halaman.
 * Hasilnya disimpan di memori selama satu permintaan saja (bawaan Next.js),
 * jadi satu kali buka halaman tidak menanyai database berkali-kali.
 */
export const penggunaSaatIni = cache(bacaPenggunaSaatIni);
