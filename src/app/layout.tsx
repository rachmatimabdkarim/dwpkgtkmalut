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

export async function generateMetadata(): Promise<Metadata> {
  const tema = await ambilTema();

  return {
    title: {
      default: `${tema.namaAplikasi} — ${tema.namaUnit}`,
      template: `%s — ${tema.namaAplikasi} ${tema.namaUnit}`,
    },
    description: tema.namaOrganisasi,
    icons: tema.faviconUrl
      ? {
          icon: tema.faviconUrl,
          shortcut: tema.faviconUrl,
          apple: tema.faviconUrl,
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
