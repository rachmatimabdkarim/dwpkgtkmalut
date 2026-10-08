"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TombolUtama, Kolom, Isian } from "@/components/dasar";
import { LambangTeks } from "@/components/ikon";
import { JudulAplikasi } from "@/components/judul-aplikasi";
import { klienPeramban } from "@/lib/supabase-peramban";

export function FormMasuk() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState("");
  const [sedang, setSedang] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setSedang(true);
    try {
      const sb = klienPeramban();
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: kataSandi,
      });
      if (error) {
        setSedang(false);
        setGalat(
          /invalid|credentials/i.test(error.message)
            ? "Email atau kata sandi tidak cocok."
            : "Gagal masuk: " + error.message,
        );
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setSedang(false);
      setGalat("Tidak dapat menghubungi server. Periksa sambungan internet.");
    }
  }

  return (
    <main className="min-h-dvh grid md:grid-cols-2">
      {/* Sisi kiri: penjelas singkat (disembunyikan di HP) */}
      <section className="hidden md:flex flex-col justify-between bg-brand-700 text-brand-contrast p-10">
        <div className="flex items-center gap-3">
          <LambangTeks ukuran={40} />
          <JudulAplikasi terang />
        </div>
        <div>
          <h2 className="text-[26px] font-semibold leading-snug max-w-[420px]">
            Satu tempat untuk mengelola kegiatan dan publikasi DWP.
          </h2>
          <p className="mt-3 opacity-90 max-w-[420px] text-[15px]">
            Perencanaan, pelaksanaan, dan pelaporan berjalan berurutan dengan persetujuan
            berjenjang.
          </p>
        </div>
        <p className="teks-3 opacity-80">
          Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara
        </p>
      </section>

      {/* Sisi kanan: formulir masuk — satu tujuan, satu aksi utama */}
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-[380px]">
          <div className="md:hidden flex items-center gap-3 mb-7">
            <LambangTeks ukuran={40} />
            <JudulAplikasi />
          </div>

          <h1 className="judul-1 text-n-800">Masuk</h1>
          <p className="mt-1 text-n-500">Gunakan email dan kata sandi akun pengurus.</p>

          <form onSubmit={kirim} className="mt-6 flex flex-col gap-4">
            <Kolom label="Email">
              <Isian
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="nama@contoh.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Kolom>
            <Kolom label="Kata sandi">
              <Isian
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
              />
            </Kolom>

            {galat && (
              <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
                {galat}
              </p>
            )}

            <TombolUtama type="submit" ukuran="besar" disabled={sedang} className="w-full mt-1">
              {sedang ? "Memeriksa…" : "Masuk"}
            </TombolUtama>
          </form>

          <p className="mt-6 teks-3 text-n-500">
            <Link href="/" className="text-brand-700 underline underline-offset-2">
              Kembali ke situs publik
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
