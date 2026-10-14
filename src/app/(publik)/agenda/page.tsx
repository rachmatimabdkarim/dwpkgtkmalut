import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarAgenda, pengaturanSitus } from "@/lib/publik";

export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return { title: "Agenda", description: tema.subJudulAgenda ?? undefined };
}

/** Potongan tanggal untuk kotak kalender. */
function potonganTanggal(iso: string | null): { hari: string; bulan: string } {
  if (!iso) return { hari: "--", bulan: "---" };
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return { hari: "--", bulan: "---" };
  return { hari: String(d.getDate()).padStart(2, "0"), bulan: bulan[d.getMonth()] ?? "---" };
}

export default function HalamanAgenda() {
  return (
    <Suspense fallback={<KerangkaAgenda />}>
      <IsiAgenda />
    </Suspense>
  );
}

/**
 * Cangkang halaman: tampil duluan supaya perpindahan terasa langsung.
 * Isi agenda menyusul sekejap (butuh tanggal hari ini).
 */
function KerangkaAgenda() {
  return (
    <div className="space-y-10" aria-busy="true">
      <div className="rounded-[18px] h-[190px]" style={{ backgroundColor: "var(--dasar-700)" }} />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[18px] h-[120px] bg-n-100" />
        ))}
      </div>
    </div>
  );
}

async function IsiAgenda() {
  // Halaman agenda memerlukan tanggal hari ini (untuk memisahkan yang akan datang
  // dan yang sudah berlangsung), jadi memang harus dirender saat diminta.
  await connection();

  const [agendaList, tema] = await Promise.all([daftarAgenda(), pengaturanSitus()]);

  const hariIni = new Date().toISOString().slice(0, 10);
  const akanDatang = agendaList
    .filter((a) => (a.tanggal_mulai ?? "") >= hariIni)
    .sort((a, b) => (a.tanggal_mulai ?? "").localeCompare(b.tanggal_mulai ?? ""));
  const sudahLewat = agendaList.filter((a) => (a.tanggal_mulai ?? "") < hariIni);

  function KartuAgenda({ agenda, lewat }: { agenda: (typeof agendaList)[number]; lewat: boolean }) {
    const tgl = potonganTanggal(agenda.tanggal_mulai);
    const tanggalTampil =
      agenda.tanggal_selesai && agenda.tanggal_selesai !== agenda.tanggal_mulai
        ? `${formatTanggal(agenda.tanggal_mulai)} – ${formatTanggal(agenda.tanggal_selesai)}`
        : formatTanggal(agenda.tanggal_mulai);

    return (
      <div
        className="rounded-[18px] bg-n-0 shadow-xs overflow-hidden flex flex-col sm:flex-row"
        style={{ border: "1px solid var(--n-200)", opacity: lewat ? 0.85 : 1 }}
      >
        {/* Kotak tanggal */}
        <div
          className="sm:w-[104px] shrink-0 flex sm:flex-col items-center justify-center gap-2.5 sm:gap-0 py-4 sm:py-6 px-5"
          style={{
            backgroundColor: lewat ? "var(--halaman)" : "var(--dasar-700)",
            color: lewat ? "var(--dasar-700)" : "var(--dasar-teks)",
          }}
        >
          <span className="text-[26px] font-extrabold leading-none">{tgl.hari}</span>
          <span className="text-[12px] font-bold uppercase tracking-wider sm:mt-1.5">{tgl.bulan}</span>
        </div>

        <div className="flex-1 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="text-[12.5px] font-semibold" style={{ color: "var(--aksen-700)" }}>
              {tanggalTampil}
            </span>
            {lewat && (
              <span
                className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--halaman)", color: "var(--dasar-600)" }}
              >
                Sudah berlangsung
              </span>
            )}
          </div>

          <h2 className="font-extrabold text-[17px] leading-snug" style={{ color: "var(--dasar-700)" }}>
            {agenda.judul}
          </h2>

          {agenda.tempat && (
            <p className="text-[13.5px] text-n-500 mt-2 flex items-center gap-1.5">
              <span aria-hidden="true">📍</span>
              <span>{agenda.tempat}</span>
            </p>
          )}

          {agenda.ringkasan && (
            <p className="text-[14.5px] text-n-600 mt-3 leading-[1.7]">{agenda.ringkasan}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ============ KEPALA HALAMAN ============ */}
      <header
        className="rounded-[18px] px-6 sm:px-10 py-10 sm:py-12"
        style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
      >
        <p
          className="text-[12.5px] font-bold tracking-[0.14em] uppercase mb-3"
          style={{ color: "var(--aksen-300)" }}
        >
          Jadwal Kegiatan
        </p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight tracking-tight">
          Agenda Kegiatan
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed opacity-90 max-w-[620px]">
          {tema.subJudulAgenda}
        </p>
      </header>

      {/* Bagian "Akan Datang" dan "Sudah Berlangsung" SELALU ditampilkan, walau
          belum ada isinya — supaya pengunjung tahu kedua bagian itu memang ada di
          halaman ini, bukan hilang. Sebelumnya saat benar-benar kosong hanya
          muncul satu pesan umum, dan kedua bagian itu tidak terlihat sama sekali. */}
      <>
        {/* ============ AKAN DATANG ============ */}
          <section>
            <h2 className="text-[22px] sm:text-[25px] font-extrabold mb-6" style={{ color: "var(--dasar-700)" }}>
              Akan Datang
              <span className="ml-2.5 text-[14px] font-semibold text-n-500">({akanDatang.length})</span>
            </h2>

            {akanDatang.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
                <p className="text-n-600">Belum ada agenda yang akan datang.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {akanDatang.map((a) => (
                  <KartuAgenda key={a.id} agenda={a} lewat={false} />
                ))}
              </div>
            )}
          </section>

          {/* ============ SUDAH BERLANGSUNG ============ */}
          {/* Bagian ini SELALU ditampilkan, walau belum ada isinya — supaya
              pengunjung tahu arsip kegiatan memang ada di sini, bukan hilang. */}
          <section>
            <h2 className="text-[22px] sm:text-[25px] font-extrabold mb-2" style={{ color: "var(--dasar-700)" }}>
              Sudah Berlangsung
              <span className="ml-2.5 text-[14px] font-semibold text-n-500">({sudahLewat.length})</span>
            </h2>
            <p className="text-[14px] text-n-500 mb-6">
              Arsip kegiatan yang sudah dilaksanakan.
            </p>

            {sudahLewat.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
                <p className="text-n-600">
                  Belum ada kegiatan yang sudah dilaksanakan.
                </p>
                <p className="text-[13.5px] text-n-500 mt-1.5">
                  Kegiatan yang selesai akan tercatat di bagian ini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sudahLewat
                  .slice()
                  .sort((a, b) => (b.tanggal_mulai ?? "").localeCompare(a.tanggal_mulai ?? ""))
                  .map((a) => (
                    <KartuAgenda key={a.id} agenda={a} lewat={true} />
                  ))}
              </div>
            )}
          </section>
      </>
    </div>
  );
}
