import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TEMA_BAWAAN, gayaTema } from "@/lib/tema";

const fontUtama = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-utama",
});

export function generateMetadata(): Metadata {
  // Kelak dibaca dari Pengaturan → Tampilan (Super Admin).
  return {
    title: {
      default: TEMA_BAWAAN.namaAplikasi,
      template: `%s — ${TEMA_BAWAAN.namaAplikasi} ${TEMA_BAWAAN.namaUnit}`,
    },
    description: TEMA_BAWAAN.namaOrganisasi,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontUtama.variable} style={gayaTema(TEMA_BAWAAN)}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
