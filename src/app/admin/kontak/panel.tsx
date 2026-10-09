"use client";

/** Panel pesan masuk dari halaman Kontak: baca, tandai, catat, hapus. */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  Lencana,
  Kosong,
  TombolUtama,
  TombolSekunder,
  AreaTeks,
  Kolom,
} from "@/components/dasar";
import { ubahStatusPesan, hapusPesan, simpanPenerima } from "./aksi";

export type PesanMasuk = {
  id: string;
  nama: string;
  email: string;
  pesan: string;
  status: "baru" | "dibaca" | "selesai";
  catatan: string | null;
  dibuat_pada: string;
};

export type Penerima = { id: string; email: string; nama: string | null; aktif: boolean };

import type { NadaStatus } from "@/components/dasar";

const NADA: Record<string, NadaStatus> = {
  baru: "warn",
  dibaca: "netral",
  selesai: "ok",
};

function tanggal(waktu: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jayapura",
    }).format(new Date(waktu));
  } catch {
    return waktu;
  }
}

export function PanelKontak({
  daftarPesan,
  daftarPenerima,
  bolehHapus,
  bolehAturPenerima,
  emailResmi,
}: {
  daftarPesan: PesanMasuk[];
  daftarPenerima: Penerima[];
  bolehHapus: boolean;
  bolehAturPenerima: boolean;
  emailResmi: string;
}) {
  const [saring, setSaring] = useState<"semua" | "baru" | "dibaca" | "selesai">("semua");
  const [buka, setBuka] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const router = useRouter();

  const jumlah = (s: string) => daftarPesan.filter((p) => p.status === s).length;
  const tampil = saring === "semua" ? daftarPesan : daftarPesan.filter((p) => p.status === saring);

  function ubah(p: PesanMasuk, status: "baru" | "dibaca" | "selesai", denganCatatan = false) {
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      const hasil = await ubahStatusPesan(p.id, status, denganCatatan ? catatan : undefined);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`Pesan dari ${p.nama} ditandai "${status}".`);
      setBuka(null);
      setCatatan("");
      router.refresh();
    });
  }

  function hapus(p: PesanMasuk) {
    if (!window.confirm(`Hapus pesan dari ${p.nama}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      const hasil = await hapusPesan(p.id);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`Pesan dari ${p.nama} sudah dihapus.`);
      setBuka(null);
      router.refresh();
    });
  }

  function simpanDaftarPenerima(form: FormData) {
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      const daftar = String(form.get("penerima") ?? "")
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean)
        .map((email) => ({ email, aktif: true }));
      const hasil = await simpanPenerima(daftar);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses("Daftar penerima email tersimpan.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <div className="flex flex-wrap gap-2">
        {(["semua", "baru", "dibaca", "selesai"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSaring(s)}
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors ${
              saring === s
                ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                : "border-n-300 bg-n-0 text-n-600 hover:bg-n-50"
            }`}
          >
            {s === "semua" ? "Semua" : s === "baru" ? "Baru" : s === "dibaca" ? "Dibaca" : "Selesai"}
            <span className="text-[11px] opacity-80">
              {s === "semua" ? daftarPesan.length : jumlah(s)}
            </span>
          </button>
        ))}
      </div>

      {pesan && (
        <p className="text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
          {pesan}
        </p>
      )}
      {sukses && (
        <p className="text-[14px] text-ok-700 bg-ok-50 border border-ok-200 rounded-token px-3 py-2">
          {sukses}
        </p>
      )}

      {/* Daftar pesan */}
      {tampil.length === 0 ? (
        <Kosong
          pesan={
            daftarPesan.length === 0
              ? "Belum ada pesan dari masyarakat. Pesan yang dikirim lewat halaman Kontak akan muncul di sini."
              : `Tidak ada pesan berstatus "${saring}".`
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {tampil.map((p) => (
            <Kartu key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-n-900 font-medium">{p.nama}</p>
                  <p className="teks-3 text-n-500 break-all">{p.email}</p>
                  <p className="teks-3 text-n-400 mt-0.5">{tanggal(p.dibuat_pada)}</p>
                </div>
                <Lencana nada={NADA[p.status]}>{p.status}</Lencana>
              </div>

              {buka === p.id ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-token bg-n-50 border border-n-200 p-4 text-[15px] text-n-800 whitespace-pre-wrap">
                    {p.pesan}
                  </div>

                  {p.catatan && (
                    <p className="teks-3 text-n-600">
                      <span className="font-medium">Catatan pengurus:</span> {p.catatan}
                    </p>
                  )}

                  <a
                    href={`mailto:${p.email}?subject=${encodeURIComponent("Balasan DWP Kantor GTK Malut")}`}
                    className="inline-flex items-center min-h-[44px] px-4 rounded-token border border-brand-300 text-brand-700 text-[14px] hover:bg-brand-50"
                  >
                    Balas lewat email
                  </a>

                  <Kolom label="Catatan (pilihan)">
                    <AreaTeks
                      rows={2}
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Contoh: sudah dijawab lewat telepon"
                    />
                  </Kolom>

                  <div className="flex flex-wrap gap-3">
                    {p.status !== "dibaca" && (
                      <TombolSekunder type="button" onClick={() => ubah(p, "dibaca")} disabled={sedang}>
                        Tandai dibaca
                      </TombolSekunder>
                    )}
                    {p.status !== "selesai" && (
                      <TombolUtama
                        type="button"
                        onClick={() => ubah(p, "selesai", true)}
                        disabled={sedang}
                      >
                        Tandai selesai
                      </TombolUtama>
                    )}
                    <TombolSekunder
                      type="button"
                      onClick={() => {
                        setBuka(null);
                        setCatatan("");
                      }}
                    >
                      Tutup
                    </TombolSekunder>
                    {bolehHapus && (
                      <button
                        type="button"
                        onClick={() => hapus(p)}
                        disabled={sedang}
                        className="inline-flex items-center min-h-[44px] px-4 rounded-token border border-bahaya-200 text-bahaya-700 text-[14px] hover:bg-bahaya-50"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-n-700 text-[15px] line-clamp-2 flex-1 min-w-[200px]">{p.pesan}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBuka(p.id);
                      setCatatan(p.catatan ?? "");
                      setSukses(null);
                    }}
                    className="inline-flex items-center min-h-[44px] px-4 rounded-token border border-n-200 text-[14px] text-n-700 hover:bg-n-50 shrink-0"
                  >
                    Baca
                  </button>
                </div>
              )}
            </Kartu>
          ))}
        </div>
      )}

      {/* Daftar penerima email */}
      <section className="pt-4">
        <JudulSeksi>Penerima Email Pesan Masuk</JudulSeksi>
        <Kartu className="p-5">
          <p className="teks-3 text-n-600 mb-4">
            Satu alamat email per baris. Pengiriman otomatis ke email akan aktif setelah akun email
            resmi organisasi tersambung. Saat ini semua pesan tetap masuk ke halaman ini.
          </p>

          {bolehAturPenerima ? (
            <form action={simpanDaftarPenerima} className="space-y-4">
              <Kolom label="Daftar alamat email">
                <AreaTeks
                  name="penerima"
                  rows={4}
                  defaultValue={daftarPenerima.map((p) => p.email).join("\n")}
                  placeholder={"ketua@dwpkgtkmalut.com\nsekretaris@dwpkgtkmalut.com"}
                />
              </Kolom>
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Menyimpan…" : "Simpan daftar penerima"}
              </TombolUtama>
            </form>
          ) : (
            <ul className="space-y-1.5 text-[15px] text-n-700">
              {daftarPenerima.length === 0 ? (
                <li className="text-n-500">Belum ada penerima diatur.</li>
              ) : (
                daftarPenerima.map((p) => <li key={p.id}>{p.email}</li>)
              )}
            </ul>
          )}

          {emailResmi && (
            <p className="teks-3 text-n-400 mt-4 border-t border-n-100 pt-3">
              Email resmi organisasi saat ini: {emailResmi}
            </p>
          )}
        </Kartu>
      </section>
    </div>
  );
}
