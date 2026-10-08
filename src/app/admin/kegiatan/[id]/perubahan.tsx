"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  Lencana,
  TombolUtama,
  TombolBahaya,
  TombolHalus,
  Kolom,
  Isian,
  AreaTeks,
  Pilihan,
  type NadaStatus,
} from "@/components/dasar";
import { formatTanggal } from "@/lib/kegiatan";
import { ajukanPerubahan, putuskanPerubahan } from "./aksi";

export type ItemPengajuan = {
  id: string;
  activity_id: string;
  jenis: "tanggal" | "tempat" | "anggaran" | "lain";
  usulan: string;
  alasan: string | null;
  status: "diajukan" | "dalam_review" | "disetujui" | "ditolak";
  diajukan_oleh: string | null;
  nama_pengaju?: string;
  dibuat_pada: string;
  diputuskan_pada?: string | null;
};

const LABEL_JENIS: Record<ItemPengajuan["jenis"], string> = {
  tanggal: "Tanggal Pelaksanaan",
  tempat: "Tempat / Lokasi",
  anggaran: "Rincian Anggaran (RAB)",
  lain: "Perubahan Lainnya",
};

const NADA_STATUS: Record<ItemPengajuan["status"], NadaStatus> = {
  diajukan: "warn",
  dalam_review: "warn",
  disetujui: "ok",
  ditolak: "bad",
};

const LABEL_STATUS: Record<ItemPengajuan["status"], string> = {
  diajukan: "Menunggu Keputusan",
  dalam_review: "Dalam Review",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export function PanelPerubahan({
  activityId,
  daftarPengajuan,
  bisaMengajukan,
  bisaMemutuskan,
}: {
  activityId: string;
  daftarPengajuan: ItemPengajuan[];
  bisaMengajukan: boolean;
  bisaMemutuskan: boolean;
}) {
  const router = useRouter();
  const [bukaForm, setBukaForm] = useState(false);
  const [jenis, setJenis] = useState<ItemPengajuan["jenis"]>("tanggal");
  const [usulan, setUsulan] = useState("");
  const [alasan, setAlasan] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);
  const [galatForm, setGalatForm] = useState("");

  // Status keputusan per item
  const [itemDipilih, setItemDipilih] = useState<{
    id: string;
    keputusan: "disetujui" | "ditolak";
  } | null>(null);
  const [catatanTolak, setCatatanTolak] = useState("");
  const [sedangPutus, setSedangPutus] = useState(false);
  const [galatPutus, setGalatPutus] = useState("");

  async function handleSubmitPengajuan(e: React.FormEvent) {
    e.preventDefault();
    setGalatForm("");
    if (!usulan.trim()) return setGalatForm("Usulan perubahan wajib diisi.");
    if (!alasan.trim()) return setGalatForm("Alasan perubahan wajib diisi.");

    setSedangKirim(true);
    const r = await ajukanPerubahan(activityId, jenis, usulan, alasan);
    setSedangKirim(false);

    if (r.galat) {
      setGalatForm(r.galat);
      return;
    }

    setUsulan("");
    setAlasan("");
    setBukaForm(false);
    router.refresh();
  }

  async function handleKirimKeputusan(id: string, keputusan: "disetujui" | "ditolak") {
    setGalatPutus("");
    if (keputusan === "ditolak" && !catatanTolak.trim()) {
      setGalatPutus("Catatan penolakan wajib diisi agar pengusul tahu alasannya.");
      return;
    }

    setSedangPutus(true);
    const r = await putuskanPerubahan(activityId, id, keputusan, catatanTolak);
    setSedangPutus(false);

    if (r.galat) {
      setGalatPutus(r.galat);
      return;
    }

    setItemDipilih(null);
    setCatatanTolak("");
    router.refresh();
  }

  return (
    <Kartu className="p-4 sm:p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <JudulSeksi>Pengajuan Perubahan Kegiatan</JudulSeksi>
          <p className="teks-3 text-n-500">
            Usulan perubahan tanggal, tempat, anggaran, atau rincian lainnya setelah kegiatan disetujui.
          </p>
        </div>
        {bisaMengajukan && !bukaForm && (
          <TombolUtama ukuran="kecil" onClick={() => setBukaForm(true)}>
            + Ajukan Perubahan
          </TombolUtama>
        )}
      </div>

      {/* Formulir pengajuan */}
      {bukaForm && (
        <form
          onSubmit={handleSubmitPengajuan}
          className="rounded-token border border-brand-200 bg-brand-50/40 p-4 mb-6 space-y-4"
        >
          <h3 className="font-semibold text-n-800 text-[15px]">Ajukan Perubahan Baru</h3>

          <Kolom label="Jenis Perubahan">
            <Pilihan
              value={jenis}
              onChange={(e) => setJenis(e.target.value as ItemPengajuan["jenis"])}
            >
              <option value="tanggal">Tanggal Pelaksanaan</option>
              <option value="tempat">Tempat / Lokasi</option>
              <option value="anggaran">Rincian Anggaran (RAB)</option>
              <option value="lain">Lainnya</option>
            </Pilihan>
          </Kolom>

          <Kolom
            label="Usulan Baru"
            bantuan={
              jenis === "tanggal"
                ? "Format: YYYY-MM-DD;YYYY-MM-DD (mulai;selesai). Contoh: 2026-11-01;2026-11-03"
                : jenis === "anggaran"
                ? "Format: uraian|jumlah|harga per baris. Contoh:\nKonsumsi Snack|50|25000\nSpanduk Kegiatan|2|150000"
                : jenis === "tempat"
                ? "Tuliskan nama lokasi atau ruangan baru secara lengkap."
                : "Tuliskan usulan penyesuaian yang diajukan."
            }
          >
            {jenis === "anggaran" || jenis === "lain" ? (
              <AreaTeks
                rows={jenis === "anggaran" ? 4 : 3}
                placeholder={
                  jenis === "anggaran"
                    ? "Uraian|Jumlah|Harga\nContoh: Konsumsi Snack|50|25000"
                    : "Rincian usulan perubahan..."
                }
                value={usulan}
                onChange={(e) => setUsulan(e.target.value)}
              />
            ) : (
              <Isian
                type="text"
                placeholder={
                  jenis === "tanggal" ? "2026-11-01;2026-11-03" : "Contoh: Aula BGP Malut"
                }
                value={usulan}
                onChange={(e) => setUsulan(e.target.value)}
              />
            )}
          </Kolom>

          <Kolom label="Alasan Perubahan" bantuan="Jelaskan dasar pertimbangan atau kendala yang mendasari usulan ini.">
            <AreaTeks
              rows={2}
              placeholder="Contoh: Jadwal pemateri bergeser menyesuaikan agenda dinas luar kota..."
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            />
          </Kolom>

          {galatForm && (
            <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
              {galatForm}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <TombolUtama type="submit" disabled={sedangKirim}>
              {sedangKirim ? "Mengirimkan…" : "Kirim Pengajuan"}
            </TombolUtama>
            <TombolHalus
              type="button"
              onClick={() => {
                setBukaForm(false);
                setGalatForm("");
              }}
            >
              Batal
            </TombolHalus>
          </div>
        </form>
      )}

      {galatPutus && (
        <p className="mb-4 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galatPutus}
        </p>
      )}

      {/* Riwayat pengajuan */}
      {daftarPengajuan.length === 0 ? (
        <p className="text-n-500 teks-3 py-3">Belum ada pengajuan perubahan untuk kegiatan ini.</p>
      ) : (
        <div className="space-y-4">
          {/* Tampilan Desktop: Tabel */}
          <div className="hidden sm:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-n-500 teks-3 text-left border-b border-n-200">
                  <th className="pb-2 font-medium">Jenis</th>
                  <th className="pb-2 font-medium">Usulan</th>
                  <th className="pb-2 font-medium">Alasan</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Pengaju & Waktu</th>
                  {bisaMemutuskan && <th className="pb-2 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {daftarPengajuan.map((p) => {
                  const menunggu = p.status === "diajukan" || p.status === "dalam_review";
                  return (
                    <tr key={p.id} className="border-b border-n-100 hover:bg-n-50/50">
                      <td className="py-3 text-n-800 font-medium align-top">
                        {LABEL_JENIS[p.jenis]}
                      </td>
                      <td className="py-3 text-n-800 align-top max-w-xs whitespace-pre-line font-mono text-[13px]">
                        {p.usulan}
                      </td>
                      <td className="py-3 text-n-600 align-top max-w-xs text-[13px]">
                        {p.alasan || "—"}
                      </td>
                      <td className="py-3 align-top whitespace-nowrap">
                        <Lencana nada={NADA_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Lencana>
                      </td>
                      <td className="py-3 text-n-600 align-top text-[13px] whitespace-nowrap">
                        <p className="font-medium text-n-800">{p.nama_pengaju || "Pengurus"}</p>
                        <p className="teks-3 text-n-500">{formatTanggal(p.dibuat_pada)}</p>
                      </td>
                      {bisaMemutuskan && (
                        <td className="py-3 align-top text-right whitespace-nowrap">
                          {menunggu ? (
                            <div className="flex justify-end gap-2">
                              <TombolUtama
                                ukuran="kecil"
                                disabled={sedangPutus}
                                onClick={() => handleKirimKeputusan(p.id, "disetujui")}
                              >
                                Setujui
                              </TombolUtama>
                              <TombolBahaya
                                ukuran="kecil"
                                disabled={sedangPutus}
                                onClick={() =>
                                  setItemDipilih({ id: p.id, keputusan: "ditolak" })
                                }
                              >
                                Tolak
                              </TombolBahaya>
                            </div>
                          ) : (
                            <span className="teks-3 text-n-400">Tuntas</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tampilan HP: Kartu-kartu */}
          <div className="sm:hidden flex flex-col gap-3">
            {daftarPengajuan.map((p) => {
              const menunggu = p.status === "diajukan" || p.status === "dalam_review";
              return (
                <div
                  key={p.id}
                  className="rounded-token border border-n-200 bg-n-0 p-3.5 space-y-2 text-[14px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-n-800">{LABEL_JENIS[p.jenis]}</span>
                    <Lencana nada={NADA_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Lencana>
                  </div>
                  <div>
                    <span className="teks-3 text-n-500 block">Usulan:</span>
                    <p className="font-mono text-[13px] text-n-800 bg-n-50 p-2 rounded-token border border-n-200 whitespace-pre-line">
                      {p.usulan}
                    </p>
                  </div>
                  {p.alasan && (
                    <div>
                      <span className="teks-3 text-n-500 block">Alasan:</span>
                      <p className="text-n-700 text-[13px]">{p.alasan}</p>
                    </div>
                  )}
                  <div className="pt-1 border-t border-n-100 flex items-center justify-between teks-3 text-n-500">
                    <span>Oleh: {p.nama_pengaju || "Pengurus"}</span>
                    <span>{formatTanggal(p.dibuat_pada)}</span>
                  </div>

                  {bisaMemutuskan && menunggu && (
                    <div className="pt-2 flex gap-2">
                      <TombolUtama
                        ukuran="kecil"
                        className="flex-1"
                        disabled={sedangPutus}
                        onClick={() => handleKirimKeputusan(p.id, "disetujui")}
                      >
                        Setujui
                      </TombolUtama>
                      <TombolBahaya
                        ukuran="kecil"
                        className="flex-1"
                        disabled={sedangPutus}
                        onClick={() => setItemDipilih({ id: p.id, keputusan: "ditolak" })}
                      >
                        Tolak
                      </TombolBahaya>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog konfirmasi penolakan dengan input catatan wajib */}
      {itemDipilih && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-token-lg bg-n-0 border border-n-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-n-900 text-[16px]">Tolak Pengajuan Perubahan</h3>
            <p className="text-n-600 text-[14px]">
              Tuliskan alasan penolakan agar pengusul memahami catatan koreksinya.
            </p>

            <Kolom label="Catatan Penolakan (Wajib)">
              <AreaTeks
                rows={3}
                placeholder="Contoh: Anggaran honor melebihi pagu yang tersedia..."
                value={catatanTolak}
                onChange={(e) => setCatatanTolak(e.target.value)}
              />
            </Kolom>

            {galatPutus && (
              <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
                {galatPutus}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <TombolHalus
                type="button"
                onClick={() => {
                  setItemDipilih(null);
                  setCatatanTolak("");
                }}
              >
                Batal
              </TombolHalus>
              <TombolBahaya
                type="button"
                disabled={sedangPutus}
                onClick={() => handleKirimKeputusan(itemDipilih.id, "ditolak")}
              >
                {sedangPutus ? "Menyimpan…" : "Konfirmasi Tolak"}
              </TombolBahaya>
            </div>
          </div>
        </div>
      )}
    </Kartu>
  );
}
