/* Komponen Bagan Struktur Organisasi
 *
 * Bentuk: bagan hierarki dari atas ke bawah — Ketua di puncak, garis turun ke
 * deretan Pengurus Harian (Wakil Ketua, Sekretaris, Bendahara), lalu garis
 * turun lagi ke tiga Ketua Bidang beserta anggotanya.
 *
 * Aturan tampilan yang dipegang:
 *  • Kartu orang tampil bulat & proporsional: foto (atau inisial bila belum ada
 *    foto) berbentuk lingkaran dengan ukuran sama di semua kartu, lalu NAMA dan
 *    JABATAN. Email SENGAJA tidak ditampilkan.
 *  • Di HP bagan tidak dipaksa menyamping (tidak ada geser-geser): tiap tingkat
 *    ditumpuk ke bawah, sedangkan garis penghubung hanya muncul pada layar lebar.
 *  • Di layar lebar, anggota bidang disusun berderet dengan gaya lebih ringkas
 *    supaya tiga bidang tetap muat rapi tanpa terpotong.
 */
import type { PengurusPublik } from "@/lib/publik";

type Orang = PengurusPublik;

const JUDUL_WAKIL = /wakil ketua/i;
const JUDUL_SEKRETARIS = /sekretaris/i;
const JUDUL_BENDAHARA = /bendahara/i;
const JUDUL_KETUA_BIDANG = /ketua bidang/i;

function inisial(nama: string) {
  return nama
    .replace(/^Ny\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0] ?? "")
    .join("")
    .toUpperCase();
}

function urutJabatan(a: Orang, b: Orang, pola: RegExp) {
  const ka = pola.test(a.jabatan) ? 0 : 1;
  const kb = pola.test(b.jabatan) ? 0 : 1;
  return ka - kb || a.urutan - b.urutan;
}

/** Kartu orang — dipakai di semua tingkat bagan. */
function KartuOrang({
  orang,
  besar = false,
}: {
  orang: Orang;
  besar?: boolean;
}) {
  const ukuran = besar ? "h-28 w-28 sm:h-32 sm:w-32 text-[30px]" : "h-16 w-16 text-[17px]";
  return (
    <div
      className={`flex flex-col items-center text-center bg-n-0 rounded-[14px] ${
        besar ? "px-5 py-5 w-[220px]" : "px-3 py-3.5 w-[152px]"
      }`}
      style={{
        border: besar ? "2px solid var(--dasar-700)" : "1px solid var(--n-200)",
        boxShadow: besar ? "0 6px 18px rgba(0,0,0,0.08)" : undefined,
      }}
    >
      {orang.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={orang.foto_url}
          alt={`Foto ${orang.nama}`}
          className={`${ukuran} rounded-full object-cover object-top shrink-0`}
          style={{
            border: besar ? "3px solid var(--aksen-500)" : "2px solid var(--dasar-100)",
          }}
        />
      ) : (
        <div
          className={`${ukuran} rounded-full flex items-center justify-center font-extrabold shrink-0`}
          style={{
            backgroundColor: besar ? "var(--dasar-700)" : "var(--dasar-50)",
            color: besar ? "var(--dasar-teks)" : "var(--dasar-700)",
            border: besar ? "3px solid var(--aksen-500)" : "2px solid var(--dasar-100)",
          }}
        >
          {inisial(orang.nama)}
        </div>
      )}
      <p
        className={`mt-3 font-bold leading-snug ${besar ? "text-[15.5px]" : "text-[13.5px]"}`}
        style={{ color: "var(--dasar-700)" }}
      >
        {orang.nama}
      </p>
      <p className={`mt-1 ${besar ? "text-[12.5px]" : "text-[11.5px]"} text-n-500 leading-snug`}>
        {orang.jabatan}
      </p>
    </div>
  );
}

/** Garis penghubung tegak. */
function GarisTegak({ tinggi = 26 }: { tinggi?: number }) {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-[2px]"
      style={{ height: tinggi, backgroundColor: "var(--dasar-200)" }}
    />
  );
}

/** Satu kelompok bidang: Ketua Bidang di atas, anggota di bawahnya. */
function KelompokBidang({ bidang, orang }: { bidang: string; orang: Orang[] }) {
  const terurut = [...orang].sort((a, b) => urutJabatan(a, b, JUDUL_KETUA_BIDANG));
  const ketuaBidang = terurut.find((o) => JUDUL_KETUA_BIDANG.test(o.jabatan));
  const anggota = terurut.filter((o) => o !== ketuaBidang);

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-full px-4 py-1.5 mb-3 text-[12px] font-bold tracking-[0.08em] uppercase"
        style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
      >
        {bidang}
      </div>

      {ketuaBidang && <KartuOrang orang={ketuaBidang} />}

      {anggota.length > 0 && (
        <>
          <GarisTegak tinggi={18} />
          <div className="flex flex-wrap justify-center gap-2.5">
            {anggota.map((o) => (
              <KartuOrang key={`${o.bidang}-${o.nama}`} orang={o} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BaganPengurus({ daftar }: { daftar: Orang[] }) {
  if (daftar.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
        <p className="text-n-600">Data susunan pengurus belum tersedia.</p>
      </div>
    );
  }

  const harian = daftar.filter((o) => o.bidang === "Pengurus Harian");
  const lain = daftar.filter((o) => o.bidang !== "Pengurus Harian");

  const ketua = harian.find(
    (o) => /ketua/i.test(o.jabatan) && !JUDUL_WAKIL.test(o.jabatan) && !JUDUL_KETUA_BIDANG.test(o.jabatan),
  );
  const wakil = harian.find((o) => JUDUL_WAKIL.test(o.jabatan));
  const sekretaris = harian
    .filter((o) => JUDUL_SEKRETARIS.test(o.jabatan) && o !== ketua)
    .sort((a, b) => (/wakil/i.test(a.jabatan) ? 1 : 0) - (/wakil/i.test(b.jabatan) ? 1 : 0));
  const bendahara = harian.find((o) => JUDUL_BENDAHARA.test(o.jabatan));

  // Deret kedua: wakil, sekretaris (+ wakil sekretaris), bendahara.
  const deretHarian: Orang[] = [...(wakil ? [wakil] : []), ...sekretaris, ...(bendahara ? [bendahara] : [])];

  // Bila ada pengurus harian yang tidak dikenali jabatannya, tetap ditampilkan.
  const sisaHarian = harian.filter((o) => o !== ketua && !deretHarian.includes(o));

  const namaBidang: string[] = [];
  for (const o of lain) if (!namaBidang.includes(o.bidang)) namaBidang.push(o.bidang);

  return (
    <div
      className="rounded-[18px] p-5 sm:p-8 overflow-hidden"
      style={{ backgroundColor: "var(--halaman)", border: "1px solid var(--dasar-100)" }}
    >
      {/* Tingkat 1 — Ketua */}
      {ketua && (
        <div className="flex flex-col items-center">
          <p
            className="text-[11.5px] font-bold tracking-[0.14em] uppercase mb-3"
            style={{ color: "var(--aksen-700)" }}
          >
            Pimpinan
          </p>
          <KartuOrang orang={ketua} besar />
        </div>
      )}

      {/* Tingkat 2 — Pengurus Harian */}
      {deretHarian.length + sisaHarian.length > 0 && (
        <>
          <GarisTegak tinggi={28} />
          <div className="flex flex-wrap justify-center gap-3">
            {[...deretHarian, ...sisaHarian].map((o) => (
              <KartuOrang key={`harian-${o.nama}`} orang={o} />
            ))}
          </div>
        </>
      )}

      {/* Tingkat 3 — Bidang-bidang */}
      {namaBidang.length > 0 && (
        <>
          <GarisTegak tinggi={28} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {namaBidang.map((bidang) => (
              <KelompokBidang
                key={bidang}
                bidang={bidang}
                orang={lain.filter((o) => o.bidang === bidang)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
