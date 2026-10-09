import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { gayaTema } from "@/lib/tema";
import { ambilTema } from "@/lib/pengaturan";
import { PenyediaTema } from "@/components/penyedia-tema";

const fontUtama = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-utama",
});

export const instant = false;

/** Memilih berkas favicon ukuran lain dari jalur yang sama (mis. -192 -> -180). */
function gantiNamaFavicon(url: string, ukuran: string): string {
  return url.replace(/-\d+\.png$/, `-${ukuran}.png`);
}

export async function generateMetadata(): Promise<Metadata> {
  const tema = await ambilTema();

  return {
    title: {
      default: `${tema.namaAplikasi} — ${tema.namaUnit}`,
      template: `%s — ${tema.namaAplikasi} ${tema.namaUnit}`,
    },
    description: tema.namaOrganisasi,
    // Favicon: pakai PNG (bukan WebP) karena banyak peramban — terutama di
    // Android — tidak menerima WebP sebagai ikon tab dan menampilkan ikon bawaan.
    icons: tema.faviconUrl
      ? {
          icon: [
            { url: tema.faviconUrl, sizes: "192x192", type: "image/png" },
            { url: gantiNamaFavicon(tema.faviconUrl, "32"), sizes: "32x32", type: "image/png" },
          ],
          shortcut: tema.faviconUrl,
          apple: [{ url: gantiNamaFavicon(tema.faviconUrl, "180"), sizes: "180x180", type: "image/png" }],
        }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await ambilTema();

  return (
    <html lang="id" className={fontUtama.variable} style={gayaTema(tema)}>
      <body className="min-h-dvh antialiased">
        <PenyediaTema tema={tema}>
          {children}
        </PenyediaTema>
      </body>
    </html>
  );
}
