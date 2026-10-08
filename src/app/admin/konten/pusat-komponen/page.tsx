import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { Kartu, JudulSeksi, Lencana, TombolUtama, TombolSekunder, TombolBahaya, TombolHalus } from "@/components/dasar";

export const metadata = { title: "Pusat Komponen" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

const contohTombol = [
  { label: "Ajukan", jenis: "utama" as const },
  { label: "Simpan Draft", jenis: "sekunder" as const },
  { label: "Batal", jenis: "halus" as const },
  { label: "Tolak", jenis: "bahaya" as const },
];

/**
 * Halaman pratinjau: menampilkan seluruh komponen dasar dengan warna bawaan
 * agar tampilan dapat disetujui sebelum halaman lain dibangun.
 */
export default async function PusatKomponen() {
  const pengguna = await sesiWajibPeran(["super_admin", "editor"]);

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Konten · Pusat Komponen"
    >
      <p className="text-n-500 mb-6">
        Pratinjau komponen dasar. Semua warna diambil dari pengaturan tampilan, sehingga
        perubahan warna di Pengaturan → Tampilan langsung terlihat di sini.
      </p>

      {/* Warna */}
      <section className="mb-7">
        <JudulSeksi>Warna utama (skala otomatis)</JudulSeksi>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => (
            <div key={n} className="text-center">
              <div
                className="h-12 rounded-token border border-n-200"
                style={{ background: `var(--brand-${n})` }}
              />
              <span className="teks-3 text-n-500">{n}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-7">
        <JudulSeksi>Warna status (tetap, tidak dapat diubah)</JudulSeksi>
        <div className="flex flex-wrap gap-2">
          <Lencana nada="ok">Disetujui</Lencana>
          <Lencana nada="warn">Menunggu</Lencana>
          <Lencana nada="bad">Revisi / Ditolak</Lencana>
          <Lencana nada="netral">Draf</Lencana>
          <Lencana nada="brand">Berjalan</Lencana>
        </div>
      </section>

      {/* Tombol */}
      <section className="mb-7">
        <JudulSeksi>Tombol</JudulSeksi>
        <Kartu className="p-4 flex flex-wrap gap-3 items-center">
          {contohTombol.map((t) =>
            t.jenis === "utama" ? (
              <TombolUtama key={t.label}>{t.label}</TombolUtama>
            ) : t.jenis === "sekunder" ? (
              <TombolSekunder key={t.label}>{t.label}</TombolSekunder>
            ) : t.jenis === "bahaya" ? (
              <TombolBahaya key={t.label}>{t.label}</TombolBahaya>
            ) : (
              <TombolHalus key={t.label}>{t.label}</TombolHalus>
            ),
          )}
        </Kartu>
      </section>

      {/* Kartu */}
      <section className="mb-7">
        <JudulSeksi>Kartu kegiatan</JudulSeksi>
        <Kartu className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-medium text-n-800">Pelatihan Literasi Digital</h3>
              <p className="teks-3 text-n-500 mt-1">Selasa, 20 Okt 2026 · Ternate</p>
            </div>
            <Lencana nada="warn">Menunggu</Lencana>
          </div>
        </Kartu>
      </section>
    </KerangkaAdmin>
  );
}
