"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TombolUtama, TombolSekunder, Kolom, Isian } from "@/components/dasar";
import { klienPeramban } from "@/lib/supabase-peramban";

/** Ganti kata sandi milik sendiri. */
export function FormKataSandi() {
  const router = useRouter();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [galat, setGalat] = useState("");
  const [sukses, setSukses] = useState("");
  const [sedang, setSedang] = useState(false);

  function periksaKuat(s: string): string | null {
    if (s.length < 10) return "Kata sandi minimal 10 karakter.";
    if (!/[a-z]/.test(s)) return "Tambahkan huruf kecil.";
    if (!/[A-Z]/.test(s)) return "Tambahkan huruf besar.";
    if (!/[0-9]/.test(s)) return "Tambahkan angka.";
    if (!/[^A-Za-z0-9]/.test(s)) return "Tambahkan tanda baca (contoh: # atau !).";
    return null;
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setSukses("");
    const lemah = periksaKuat(baru);
    if (lemah) return setGalat(lemah);
    if (baru !== ulang) return setGalat("Kata sandi baru dan ulangannya tidak sama.");
    setSedang(true);
    const sb = klienPeramban();
    const { error } = await sb.auth.updateUser({ password: baru });
    if (error) {
      setSedang(false);
      return setGalat("Gagal mengganti kata sandi: " + error.message);
    }

    // Catat waktu ganti supaya Super Admin tahu siapa yang sudah mengganti sendiri
    const { data: sesi } = await sb.auth.getUser();
    if (sesi.user?.id) {
      await sb
        .from("profiles")
        .update({ sandi_diganti_pada: new Date().toISOString() })
        .eq("id", sesi.user.id);
    }
    setSedang(false);
    setSukses("Kata sandi berhasil diganti.");
    setLama("");
    setBaru("");
    setUlang("");
    router.refresh();
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4 max-w-[420px]">
      <Kolom label="Kata sandi saat ini">
        <Isian
          type="password"
          required
          autoComplete="current-password"
          value={lama}
          onChange={(e) => setLama(e.target.value)}
        />
      </Kolom>
      <Kolom
        label="Kata sandi baru"
        bantuan="Minimal 10 karakter, campur huruf besar, huruf kecil, angka, dan tanda baca."
      >
        <Isian
          type="password"
          required
          autoComplete="new-password"
          value={baru}
          onChange={(e) => setBaru(e.target.value)}
        />
      </Kolom>
      <Kolom label="Ulangi kata sandi baru">
        <Isian
          type="password"
          required
          autoComplete="new-password"
          value={ulang}
          onChange={(e) => setUlang(e.target.value)}
        />
      </Kolom>

      {galat && (
        <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      {sukses && (
        <p className="rounded-token border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok-fg">
          {sukses}
        </p>
      )}

      <div className="flex gap-3">
        <TombolUtama type="submit" disabled={sedang}>
          {sedang ? "Menyimpan…" : "Simpan"}
        </TombolUtama>
        <TombolSekunder
          type="button"
          onClick={() => {
            setLama("");
            setBaru("");
            setUlang("");
            setGalat("");
            setSukses("");
          }}
        >
          Batal
        </TombolSekunder>
      </div>
    </form>
  );
}
