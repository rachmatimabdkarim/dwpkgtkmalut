import { redirect } from "next/navigation";
import { penggunaSaatIni } from "./supabase-server";
import type { SesiPengguna } from "./sesi";

export type { SesiPengguna };

/** Mengambil pengguna yang sedang masuk, atau mengalihkan ke halaman masuk. */
export async function sesiWajib(): Promise<SesiPengguna> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk");
  return pengguna;
}

/** Halaman panel yang hanya boleh dibuka peran tertentu. */
export async function sesiWajibPeran(diizinkan: SesiPengguna["peran"]): Promise<SesiPengguna> {
  const pengguna = await sesiWajib();
  if (!pengguna.peran.some((p) => diizinkan.includes(p))) redirect("/admin");
  return pengguna;
}
