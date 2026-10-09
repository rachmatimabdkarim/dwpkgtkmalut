"use client";

/** Form kontak publik: nama, email, isi pesan. */

import { useState, useTransition } from "react";
import { Isian, AreaTeks, Kolom, TombolUtama } from "@/components/dasar";
import { kirimPesanKontak } from "@/app/admin/kontak/aksi";

export function FormKontak() {
  const [pesan, setPesan] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const [sedang, mulai] = useTransition();

  function kirim(form: FormData) {
    setPesan(null);
    setSukses(false);
    mulai(async () => {
      const hasil = await kirimPesanKontak({
        nama: String(form.get("nama") ?? ""),
        email: String(form.get("email") ?? ""),
        pesan: String(form.get("pesan") ?? ""),
      });
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(true);
    });
  }

  if (sukses) {
    return (
      <div className="rounded-token border border-ok-200 bg-ok-50 p-5 text-center space-y-3">
        <p className="text-[16px] font-medium text-ok-700">Pesan Anda sudah terkirim.</p>
        <p className="teks-3 text-n-600">
          Terima kasih. Pengurus akan menindaklanjuti pesan Anda.
        </p>
        <button
          type="button"
          onClick={() => setSukses(false)}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-token border border-n-200 text-[14px] text-n-700 hover:bg-n-50"
        >
          Kirim pesan lain
        </button>
      </div>
    );
  }

  return (
    <form action={kirim} className="space-y-4">
      <Kolom label="Nama Anda">
        <Isian name="nama" placeholder="Contoh: Siti Aminah" required minLength={2} />
      </Kolom>

      <Kolom label="Email">
        <Isian name="email" type="email" placeholder="nama@contoh.com" required />
      </Kolom>

      <Kolom label="Pesan">
        <AreaTeks
          name="pesan"
          rows={6}
          placeholder="Tulis pertanyaan, saran, atau permintaan informasi Anda di sini…"
          required
          minLength={10}
        />
      </Kolom>

      {pesan && (
        <p className="text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
          {pesan}
        </p>
      )}

      <TombolUtama type="submit" disabled={sedang} className="w-full sm:w-auto">
        {sedang ? "Mengirim…" : "Kirim Pesan"}
      </TombolUtama>
    </form>
  );
}
